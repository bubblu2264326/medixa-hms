# HMS Audit — Consolidated Findings & Punch-List

> Full audit run 2026-06-20: 4 mapping agents + 3 audit agents (coding, business-logic, integration), all read-only and code-verified. This is the **merged, deduplicated** master list. Per-audit detail:
> - [project-map.md](project-map.md) — full architecture map
> - [coding-audit.md](coding-audit.md) — 15 findings
> - [business-logic-audit.md](business-logic-audit.md) — money/stock/lifecycle correctness
> - [integration-audit.md](integration-audit.md) — FE↔BE↔DB seams

## Verdict
The app is **broad, well-structured, and the plumbing works** (no missing routes, no schema drift in active paths, SSE fully wired with a real 45s fallback). But it is **not yet safe to handle real patient data or deploy to production** — the issues cluster in three themes: **(A) the API surface is largely unauthenticated, (B) two deploy-breakers, (C) money/stock/lifecycle correctness bugs incl. a migration that never reached the live DB.**

## P0 — block production / patient data (fix first)

| # | Finding | Where | Seen in |
|---|---|---|---|
| **P0-1** | **API surface largely unauthenticated** — `/api/patient*` (`SELECT * FROM patient` incl. CNIC/phone), `/api/prescription`, `/api/visit*`, `/api/queue`, `/api/medicine`, `/api/clinicalDetails/*` have no auth; middleware matcher excludes `/api`. Unauthenticated PII read/write. | `middleware.ts:80`, `patient/route.ts:25`, `prescription/route.ts`, `visit/route.ts` | coding C1+C2, integration C1 |
| **P0-2** | **Hardcoded JWT secret fallback** in 4 files — forgeable Super-Admin token if `secret_key` unset. | `middleware.ts:3`, `auth.ts:5`, `doctor.ts:5`, `login/route.ts:7` | coding C3, integration M3 |
| **P0-3** | **`localhost:3000` self-fetch inside txns** — prescription & lab POST break on any non-local deploy (and likely the old "visit not selected" bug). | `prescription/route.ts:26`, `lab/route.ts:46` | coding H2, integration H1 |
| **P0-4** | **Stock migration never applied to live DB** — `fn_tg_stockquantity_generic` doesn't maintain `medicine.stock_quantity` and has **no negative-stock guard**; 2026-03-20 migration absent from the snapshot. | `snapshot/routines.md:195` vs `migrations/2026_03_20_*.sql` | business C2 (+H4) |
| ~~**P0-5**~~ ✅ **FIXED 2026-06-20** | **`completed` unreachable via the proc** — `visit_status_history` CHECK omitted `completed`. **Resolved**: migration `database/migrations/2026_06_20_add_completed_to_visit_status_history_check.sql` applied to local DB; history constraint now matches `visit_status_check` (incl. `completed`). | `tables.md:4882` vs proc | business C3 |
| **P0-6** | **`pharmacy/purchase/return` is a fake transaction** — `BEGIN/COMMIT` via pooled `query()` on random connections → partial stock decrements commit permanently; pool poisoning. | `pharmacy/purchase/return/route.ts:14-49` | business C1 |

## P1 — correctness, money & access integrity

| # | Finding | Where | Seen in |
|---|---|---|---|
| **P1-1** | **Visit-status write fragmentation** — `/api/visit` PATCH raw-updates `status`, skipping the proc (no history) AND the payment-due guard. Route all status writes through `update_and_log_visit_status`. | `visit/route.ts:33-36` | coding H4, business H1, integration M1 |
| **P1-2** | **No role checks on status transitions** — `/api/visit/status` lets any authenticated user (e.g. receptionist) drive a visit to `completed`. | `visit/status/route.ts:29` | integration H3 |
| **P1-3** | **Role-casing coupling** — middleware lowercases; auth helpers compare titlecase & return role unnormalized. If `staff.role` is ever lowercase, admin UI loads but all `/api/admin/*` calls 403. | `middleware.ts:5`, `auth.ts:122`, `cashier.ts:9` | coding H6, integration H2 |
| **P1-4** | **Cashier reversal doesn't revert visit status** — bill goes Unpaid but visit stays `payment_done`; money vs visit state diverge. | `cashier/reversal/route.ts:206-274` | business H2 |
| **P1-5** | **Sale returns record no refund** — stock restored, but no `cashier_payment_txn`/bill adjustment → revenue overstated. | `transactions/return/route.ts:6-120` | business M3 |
| **P1-6** | **`bill.payment_status` desync** — append-to-bill hard-codes `'Unpaid'`, discarding prior payments; no bill lock during total mutation (race with settle). | `transactions/route.ts:538-564` | business M1+M2 |
| **P1-7** | **No request-body validation** — zod unused in API; trusted casts → NaN inserts / 500s. | all write routes | coding H3 |
| **P1-8** | **App enum vs DB CHECKs disagree** (`admitted`/`dispensing`/`completed`) — an `admitted` visit bricks in the UI; `dispensing` is dead. | `visitLifecycle.ts:1-10` vs CHECKs | business H3 |

