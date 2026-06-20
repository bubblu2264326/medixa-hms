# HMS — Full Project Map

> Synthesized 2026-06-20 from 4 parallel read-only Explore agents (frontend, backend/API, database, platform). This is the foundation for the coding / business-logic / integration audits. File paths are clickable references. Where agents disagreed on exact table names, the canonical source is `database/snapshot/`.

## 1. What it is
A role-based **Next.js 16 (App Router) + React 19** HMS talking directly to **PostgreSQL** via a `pg` pool (no ORM in the request path). Significant business logic lives **in the database** (triggers, views, stored procedure). Stack: Turbopack, Tailwind 4, Radix UI, `jose` (JWT), `zod`, `react-hook-form`, Vitest (jsdom).

## 2. Layers at a glance
```
Browser (role workspaces, SSE)
  → src/app/<role>/        role-segmented App Router UIs (parallel routes for doctor/reception/pharmacy)
  → src/features/<role>/   feature modules + colocated __tests__
  → contexts/              PatientId, ClinicalDetails, Sidebar, (DoctorWorkspace)
        │ fetch /api/*  + EventSource SSE
        ▼
  src/app/api/<domain>/    ~160 route handlers, raw SQL
  → src/lib/server/*       domain helpers (auth, audit, cashier, visitLifecycle, workforce, queue…)
        │ pg.Pool (database/db.ts)
        ▼
  PostgreSQL: 93 tables · 4 views · 15 fns + 1 proc · 17 triggers
        └ DB-enforced: stock trigger chain, visit-status proc, search vectors, constraints
```

## 3. Frontend layer
**Role workspaces** (each `src/app/<role>/layout.tsx`):

| Role | Segment | Notable UI |
|---|---|---|
| Auth | `(auth)` | Login, role-based redirect |
| Doctor | `doctor` | **Parallel routes** (@queue/@patientDetails/@pharmacyOrder/@labOrder/@pastVisits/@dashboard); SSE queue; stale-visit detection |
| Receptionist | `receptionist` | **Parallel routes**; registration, vitals, gynae clinical details |
| Pharmacy | `pharmacy` | Tab via `?tab=`; POS/retail, purchases, parties, returns, reports |
| Lab | `lab` | Simple tabs: sample collection, results, orders |
| Cashier | `cashier` | Shift-based settlement workspace |
| Admin | `admin` | Dashboard (revenue, live audit SSE), staff, payroll, financials, credentialing, roster, lifecycle |
| Attendance | `attendance/kiosk` | Device-key punch kiosk |
| Public | `public/queue` | Public queue display (10s poll) |

**Contexts:** `PatientIdContext` (patient+visit selection), `ClinicalDetailsContext`, `SidebarContext`, `DoctorWorkspaceContext` (queue collapse, stale-visit).
**Call patterns:** `fetch('/api/*', {credentials:'include'})`; **SSE** via `EventSource` on `/api/*/stream` listening for `invalidate` events with reconnect.
**UI primitives:** `src/components/ui/{Button,Card,Input,Label}` + session/admin/reception components.

## 4. Backend / API layer (~160 routes)
Domains and what they own:

| Domain | Routes | Owns |
|---|---|---|
| admin | ~38 | staff/HR v2 (allowances, analytics, approvals, credentialing, leave, lifecycle, roster), payroll runs, finance, audit logs+SSE, dashboard, settings |
| cashier | ~12 | settle (uses `update_and_log_visit_status`), bills, drafts, history, outstanding/overdue, receipts, reversal, shift, **idempotency** |
| doctor | ~17 | queue+SSE, encounter notes, visit status (`transitionDoctorVisitStatus`), lab orders, prescriptions, patient history, soft-delete |
| visit | 4 | **`/api/visit/status` = primary status path** (validates → proc); `/api/visit` PATCH updates status **directly** (bypasses proc) |
| pharmacy/pos/medicine/transactions/return/dispense/party/inventory/receipts | ~40 | sales (prescription + OTC), purchases, returns, ledgers, medicine masters+search, stock checks, receipts |
| lab | 7 | tests, categories, orders, parameters, results |
| clinicalDetails | 8 | gynae: current pregnancy, menstrual, obstetric, para |
| attendance/employee/integrations | ~9 | self check-in/out/status, leave, payroll view, device events |
| patient/patientVitals/prescription | ~8 | patient CRUD, vitals, prescriptions |
| login/logout/user/receptionist/public/print/email/hardware | ~12 | auth, profile, public queue/doctors/timezone, print/email/cash-drawer stubs |

**Server helpers** (`src/lib/server/`): `auth`, `audit`/`auditEvents`, `attendance`, `cashier`, `doctor`/`doctorWorkspace`, `medicineMasters`, `password`, `queueConfig`/`queueEvents`, `systemTimezone`, `visitLifecycle` (8-state machine + transition rules), `workforceAnalytics`, `workforceFinance`, `adminInventory`.

## 5. Database layer
**Domains:** Patient/Clinical · Visits/Encounters · Pharmacy/Inventory (~15 tables) · Lab · Billing/Cashier (~10) · Workforce/HR (largest, ~28) · Admin/Masters · Finance/Payroll · POS/Audit. Canonical names: `database/snapshot/tables.md`.

