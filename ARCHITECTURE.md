# HMS Architecture

## Overview

HMS is a **role-based Next.js 16 App Router application** backed by a Supabase PostgreSQL database. The codebase combines:

- App Router dashboards in `src/app/`
- Feature modules in `src/features/<role>/`
- Server-side domain helpers in `src/lib/server/`
- Shared contexts in `contexts/`
- Direct PostgreSQL access through `database/db.ts` (single `pg.Pool`, no ORM in request path)
- Database-side business logic for inventory math, search vectors, and visit-status auditing

The DB is **deliberately load-bearing** — triggers and stored procedures enforce invariants the route handlers depend on.

## Runtime shape

### Frontend

- Next.js App Router with route groups (`(auth)`) and per-role top-level segments
- React 19 client components for operational workspaces; server components used sparingly
- Tailwind CSS 4 + shadcn-style primitives in `src/components/ui`
- Notifications via `react-hot-toast` and `sonner`
- Forms via `react-hook-form` + `zod`
- Queue updates use **Server-Sent Events** (`/api/queue/events`) with a 45-second polling fallback (see `src/lib/server/queueEvents.ts`, `src/lib/server/queueConfig.ts`)

### Backend

- Route handlers under `src/app/api`, grouped by domain
- Direct SQL via the `pg` pool exported from `database/db.ts`
- Server-only domain helpers in `src/lib/server/`:
  - `auth.ts`, `password.ts` — JWT, scrypt password hashing + legacy plaintext upgrade
  - `audit.ts`, `auditEvents.ts` — central audit-log helpers
  - `visitLifecycle.ts` — wraps `update_and_log_visit_status(…)`
  - `cashier.ts`, `doctor.ts`, `doctorWorkspace.ts` — per-role logic
  - `attendance.ts`, `workforceAnalytics.ts`, `workforceFinance.ts`
  - `adminInventory.ts`, `medicineMasters.ts`
  - `queueEvents.ts`, `queueConfig.ts` — SSE producer + config
  - `systemTimezone.ts` — system-wide TZ resolution (default `Asia/Karachi`)
- No ORM. `database/schema.prisma` exists historically but is **not** the source of truth and is not used.

### Database

- Source of truth: Supabase project `vqhlyxhnjjipypzqfpiu`, PostgreSQL 17.6.1
- Schema introspection lives in `database/snapshot/` (regenerable via `scripts/introspect-db.mjs`)
- SQL migrations applied by hand from `database/migrations/*.sql`; current Supabase baseline is `20260303185544_fix_sale_return_detail_trigger`
- Local SQL dumps (`backup.dump`, `db_structure.sql` if present) are historical references only

## Authentication & access control

### Login

- Endpoint: `src/app/api/login/[userCode]/route.ts` for code lookup, `src/app/api/login/route.ts` for credential check
- Reset flow: `POST /api/login/reset`
- JWT signed with `process.env.secret_key` (fallback hardcoded in middleware for non-fatal startup)
- Cookie: HTTP-only `token`, `secure: true`, `sameSite: lax`

### Password handling

- New passwords stored as scrypt hashes (`scrypt$salt$hash`) in `staff.password` / `doctor.password`
- Login auto-upgrades any plaintext row to a hash on first successful login
- Session tracking: `staff_security_sessions` and `doctor_security_sessions` rows are created at login, can be `revoked_at` with `revoked_reason: forced_logout`
- `session_version` on `staff` / `doctor` is bumped by admin actions to globally invalidate tokens

### Middleware role gate

`src/middleware.ts` matches `/doctor`, `/lab`, `/receptionist`, `/pharmacy`, `/admin`, `/cashier`, `/employee` and normalizes role names before checking:

| Path prefix | Allowed role(s) |
|---|---|
| `/doctor` | `doctor` |
| `/lab` | `lab_technician` |
| `/receptionist` | `receptionist` |
| `/pharmacy` | `pharmacist` |
| `/admin` | `admin`, `super_admin` |
| `/cashier` | `cashier`, `admin`, `super_admin` |
| `/employee` | any authenticated user |

