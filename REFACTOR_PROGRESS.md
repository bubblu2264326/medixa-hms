# Refactor Progress Log

Authoritative running state of the HMS stabilization effort. Newest entries at the bottom of each section. Driven by [REFACTOR_PLAN.md](REFACTOR_PLAN.md).

## Status
- **Branch:** `refactor/hms-stabilization`
- **Current phase:** Phase 0 ✅ done (see `audit/`). **Next: Phase 1 (foundation).**
- **Mode:** autonomous, Git-checkpointed (user away). Commit + push every green unit.

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

## Known issues carried in from the audit (the work queue)
See `audit/README.md` for the full P0/P1/P2 punch-list. Headlines:
- **P0:** unauthenticated data APIs + PII exposure; hardcoded JWT secret fallback; `localhost:3000` self-fetch (deploy-breaker); fake transaction in `pharmacy/purchase/return`; unapplied 2026-03-20 stock-guard migration.
- **Fixed:** `completed` visit-status constraint (migration `2026_06_20_add_completed_to_visit_status_history_check.sql`, applied to local DB).

## Deferred (for the later UI/UX pass — do NOT do now)
- Visual restyle, layout, theming, responsive polish, animations. (Add items here as encountered.)

## Unit log
*(append one entry per committed unit: what changed, why, tests, commit hash)*
- _(none yet — Phase 1 is next)_
