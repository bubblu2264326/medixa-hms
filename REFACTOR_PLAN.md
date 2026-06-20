# HMS Refactor & Stabilization Plan (autonomous, Git-checkpointed)

> Source of truth for the stabilization effort. **Re-read the relevant section at the start of each phase/module** rather than relying on memory. Driven by a short `/goal` condition. UI/UX polish is **DEFERRED** — frontend work now is *correctness only*.

## Project facts (detected — Next.js monolith, not the generic template)
- **Repo:** `E:\Personal\hms_vercel_main` · **Branch:** `refactor/hms-stabilization`
- **Stack:** Next.js 16 App Router + React 19 + TypeScript + Tailwind 4. **There is NO separate backend** — "backend" = API route handlers under `src/app/api/**` + domain helpers in `src/lib/server/**`, using **raw SQL via `pg`** (no ORM). So "mirror module boundaries across backend and frontend" = align `src/app/api/<domain>` ↔ `src/features/<role>` ↔ `src/lib/server/<domain>`.
- **DB:** PostgreSQL. **Use the LOCAL dev DB only** (`localhost:5432/hms`, seed/synthetic data). **Supabase is paused — never touch it during the run.**
- **Tests:** Vitest (jsdom), colocated `__tests__/`. DB tests currently **stub the pool** → no integration runner yet (Stage C must stand up a real test DB).

## Autonomous operating rules (user is AWAY — cannot approve gates)
1. **Dedicated branch only.** Never commit to `main`. Never force-push. Never touch Supabase.
2. **Checkpoint cadence:** after every green unit (a phase, or one module within a stage) → build + typecheck + lint + tests, then **commit and push**. Each unit = one independent, reviewable commit. **Push command (MUST pin the account — `gh` active account can drift to `tools-aidapt` and 404 this PRIVATE repo):** `gh auth switch --user bubblu2264326 && git push`. Author identity for this repo is `bubblu2264326 <k224291@nu.edu.pk>` (set via `git config user.*`).
3. **Structural ≠ behavioral.** Never mix a move/rename with a logic change in one commit.
4. **Ambiguity rule (replaces "ask the human"):** if intended behavior is unclear, make the **smallest reversible change**, mark it `TODO(review)` in code, log it under "Decisions made unattended" in `REFACTOR_PROGRESS.md`, and continue. **Never** make an irreversible choice unattended.
5. **Forbidden unattended:** dropping/altering columns that lose data, deleting tables/rows, force-push, editing `.env*`, committing secrets or the binary `.dump`, anything touching production/Supabase.
6. **Never fake a test.** A surfaced red test > a faked green one. If a test legitimately can't pass, mark it `.skip` with a `TODO(review)` and log why.
7. **Keep `REFACTOR_PROGRESS.md` current** every unit.

## Failure & self-recovery protocol
- **Code:** if build/test goes red and can't be fixed in **2 attempts**, `git reset --hard` to the last green commit (last push), log the failure + repro in `REFACTOR_PROGRESS.md`, and **continue with the next independent unit**. Halt the whole run only if a *foundation* (Phase 1, RBAC, audit, DB connectivity) is broken and unrecoverable.
- **DB restore points (on GitHub):**
  - `db/seed/hms-seed-base.sql` = the known-good base (plain SQL, committed).
  - Every schema change is a **forward migration + matching rollback** in `database/migrations/` (committed = versioned on GitHub).
  - **Restore = reload `db/seed/hms-seed-base.sql`, then replay migrations up to the target commit.**
  - **Before each migration:** take a local dump to `backups/` (gitignored) for fast local rollback; apply; run the DB consistency tests; on failure → restore the dump + run the rollback migration + log + skip that schema change.
- **Resumability:** because every unit is pushed, if the process dies, the next run resumes from the last pushed commit + this plan + `REFACTOR_PROGRESS.md`.

## Phase 0 — Discovery (DONE ✅)
Already completed and committed under `audit/`:
- [audit/project-map.md](audit/project-map.md) — full system map (frontend/api/db/platform).
- [audit/README.md](audit/README.md) — consolidated, prioritized punch-list (P0/P1/P2).
- [audit/coding-audit.md], [business-logic-audit.md], [integration-audit.md] — detailed findings (several DB-verified).
**Do not redo Phase 0.** Start from these. (One P0 already fixed: `completed` status constraint, migration `2026_06_20_*`.)

