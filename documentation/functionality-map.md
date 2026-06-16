# Functionality Map

Exhaustive inventory of what users can do in the HMS, where each feature lives in the codebase, and which APIs back it. Verified against the live tree on 2026-05-23.

**Totals**: 8 role workspaces · 48+ pages · 159 API route files · 16 server-side helpers · 93 DB tables. 38 routes use explicit auth helpers (`requireAdminOrSuperAdmin`, etc.); the rest either are public or rely on the calling UI's session — see [issues-found.md](./issues-found.md) for the unprotected-route gap.

## Receptionist workspace

**Route**: `/receptionist` · **Layout**: parallel route slots, sidebar queue + main pane

### Pages

- `/receptionist/@queue` — live SSE queue
- `/receptionist/@queueManagement` — queue ops (reorder, triage)
- `/receptionist/@patientRegistration` — new-patient intake form (name, CNIC, contact, demographics)
- `/receptionist/@patientVitals` — vitals capture (BP, HR, temp, SpO2, weight, height, blood group)
- `/receptionist/@clinicalDetails` — OB/GYN clinical history (menstrual, obstetric/para, current pregnancy)
- `/receptionist/@sidebar` — helper (unused in current layout)

### Features (`src/features/reception/`)

- `queueManagement/` — queue CRUD, search, SSE subscription
- `patientRegistration/` — form validation, CNIC lookup, patient create
- `patientVitals/` — vital capture with defaults and validation
- `clinicalDetails/Gynaecologist/` — sub-modules: `currentPregnancy`, `menstrualHistory`, `obstetricHistory`, `paraDetails`

### APIs

```
GET/POST     /api/receptionist
GET          /api/patient/search
GET/POST     /api/patient
GET/PATCH    /api/patient/[id]
GET          /api/patient/getNewClinicNo
POST         /api/patientVitals
GET/PATCH    /api/patientVitals/[id]
POST         /api/clinicalDetails/gynaecologist/currentPregnancy
POST         /api/clinicalDetails/gynaecologist/menstrualHistory
POST         /api/clinicalDetails/gynaecologist/obstetric
POST         /api/clinicalDetails/gynaecologist/para
GET          /api/queue
GET          /api/queue/events    (SSE)
POST         /api/visit           (create new visit + auto-bill)
PATCH        /api/visit           (update visit)
DELETE       /api/visit           (soft-delete via is_deleted)
```

### Server helpers used
`audit.ts`, `visitLifecycle.ts`, `queueEvents.ts`, `systemTimezone.ts`.

### User workflow
Walk-in patient → search or register → vitals → optional OB/GYN forms → create visit (auto clinic number from `get_clinic_number(p_visit_type)`) → patient appears in doctor's queue in real time.

---

## Doctor workspace

**Route**: `/doctor` · **Layout**: parallel queue + tabbed clinical workspace

### Pages

- `/doctor/@queue` — assigned queue with SSE updates and collapse state
- `/doctor/@patientDetails` — identity, vitals snapshot, complaint, women's-health panel
- `/doctor/@pharmacyOrder/@prescriptionform` — medicine search, dose/frequency/duration, save
- `/doctor/@pharmacyOrder/@previous` — past prescriptions with repeat/modify
- `/doctor/@labOrder/@orderform` — lab test selection and order placement
- `/doctor/@labOrder/@previous` — historical lab orders and results
- `/doctor/@pastVisits` — chronological encounter history
- `/doctor/@dashboard` — daily stats (checked count, summaries)

### Features (`src/features/doctor/`)

- `dashboard/` — API + hooks (`useDoctorDashboard`)
- `patientDetails/` — `PatientForm`, vitals display
- `pharmacyOrder/prescriptionForm/` — medicine catalog search + Rx persistence
- `pharmacyOrder/previous/` — history with repeat
- `labOrder/orderForm/` — test selection from `lab_test`
- `labOrder/previous/` — order status + result display
- `pastVisits/` — chronological visit list with note expansion
- `workspace/` — `DoctorWorkspaceContext` (queue collapse, stale-visit notice)

### APIs

