# Feature Map

A module-by-module inventory of what's shipped, where the code lives, and what APIs back it. Use this as the index when adding to or refactoring a workflow.

## Login & session

**UI**: `src/features/Login`
**APIs**:
- `GET /api/login/[userCode]` — user code lookup (auto-fills name/designation)
- `POST /api/login` — credential check, JWT issue, session insert
- `POST /api/login/reset` — password reset (token-based)
- `POST /api/logout` — revoke session, clear cookie

**Backed by**: `staff`, `doctor`, `staff_security_sessions`, `doctor_security_sessions`; `src/lib/server/auth.ts`, `src/lib/server/password.ts`.

**Behaviour**:
- scrypt hash storage with legacy plaintext auto-upgrade on successful login
- failed-attempt tracking + lockout (`account_locked_until`)
- session rows track IP / UA, can be force-revoked
- `session_version` bumps invalidate all outstanding tokens for that user

## Reception

**UI**: `src/features/reception/*` — `patientRegistration`, `queueManagement`, `patientVitals`, `clinicalDetails`
**Workspace**: `src/app/receptionist/*`

**Capabilities**:
- Patient registration / search / load
- Visit creation (`OPD` / `Emergency`) with auto-generated `clinic_number`
- Vitals entry (one row per visit)
- OB/GYN forms (menstrual, obstetric, para, current pregnancy)
- Queue entry and live queue updates (SSE + 45 s poll fallback)

**APIs**:
- `/api/patient/*` — CRUD + search
- `/api/patientVitals/*`
- `/api/clinicalDetails/*` — OB/GYN forms
- `/api/visit/*` — visit creation + reads
- `/api/queue/*` — `events` (SSE) + ops
- `/api/receptionist/*` — workspace-specific reads

## Doctor

**UI**: `src/features/doctor/*`
**Workspace**: `src/app/doctor/*`

**Capabilities**:
- Personal queue
- Patient detail panel with past visits
- Encounter notes (`doctor_encounter_note`)
- Prescription order form
- Lab order form
- Past prescriptions / lab orders
- Doctor self-attendance check-in/out

**APIs**:
- `/api/doctor/queue` — assigned queue
- `/api/doctor/encounter` — notes CRUD
- `/api/doctor/prescriptions/*`
- `/api/doctor/lab-orders/*`
- `/api/doctor/history`, `/api/doctor/visit/*`
- `/api/doctor/dashboard`, `/api/doctor/me`
- `/api/doctor/getAllDoctors`
- `/api/prescription/*` (shared)

## Lab

**UI**: `src/features/laboratory/*`
**Workspace**: `src/app/lab/*`

**Capabilities**:
- Pending order retrieval (`lab_order.status='Pending'`)
- Parameter-based result entry (`lab_test_parameters` drives the form)
- Critical-flag handling
- Verification / approval (`lab_result_approvals`)

**APIs**:
- `/api/lab/order/*`
- `/api/lab/testParameters/*`
- `/api/lab/category/*`

## Pharmacy

The most operational workflow.

**UI**: `src/features/pharmacy/*`
**Workspace**: `src/app/pharmacy/*`

**Capabilities**:
- POS retail (OTC + prescription-linked)
- Batch-aware medicine search (`v_medicine_pos`)
- Sub-unit sales (strips × tablets) honored by triggers
- Held-cart with multiple parked transactions
- Purchase intake (vendor + batch creation)
- Sale and purchase returns
- Receipt print
- Audit log per POS action

**APIs**:
- `/api/pharmacy/active-visits` — visits pending dispense
- `/api/pharmacy/patient-search`
- `/api/pharmacy/prescription-sale/*` — visit-bound checkout
- `/api/pharmacy/purchase/*` — purchase header + lines
- `/api/pharmacy/transactions/*` — txn journal reads
- `/api/pharmacy/party/*` — supplier ops
- `/api/pharmacy/ledger` — supplier balances
- `/api/pharmacy/reports/*`
- `/api/pos/*` — sale create/update, hold/resume, print
- `/api/return/*` — sale + purchase returns
- `/api/medicine/*` — masters + search
- `/api/inventory/*` — admin adjustments
- `/api/dispense/*` — prescription fulfillment
- `/api/receipts/*` — receipt config + reprint
- `/api/print/*` — printer hooks
- `/api/hardware/*` — cash drawer + printer

**Backed by**: `medicine`, `medicine_batch`, `medicine_transaction`, `pharmacy_sale*`, `sale_return*`, `medicine_purchase*`, `purchase_return*`, `pos_*`. All stock math runs through the trigger chain (see [`/DATABASE.md`](../DATABASE.md)).

## Cashier

**UI**: `src/features/cashier/*`
**Workspace**: `src/app/cashier/*`