## P2 — quality, attribution, hardening

| # | Finding | Seen in |
|---|---|---|
| P2-1 | `getCurrentStaffId()=1` falsifies audit attribution (cash-drawer, returns) | coding H1, business M4, integration M2 |
| P2-2 | Raw DB error objects leaked to clients (`{error: err}`) | coding H5 |
| P2-3 | `secure:true` cookie hardcoded → breaks plain-HTTP local/intranet | coding L5, integration M4 |
| P2-4 | Duplicated queue query + duplicated auth helper (`getAuthenticatedDoctor` vs `getAuthenticatedUser`) | coding M1+M2 |
| P2-5 | `check_stock_available()` column drift (`quantity` vs `stock_quantity`) — throws if called; no callers today | business M5, integration L1 |
| P2-6 | `rejectUnauthorized:false` DB SSL; no rate limiting; 22 stray `console.log` (some PII) | coding L1/L2/L3, integration L3 |
| P2-7 | Integration stubs (email/print/cash-drawer) return success while no-op — return 501 until implemented | integration M2 |
| P2-8 | `error: any` + unsafe casts (165 occ / 70 files), incl. financial transaction path | coding M3 |
| P2-9 | Test gaps: `/api/patient*`, `/api/prescription` POST, `/api/visit` PATCH, `/api/clinicalDetails/*`, `/api/queue` untested; no integration runner | coding (coverage) |

## Cross-cutting root cause
**No applied-migrations check.** The live DB (snapshot) already contradicts two committed migrations (P0-4, P0-5). **Recommend a CI gate** that diffs a fresh introspection against the snapshot + migration definitions, so DB and code can't silently drift.

## ✅ Verified against the live DB (psql, 2026-06-20) — all CONFIRMED
- **P0-4 CORRECTED 2026-06-20 (verified on live DB) — largely a NON-issue; migration will NOT be applied.** Two facts overturn the original finding: (1) `medicine_batch` ALREADY has `CHECK (stock_quantity >= 0)` + `CHECK (stock_sub_quantity >= 0)` → **oversell is guarded at the DB level** (a negative-driving UPDATE aborts the transaction), independent of the trigger's missing `RAISE`; (2) **`medicine` has no `stock_quantity` column at all** → the 2026-03-20 migration's "sync `medicine.stock_quantity`" is moot and would add an unused column. Stock is batch-only and the app reads batches (`v_medicine_pos`). Conclusion: the unapplied `2026_03_20_stock_reconciliation_and_guard.sql` is **not needed and should not be applied**. (App also guards via `stockValidation` + `FOR UPDATE`.) The real Pharmacy DB gap — non-negative *price* CHECKs — was fixed in migration `2026_06_20_medicine_batch_nonneg_prices.sql`.
- **P0-5 CONFIRMED → ✅ FIXED** — `completed` was absent from `visit_status_history_status_check`; migration applied, constraint now = {waiting, seen_by_doctor, dispensing, medicines_dispensed, lab_tests_done, payment_done, **completed**, admitted, discharged}. Verified: 0 existing visits in `completed`, so additive + safe.
- **P2-5 CONFIRMED, NOT applied** — `check_stock_available` references `quantity` → would throw, but **zero callers** anywhere (verified). Dormant; no need to run. Fix or drop when a caller is added.

## Suggested sequencing
1. **Security gate (P0-1, P0-2, P0-3, P1-2, P1-3)** — auth everything, kill the secret fallback + self-fetch, add role checks. Nothing ships before this.
2. **Data-integrity gate (P0-4, P0-5, P0-6, P1-4, P1-5, P1-6)** — reconcile DB vs migrations, fix the fake transaction, money/lifecycle consistency.
3. **Hardening (P1-7, P1-8, P2-*)** — validation, dedup, attribution, tests, CI migration check.