```
GET          /api/doctor/queue
GET          /api/doctor/queue/stream         (SSE)
GET          /api/doctor/me
GET          /api/doctor/dashboard/summary
GET          /api/doctor/dashboard/checked-patients
GET          /api/doctor/dashboard/visit-history/[visitId]
POST/GET     /api/doctor/prescriptions
POST/GET     /api/doctor/lab-orders
GET          /api/doctor/history/patient/[patientId]/prescriptions
GET          /api/doctor/history/patient/[patientId]/lab-orders
GET          /api/doctor/history/patient/[patientId]/visits
GET/POST     /api/doctor/visit/[visitId]
PATCH        /api/doctor/visit/[visitId]/status   (uses update_and_log_visit_status)
DELETE       /api/doctor/visit/[visitId]/soft-delete
GET/POST     /api/doctor/encounter/[visitId]
GET          /api/doctor/getAllDoctors
POST/GET     /api/prescription
GET          /api/prescription/[patientId]
```

### Server helpers used
`doctor.ts`, `doctorWorkspace.ts`, `visitLifecycle.ts`, `auth.ts`, `audit.ts`.

### User workflow
Doctor opens queue → picks patient → reviews vitals + complaint + past visits → writes encounter note → issues prescriptions or lab orders → marks visit `seen_by_doctor` (which triggers status transition through the procedure) → patient flows to pharmacy / lab / cashier.

---

## Pharmacy workspace

The most operational area.

**Route**: `/pharmacy` · **Layout**: 8-tab POS + inventory

### Pages

- `/pharmacy/@retail` — POS with walk-in and prescription modes
- `/pharmacy/@purchase` — stock receiving from suppliers
- `/pharmacy/@transactions` — sales history, edit, return initiation
- `/pharmacy/@medicines` — medicine master (add/edit, barcode, dosage)
- `/pharmacy/@parties` — supplier directory
- `/pharmacy/@returnMedicine` — sale return
- `/pharmacy/@reports` — stock + financial summaries
- `/pharmacy/@settings` — printer config, POS preferences

### Features (`src/features/pharmacy/`)

- `retail/` — `PharmacyPOS`, medicine search, barcode scan, cart, payment, discount, qty input, sub-unit handling
- `purchase/` — supplier select, batch entry (SKU, expiry, qty, costs, sale prices), price-history lookup
- `transactions/` — sale-history search, edit mode, return initiation
- `medicines/` — medicine form (brand, generic, dosage, category, barcode, sub-unit config, min stock)
- `parties/` — supplier CRUD + ledger
- `returnMedicine/` — return-against-invoice, debit-note creation
- `purchaseReturn/` — vendor returns
- `reports/` — stock report (low-stock highlights), financial summary
- `ledger/` — supplier account ledger
- `settings/` — printer + display

### APIs

```
GET          /api/pharmacy
GET/POST     /api/medicine
GET/PATCH    /api/medicine/[id]
GET          /api/medicine/search
GET          /api/medicine/recommendations
GET          /api/medicine/purchase-search
POST         /api/medicine/returnMedicine
GET          /api/medicine/returnMedicine/currentMeds/[patientId]
GET          /api/medicine/masters
GET          /api/medicine/category
GET          /api/medicine/category/[category]
POST         /api/pharmacy/prescription-sale
GET          /api/pharmacy/active-visits
GET          /api/pharmacy/patient-search
GET/POST     /api/pharmacy/transactions
GET          /api/pharmacy/ledger
GET          /api/pharmacy/reports/stock
GET          /api/pharmacy/reports/medicine-stock
GET          /api/pharmacy/party/[id]/insights
GET          /api/pharmacy/party/[id]/supplies
GET/POST     /api/pharmacy/purchase
GET/PATCH    /api/pharmacy/purchase/[id]
GET          /api/pharmacy/purchase/search
GET          /api/pharmacy/purchase/utils
POST         /api/pharmacy/purchase/return
GET/POST     /api/transactions
GET/PATCH    /api/transactions/[id]
POST         /api/transactions/hold
POST         /api/transactions/return
PATCH        /api/transactions/return/[id]
POST         /api/dispense/[patientId]
POST         /api/inventory/check-stock
GET/POST     /api/party
POST         /api/pos/receipt-config
POST         /api/print/receipt
GET          /api/receipts/[saleId]
POST         /api/hardware/cash-drawer
POST         /api/email/receipt
```

