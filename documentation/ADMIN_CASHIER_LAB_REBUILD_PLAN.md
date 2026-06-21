# Admin · Cashier · Lab — full-stack rebuild plan

Status: **DRAFT for owner review.** Full-stack (FE + BE + DB), unlike the visual
overhaul. Grounded in a read-only audit of all three modules (FE pages, API
routes, DB snapshot/migrations). Honors DESIGN_SYSTEM.md "Density & sizing — v2"
for all new UI.

> **Scope reality:** this is large — realistically **multi-session**, not one 5h
> sitting. The `/goal` below drives it module-by-module, feature-by-feature,
> committing per screen so you can review incrementally and stop anytime.

---

## 0. The big finding
The admin/cashier backends are **largely built and well-gated** (transactional,
audit-logged, `requireAdminOrSuperAdmin` + `assertPermitted`). The owner's "awful
/ confusing" is an **IA + UI-consistency + wiring** problem, not a missing-backend
problem. Lab is the exception — it has genuine FE/BE/DB gaps and a patient-safety
hole. So: mostly *restructure + wire + polish*, with *targeted* new BE/DB.

---

## 1. ADMIN — decision: keep ONE shell, restructure into 4 peer sections
**HR and Finance stay in one admin app** (shared auth boundary, shared audit
ledger, payroll bridges both). Do **not** split into separate portals. Fix the
*grouping* and *per-screen UX*. New sidebar:

```
Dashboard
WORKFORCE (HR):  People · Time & Attendance · Roster · Leave · Approvals ·
                 Credentials & Docs · Onboarding · Workforce Analytics
FINANCE:         Overview · Payroll · Cashier & Dues · FBR Invoicing
PHARMACY OPS:    Inventory · Narcotics
SYSTEM:          Patients Analytics (re-attach orphan) · Access & Roles ·
                 Security Sessions · Settings · Audit · Notifications
```

**Keystone: an Employee Profile drill-in** (`/admin/staff/[id]`) with tabs
(Profile · Compensation · Allowances · Leave · Attendance · Credentials/Docs ·
Onboarding · Access/Security) — collapses today's "pick the same person in 6
different pages." Compensation/allowances move here out of "Settings".

**Standard record/show pattern (match the Dashboard quality bar):** list table →
row drill-in (page/drawer) → action buttons open **modal forms (never
`window.prompt`)** → audit-logged write → optimistic refresh. Dense `DataTable`,
`StatusBadge`, `FormField`/`FormGrid`, `PageHeader`, `EmptyState`.

**Wire backend actions that already exist (no rebuild):** payroll per-line
`adjust`; role-level + scoped (`scope_type`/`expires_at`) permissions;
leave/approvals **decision history** (UI hides it via `status='pending'`);
lifecycle template create.

**Net-new backend/DB (genuinely missing):**
- Inventory **procurement/stock-order** write route → must go through
  `medicine_purchase*` detail tables + the trigger chain (never poke
  `medicine`/`medicine_batch` directly).
- **Retry** endpoints: FBR `fbr_invoice_submission` (idempotent — no double
  submit), notifications `notification_outbox`.
- **Export** endpoints: narcotics (DRAP CSV/PDF), audit logs.
- Audit logs: server-side **date-range + severity filter** params.
- Staff: **archive/deactivate** + create-**doctor** account; allowances **edit (PUT)**.
- Patients analytics: **compute** growth rate server-side (kill hardcoded values).
- Kill all dead buttons (Inventory "New Stock Order", Audit "Date Range/Critical",
  Patients CTAs) — wire or remove.

---

## 2. CASHIER — consolidate 5 tabs → 3 + drawer + new Shift
- **Collect** (merge Worklist + Overdue — they duplicate the same scoring).
- **Settle drawer** (not a tab): bill summary + source breakdown + payment panel;
  partial payment, **printable/PDF receipt** (today the receipt route returns
  **JSON** — biggest "feels broken" issue), hold-as-draft.
- **History & Corrections**: ledger + reverse-and-repost wizard, constrained
  reason-code dropdown.
- **My Shift (NEW UI)**: open float → live collected → close with counted cash →
  variance. **The `/api/cashier/shift` GET/POST/PATCH API is already complete; no
  UI exists** — biggest money-recording gap.

**Money-integrity — MUST preserve (no triggers exist; integrity is app-side):**
append-only `cashier_payment_txn`; **reverse-and-repost** for all corrections
(never mutate/delete a payment); balances always = `SUM(amount)`; `BEGIN … SELECT
bill FOR UPDATE … COMMIT` concurrency guard; overpayment block; idempotency.

**Backend/DB gaps to fill:** add **idempotency** to `drafts/[id]` apply + `correct`
(today only `settle` has it); carry the **terminal-reopen (H2) guard** into the
`correct` route the UI uses (it's only in the unused `reversal` route); render
receipts (HTML/PDF); decide split-tender/insurance — **build them or remove the
unimplemented `SPLIT`/`INSURANCE` options** from the dropdown; (optional) make
`bill.visit_id` nullable for OTC/walk-in collection.

---

## 3. LAB — partially built; fix wiring + close the real gaps
**Immediate bug (the blank screen):** `src/app/lab/layout.tsx` consumes a
`sampleCollection` slot, but there's **no `@sampleCollection` directory** (slots
on disk are `@labOrders`/`@reports`/`@testResults`). Default tab renders blank.
- **Build Sample Collection end-to-end** (FE slot + component, `POST /api/lab/sample`
  or PATCH, new `lab_order.status='Collected'` + `collected_by`/`collected_at`/
  `specimen_type`). Currently missing in FE **and** BE **and** DB.