**Capabilities**:
- Patient bill settlement with multi-bill allocation
- Settlement drafts (stage → review → commit)
- Reversal (`txn_type='reversal'`)
- Corrections workflow
- Shift open/close
- Idempotency keys for retried requests
- Audit event stream (`cashier_audit_event`)

**APIs**:
- `/api/cashier/worklist` — open bills + drafts
- `/api/cashier/outstanding`, `/api/cashier/overdue`
- `/api/cashier/bill/*`
- `/api/cashier/drafts/*` — create / cancel / apply
- `/api/cashier/settle/*`
- `/api/cashier/reversal/*`
- `/api/cashier/correct/*`
- `/api/cashier/shift/*` — open / close / status
- `/api/cashier/history/*`
- `/api/cashier/receipt/*`

**Backed by**: `cashier_shift`, `cashier_payment_txn`, `cashier_payment_allocation`, `cashier_settlement_draft`, `cashier_audit_event`, `cashier_idempotency`, `bill*`; `src/lib/server/cashier.ts`.

## Admin

**UI**: `src/features/admin/*`
**Workspace**: `src/app/admin/*` (grouped sidebar with Phase-A layout)

**Sections** (sidebar groups):

### Staff & management
- Directory (`/admin/staff`)
- Access — roles + RBAC v2 permission policies (`/admin/staff/access`)
- Security — lock / unlock / force-logout / password reset (`/admin/staff/security`)
- Credentialing — license / certification tracking with expiry windows (`/admin/credentialing`)
- Lifecycle — onboarding/offboarding template runs (`/admin/lifecycle`)
- Documents — required documents per role with review workflow (`/admin/documents`)

### Operations
- Roster — shift templates + date-keyed assignments (`/admin/roster`)
- Leave — requests + balances (`/admin/leave`)
- Approvals — pending approval queue (`/admin/approvals`)
- Attendance — corrections + analytics (`/admin/attendance`)
- Analytics — workforce KPIs (`/admin/analytics`)

### Financials
- Payroll — runs + line items (`/admin/payroll`)
- Cashier — admin oversight of cashier flow (`/admin/cashier`)
- Finance — expenses + asset purchases (`/admin/finance`, `/admin/financials`)

### System
- Audit logs (`/admin/audit-logs`)
- Settings — including system timezone (`/admin/settings`)
- Dashboard / overview

**APIs**:
```
/api/admin/staff/v2/directory
/api/admin/staff/v2/permissions
/api/admin/staff/v2/roster
/api/admin/staff/v2/leave
/api/admin/staff/v2/approvals
/api/admin/staff/v2/attendance-corrections
/api/admin/staff/v2/compensation
/api/admin/staff/v2/credentialing
/api/admin/staff/v2/documents
/api/admin/staff/v2/lifecycle
/api/admin/staff/v2/allowances
/api/admin/staff/v2/analytics
/api/admin/staff/security
/api/admin/attendance/*
/api/admin/audit-logs/*
/api/admin/cashier/*
/api/admin/dashboard/*
/api/admin/finance/*
/api/admin/financials/*
/api/admin/inventory/*
/api/admin/patients/*
/api/admin/payroll/*
/api/admin/settings/*
```

**Backed by**: see Staff/RBAC, Attendance, Leave, Payroll, Credentialing, Lifecycle, Document table groups in [database.md](./database.md).

## Employee self-service

**Workspace**: `src/app/employee/*` (any authenticated user passes middleware)
**APIs**:
- `GET /api/employee/me/summary` — overview tiles
- `GET /api/employee/me/attendance`
- `GET /api/employee/me/leave`
- `GET /api/employee/me/payroll`

Reads scope to the authenticated user from the JWT; no cross-employee access.

## Attendance device

**Workspace**: `src/app/attendance/*`
**APIs**: `/api/attendance/*` — endpoints for kiosk / biometric check-in/out. Records source as `self` or `System Trigger`.

## Shared

**Helpers**: `src/features/shared/patient`, `src/features/shared/queue` — reusable patient lookup + queue subscription used across reception, doctor, pharmacy.

## System settings

**API**: `/api/admin/settings/*`
**Backed by**: `system_settings` (KV-style).

Notable keys:
- System timezone (default `Asia/Karachi`) — resolved by `src/lib/server/systemTimezone.ts`
- Other operational flags

## Cross-cutting: audit logging

- Generic action log: `audit_logs` via `src/lib/server/audit.ts`
- Cashier domain stream: `cashier_audit_event`
- POS stream: `pos_audit_log`
- Permission changes: `staff_permission_audit`

The audit-logs read endpoint falls back to `cashier_audit_event` when `audit_logs` is empty for the chosen filter.

## What is _not_ implemented (yet)

- No SMS / WhatsApp out-of-band notifications wired up beyond stubs in `/api/email`, `/api/integrations`
- No patient-facing portal
- No insurance / claims handling
- No bed / ward management (outpatient + retail focus)
- No DRG / ICD coding
- No background workers — anything periodic is admin-triggered or unscheduled