### Server helpers used
`medicineMasters.ts`, `cashier.ts`, `adminInventory.ts`, `audit.ts`.

### User workflow
- **Walk-in (OTC)**: search medicine → set qty (whole units and/or sub-units) → discount → cash/card payment → receipt + cash drawer open.
- **Prescription dispense**: pick from active-visits queue → cart auto-populates from `prescription_medicines` → adjust → settle.
- **Purchase intake**: supplier + items + batches → save → triggers update `medicine_batch.stock_quantity`.
- **Return**: search invoice → select lines + qty → reverse → triggers decrement stock.

All stock math is enforced via the DB trigger chain.

---

## Lab workspace

**Route**: `/lab` · **Layout**: 3-tab (sample collection, results, orders)

### Pages

- `/lab/@labOrders` — orders from doctors (pending, in-progress)
- `/lab/@testResults` — result entry + upload
- `/lab/@reports` — pending counts, TAT metrics

### Features (`src/features/laboratory/`)

- `labOrder/` — order fetch, patient info, test parameters
- `labResult/` — result entry, sample status, upload

### APIs

```
GET          /api/lab
GET          /api/lab/order
GET          /api/lab/order/[patientId]
POST         /api/lab/testParameters
GET          /api/lab/testParameters/[test_id]
GET          /api/lab/category
GET          /api/lab/category/[category]
POST         /api/lab/result
```

### User workflow
Open pending orders → collect sample → enter parameter values (against reference ranges from `lab_test_parameters`) → save → flag critical → optional approval → result becomes visible on doctor's history view.

---

## Cashier workspace

**Route**: `/cashier` · **Layout**: single-page `CashierWorkspace`

### Pages
- `/cashier` — bill list, payment modal, receipt generation, overdue tracking

### Features (`src/features/cashier/`)
- `workspace/` — `CashierWorkspace` (bill listing, payment modal, draft management)

### APIs

```
GET          /api/cashier/worklist        (open bills aggregated from consult + lab + pharmacy)
GET          /api/cashier/outstanding
GET          /api/cashier/overdue
GET          /api/cashier/bill/[billId]
GET/POST     /api/cashier/drafts
PATCH/DELETE /api/cashier/drafts/[id]
POST         /api/cashier/settle          (uses update_and_log_visit_status)
POST         /api/cashier/correct
POST         /api/cashier/reversal
POST         /api/cashier/shift           (open/close shift)
GET          /api/cashier/history
POST         /api/cashier/receipt/[cashierPaymentTxnId]
GET          /api/admin/cashier/kpis
GET          /api/admin/cashier/audit
GET          /api/admin/cashier/overdue-summary
```

### Server helpers used
`cashier.ts`, `audit.ts`, `visitLifecycle.ts`.

### User workflow
Patient finishes visit → bill aggregated from consultation + lab + pharmacy → cashier creates settlement draft → assigns allocations across one or more bills → settles via `cashier_payment_txn` (txn_type `payment`) → reversal possible (`txn_type='reversal'`) → receipt printed → idempotency key prevents double-charge on retry.

---

## Attendance device

**Route**: `/attendance` · **Layout**: kiosk-style page

### Pages
- `/attendance/kiosk` — biometric/PIN check-in/out terminal

### APIs

```
POST         /api/attendance/me/check-in
POST         /api/attendance/me/check-out
GET          /api/attendance/me/status
POST         /api/integrations/attendance/events     (webhook from biometric device)
GET          /api/admin/attendance
POST         /api/admin/attendance/manual            (override with reason)
```

### Server helpers used
`attendance.ts` (roster-aware derivation), `systemTimezone.ts`, `audit.ts`.

### User workflow
Employee approaches kiosk → biometric or PIN → row inserted with `policy_snapshot` (timezone, grace, half-day, overtime, early-leave) and `derived_status` computed against the active `staff_roster_assignment` for the date. Manual override available to Admin with audit trail.

---

## Admin workspace

**Route**: `/admin` · **Layout**: grouped sidebar (Phase A) — 20+ sub-pages

### Pages

#### Dashboard
- `/admin` — revenue trends, live metrics, pulse feed, quick actions

