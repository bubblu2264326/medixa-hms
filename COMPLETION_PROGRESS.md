# HMS Completion — Progress Log

Running state of the autonomous completion build. Newest entries at the bottom. Driven by [COMPLETION_PLAN.md](COMPLETION_PLAN.md); strategy in [documentation/HMS_COMPLETION_ROADMAP.md](documentation/HMS_COMPLETION_ROADMAP.md).

## Status
- **Branch:** `feat/hms-completion` (off `main`, which now includes the merged stabilization work).
- **Mode:** autonomous, Git-checkpointed; combined leftovers + FE↔BE↔DB sync, then full IPD, then HR/Admin UX, then gap-fill.
- **Owner decisions:** cash-refund (M3); full IPD v1; granular RBAC via existing permission tables; PR to `main` per phase.
- **Gate baseline (start):** build ✅ · tsc ✅ 0 · tests ✅ 138/138 · lint ✅ 0 errors · scenario suite ✅ 16/16 · invariants ✅ 8/8.

## Phase checklist
- [ ] **Phase 1** — Sync + leftovers (module by module): Reception · Doctor/EMR · Pharmacy · Billing · Lab · HR · Admin.
  - [ ] Leftover: M3 cash-refund · [ ] H2 admin-gated terminal reversal · [ ] granular RBAC · [ ] `lab/testParameters` + `doctor/route.ts` stub.
- [ ] **Phase 2** — IPD / Nursing (full v1).
- [ ] **Phase 3** — HR + Admin wire + UX.
- [ ] **Phase 4** — Gap-fill (allergies → appointments → FBR e-invoicing → WhatsApp/SMS → lab depth → narcotics/FEFO → panel/wallet).
- [ ] **Final** — completion report.

## Decisions made unattended
*(log every non-obvious or behavior-affecting choice for later review)*
- 2026-06-20 — Plan created; decisions per owner baked into COMPLETION_PLAN.md §"Owner decisions".

## Unit log
*(append one entry per committed unit: what changed, why, tests, commit hash)*
- **P1·Lab·1 — leftover (lab stub) + lab FE↔BE sync.** The lab result-entry screen calls `/api/lab/testParameters/<test_id>`; that dynamic route **existed but had bugs** (`SELECT *`; **threw 500 on zero rows** — so a test with no configured parameters broke result entry; wrong non-Promise `params` type; raw-error leak; no id validation). Rewrote it: explicit columns, `getAuthenticatedUser` (401), numeric-id validation (400), ordered by `display_order`, and **empty array is a valid 200**. Removed the dead 0-byte base stub `lab/testParameters/route.ts`. Fixed two **relative** FE fetches (`fetch("api/lab")`, `fetch("api/lab/testParameters/"+id)`) → leading-slash absolute (`/api/...`) — they previously resolved against the page path (no `basePath` configured), i.e. broken lab list + parameter fetch. New `src/features/laboratory/__tests__/testParameters-api.test.ts` (4: 401, 400 bad id, 200 ordered+explicit-cols, **200 `[]` zero-rows regression**). Suite 138→**142**. Verified: build ✅, tsc ✅ 0, tests ✅ 142/142, lint ✅ 0. **Leftover "lab stub" ✅.** Commit: _(below)_.
  - Remaining leftover: a live scenario for testParameters deferred to the lab sync pass.
- **P1·Sync·1 — app-wide relative-fetch sweep + dead doctor stub.** Found and fixed **4 more** broken FE fetches that omitted the leading slash (`fetch("api/…")` → resolves against the page path, no `basePath` configured): `reception/clinicalDetails/Gynaecologist/paraDetails/api.ts` ×2 (obstetric + para GETs — the POST/PATCH in the same file were already absolute, confirming the inconsistency) and `laboratory/labOrder/api.ts` ×2 (`/api/lab/order`). All target routes verified to exist; pure URL fix. Re-scan → **0 relative fetches remain** app-wide. Deleted the dead 0-byte `src/app/api/doctor/route.ts` (bare `/api/doctor` referenced nowhere — all doctor calls use subpaths). Verified: build ✅, tsc ✅ 0, tests ✅ 142/142, lint ✅ 0. **Both leftover stubs ✅** (lab implemented, doctor removed). Commit: _(below)_.
