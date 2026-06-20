# Refactor Progress Log

Authoritative running state of the HMS stabilization effort. Newest entries at the bottom of each section. Driven by [REFACTOR_PLAN.md](REFACTOR_PLAN.md).

## Status
- **Branch:** `refactor/hms-stabilization`
- **Current phase:** **Phase 1 (foundation) — IN PROGRESS.**
- **Mode:** autonomous, Git-checkpointed (user away). Commit + push every green unit.
- **Live gate status (after P1·U3):** build ✅ · typecheck ✅ 0 errors · tests ✅ 124/124 · lint ✅ **0 errors** + 54 warnings (warnings = mostly react-hooks/exhaustive-deps + unused vars; non-blocking, deferred).

## Baseline (recorded 2026-06-20, before Phase 1 edits)
| Gate | State |
|---|---|
| Build (`next build`) | ✅ passes |
| Lint (`eslint`) | **9 errors, 226 warnings** in `src/` (was 976/9316 — caused by linting `.next/`; fixed) |
| Typecheck (`tsc --noEmit`) | 3 errors — all in TEST files (`admin/__tests__/auth.test.ts` ×2, `payroll-finalization-immutability.test.ts`) |
| Tests (`vitest run`) | **6 failed / 124** — files: admin/dashboard-page-loading, admin/dashboard-summary-api, doctor/visit-history-api (×2), pharmacy/cashier-api, pharmacy/medicine-search-api |

**Green bar (interpretation — see decision below):** a unit is acceptable if it does **not regress** these baseline counts and the code/tests it touches pass. Lint/typecheck/test full-green are pursued in dedicated units, not required as a precondition for every commit.

## Phase checklist
- [x] **Phase 0** — Discovery (done before this branch; see `audit/project-map.md` + `audit/README.md`).
- [ ] **Phase 1** — Foundation: structure (no behavior change) + RBAC foundation + audit foundation.
- [ ] **Stage A** — Patient/EMR · RBAC/Audit verify · Pharmacy/Inventory · Billing · Lab · Doctor · Queue · HR · Admin.
- [ ] **Stage B** — Integration chains.
- [ ] **Stage C** — Curl scenario assault + DB invariant asserts.
- [ ] **Final** — Closing report.

## Decisions made unattended
*(Per the ambiguity rule — log every non-obvious or behavior-affecting choice made without the user, for later review.)*
- 2026-06-20 — Created branch `refactor/hms-stabilization` from `main`.
- 2026-06-20 — DB restore strategy: committed plain-SQL seed `db/seed/hms-seed-base.sql` (synthetic data, verified `@example.com`) as the base restore point; DB versioning via forward+rollback migrations. Chose plain SQL over the binary `.dump` (reviewable, diffable; binary dumps stay gitignored).
- 2026-06-20 — Baseline commit includes pre-existing (not-by-me) working-tree changes: `database/db.ts` (local/cloud SSL switch — lets it connect to local Postgres w/o SSL), `scripts/introspect-db.mjs` (2 lines), `.gitignore` (added `*.dump`/`backups/`/`.env.supabase`). Reviewed `db.ts` diff — benign. Included so the tree is clean for autonomous work.
- 2026-06-20 — Excluded from commits (as all session): `hms-*.dump` (binary), `.claude/` (settings + other-client brain), `.env*` (secrets).
- 2026-06-20 — **Push reliability gotcha:** the `gh` active account drifted from `bubblu2264326` back to `tools-aidapt`, causing `git push` → "Repository not found" (404 on the private repo). Fix: every push MUST run `gh auth switch --user bubblu2264326` first. Baked into REFACTOR_PLAN.md rule 2. The loop must never push without pinning the account.
- 2026-06-20 — **TODO(review): green-bar reinterpreted.** Baseline is red (9 lint errors, 3 test-file type errors, 6 failing tests) and lint had 976 errors purely from linting `.next/`. Requiring all-green before every commit is impossible without first burning the whole effort on cleanup. Decision: green = **no regression vs the recorded baseline**; lint/typecheck/test are driven to full green in dedicated units. Reversible (process choice). Flagged for user review.
- 2026-06-20 — **ESLint config fix (tooling, behavior-preserving):** `ignores` was bundled with `rules` in one config object, so it was inert and ESLint linted `.next/` build output (967 of 976 errors). Moved `ignores` into its own standalone object + added `coverage/`, `db/seed/`, `database/snapshot/`. Result: 976→9 errors. App runtime unaffected.

## Known issues carried in from the audit (the work queue)
See `audit/README.md` for the full P0/P1/P2 punch-list. Headlines:
- **P0:** unauthenticated data APIs + PII exposure; hardcoded JWT secret fallback; `localhost:3000` self-fetch (deploy-breaker); fake transaction in `pharmacy/purchase/return`; unapplied 2026-03-20 stock-guard migration.
- **Fixed:** `completed` visit-status constraint (migration `2026_06_20_add_completed_to_visit_status_history_check.sql`, applied to local DB).

## Deferred (for the later UI/UX pass — do NOT do now)
- Visual restyle, layout, theming, responsive polish, animations. (Add items here as encountered.)

## Unit log
*(append one entry per committed unit: what changed, why, tests, commit hash)*
- **P1·U1 — tooling: ESLint scope fix.** Moved `ignores` to a standalone flat-config object so it applies globally; added `coverage/`, `db/seed/`, `database/snapshot/`. Lint errors 976→9, warnings 9316→226 (eliminated `.next/` noise). Behavior-preserving (config only). Commit `c8b7440`.
- **P1·U2 — test: green the test + typecheck bar.** Fixed all 6 failing tests + 3 tsc errors. **Root cause: all were STALE TESTS, zero source/product bugs** (Vitest-4 `toMatchObject<T>` generic removed; Next-16 async `params` Promise; under-mocked `getSystemTimezone()` and `paymentSnapshot` queries causing off-by-one mock ordering; calendar-drifted hardcoded fixtures). 7 test files changed, 0 source files; no assertions weakened (verified: 4 assertion lines changed, all legit; net assertion count unchanged). Now: **`tsc --noEmit` 0 errors, `vitest` 124/124 pass.** Lesson: test suite had rotted — fixtures should not hardcode dates relative to "today", and route dependencies like `getSystemTimezone()` must be stubbed. Commit `faf70e7`.
- **P1·U3 — lint: green the lint bar (9→0 errors).** Ignored generated TypeDoc output (`docs/**`, was 2 `no-this-alias`). Fixed 7 real source errors, all behavior-preserving: added `.displayName` to 4 `forwardRef` components (product-entry inputs), escaped `'` in `lab/layout.tsx`, nested `{children}` instead of `children=` prop in `pharmacy/layout.tsx`, `useState<Boolean>`→`<boolean>` in `useLaborders.ts`. Verified: build ✅, tests ✅ 124/124, lint 0 errors (warnings 226→54). Commit: _(below)_.