## Phase 1 — Foundation (behavior-preserving + cross-cutting)
- **Structure (no behavior change):** make `src/app/api/<domain>` ↔ `src/lib/server/<domain>` ↔ `src/features/<role>` consistent; standardize naming/imports; remove dead code (the audit lists stubs/commented blocks); single shared eslint/prettier/tsconfig strictness. Done when build+typecheck+lint pass and the app runs unchanged. Commit.
- **RBAC foundation:** fix the audit's confirmed gaps — **add auth to the unauthenticated data routes** (`/api/patient*`, `/api/prescription`, `/api/visit*`, `/api/queue`, `/api/medicine`), and **unify role normalization** (one `normalizeRole`, used by middleware AND `auth.ts`/`doctor.ts`/`cashier.ts`). Roles: super_admin, admin, doctor, pharmacist, lab_technician, cashier, receptionist (+ employee self-service). Also kill the **hardcoded JWT secret fallback** (fail-fast if `secret_key` unset).
- **Audit foundation:** one mechanism (`src/lib/server/audit.ts`) used uniformly for sensitive actions; sensitive = clinical record changes, money movements, stock adjustments, permission changes. Replace `getCurrentStaffId()=1` with the authenticated actor.

## Stage A — Module-by-module stabilization
For EACH module: (1) DB integrity (constraints/indexes/transactions) → (2) backend (validate every endpoint [zod], enforce RBAC, audit sensitive actions, transactions for multi-table writes, consistent errors/response shapes; **fix the `localhost:3000` self-fetch** in prescription/lab → direct SQL) → (3) frontend correctness wiring (real data, RBAC hide/disable, loading/empty/error — NO polish) → (4) tests (unit + integration + curl smoke). Build+test+commit per module. Every bug fix ships with a test that would have caught it.
**Order** (foundation + high-risk first): Patient/EMR → RBAC/Audit verification → **Pharmacy/Inventory** → Billing/Cashier → Laboratory → Doctor workspace → Queue → HR → Admin. Adjust per audit.
- **Pharmacy (highest risk):** CHECK `stock_quantity >= 0`, non-negative prices, FKs on detail tables; a sale = ONE atomic txn (detail rows → trigger chain → stock) with row locks so concurrent last-unit sales can't oversell; batch/expiry enforced; refund/void restore stock atomically. **Fix the fake transaction in `pharmacy/purchase/return`** (real client, not pooled `query()`). Evaluate applying the unapplied 2026-03-20 stock-guard migration here (with reconciliation) — it's deferred until this module.
- **Billing/Cashier:** FKs invoice↔lines↔patient/visit; non-negative amounts; invoice total = Σ lines; payments/refunds transactional + audited; idempotent payment endpoints; reversal must also revert the visit status it set; recompute `bill.payment_status` from ledger (never hard-code), lock the bill on append.
- **Lab:** results require a valid order; constrained state transitions. **Doctor:** orders/prescriptions go through the same validated transactional paths as pharmacy/lab. **Queue:** explicit state machine, legal transitions only, SSE mirrors DB. **Patient/EMR:** unique identifier, no orphans, transactional + audited. **HR:** one attendance/day, conservative payroll. **Admin:** role changes audited, safe deletes.

## Stage B — Integration & cross-module chains
Harden the seams; per chain define invariants + integration tests, and unify divergent code paths into one:
- **Visit lifecycle:** register → queue → consult → orders → billing → complete/close (state consistent at every hop; route ALL status writes through `update_and_log_visit_status` — fix the `/api/visit` PATCH bypass).
- **Pharmacy sale chain:** inventory + billing + audit update atomically.
- **Lab chain:** order → result → billing (bill only ordered work).
- **Reversals:** cancel/refund invoice restores stock + reverses ledger; void propagates.
- **HR chain:** attendance → payroll figures consistent.

## Stage C — Scenario & consistency assault (curl-driven)
Stand up a **real test DB** first. Build a data-driven curl suite under `scripts/scenario-tests/` that hammers the API, then **queries the DB to assert invariants after each batch**:
- Happy paths (all modules); edges (boundary/empty/oversized input, missing/expired auth, **wrong-role RBAC negatives**, duplicates, out-of-order); concurrency (parallel last-unit sells → no oversell/negative; concurrent billing; simultaneous edits); cross-module integrity.
- **Invariants:** stock ≥ 0; every invoice reconciles with lines/ledger; no orphans; an audit row per sensitive action; legal queue/lab states.
- Failure report with exact repro → fix → re-run until green. Commit the runnable suite.

## Test approach (all stages)
Bottom-up: unit (services/validation/business rules) → integration (endpoints vs a real **test** DB) → e2e for Stage B flows. Prioritize: pharmacy concurrency, billing, RBAC negatives, audit completeness, queue transitions. Report coverage per module; meaningful critical-path coverage over a vanity %.

## Skills/subagents
Project agents already exist (`.claude/agents/`: gtm-*). Add for this effort: a **test-author**, a **code-reviewer**, and a **db-consistency-checker** agent aware of the high-risk modules; record conventions in `CLAUDE.md`. **Any EXTERNAL skill/agent/plugin must be listed (source/license/purpose) and logged for review before integ: do NOT silently wire in internet code** (patient-data supply-chain risk).

## Final
Closing report: per-phase changes, resulting structure, coverage per module, scenario results, **known remaining issues**, next steps (incl. the deferred UI/UX pass). Keep `REFACTOR_PROGRESS.md` the authoritative state.
