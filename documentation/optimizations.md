# Optimization & Technical Debt

What's worth tightening, with concrete pointers. Ordered roughly by risk/value.

## Security & auth

- **Plaintext password rows persist** for unrotated legacy accounts (`doctor`, `staff`). Auto-upgrade kicks in only on successful login; force a rotation cycle for accounts that haven't logged in since the scrypt migration.
- **`getCurrentStaffId()` is hardcoded** in [`src/lib/utils.ts:28`](../src/lib/utils.ts#L28) returning `1`. Audit every caller — the JWT-derived id from `src/lib/server/auth.ts` should be used.
- **Unconditional `secure: true` cookie** complicates non-HTTPS local environments. Branch on env or strip when host is `localhost`.
- **`fallback secret`** in `src/middleware.ts` (`"hms_super_secure_2026_clinic_key"`). Fine for boot, but make sure prod always has `process.env.secret_key` set; consider failing loud at startup if missing.

## Database integrity

- **Direct `UPDATE visit SET status = ...`** still exists in some route handlers. They skip `visit_status_history`. Migrate all callers to the `update_and_log_visit_status(…)` procedure (or its server helper).
- **Three overloads of `get_clinic_number(...)`** exist; the `()` and `(p_patient_id integer)` versions ignore the argument. Migrate callers to `get_clinic_number(p_visit_type text)` and drop the legacy overloads.
- **Mixed timestamp types** — some tables are `timestamptz`, others still `timestamp without time zone`. The 2026-03-25 migration covered attendance; complete the sweep for the remaining clinical tables.
- **No transaction helper** — multi-statement writes go through `pool.connect()` + manual `BEGIN`/`COMMIT`. A thin wrapper in `database/db.ts` would reduce risk of forgotten rollbacks on failure paths.

## Route handler patterns

- **Inline SQL in route handlers** drifts from schema. Push domain logic into `src/lib/server/<domain>.ts` and keep handlers thin (parse → call helper → respond).
- **No shared error response shape.** Routes return mixed structures (`{ error }`, `{ message }`, strings). Define one helper and use it everywhere.
- **Input validation is partial** — some routes parse with zod, others trust the body. Add zod schemas to the rest, especially anywhere a route writes to the DB.

## Frontend

- **Two toast libraries** in `package.json` (`react-hot-toast`, `sonner`). Pick one (`sonner` is the more recent and better-styled) and migrate.
- **Date formatting drift** is enforced by ESLint, but pre-existing call sites should still be swept (the rule is `warn`, not `error`).
- **Reused DB-shape types are duplicated** across feature modules. Extract a `types/db.ts` from the introspection or define hand-written shapes in `src/lib/types.ts`.
- **UI maturity differs** across modules. Doctor and lab workspaces should adopt the patterns from pharmacy and admin v2 (sidebar grouping, list/detail panes, consistent action-button placement).
- **`react.StrictMode` is disabled** in `next.config.ts`. Re-enable once double-mount-safe SSE subscription and form bookkeeping is verified.

## Observability

- **Audit gaps** — login success/failure events are partially logged but not full coverage. See [next_steps.md](./next_steps.md) for the audit TODO list.
- **No structured logging on the server side** — `console.log` / `console.error` only. A structured logger (pino, or even console with JSON) would unblock downstream log analysis.
- **No metrics** — no `/health`, no request timings, no DB-pool stats.
- **No external error reporting** — Sentry / Bugsnag / etc. not wired up.

## DX

- **`docs/`** is committed (TypeDoc-generated HTML). Either gitignore it or auto-build in CI.
- **`backup.dump`** (164 KB), **`pg4.dbm`**, **`pg_modeler_hms.dbm`**, **`debug-output.css`** at the repo root are unused artifacts. Likely safe to remove but kept by user preference.
- **`database/schema.prisma`** is unused. Either remove or rewrite (drop is preferred to avoid confusion).
- **`scripts/`** is a single one-shot file; future scripts can join it.

## Tests

- **Vitest coverage is uneven.** Strong in `src/features/admin/__tests__/*`; weak elsewhere. Add tests for:
  - the pharmacy trigger chain integrity (insert detail → assert journal + batch updated)
  - visit-status transitions through the procedure vs direct UPDATEs
  - role-based middleware redirects
  - login lockout + auto-upgrade behavior

## Build & CI

- **No CI pipeline visible** in the repo. Add at minimum lint + test on every push, build on PR.
- **`postcss.config.mjs`** and Tailwind 4 setup work but aren't documented.
- **Turbopack builds** are fast but consider adding a stable `next build` fallback in CI in case of Turbopack-only regressions.

## Cleanup tasks (low-risk, high-signal)

- Delete or gitignore `docs/` HTML output
- Decide on `backup.dump`, `pg4.dbm`, `pg_modeler_hms.dbm`, `debug-output.css`, `database/schema.prisma`
- Consolidate `findings.md` / `task_plan.md` / `progress.md` (root) — these are working notes not core docs
- Remove the unused Prisma file or wire it up to a generator pipeline (don't leave it as decoration)