Role name normalization handles e.g. `super admin`/`super_admin`, `lab technician`/`lab_technician`/`technician`, `front desk`/`receptionist`.

### Known gaps

- Some legacy rows in `doctor`/`staff` still have plaintext passwords (e.g. `password123`) — they auto-upgrade on next login, but rotation is encouraged.
- `getCurrentStaffId()` in `src/lib/utils.ts` still returns a hardcoded `1` placeholder; production code paths should use the JWT-derived staff id from server auth helpers, not this utility.
- The `secure: true` cookie complicates non-HTTPS local environments; use `localhost` with browser cookie-policy exceptions or proxy via HTTPS for thorough manual testing.

## Role workspaces

### Reception (`src/app/receptionist`)

Queue entry, patient registration, vitals, OB/GYN forms. Cross-panel state via `PatientIdContext`, `ClinicalDetailsContext`, `SidebarContext`.

### Doctor (`src/app/doctor`)

Queue review, patient details, encounter notes (`doctor_encounter_note`), prescription ordering, lab ordering, past visits, doctor self-attendance check-in.

### Lab (`src/app/lab`)

Lab order retrieval, parameter-based result entry, result approval workflow (`lab_result_approvals`).

### Pharmacy (`src/app/pharmacy`)

Most mature operational workflow. Batch-aware POS, sales (visit-linked or OTC), purchase intake, sale/purchase returns, held transactions (`pos_held_transaction`), receipts, audit logging, low-stock and daily-summary views.

### Cashier (`src/app/cashier`)

Patient bill settlement. Shifts (`cashier_shift`), payment transactions (`cashier_payment_txn`), per-bill allocations (`cashier_payment_allocation`), settlement drafts (`cashier_settlement_draft`), idempotency keys (`cashier_idempotency`), event stream (`cashier_audit_event`).

### Admin (`src/app/admin`)

Phase-A grouped sidebar:
- Staff & management: directory, access (roles + permission policies), security (lock/unlock/force-logout/reset), credentialing, lifecycle, documents
- Inventory & operations: roster, leave, approvals, analytics
- Financials & insights: payroll, expense, cash ledger
- Dashboard / overview

Backed by versioned APIs under `/api/admin/staff/v2/*` (directory, permissions, roster, leave, approvals, attendance-corrections) and `/api/admin/payroll/*`.

### Employee self-service (`src/app/employee` via middleware allowance)

Reads from `/api/employee/me/*` for profile, attendance, roster, leave, payroll.

### Attendance device (`src/app/attendance`)

Endpoint for kiosk / biometric check-in/out.

## Important data flows

### Visit lifecycle

1. Reception creates or selects a patient, then a `visit` (with `clinic_number` via `get_clinic_number(p_visit_type)`).
2. Doctor records `doctor_encounter_note`, prescriptions, lab orders.
3. Visit status transitions through allowed states: `waiting`, `seen_by_doctor`, `medicines_dispensed`, `lab_tests_done`, `payment_done`, `completed`, `admitted`, `discharged`.
4. The authoritative status path is the stored procedure `update_and_log_visit_status(p_visit_id, p_status, p_updated_by_doctor, p_updated_by_staff)`, which updates `visit.status` **and** appends to `visit_status_history`.

**Caveat**: not every route handler uses the procedure yet — some still update `visit.status` directly. When changing visit-status behavior, audit DB + API + frontend together.

### Pharmacy stock chain

Inventory math lives in the DB:

1. Detail rows are written into `medicine_purchase_detail`, `pharmacy_sale_detail`, `purchase_return_detail`, or `sale_return_detail`.
2. Per-table triggers (`tg_*_detail_to_txn`) mirror each row into `medicine_transaction` with the correct `txn_type` (`purchase`, `sale`, `purchase_return`, `sale_return`, `adjustment`).
3. `tg_stockquantity_generic` on `medicine_transaction` calls `fn_tg_stockquantity_generic()`, which:
   - looks up `sub_units_per_unit` from `medicine`
   - converts whole-unit + sub-unit math into a single sub-unit delta
   - applies sign by `txn_type` (`purchase`/`sale_return` add, `sale`/`purchase_return` subtract, `adjustment` adds)
   - updates `medicine_batch.stock_quantity` and `stock_sub_quantity` accordingly

