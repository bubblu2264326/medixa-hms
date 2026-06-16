# Implementation Memory

Decisions and patterns worth retaining — the *why* behind the code that future readers shouldn't have to reverse-engineer.

## Architecture decisions

### Database-first for inventory
Stock math runs in a trigger chain (`medicine_*_detail` → `medicine_transaction` → `medicine_batch`) so that any caller — POS, purchase intake, returns, admin adjustments — gets identical, atomic behavior. Direct writes to `medicine_batch.stock_quantity` are forbidden in practice; they bypass the journal and desync.

### Visit status via stored procedure
`update_and_log_visit_status(…)` updates `visit.status` and inserts into `visit_status_history` in one transaction. Any handler that writes the status directly creates a history gap. Some legacy routes still do this and need to migrate.

### Sub-unit math
Medicines have `sub_units_per_unit` (e.g. 10 tablets per strip). `fn_tg_stockquantity_generic()` normalizes whole-unit and sub-unit movement into a single sub-unit delta before updating `medicine_batch`. This is why `medicine_batch` has both `stock_quantity` and `stock_sub_quantity`: the trigger keeps them coherent via `(total_sub_units / sub_units_per_unit, total_sub_units % sub_units_per_unit)`.

### Policy-snapshotted attendance
Each `staff_attendance` / `doctor_attendance` row stores `policy_snapshot` jsonb at insert time (timezone, grace, half-day threshold, overtime threshold, early-leave threshold). Retroactive policy changes don't rewrite history. Derivation fields (`derived_status`, `is_unscheduled`, `is_on_time`) are computed at write time against the active roster.

### Queue via SSE
Queue used to be polled. Moved to Server-Sent Events at `/api/queue/events` in commit `e8839ba` (2026-03-21) for sub-second updates, with a 45-second polling fallback in case the stream drops. The fallback interval is in `src/lib/server/queueConfig.ts`.

### scrypt passwords with legacy auto-upgrade
Newer accounts use `scrypt$salt$hash` in `staff.password` / `doctor.password`. Older accounts are still plaintext (`password123`-style). On successful plaintext login, the server re-hashes and overwrites the row, so accounts auto-upgrade as users log in.

### Session invalidation via `session_version`
Forced logout works two ways: per-session via `revoked_at`/`revoked_reason` in `*_security_sessions`, and global via bumping `session_version` on `staff` / `doctor`. The server-side auth helper compares both on each request.

### Timezone enforcement via ESLint
The system has a configurable global timezone in `system_settings` (default `Asia/Karachi`). Native `Date.toLocale*` formatting silently uses the runtime locale, so ESLint warns against them and pushes callers to `src/lib/timezone/client.ts` helpers. The hook `useSystemTimezone()` keeps client UI consistent.

## Patterns

### `src/lib/server/<domain>.ts` for domain logic
Route handlers stay thin: parse input → call domain helper → return JSON. Inline SQL is acceptable for trivial reads only. This is where transaction boundaries, audit calls, and complex queries live.

### Idempotency keys for cashier writes
`cashier_idempotency` stores request keys so retried settlement calls don't double-charge. New cashier writes should pass the idempotency key through this table.

### `@/` alias resolves to repo root
Imports look like `@/src/lib/server/auth`, `@/database/db`, `@/contexts/PatientIdContext`. Not `@/auth`, not relative-only. See `tsconfig.json:paths`.

### Append-only journals
`medicine_transaction`, `visit_status_history`, `audit_logs`, `cashier_audit_event`, `pos_audit_log`, `staff_permission_audit`, `employee_credential_events`, `employee_lifecycle_events` — all append-only. Reconstruction (e.g. stock from txns) and audit are first-class.

## Modules shipped (high-level)

- Reception, doctor, lab, pharmacy POS, cashier settlement
- Workforce v2: staff directory, RBAC v2, attendance v2 with policy snapshots, roster, leave (with role × employee quotas), payroll, credentialing, document store, employee lifecycle
- Employee self-service portal
- Multi-stream audit (`audit_logs` + domain-specific streams)
- Admin cash ledger view union (cashier + pharmacy)

## What we deliberately don't have (yet)

- No ORM. Raw SQL only.
- No background workers / scheduler. `cleanup_old_audit_logs(p_days)` exists but isn't on a timer.
- No global state library — React contexts only for cross-panel state.
- No GraphQL / tRPC — REST-ish route handlers.
- No offline / service worker.
- No internationalization (English-only).

## Things to read before changing related code

| Touching… | Read first |
|---|---|
| Inventory write paths | [`/database/snapshot/routines.md`](../database/snapshot/routines.md) — trigger bodies |
| Visit status changes | `src/lib/server/visitLifecycle.ts` + the procedure body |
| Login flow | `src/lib/server/auth.ts`, `src/lib/server/password.ts` |
| Cashier settlement | `src/lib/server/cashier.ts` + `cashier_*` table samples |
| Attendance | `src/lib/server/attendance.ts` + `policy_snapshot` sample rows |
| Timezone | `src/lib/timezone/client.ts` + `system_settings` row for timezone |
| Adding a role-gated route | `src/middleware.ts` matcher + per-prefix role check |

## Open notes / conventions to formalize

- Standard error response shape (currently mixed)
- Whether `react-hot-toast` or `sonner` is the single notification library going forward
- Whether to keep `database/schema.prisma` (currently unused)
- CI policy: lint + test on every push