#### Staff & management
- `/admin/staff` — directory, onboarding, bulk actions
- `/admin/staff/access` — RBAC v2 module visibility (per-user × per-module checkbox grid)
- `/admin/staff/security` — active sessions, force-logout, password reset
- `/admin/staff/settings` — staff preferences
- `/admin/credentialing` — license upload, expiry tracking
- `/admin/lifecycle` — onboarding/offboarding template runs
- `/admin/documents` — HR documents + review queue

#### Operations
- `/admin/roster` — weekly shift assignments
- `/admin/leave` — leave queue (approve/reject), balance tracking
- `/admin/approvals` — centralized approval queue
- `/admin/attendance` — live clock-in view, manual override
- `/admin/analytics` — workforce metrics

#### Financials
- `/admin/payroll` — monthly runs, salary slips, adjustments
- `/admin/cashier` — pharmacy financial overview
- `/admin/financials` — unified revenue (consultation + lab + pharmacy)
- `/admin/finance` — expense ledger + asset purchases
- `/admin/inventory` — stock levels, critical low-stock

#### System
- `/admin/patients` — analytics (registration, frequency, spend)
- `/admin/audit` — forensic audit log (search by user/action/date)
- `/admin/audit-logs` — same surface with stream
- `/admin/settings` — global timezone, attendance policy, branding

### APIs (selection)

```
GET          /api/admin/dashboard/summary?range=…
GET          /api/admin/audit-logs?limit=…
GET          /api/admin/audit-logs/stream                  (SSE)
GET/POST     /api/admin/staff
GET          /api/admin/staff/permissions
POST         /api/admin/staff/security                     (lock/unlock/force-logout/reset)
GET/POST     /api/admin/staff/v2/directory
GET/PUT      /api/admin/staff/v2/permissions
GET/POST     /api/admin/staff/v2/roster
GET/POST     /api/admin/staff/v2/roster/templates
GET/POST     /api/admin/staff/v2/leave
GET          /api/admin/staff/v2/leave/types
GET          /api/admin/staff/v2/leave/policies
GET/PATCH    /api/admin/staff/v2/approvals
GET/POST     /api/admin/staff/v2/attendance-corrections
GET/POST     /api/admin/staff/v2/compensation
GET/POST     /api/admin/staff/v2/credentialing
GET/POST     /api/admin/staff/v2/documents
GET/POST     /api/admin/staff/v2/lifecycle
GET/POST     /api/admin/staff/v2/allowances
GET          /api/admin/staff/v2/analytics
GET          /api/admin/staff/v2/analytics/config
GET          /api/admin/staff/v2/analytics/employees
GET          /api/admin/attendance
POST         /api/admin/attendance/manual
GET/POST     /api/admin/settings
GET          /api/admin/settings/attendance-policy
GET          /api/admin/inventory
GET          /api/admin/finance/assets
GET          /api/admin/finance/expenses
GET          /api/admin/finance/masters
GET          /api/admin/financials
GET          /api/admin/payroll/runs
GET          /api/admin/payroll/runs/[id]
GET          /api/admin/patients/analytics
GET          /api/admin/cashier/kpis
GET          /api/admin/cashier/audit
GET          /api/admin/cashier/overdue-summary
```

### Server helpers used
`audit.ts`, `auditEvents.ts`, `workforceAnalytics.ts`, `workforceFinance.ts`, `attendance.ts`, `adminInventory.ts`, `cashier.ts`, `systemTimezone.ts`.

### User workflow
Admin logs in → dashboard with live SSE audit pulse → drills into a domain (staff / roster / leave / attendance / payroll / inventory) → modifies records with full audit logging → reviews financials → tunes system settings (timezone, attendance policy).

---

## Employee self-service

**Route**: `/employee/*` (any authenticated user via middleware)

### Pages (limited)
- `/employee` — landing
- (Most data surfaces via the personal portal link inside other workspaces)

### APIs

```
GET   /api/employee/me/summary
GET   /api/employee/me/attendance
GET   /api/employee/me/leave/balance
GET/POST  /api/employee/me/leave/requests
GET   /api/employee/me/payroll
```

### User workflow
Any logged-in user can view their own attendance history, leave balance, submit leave requests, and view payroll history. Reads are scoped to the JWT-derived staff/doctor id.

---

## Login & session

**Route**: `(auth)` group — login page at `/`