POS reads go through `v_medicine_pos` (joined medicine + non-expired batches, with derived stock and out-of-stock/low-stock flags). Reorder UIs read `v_low_stock_medicines`. Daily reporting reads `v_daily_sales_summary`.

### Cashier settlement

1. Pharmacy retail sale or patient bill is created.
2. Cashier opens a shift (`cashier_shift`).
3. Settlement draft is built (`cashier_settlement_draft`), allocating payment across one or more bills (`cashier_payment_allocation`) inside a `cashier_payment_txn` (`txn_type` of `payment` or `reversal`).
4. `admin_cash_collected_ledger_v1` view unions cashier payment txns with `settlement_channel='pharmacy'` settled sales for finance reporting.

### Medicine search

`medicine_search_vector_trigger` (BEFORE INSERT/UPDATE on `medicine`) runs `medicine_search_vector_update()` to maintain `search_vector` using `setweight` on `generic_name` (A), `brand_name` (A), `category` (B). POS search reads `v_medicine_pos`.

### Attendance derivation

Both `doctor_attendance` and `staff_attendance` store a `policy_snapshot` JSON (timezone, grace minutes, half-day threshold, overtime threshold, early-leave threshold) at record creation, plus `derived_status` (`unscheduled` / `late` / etc.), `is_unscheduled`, and `is_on_time`. Derivation is driven by the staff's `staff_roster_assignments` for that date — no roster row → marked `unscheduled` even if the person checks in.

### Audit

- `audit_logs` is the general-purpose action log (148+ rows), written via `src/lib/server/audit.ts`.
- `cashier_audit_event` is a domain-specific event stream for cashier flow (`draft_created`, `settle_success`, etc.).
- `pos_audit_log` captures POS-specific events (`SALE_COMPLETED`, `RECEIPT_PRINTED`, `CASH_DRAWER_OPENED`, …).
- `staff_permission_audit` tracks permission-policy changes.

## Source structure

```text
src/
  app/
    (auth)/         # login UI
    api/            # route handlers grouped by domain
    admin/          # admin workspace
    attendance/     # device check-in endpoint
    cashier/
    doctor/
    employee/
    lab/
    pharmacy/
    receptionist/
  components/ui/    # shadcn-style primitives
  features/
    Login/
    admin/
    cashier/
    doctor/
    laboratory/
    pharmacy/
    reception/
    shared/         # cross-role helpers (patient, queue)
  lib/
    server/         # server-only domain helpers
    timezone/       # client.ts + useSystemTimezone hook
    types.ts
    utils.ts
contexts/           # PatientIdContext, ClinicalDetailsContext, SidebarContext
database/
  db.ts             # pg.Pool
  migrations/*.sql  # hand-applied SQL migrations
  scripts/          # one-off SQL helpers
  snapshot/         # generated live-DB introspection
scripts/
  introspect-db.mjs # regenerates database/snapshot/
```

## Conventions & constraints

- The `@/` import alias resolves to the **repo root** (see `tsconfig.json`), so imports look like `@/src/lib/server/...`, `@/contexts/...`, `@/database/db`.
- **ESLint blocks** `Date.toLocaleString`, `Date.toLocaleDateString`, `Date.toLocaleTimeString` — use helpers from `src/lib/timezone/client.ts` instead.
- New business logic should go in `src/lib/server/<domain>.ts` rather than inlined in route handlers.
- `database/schema.prisma` is **not** used; do not edit it expecting effects.
- Visit-status changes should go through `update_and_log_visit_status(…)` (procedure) so `visit_status_history` stays consistent.

## Known architectural realities

- The route layer is not yet fully normalized around stored procedures and shared domain services — some handlers still write directly to detail tables / status columns.
- Documentation should be treated as a living mirror of the snapshot, not the authoritative spec. When in doubt, read `database/snapshot/` or query the live DB directly.
- The system is a hybrid: database-first for inventory and visit-status audit, but route-driven for most CRUD and read paths.
