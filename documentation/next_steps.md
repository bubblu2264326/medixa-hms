# Next Steps

## Priority 1

- harden authentication and password storage
- remove placeholder staff identity logic from purchase/POS routes
- standardize visit status updates through the stored procedure

## Priority 2

- finish documentation-driven cleanup of API routes that drift from live schema
- add tests around pharmacy sale, purchase, and return trigger flows
- improve lab result verification and approval workflow coverage

## Priority 3

- unify UI shell patterns across doctor, lab, receptionist, and pharmacy
- improve party/ledger modules and complete placeholders in pharmacy layout

## March 24, 2026

- Group Admin Module Sidebar Tabs: Organize the sidebar into logical sections.
  - Staff Management & Management
  - Inventory (Pharmacy) & Operations
  - Financials & Insights
  - Dashboard (Direct/Overview)
- Complete implementation of the grouped navigation layout in the Admin Sidebar.

## Staff Management Rollout Progress (March 24, 2026)

- Implemented **Phase 0 foundation hardening**:
  - Password hashing with scrypt and legacy password auto-upgrade on successful login.
  - Staff account status checks (`employment_status`) during login.
  - Login lockout protections with failed-attempt tracking and temporary lock.
  - Session tracking table (`staff_security_sessions`) with revoke support.
  - Admin security controls API:
    - `GET/POST /api/admin/staff/security` for lock/unlock, force logout, password reset, reset-token issue.
  - Password reset flow endpoint:
    - `POST /api/login/reset`.
  - Session validation in server auth (`session_version` + revoked session checks).

- Implemented **Phase 1/2 schema scaffolding** via migration:
  - Expanded staff directory profile columns.
  - New RBAC v2 structures (`staff_roles`, `staff_role_assignments`, `staff_permission_policies`, `staff_permission_audit`).
  - Attendance v2 and workflow foundations (`attendance_regularization_requests`, shift templates, roster assignments, leave tables).
  - Added baseline indexes and audit log cleanup function (`cleanup_old_audit_logs`).

- Implemented **versioned Staff v2 APIs**:
  - `GET/POST /api/admin/staff/v2/directory`
  - `GET/PUT /api/admin/staff/v2/permissions`
  - `GET/POST /api/admin/staff/v2/roster`
  - `GET/POST /api/admin/staff/v2/leave`
  - `GET/PATCH /api/admin/staff/v2/approvals`
  - `GET/POST /api/admin/staff/v2/attendance-corrections`

- Added Staff Management tab routes in Admin:
  - `/admin/staff` (seed module)
  - `/admin/staff/access`
  - `/admin/staff/security`
  - `/admin/roster`
  - `/admin/leave`
  - `/admin/approvals`
  - `/admin/credentialing`
  - `/admin/lifecycle`
  - `/admin/documents`
  - `/admin/analytics`

## Audit Logging Status (March 24, 2026)

- Implemented centralized audit helper: `src/lib/server/audit.ts`.
- `/admin/audit` reads from `audit_logs`; if empty, it falls back to `cashier_audit_event`.
- Existing audited actions in `audit_logs`:
  - Staff profile created
  - Staff permissions updated
  - Attendance check-in marked
  - Attendance check-out marked
  - Attendance adjusted manually
  - Cashier shift opened
  - Cashier shift closed
  - Cashier draft created
  - Cashier payment settled
  - Cashier payment reversed
  - Update Setting
- Existing audited cashier stream events (`cashier_audit_event`):
  - `draft_created`
  - `draft_cancelled`
  - `draft_applied`
  - `settle_success`
  - `reversal_success`
  - `correction_success`

## Audit Logging TODO (High Value)

- Add login success/logout/session-expired events with actor, role, IP, and user-agent.
- Add failed login attempts and lockout-related events.
- Add role changes and account status changes (activate/deactivate/reset password).
- Add inventory mutation events:
  - stock adjustment
  - stock transfer
  - purchase GRN/finalization
  - low-stock threshold changes
- Add pharmacy POS mutation events:
  - sale create/finalize
  - return create/finalize
  - hold/resume/cancel
  - receipt reprint
- Add patient/visit lifecycle events:
  - visit create
  - status transition
  - doctor assignment change
  - soft-delete/restore
- Add clinical action events:
  - prescription created/edited
  - lab order created/updated
  - report verification/approval
- Add configuration/security events:
  - module permission matrix changes
  - system settings changes with before/after snapshots
  - auth secret rotation/config updates
- Add retention + performance controls:
  - indexes for `audit_logs(created_at)` and `(staff_id, created_at)`
  - archival strategy for old audit rows
  - optional async write path when traffic increases

## Workforce Roadmap (Approved - March 24, 2026)

### Phase A - Admin Module Completion (Immediate)

- Complete Staff Management tab workflows (directory, edit, status, and credentials touchpoints).
- Complete Roster tab as the shift and duty planning baseline (templates, assignment, coverage view).
- Complete Leave tab lifecycle (request, approve/reject, balances, and audit trail).
- Ensure doctors and staff are handled uniformly as employees wherever applicable.

### Phase B - Attendance + Roster Enforcement

- Attendance derivation must use roster assignment plus global attendance policy settings.
- Mark attendance as `unscheduled` if no roster assignment exists for the selected date.
- Keep admin manual override available with full audit logging and actor/source tagging.

### Phase C - Payroll Engine (Full Scope)

- Build payroll domain end-to-end: salary structures, allowances, deductions, overtime linkage, monthly payroll processing, and payout status.
- Add payroll reports and employee-wise salary ledger tracking.
- Keep payroll mutation actions restricted to admin-authorized roles.

### Phase D - Employee Records UX (Both, Phased)

- Step 1: expose core employee records in admin employee edit/view surfaces.
- Step 2: launch dedicated employee portal pages for each employee to view:
  - working hours
  - attendance summary
  - roster and shift details
  - leave history
  - salary slips and payroll history

### Source of Truth and Data Policy

- Supabase is the only source of truth for all staff, attendance, roster, leave, and payroll data.
- Local/mock/outdated database records must not drive business workflows.
- New endpoints and UI reads must resolve against live Supabase schema.

### API and Interface Targets

- Admin:
  - `GET/POST/PATCH /api/admin/staff/*` for staff directory and lifecycle actions.
  - `GET/POST /api/admin/staff/v2/roster*` for shift templates and assignments.
  - `GET/POST/PATCH /api/admin/staff/v2/leave*` for leave requests and decisions.
  - `GET/POST/PATCH /api/admin/payroll/*` for payroll engine operations.
- Employee:
  - `GET /api/employee/me/profile`
  - `GET /api/employee/me/attendance`
  - `GET /api/employee/me/roster`
  - `GET /api/employee/me/leave`
  - `GET /api/employee/me/payroll`

### Delivery Order

1. Staff Management hardening.
2. Roster and Leave completion.
3. Attendance-policy and status-derivation alignment.
4. Payroll engine rollout.
5. Employee portal rollout.
