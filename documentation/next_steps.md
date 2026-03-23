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
