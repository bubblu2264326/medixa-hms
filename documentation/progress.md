# Progress

## Shipped (verified against live DB + code as of 2026-05-23)

### Clinical operations
- [x] Reception — patient registration, search, queue entry, vitals, OB/GYN forms
- [x] Doctor — queue review, patient details, encounter notes, prescription + lab ordering, past visits, self-attendance
- [x] Lab — order pick-up, parameter-based result entry with reference ranges, approvals scaffold
- [x] Visit lifecycle — status transitions through `update_and_log_visit_status(…)` procedure with append-only `visit_status_history`

### Pharmacy
- [x] Batch-aware POS with sub-unit support
- [x] OTC sales (visit-nullable) + prescription-linked sales
- [x] Purchases (vendor + batch creation) and purchase returns
- [x] Sale returns
- [x] Held transactions (parked carts)
- [x] Receipt config + print
- [x] POS audit log (`pos_audit_log`)
- [x] Inventory trigger chain enforcing stock math in DB
- [x] Views: `v_medicine_pos`, `v_low_stock_medicines`, `v_daily_sales_summary`

### Cashier settlement
- [x] Shift open/close (`cashier_shift`)
- [x] Settlement drafts → settle/reverse/correct
- [x] Multi-allocation payment txns (`cashier_payment_txn` + `cashier_payment_allocation`)
- [x] Idempotency keys (`cashier_idempotency`)
- [x] Cashier audit event stream
- [x] Admin cash ledger view (`admin_cash_collected_ledger_v1`)

### Auth & security
- [x] JWT cookie auth with role-gated middleware
- [x] scrypt password hashing with legacy plaintext auto-upgrade
- [x] Lockout protection (failed attempts + `account_locked_until`)
- [x] Session tracking (`staff_security_sessions`, `doctor_security_sessions`) with `revoked_at`/`revoked_reason` and `session_version`
- [x] Admin security controls API (`/api/admin/staff/security`)
- [x] Password reset flow (`POST /api/login/reset`)

### Real-time
- [x] Queue updates over Server-Sent Events with 45 s polling fallback (`/api/queue/events`)

### Admin (Phase A + workforce v2)
- [x] Grouped sidebar (staff / operations / financials / system)
- [x] Staff directory v2 with extended HR profile
- [x] RBAC v2: roles, role assignments, permission policies (84 active), permission audit (84)
- [x] Attendance v2 with `policy_snapshot` jsonb, roster-aware derivation
- [x] Roster (shift templates + 1,332 assignment rows)
- [x] Leave (types, role quotas, employee overrides, requests, approvals, balances)
- [x] Payroll (compensation profiles, payroll runs, line items)
- [x] Credentialing (4 credential types, expiry windows)
- [x] Document store (4 document types, versioning, reviews)
- [x] Employee lifecycle templates (`ONBOARD_STD`, `OFFBOARD_STD`) + 6 default tasks
- [x] Expense ledger + asset purchases
- [x] Audit-log viewer (with `cashier_audit_event` fallback)
- [x] System settings including global timezone

### Employee self-service
- [x] Personal profile, attendance, roster, leave, payroll endpoints
- [x] Workspace pages under `/employee`

### Infrastructure
- [x] Timezone helpers and ESLint enforcement against native `Date.toLocale*`
- [x] Audit retention helper (`cleanup_old_audit_logs(p_days)`)
- [x] DB snapshot script (`scripts/introspect-db.mjs`)

## In progress

- Bringing remaining route handlers onto `update_and_log_visit_status(…)` instead of direct `visit.status` UPDATEs
- Replacing `getCurrentStaffId()` hardcoded placeholder in `src/lib/utils.ts` with JWT-derived staff id throughout
- Audit-event coverage for the remaining flows (see [next_steps.md](./next_steps.md))
- Consolidating the two toast libraries (`react-hot-toast` + `sonner`)

## Audit baselines

### 2026-05-23 (snapshot-based)
- 93 tables, 4 views, 14 functions + 1 procedure, 17 triggers, 0 custom enums
- Live DB introspection committed to [`/database/snapshot/`](../database/snapshot/) and regenerable via `node --env-file=.env.local scripts/introspect-db.mjs`
- Recent module additions since the previous baseline: workforce & finance, employee lifecycle, credentialing, document store, cashier settlement, leave management, RBAC v2, attendance v2 with policy snapshots

### 2026-03-25 (commit `1af3589`)
- Roster tab fix
- Employee management additions: analytics, credentialing, documents
- System-wide timezone migration (`2026_03_25_global_system_timezone.sql`)
- Attendance `timestamptz` phase 2 (`2026_03_25_attendance_timestamptz_phase2.sql`)

### 2026-03-23 (commits `e59a4e6`, `40152b5`)
- Purchase orders complete
- Doctor & reception modules complete
- Admin & cashier in progress
- Queue still pending (later moved to SSE in `e8839ba` on 2026-03-21)

### 2026-03-14 (legacy entry)
- Previous baseline recorded 38 tables, 11 function signatures, 6 triggers, 3 views. Superseded.