- **Doctor result read-back (PATIENT SAFETY):** doctor history shows status only,
  **not result values / abnormal / critical flags** — a critical result can be
  signed off without the doctor ever seeing it. Extend
  `GET /api/doctor/history/.../lab-orders` (or add `GET /api/lab/results/[orderId]`)
  to return values + flags; render them doctor-side.
- **Lab billing (MISSING):** `bill_charge_source.source_type='lab'` is allowed but
  **never inserted** — lab tests are never charged. Insert `bill_item` +
  `bill_charge_source(source_type='lab')` from `lab_test.price` on order/finalize.
- **Reports tab:** `@reports/page.tsx` is a `<h2>dkd</h2>` placeholder — build a
  real result report/printout or remove.
- **Deploy hazard:** legacy `src/app/api/lab/order/route.ts` POST does a hardcoded
  `fetch("http://localhost:3000/...")` — retire it.
- **Migration divergence:** lab tables (`lab_order`, `lab_test`,
  `lab_test_parameters`, `lab_test_results`, `lab_result_approvals`) exist only in
  Supabase/snapshot, **not in `database/migrations/`** — commit their DDL.
- **Keep working:** result entry, critical-value flag + SMS, verify/sign-off.

**Lab patient-safety:** critical-value handling must remain; numeric flagging
currently no-ops on non-numeric `result_value` — make qualitative criticals
flaggable; never lose the verify/approval gate.

---

## 4. Guardrails (all modules)
Full-stack now (FE+BE+DB allowed), but: money ledger append-only; narcotics
register immutable/append-only; payroll finalized-run immutability (tested);
pharmacy stock **trigger chain** (writes via detail tables only); lab verify gate +
critical values; RBAC gates unchanged. **DB migrations:** forward `.sql` +
`.down.sql`, back up first, test on a throwaway row + roll back, apply to Supabase
per `CLAUDE.md`. New code token-clean (ESLint guard). Gate every change:
`tsc` · `lint` 0 errors · `build` · `test` (extend tests for new BE/DB invariants).

## 5. Suggested order (highest value / safety first)
1. **Lab** — fix blank tab + Sample Collection + doctor result read-back (safety) +
   lab billing + commit DDL. (Most genuinely broken + patient-safety.)
2. **Admin** — sidebar restructure + Employee Profile drill-in + wire dead buttons +
   replace `window.prompt` + surface existing backend actions + net-new routes.
3. **Cashier** — consolidate tabs + Settle drawer + printable receipts + Shift UI +
   idempotency/guard hardening.

## 6. `/goal` prompt
> Run the full-stack rebuild of the Admin, Cashier, and Lab modules per
> documentation/ADMIN_CASHIER_LAB_REBUILD_PLAN.md, DESIGN_SYSTEM.md "Density &
> sizing — v2", and the per-module audits in that plan. This is FE + BE + DB
> (migrations allowed this time — forward + .down + backup + test-and-rollback per
> CLAUDE.md). Order: (1) LAB — add the missing @sampleCollection slot + Sample
> Collection flow (FE+route+`lab_order.status='Collected'`/collected_by/at/specimen),
> fix the doctor result read-back so result values + abnormal/critical flags reach
> the ordering doctor (patient-safety), add lab→bill integration
> (bill_charge_source source_type='lab' from lab_test.price), build/remove the
> @reports placeholder, retire the legacy localhost lab order route, and COMMIT the
> lab table DDL to database/migrations/; (2) ADMIN — restructure the sidebar into
> Workforce/Finance/Pharmacy-Ops/System, add the Employee Profile drill-in
> (/admin/staff/[id] tabs), replace every window.prompt with modal forms, wire all
> dead buttons (or remove), surface existing backend actions (payroll line adjust,
> role/scoped permissions, decision history, lifecycle templates), and add the
> net-new routes (inventory procurement via medicine_purchase detail tables, FBR +
> notifications retry [idempotent], narcotics + audit export, audit date/severity
> filters, staff archive + doctor-create, allowance edit, computed patient growth);
> (3) CASHIER — merge Worklist+Overdue into Collect, make Settle a drawer with a
> printable/PDF receipt, build the My-Shift UI on the existing /api/cashier/shift
> API, add idempotency to drafts-apply + correct, carry the terminal-reopen guard
> into correct, and remove unimplemented SPLIT/INSURANCE options (or build them).
> PRESERVE all money/safety invariants: append-only cashier ledger + reverse-and-
> repost, narcotics immutability, payroll finalized-run lock, pharmacy stock trigger
> chain (write via detail tables only), lab verify gate + critical values, RBAC
> gates. Use the screenshot loop (scripts/ux-shots.mjs at 1536×864; mock/seed via the
> existing scripts where forms are data-gated) to verify each screen. Gate every
> change (npx tsc --noEmit, pnpm lint 0 errors, pnpm build, pnpm test — extend tests
> for new invariants) and commit per screen/feature with pinned push to
> feat/hms-completion (gh auth switch --user bubblu2264326 first). Work module by
> module, feature by feature; checkpoint after each module so the owner can review.
