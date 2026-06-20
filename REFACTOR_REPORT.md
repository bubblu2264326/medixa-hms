# HMS Stabilization — Closing Report

**Outcome:** the stabilization goal is met. The HMS backend was hardened module-by-module (auth, audit, DB integrity), and a live-server scenario suite now proves the 5 cross-module invariants hold. All work is on branch `refactor/hms-stabilization`, committed and pushed in 33 checkpoints. `main` was never touched; the Supabase project was never touched; no `.env*` or secrets were committed.

This report is the summary. The blow-by-blow trail is in [REFACTOR_PROGRESS.md](REFACTOR_PROGRESS.md); the plan it executed is [REFACTOR_PLAN.md](REFACTOR_PLAN.md).

---

## Final gate status

| Gate | Result |
|---|---|
| Build (`pnpm build`) | ✅ passes |
| Typecheck (`tsc --noEmit`) | ✅ 0 errors |
| Tests (`pnpm test`) | ✅ 138 / 138 |
| Lint (`pnpm lint`) | ✅ 0 errors (48 warnings — pre-existing react-hooks/unused-vars, non-blocking) |
| Scenario suite (live server) | ✅ 16 / 16 |
| DB invariants | ✅ 8 / 8 |

Baseline at the start of the branch was **red**: 9 lint errors, 3 type errors, 6 failing tests (all stale tests, not product bugs). It is now green.

---

## The 5 invariants — how each is proven

| # | Invariant | How it's proven | Where |
|---|---|---|---|
| 1 | **Stock ≥ 0** | *Actively* — 12 parallel decrements on a stock-5 batch: exactly 5 succeed, 7 abort on the `ck_stock_qty_non_negative` CHECK, final stock = 0. Plus a static scan for any negative batch. | `run-scenarios.mjs` (concurrency), `check-invariants.mjs` (static) |
| 2 | **Invoices reconcile** | Static — every `bill.payment_status` matches the ledger (`total_amount` vs Σ `cashier_payment_txn.amount`). | `check-invariants.mjs` |
| 3 | **No orphans** | Static — no bill without a patient+visit, no lab result without an order, no sale detail without a sale. | `check-invariants.mjs` |
| 4 | **Audit per sensitive action** | *Actively* — `POST /api/patient` writes exactly one matching `audit_logs` row (`action=patient.create`, `entity_id`=new id). Plus a static presence check. | `run-scenarios.mjs` (delta), `check-invariants.mjs` (presence) |
| 5 | **Legal queue/lab states** | Static — every `visit.status` and `lab_order.status` is within its allowed domain. | `check-invariants.mjs` |

---

## What changed, by phase

**Phase 1 — foundation (RBAC + audit + tooling).**
- **RBAC:** unified role normalization into `src/lib/server/roles.ts` (`normalizeRole`/`rolesMatch`), fixing the page-gate-vs-API-gate casing mismatch; centralized the JWT secret in `src/lib/server/jwtSecret.ts` with **fail-fast if `secret_key` is unset** (removed the hardcoded fallback from 5 sites — a forgeable-token hole); **authenticated 25 previously-open data routes** (`patient*`, `prescription`, `visit*`, `queue`, `medicine`) — closing an unauthenticated PII read/write hole.
- **Audit:** added `src/lib/server/actor.ts` → `resolveActorStaffId()`, the real authenticated-actor resolver, and deprecated `getCurrentStaffId()` (which returned a hardcoded `1`, falsifying the audit trail).
- **Tooling:** ESLint was linting `.next/` build output (967 of 976 errors) — scoped it to source; drove lint, typecheck, and tests to green (the 6 failing tests were all stale fixtures, zero product bugs).

