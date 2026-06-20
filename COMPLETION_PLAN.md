# HMS Completion — Autonomous Goal Plan

Executable plan for the autonomous build that takes the HMS from hardened-but-partial to a **complete** product for our ICP (small/mid clinics, standalone pharmacy/lab, small hospitals — Pakistan/South Asia). Source of strategy: [documentation/HMS_COMPLETION_ROADMAP.md](documentation/HMS_COMPLETION_ROADMAP.md). Running state: [COMPLETION_PROGRESS.md](COMPLETION_PROGRESS.md).

## Owner decisions (baked in — do not re-litigate)
1. **Scope = the whole roadmap, one goal.** Run autonomously in goal mode, like the stabilization.
2. **Start mode = combined.** Do leftover items **and** the FE↔BE↔DB sync audit together, **module by module**.
3. **Refund (M3) = cash refund by default.** A sale-return posts a negative `refund` cashier transaction linked to the return; credit-note/store-credit is a later option, not now.
4. **IPD v1 = full.** Admission + ward/room/bed + bed transfer + doctor orders + **MAR** + nursing notes + intake/output + patient allergies + running inpatient bill + advances + discharge. Dual-loop: OPD stays a short loop; **admission is an explicit, optional conversion of a visit** — most patients never get an admission row.
5. **Cadence:** long-lived branch `feat/hms-completion`; frequent small verified commits (stabilization cadence); open a **PR to `main` at each phase boundary** for owner review.

## DONE condition (goal is met when ALL hold)
- **Phase 1** complete: every module's FE↔BE↔DB contract verified + mismatches fixed; the 4 leftover items closed (cash-refund M3, admin-gated terminal reversal H2, granular RBAC enforced via existing permission tables, `lab/testParameters` implemented + dead `doctor/route.ts` resolved).
- **Phase 2 (IPD)** complete: full IPD per decision #4 — tables + backend + nurse route + frontend; OPD loop unaffected.
- **Phase 3 (HR + Admin)** complete: rich HR/Admin backends wired to usable screens + role-aware dashboards + permission-matrix UI.
- **Phase 4 (gap-fill)** complete: patient allergies + drug/allergy checks, appointment scheduling, FBR/PRAL e-invoicing, WhatsApp/SMS notifications, lab depth (accessioning/critical-values/sign-off/QC), pharmacy narcotics register + FEFO.
- **Verification green throughout:** build · tsc 0 · tests · lint 0-errors · extended scenario suite · DB invariants (existing 8 + new IPD invariants: a bed is never double-occupied; every MAR row ties to an active medication order; the inpatient running bill reconciles with posted charges − advances; stock never negative).
- No regressions to the proven stabilization invariants.

## Autonomy & git-checkpoint protocol (reuse from stabilization — it worked)
- Branch `feat/hms-completion` only. **Never** commit to `main`; PRs to `main` at phase boundaries (owner merges, or merges on explicit confirmation). Never force-push. Never touch Supabase. Never edit `.env*`. Never commit `.claude/` or `*.dump`.
- **Every green unit:** verify → commit → **pin account** (`gh auth switch --user bubblu2264326 && git push`) → log in COMPLETION_PROGRESS.md. Push is the checkpoint/safety net.
- **Self-recovery:** on an unrecoverable failure, reset to the last green commit + restore the DB dump, log it, and continue. Ambiguity → smallest reversible change + `TODO(review)` + log; never invent money/clinical policy beyond the decisions above.
- **Never fake a test.** Never weaken an assertion to go green.

## DB safety protocol
- Local `hms` only (Supabase paused/untouched). Restore base = `db/seed/hms-seed-base.sql`.
- Before any schema migration: **dump to `backups/`** (gitignored), apply, run the invariant checker; on failure restore dump + apply `.down` + log + skip. Every migration ships a `.down`.
- New IPD/feature logic that belongs in the DB (e.g. room-rent accrual, bed-occupancy guards) follows the existing trigger/stored-proc pattern, not inlined app code.

## Phases & units
**Phase 1 — Sync + leftovers (module by module).** For each of Reception, Doctor/EMR, Pharmacy, Billing, Lab, HR, Admin: trace each screen → API → tables; fix FE↔BE↔DB mismatches, dead buttons, unhandled loading/empty/error and the new 400/401/403/409 states; close that module's leftover item(s). Extend the scenario suite with that module's key read/write happy-paths. Leftovers: M3 (Pharmacy/Billing), H2 (Billing), RBAC granularity (Admin, wire `staff_permission_policies`), lab stub (Lab).

**Phase 2 — IPD / Nursing (full v1).** Data model (ward/room/bed/admission/bed_transfer/doctor_order/medication_order/medication_administration/nursing_note/intake_output/patient_allergy/ip_advance/ip_charge/ip_final_bill) → migrations → backend (admit/transfer/discharge via `update_and_log_visit_status`; bed occupancy; running-bill accrual via DB trigger/job; advances) → **nurse route** (MAR charting, vitals, nursing notes, I/O) with patient-safety (MAR ties to active order, allergy surfaced, real-actor audit, role-gated) → frontend (bed board, nursing worklist, MAR timeline, admission/discharge, running bill) → IPD scenario tests + new invariants.

**Phase 3 — HR + Admin (wire + UX).** Make the existing rich schema usable: unified staff record, roster planner, leave workflow, payroll UX, credential-expiry alerts, doctor fee-share from billing; admin role-aware dashboards (KPI tiles + drill-down), permission-matrix grid, master-data CRUD, report library, audit visibility. Apply consistent list→detail→edit IA.

**Phase 4 — Gap-fill (prioritized).** Allergies + drug/allergy checks → appointments → FBR/PRAL e-invoicing → WhatsApp/SMS → lab depth → narcotics register + FEFO → corporate-panel split billing + mobile-wallet capture.

## Verification gate (every unit)
`pnpm build` · `npx tsc --noEmit` · `pnpm test` · `pnpm lint` (0 errors) · scenario suite (`PORT=3100 node scripts/scenario-tests/run-with-server.mjs`) · invariant checker. Frontend correctness verified against the running app.

## Guardrails (org + global)
No fabrication; claims trace to code. No external pricing to customers (owner-only). Timezone via `src/lib/timezone/client.ts`; no `SELECT *` in production SQL. Confidential data stays in-stack.
