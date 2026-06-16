# Next Steps

Priorities derived from the current state of the codebase and live DB (verified 2026-05-23).

## Priority 1 — correctness & safety

- **Standardize visit-status updates** through `update_and_log_visit_status(…)` (procedure) across every route that mutates `visit.status`. Status changes that skip the procedure silently desync `visit_status_history`.
- **Eliminate `getCurrentStaffId()` placeholder** ([`src/lib/utils.ts:28`](../src/lib/utils.ts#L28)). Replace every caller with JWT-derived staff id from `src/lib/server/auth.ts`.
- **Force scrypt rotation** for any `staff` / `doctor` row still on plaintext after the auto-upgrade window. Optional: add a periodic check that flags those rows in admin.
- **Drop the legacy `get_clinic_number()` and `get_clinic_number(p_patient_id integer)` overloads** after migrating callers to the `(p_visit_type)` overload.

## Priority 2 — audit coverage

Already implemented (in `audit_logs`):
- Staff profile created
- Staff permissions updated
- Attendance check-in / check-out / adjustment
- Cashier shift open/close, draft created, payment settled/reversed
- Update Setting

Cashier event stream (`cashier_audit_event`):
- `draft_created`, `draft_cancelled`, `draft_applied`, `settle_success`, `reversal_success`, `correction_success`

Still missing — add via `src/lib/server/audit.ts`:

- Auth events: login success / logout / session-expired with actor, role, IP, UA; failed login attempts; lockout reached
- Account events: role changes, account activate/deactivate, password reset
- Inventory mutations: stock adjustment, stock transfer, purchase GRN/finalization, low-stock threshold changes
- POS mutations: sale create/finalize, return create/finalize, hold/resume/cancel, receipt reprint
- Patient/visit lifecycle: visit create, status transition (in addition to the history table), doctor assignment change
- Clinical actions: prescription created/edited, lab order created/updated, report verified/approved
- Configuration/security: module permission matrix changes, system settings changes (before/after snapshot), auth-secret rotation

Retention + performance:
- Confirm indexes exist: `audit_logs(created_at)`, `audit_logs(staff_id, created_at)`
- Decide archival strategy beyond `cleanup_old_audit_logs(p_days)`
- Consider async write path once traffic grows

## Priority 3 — workforce roadmap

### Phase A — admin module completion (current)

- Finish Staff Management edit/view, status, credentials touchpoints
- Finish Roster tab as the duty-planning baseline (templates, assignment, coverage view)
- Finish Leave lifecycle (request, approve/reject, balances, audit)
- Unify doctors and staff as `employees` wherever applicable

### Phase B — attendance + roster enforcement

- Derive attendance from `staff_roster_assignments` + global attendance policy
- Mark `unscheduled` when no roster row exists for the date
- Keep admin manual override with full audit logging and actor/source tagging

### Phase C — payroll engine (full scope)

- Salary structures, allowances, deductions, overtime linkage
- Monthly payroll processing with payout status tracking
- Payroll reports and employee-wise salary ledger
- Restrict payroll mutations to admin-authorized roles

### Phase D — employee records UX

- Surface core employee records inside admin staff edit/view
- Launch dedicated employee portal pages with working hours, attendance summary, roster, leave history, salary slips, payroll history

## Priority 4 — frontend polish

- Consolidate to one toast library (`sonner` preferred over `react-hot-toast`)
- Normalize doctor and lab layouts toward the admin v2 / pharmacy patterns
- Extract repeated workspace-shell patterns into shared components
- Reduce per-feature type duplication of DB shapes
- Sweep remaining `Date.toLocale*` call sites despite the ESLint warning (rule is `warn`, not `error`)
- Re-enable `reactStrictMode` once double-mount-safe SSE + form bookkeeping is verified

## Priority 5 — infrastructure

- Add a CI pipeline: lint + test on every push, build on PR
- Add structured server-side logging (pino or JSON-on-console)
- Add `/api/healthz` for uptime checks with DB-pool ping
- Add external error reporting (Sentry / Bugsnag)
- Wire `cleanup_old_audit_logs(p_days)` to a real scheduler (Supabase cron / Vercel cron)
- Gitignore `docs/` output or build it in CI instead of committing it
- Decide on artifact cleanup: `backup.dump`, `pg4.dbm`, `pg_modeler_hms.dbm`, `debug-output.css`, `database/schema.prisma`

## Source-of-truth policy

- Supabase remains the only source of truth for all clinical, pharmacy, attendance, roster, leave, and payroll data.
- Local SQL files (`backup.dump`, `database/migrations/*.sql`) are reference / migration artifacts, not the spec.
- New endpoints and UI reads must resolve against live Supabase schema — refresh `database/snapshot/` before relying on the markdown docs.

## API & interface targets (in flight)

### Admin
- `GET/POST/PATCH /api/admin/staff/*` — directory + lifecycle actions
- `GET/POST /api/admin/staff/v2/roster*` — shift templates + assignments
- `GET/POST/PATCH /api/admin/staff/v2/leave*` — requests + decisions
- `GET/POST/PATCH /api/admin/payroll/*` — payroll engine

### Employee
- `GET /api/employee/me/profile`
- `GET /api/employee/me/attendance`
- `GET /api/employee/me/roster`
- `GET /api/employee/me/leave`
- `GET /api/employee/me/payroll`

## Delivery order

1. Standardize visit-status writes through the procedure
2. Eliminate `getCurrentStaffId()` placeholder
3. Audit coverage Priority 2 list
4. Roster + leave completion (Phase A workforce)
5. Attendance-policy alignment (Phase B)
6. Payroll engine rollout (Phase C)
7. Employee portal rollout (Phase D)
8. Frontend consolidation pass
9. CI + observability