### Features (`src/features/Login/`)
- `components/Login.tsx` — form (user code + password)
- `api.ts` — login/logout/reset mutations
- `hooks/useLogin.ts` — form state
- `utils.ts` — helpers

### APIs

```
POST  /api/login                  (credential check, JWT issue, session row, audit)
GET   /api/login/[userCode]       (user code lookup for autofill)
POST  /api/login/reset            (password reset)
POST  /api/logout                 (revoke session, clear cookie)
```

### Server helpers used
`auth.ts`, `password.ts`, `audit.ts`.

### Behaviour
- scrypt password storage with legacy plaintext auto-upgrade
- 5 failed attempts → 15-minute lockout (`account_locked_until`)
- Session row in `staff_security_sessions` / `doctor_security_sessions` with IP + UA
- `session_version` bump invalidates all tokens globally for that user
- All auth events logged to `audit_logs`

---

## Cross-cutting concerns

### Real-time queue (SSE)

- `/api/queue/events` — receptionist + reception queue widgets
- `/api/doctor/queue/stream` — doctor queue
- `/api/admin/audit-logs/stream` — admin audit pulse
- Server: `src/lib/server/queueEvents.ts` (broadcast on mutation)
- Client: `EventSource` subscription with 5-second auto-reconnect; 45-second polling fallback (`src/lib/server/queueConfig.ts`)

### Audit logging

- General: `audit_logs` via `src/lib/server/audit.ts`
- POS-specific: `pos_audit_log`
- Cashier-specific: `cashier_audit_event` (`draft_created` → `settle_success` etc.)
- Permissions: `staff_permission_audit`
- Credentials: `employee_credential_events`
- Lifecycle: `employee_lifecycle_events`

The audit-logs viewer falls back to `cashier_audit_event` if the main table is empty for the filter.

### Timezone

- System-wide setting in `system_settings`, default `Asia/Karachi`
- `src/lib/timezone/client.ts` exposes formatters; `useSystemTimezone()` hook for client components
- ESLint warns on native `Date.toLocale*` calls (currently 44 violations exist — rule is `warn`)

### Authentication infrastructure

- `src/middleware.ts` matches frontend role paths (`/doctor`, `/admin`, etc.) only — **does not gate `/api/*`**.
- API routes that need auth call helpers in `src/lib/server/auth.ts` directly (`requireAdminOrSuperAdmin`, etc.).
- 38 of 159 route files call those helpers; the rest are either public (login, public reads) or rely on the calling UI's session — a coverage gap flagged in [issues-found.md](./issues-found.md).

### Hardware integrations

- Cash drawer: `/api/hardware/cash-drawer` opens on cash sale
- Biometric attendance: `/api/integrations/attendance/events` webhook receives clock events
- Barcode scanner: browser USB device in pharmacy POS
- Receipt printer: thermal via `react-to-print` + `/api/print/receipt`

---

## Stubbed / unmapped

- `src/features/pharmacy/Code_review.md`, `src/features/reception/fixes.md` — historical notes, not active features
- `src/app/pharmacy/page.tsx` — returns null; the workspace is purely tab-driven via parallel routes
- `/employee` workspace is sparse — most data is API-only with no dedicated portal pages yet
- `figma-mcp` is a dependency in `package.json` but no Figma integration is wired up

---

## Summary table

| Workspace | Pages | API endpoints | Key server helpers | Status |
|---|---|---|---|---|
| Receptionist | 6 | ~15 | `visitLifecycle`, `queueEvents` | Stable |
| Doctor | 8 | ~20 | `doctor`, `doctorWorkspace`, `visitLifecycle` | Stable |
| Pharmacy | 8 | ~35 | `medicineMasters`, `cashier` | **Most mature** |
| Lab | 3 | ~8 | `queueEvents` | Stable |
| Cashier | 1 | ~14 | `cashier`, `audit` | **Recently shipped** |
| Attendance | 1 | ~6 | `attendance`, `systemTimezone` | Stable |
| Admin | 20+ | 60+ | `audit`, `workforceFinance`, `workforceAnalytics`, `attendance` | **Active expansion** |
| Employee | ~1 | ~5 | (reuses helpers) | Sparse |
| Auth/login | 1 | 4 | `auth`, `password` | Stable |