**Stage A — module hardening (all 8 modules).** Patient · Pharmacy · Billing · Lab · Doctor · Queue · HR · Admin. Each module: verified/added DB integrity, then backend auth + real-actor audit. Highlights:
- **Patient:** zod validation (fixes the `age`→NaN bug), audit on create/update, unique-CNIC index, `409` on duplicate.
- **Pharmacy:** fixed a **fake transaction** in purchase-return (pooled `query` with BEGIN/COMMIT → a real dedicated-client transaction, so a mid-loop failure can't leave partial stock decrements committed); swapped every `getCurrentStaffId()` for the real actor; fixed a connection leak in `transactions/hold` GET.
- **Billing:** append-to-bill now **recomputes `payment_status` from the ledger** (was hard-coding `Unpaid`); reversal now reverts the visit status that settle advanced.
- **Queue/Visit:** `/api/visit` PATCH status changes now route through the `update_and_log_visit_status` proc (history + legal-transition check) instead of writing `visit.status` directly.
- **Lab / HR / Admin:** verified already DB-sound and authed — no changes needed (HR has the per-day attendance uniqueness; Admin's 38 routes are all gated + audited).

**Stage B + C — integration chains + scenario assault.**
- `scripts/scenario-tests/check-invariants.mjs` — the 8-invariant assertion engine (exit 0/1).
- `scripts/scenario-tests/run-scenarios.mjs` — the HTTP scenario driver (16 scenarios; self-provisions its own `SCN_*` test logins, local-DB-guarded).
- `scripts/scenario-tests/run-with-server.mjs` — orchestrator: boots the prod build, waits for readiness, runs the driver + invariants, tears the server down.

---

## Database changes

4 forward migrations added (all with consistency tests; 3 with `.down` rollbacks), applied to the **local** `hms` DB only:
- `2026_06_20_patient_cnic_unique` — partial unique index on CNIC (walk-ins with no CNIC still allowed).
- `2026_06_20_medicine_batch_nonneg_prices` — `>= 0` CHECKs on the 4 batch price columns.
- `2026_06_20_billing_nonneg_amounts` — `bill.total_amount >= 0`, `bill_item.quantity >= 0`.
- `2026_06_20_add_completed_to_visit_status_history_check` — allow `completed` in the status-history CHECK.

**Corrected a false audit finding (P0-4):** `medicine_batch` already had non-negative stock CHECKs and `medicine` has no `stock_quantity` column — so the unapplied `2026_03_20_stock_reconciliation_and_guard.sql` was moot and was **not** applied.

**Restore point:** `db/seed/hms-seed-base.sql` (synthetic data) is the committed baseline. Binary `.dump` files stay gitignored.

---

## How to verify (one command)

```bash
# fresh build, then boot server + run all scenarios + invariants + teardown
pnpm build
PORT=3100 node scripts/scenario-tests/run-with-server.mjs   # exit 0 = green

# or just the static invariant check against the current DB:
node --env-file=.env.local scripts/scenario-tests/check-invariants.mjs
```

The suite provisions 3 inert, clearly-named test logins (`SCN_ADMIN`/`SCN_RECEP`/`SCN_DOC`, password `password123`) on the **local** DB. All other test data is self-cleaned (verified: 0 leftover rows).

---

## Deferred — needs your decision (none block the goal)

These were flagged rather than guessed, because they involve product/money policy or UI:

1. **Sale-return refunds (M3):** `transactions/return` restores stock but records **no monetary refund** → revenue is overstated. Needs a refund-policy decision (cash vs bill-credit vs negative cashier txn) before implementing.
2. **Reversal-revert edges (H2):** reversing a payment on a `completed`/`discharged` visit is left untouched — confirm the desired behavior.
3. **`/api/visit` PATCH due-guard:** a status change there does not run the outstanding-payment guard that `/api/visit/status` applies — unify if you want one path.
4. **Per-role RBAC granularity:** routes are authenticated (any valid staff); fine-grained role↔endpoint rules (who may delete a visit, merge a patient) are deferred until the role map is confirmed.
5. **2 empty route stubs:** `lab/testParameters/route.ts` and `doctor/route.ts` are 0-byte — delete or implement.
6. **Frontend correctness pass** (surface the new 400/409 states, loading/empty/error) and a **fuller per-module test suite** — the planned UI/UX phase.
7. **Optional v3:** a full cross-module HTTP happy-chain (register → visit → dispense → bill → settle). Its end-state is already covered by the static reconcile/orphan invariants on real data; deferred as lower-value.

The full list with rationale is under "Decisions made unattended" in [REFACTOR_PROGRESS.md](REFACTOR_PROGRESS.md).

---

## Autonomy / safety notes

- **Branch:** all 33 commits on `refactor/hms-stabilization`, pushed to the personal GitHub (`bubblu2264326`). `main` untouched — open a PR when you're ready to merge.
- **Never touched:** Supabase (paused), `.env*`, secrets, `.claude/`.
- **DB:** local `hms` only, every migration backed up before applying.
- **Each checkpoint** passed build + typecheck + tests + lint before commit + push.
