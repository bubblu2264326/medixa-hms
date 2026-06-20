# Product Capabilities — Code-Grounded Feature Inventory

> **This is the source of truth for what we can honestly claim.** Every capability below maps to real modules in the codebase (App Router segments, API domains, server helpers, and DB objects). Do **not** market beyond this list without confirming the code. Maturity tags are an internal estimate and should be validated during the upcoming functionality/integration audit.
>
> Maturity legend: 🟢 working · 🟡 partial / needs verification · 🔴 known gap

## 1. Patient & Clinical (EMR)
- Patient registration & records — `api/patient`, `features/reception` 🟢
- Visits & visit lifecycle (OPD / Emergency), status auditing via `update_and_log_visit_status` stored proc — `api/visit`, `lib/server/visitLifecycle.ts` 🟢
- Patient vitals — `api/patientVitals` 🟢
- Clinical details / encounter notes — `api/clinicalDetails`, `ClinicalDetailsContext` 🟢
- Prescriptions — `api/prescription`, `features/doctor` 🟢
- Specialty data captured in schema (e.g. pregnancy tracking) — DB tables 🟡

## 2. Doctor Workspace
- Per-doctor consultation workspace, queue intake, prescribing — `app/doctor`, `lib/server/doctorWorkspace.ts` 🟢

## 3. Queue Management
- Real-time patient queue via **server-sent events** (45s polling fallback) — `lib/server/queueEvents.ts`, `queueConfig.ts` 🟢

## 4. Pharmacy + POS + Inventory
- Medicine master + full-text search (`search_vector`) — `api/medicine`, `lib/server/medicineMasters.ts` 🟢
- POS dispensing & OTC sales — `api/pos`, `api/dispense` 🟢
- **Trigger-driven stock integrity**: detail tables → `medicine_transaction` → stock math on `medicine`/`medicine_batch` (whole-unit vs sub-unit) 🟢
- Batches & expiry handling; POS reads via `v_medicine_pos` (active, non-expired) 🟢
- Purchases, suppliers/parties — `api/party`, purchase detail tables 🟢
- Returns (sale + purchase) — `api/return` 🟢
- Low-stock reorder view `v_low_stock_medicines`; daily sales `v_daily_sales_summary` 🟢

## 5. Laboratory
- Lab tests, results, lab workflow — `app/lab`, `api/lab`, `features/laboratory` 🟢

## 6. Billing / Cashier
- Bills, payment status, receipts — `api/cashier`, `api/receipts`, `lib/server/cashier.ts` 🟢
- Transactions ledger — `api/transactions` 🟡 (confirm reconciliation in audit)

## 7. Admin
- Master data & admin inventory — `api/admin`, `lib/server/adminInventory.ts` 🟢
- Integrations + hardware hooks (e.g. printers/devices) — `api/integrations`, `api/hardware`, `api/print` 🟡
- Email — `api/email` 🟡

## 8. Workforce / HR
- Attendance (with timezone handling) — `app/attendance`, `api/attendance`, `lib/server/attendance.ts` 🟢
- Employee management, analytics, credentialing, documents — `api/employee`, `lib/server/workforceAnalytics.ts` 🟢
- Workforce finance / allowances (payroll-adjacent) — `lib/server/workforceFinance.ts`, allowance master tables 🟡

## 9. Platform / Cross-cutting
- **RBAC** via middleware (role-gated route prefixes) — `src/middleware.ts` 🟢
- **Audit logging** — `lib/server/audit.ts`, `auditEvents.ts`, `audit_logs` table 🟢
- Timezone-safe formatting (lint-enforced) — `lib/timezone/` 🟢
- Auth: JWT cookie login — `api/login` 🔴 **known gaps**: plaintext password comparison; `getCurrentStaffId()` hardcoded to `1`. Must be hardened before any real deployment.

## Scale reference (current dev/seed DB)
93 tables · 4 views · 15 routines (14 functions + 1 procedure) · 17 triggers. See `database/snapshot/`.

## Honest gaps to flag in sales conversations
- Authentication hardening (passwords, real session identity) — **must-fix pre-sale**.
- Integrations/hardware/email maturity unverified — confirm in integration audit.
- No telemedicine, insurance/claims, or patient-facing app yet (roadmap).
