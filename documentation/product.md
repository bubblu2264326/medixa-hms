# Product Overview

## What HMS is

A web-based Hospital Management System that unifies reception, doctor consultations, lab work, pharmacy retail, cashier settlement, and workforce management into a single role-aware workspace. Designed for clinics and small hospitals that need one source of truth for patients, visits, inventory, payments, and staff.

## Who it's for

- **Receptionists** — register patients, queue them, capture vitals and OB/GYN intake.
- **Doctors** — review their queue, record consultations, issue prescriptions and lab orders, view history.
- **Lab technicians** — pull pending orders, log parameter-based results, route to verification.
- **Pharmacists** — run the POS with batch-aware stock, handle returns, intake purchases.
- **Cashiers** — settle patient bills with multi-allocation, manage shifts, handle reversals.
- **Admins** — manage staff directory, RBAC v2 permissions, roster, leave, attendance, payroll, credentialing, lifecycle templates, expense ledger, and dashboards.
- **Employees (any role)** — view their own attendance, roster, leave, payroll.

## What problem it solves

Clinics juggling paper queues, Excel rosters, ad-hoc WhatsApp coordination, and a separate POS app get one workspace where:

- Patient → visit → prescription → dispensing → settlement is one workflow with audit at each step.
- Staff lifecycle (hire → onboard → credential → roster → attendance → leave → payroll → offboard) lives in one schema with policy-driven derivation.
- Inventory math runs in the database, so concurrent POS sales, purchases, and returns don't drift.

## Core features

### Clinical operations

- **Queue & intake** — registration, search, vitals, OB/GYN forms, real-time SSE-driven queue.
- **Doctor consults** — encounter notes, prescription + lab orders, past-visit history.
- **Lab work** — parameter-based result entry with reference ranges and critical-value flags, approval workflow.

### Pharmacy & cashier

- **POS** — batch-aware sale with sub-unit support (e.g. selling tablets from a strip), held carts, receipts.
- **Inventory** — purchase intake, sale + purchase returns, audit-tracked stock movement.
- **Cashier settlement** — drafts → settle → reverse with multi-bill allocation, idempotency keys, and a dedicated audit stream.

### Workforce & admin

- **Staff directory v2** — extended HR profile (department, designation, manager, tags).
- **RBAC v2** — roles, role assignments, permission policies with full change audit.
- **Roster** — shift templates + date-keyed assignments (1,332 rows in live data).
- **Attendance** — policy snapshots per record (timezone, grace, half-day, overtime, early-leave), roster-aware derivation (`unscheduled` / `late` / …).
- **Leave** — role-based quotas with employee-specific overrides, request → approval → balance.
- **Payroll** — compensation profiles (fixed monthly or per-patient), payroll runs with line items.
- **Credentialing** — license / certification tracking with validity months + renewal windows.
- **Documents** — typed document store with versioning and review workflow.
- **Lifecycle** — `ONBOARD_STD` and `OFFBOARD_STD` templates driving runtime task lists per employee.
- **Finance** — expense entries by category, asset purchases, cash-collected ledger view combining cashier + pharmacy sources.

## Workflow narrative

1. Receptionist looks up or registers a patient, captures vitals and any OB/GYN intake, then creates a visit with auto-numbered `clinic_number`.
2. Visit appears in the doctor's queue in real time (SSE).
3. Doctor opens the queue, reviews patient detail and past visits, records an encounter note, issues prescriptions and / or lab orders.
4. Lab technician picks up the order, enters parameter results, marks verified.
5. Pharmacist receives the visit in the active-visits panel, dispenses prescribed medicines, and the POS records the sale; the trigger chain updates batch stock.
6. Cashier sees the settled / unsettled balance, runs a settlement transaction (single bill or multi-allocation), prints the receipt.
7. Admin oversees all of the above plus workforce: posts the roster, approves leave, runs payroll at cycle close, tracks credential expiry, drives onboarding tasks.
8. Employees view their own attendance, roster, leave balance, and payroll history via the self-service portal.

## Hidden / advanced capabilities

- **DB-first inventory math** — the trigger chain (`medicine_transaction` → `fn_tg_stockquantity_generic`) means stock math is enforced regardless of which route handler writes the sale or return. Concurrent updates stay consistent.
- **Sub-unit sales** — `sub_units_per_unit` lets pharmacies sell e.g. 4 tablets from a strip of 10; views and triggers normalize the math.
- **Policy-snapshotted attendance** — each `staff_attendance` / `doctor_attendance` row freezes the active policy at write time, so retroactive policy changes don't rewrite history.
- **Auditable visit transitions** — `update_and_log_visit_status(…)` updates and appends to `visit_status_history` atomically.
- **Multi-stream audit** — `audit_logs` (general), `pos_audit_log` (POS), `cashier_audit_event` (cashier), `staff_permission_audit` (RBAC) — each retains its own shape and retention story.
- **Cross-source cash ledger** — `admin_cash_collected_ledger_v1` view unions cashier txns with pharmacy sales for finance reporting.

## What HMS deliberately isn't

- Not an EHR/EMR with structured ICD coding, decision support, or interoperability (HL7/FHIR).
- Not insurance / claims aware.
- Not a hospital bed / ward management system (outpatient + retail focus).
- Not patient-facing — no patient portal or appointment self-booking.
- Not offline-capable.