**Views:** `v_medicine_pos` (active non-expired stock for POS), `v_low_stock_medicines` (reorder), `v_daily_sales_summary` (daily KPIs), `admin_cash_collected_ledger_v1` (unified cash ledger).

**Routines (15 fns + 1 proc):** `update_and_log_visit_status` (proc — authoritative status path), `check_stock_available`, the trigger fns `fn_tg_*_detail_to_txn`, `fn_tg_stockquantity_generic` (**central stock engine**, unit↔sub-unit math), `medicine_search_vector_update`, `get_stock_display`, `get_clinic_number`, `generate_batch_code/invoice_no`, `cleanup_old_audit_logs`.

**Stock trigger chain (the core invariant):**
`*_detail` insert → `tg_*_detail_to_txn` → row in `medicine_transaction` → `tg_stockquantity_generic` → updates `medicine_batch` stock (signed by txn_type). Application must write detail tables, **never** stock directly.

**Key DB-enforced invariants:** visit.status ∈ {waiting, seen_by_doctor, (dispensing), medicines_dispensed, lab_tests_done, payment_done, completed, admitted, discharged}; visit_type ∈ {OPD, Emergency}; `pharmacy_sale.visit_id` nullable (OTC); expiry filtering in POS view; cashier idempotency keys; check constraints on amounts/statuses.

## 6. Cross-cutting / platform
- **Middleware** (`src/middleware.ts`): gates `/doctor /lab /receptionist /pharmacy /admin /cashier /employee`; `normalizeRole()` maps casings (super admin→super_admin, lab technician→lab_technician, front desk→receptionist). `/employee` = any authenticated active user.
- **Auth** (corrects CLAUDE.md): login uses **scrypt** `hashPassword`/`verifyPassword` with **timing-safe compare**, **account lockout** (5 fails / 15 min), **DB session rows** (`staff/doctor_security_sessions`), **force-logout** via `session_version` bump, JWT (8h, `jose`) in httpOnly+secure cookie. **Legacy plaintext is still accepted and auto-rehashed on first login.**
- **Realtime:** in-memory pub/sub SSE (`queueEvents`/`auditEvents`), 25s heartbeat, client reconnect; queue statement timeout 5s.
- **Timezone:** `src/lib/timezone/*`, default Asia/Karachi, ESLint bans native `Date.toLocale*`.
- **Tooling:** `pnpm dev/build` (Turbopack), `pnpm test` (Vitest jsdom), `@/*` → repo root. `next.config` has `reactStrictMode:false`.
- **Env:** `DATABASE_URL` (fatal if missing), `secret_key` (⚠️ hardcoded fallback `hms_super_secure_2026_clinic_key`). DB SSL `rejectUnauthorized:false`.

## 7. Key cross-layer flows
- **Visit lifecycle:** queue → doctor sets `seen_by_doctor` (`transitionDoctorVisitStatus`) → pharmacy/lab → cashier `settle` auto-completes when fully paid (proc) → `completed`. **Three different code paths write visit.status** — only some go through the proc.
- **Pharmacy stock:** UI → detail tables → trigger chain → `medicine_batch`; reads via `v_medicine_pos`.
- **Cashier settlement:** `/api/cashier/settle` — single txn, `FOR UPDATE` on bill, idempotency key, allocates to pharmacy sales, audit event, status via proc.

## 8. Risk register (seeds the audits — to be confirmed)
**Security**
- ⚠️ Hardcoded JWT secret fallback in middleware/auth/login/doctor.
- ⚠️ `rejectUnauthorized:false` on DB SSL.
- ⚠️ `/api/patient` and `/api/prescription` reportedly lack auth checks.
- ⚠️ Legacy plaintext passwords still accepted (migration path).
- ⚠️ `getCurrentStaffId()` hardcoded `=1` (used in cash-drawer route) — audit attribution risk.
- ⚠️ PII (CNIC/contact) returned unmasked; no rate limiting.

**Correctness / consistency**
- ⚠️ **Dual/triple visit-status write paths** — `/api/visit` PATCH bypasses the logging proc.
- ⚠️ Role-string **casing mismatch** (middleware lowercase vs `auth.ts` "Admin"/"Super Admin" titlecase).
- ⚠️ Denormalized payment state (`bill.payment_status` vs `cashier_payment_txn` aggregates) must stay in sync.
- ⚠️ In-memory SSE pub/sub — lost on restart / won't work across multiple instances.

**Integration stubs**
- email receipt, thermal printer, cash-drawer = TODO stubs; `/api/medicine/dispenseMedicine` returns 410 (moved to `/api/transactions`).

**GTM-driven gaps** (from market research)
- No offline/local-first; no FBR POS integration; DRAP retention/FEFO and PHC-MSDS readiness unconfirmed.

## 9. To verify (agent discrepancies)
- Exact gynae table names (`current_pregnancy` vs `gynaecologist_current_pregnancy`) — check `database/snapshot/tables.md`.
- Whether a `dispensing` status value is real or app-only.
- Exact API route count (~160 nested) vs the 14 top-level files.
