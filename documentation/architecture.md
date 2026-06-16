# Architecture (Deep)

This expands on [`/ARCHITECTURE.md`](../ARCHITECTURE.md) with implementation-level detail. Read the root file first.

## Application layers

```
Browser
   │
   ▼
Next.js App Router (src/app/*)
   │── Layout per role workspace
   │── Client components for forms / interactive views
   │── Server components for shells
   │
   ▼
API route handlers (src/app/api/*)
   │── Direct SQL via pg.Pool
   │── Delegate domain logic to src/lib/server/*.ts
   │
   ▼
Postgres (Supabase)
   │── Tables (93)
   │── Views (4)
   │── Triggers (17)        ← inventory math + search vector
   │── Functions (14)
   │── Procedures (1)       ← update_and_log_visit_status
```

## Stack versions

- **Next.js** 16.1.6 — App Router, Turbopack dev + build
- **React** 19.1.0 — no `reactStrictMode` (disabled in `next.config.ts`)
- **TypeScript** 5.x (strict)
- **Tailwind CSS** 4 — via `@tailwindcss/postcss`
- **Radix UI** primitives + shadcn-style wrappers in `src/components/ui`
- **pg** 8.16 — single pool from `database/db.ts`
- **jose** 6.x — JWT sign/verify
- **react-hook-form** 7 + **zod** 4 — forms
- **react-hot-toast** 2.6 + **sonner** 2 — notifications (two libs in use; not yet consolidated)
- **react-select** 5 — selects for the few non-Radix cases
- **react-to-print** 3 — POS / report printing

## Routing

### Top-level segments

- `(auth)/` — login page (route group, no URL segment)
- `admin/`, `attendance/`, `cashier/`, `doctor/`, `employee/`, `lab/`, `pharmacy/`, `receptionist/`
- `api/` — route handlers

### Middleware gate

[`src/middleware.ts`](../src/middleware.ts) matches:

```
/doctor/:path*  /lab/:path*  /pharmacy/:path*  /receptionist/:path*
/admin/:path*   /cashier/:path*  /employee/:path*
```

Role strings are normalized before role checks (e.g. `super admin` ↔ `super_admin`, `lab technician` ↔ `lab_technician`, `front desk` ↔ `receptionist`). On JWT failure, the cookie is deleted and the user is redirected to `/`.

### API directory layout

```
src/app/api/
  admin/                 # admin v2 endpoints
  attendance/            # device check-in/out
  cashier/               # settlement flow
  clinicalDetails/       # OB/GYN forms
  dispense/              # prescription dispensing
  doctor/                # doctor-specific endpoints
  email/                 # outbound notifications
  employee/              # self-service /me endpoints
  hardware/              # cash drawer / printer
  integrations/          # 3rd-party hooks
  inventory/             # purchase / stock adjustments
  lab/                   # lab orders + results
  login/                 # login + reset
  logout/
  medicine/              # masters + search
  party/                 # supplier / customer
  patient/
  patientVitals/
  pharmacy/              # POS, sales, returns
  pos/
  prescription/
  print/
  public/                # unauthenticated reads
  queue/                 # SSE + queue ops
  receipts/
  receptionist/
  return/
  transactions/
  user/
  visit/
```

## Server-side domain helpers (`src/lib/server/`)

| File | Responsibility |
|---|---|
| `auth.ts` | JWT issue/verify, session validation against `*_security_sessions` and `session_version` |
| `password.ts` | scrypt hashing, legacy plaintext detection + auto-upgrade |
| `audit.ts`, `auditEvents.ts` | Append to `audit_logs` with consistent shape |
| `visitLifecycle.ts` | Wrap `update_and_log_visit_status(…)` |
| `cashier.ts` | Shift/draft/settle/reverse logic for cashier flow |
| `doctor.ts`, `doctorWorkspace.ts` | Doctor queue + workspace queries |
| `attendance.ts` | Roster-aware attendance derivation, policy snapshots |
| `workforceAnalytics.ts`, `workforceFinance.ts` | Admin analytics, payroll |
| `adminInventory.ts`, `medicineMasters.ts` | Admin pharmacy ops |
| `queueEvents.ts`, `queueConfig.ts` | SSE producer + 45 s polling fallback config |
| `systemTimezone.ts` | System TZ resolution from `system_settings` (default `Asia/Karachi`) |

**Convention**: route handlers should be thin — parse input, call the helper, return JSON. Inline SQL is acceptable only for trivial reads.

## Authentication lifecycle

1. **User code lookup** — `GET /api/login/<userCode>` returns `{ name, designation }` if the user exists, used to auto-fill the login form.
2. **Credential check** — `POST /api/login` verifies the password. If stored as plaintext and a match, it is re-hashed with scrypt and saved (`password_changed_at` is updated). Failed attempts increment `failed_login_attempts`; after a threshold, `account_locked_until` is set.
3. **Token issue** — `jose.SignJWT` signs `{ id, role, userCode, sessionId }` with `secret_key`. Cookie `token` is set HTTP-only, `secure`, `sameSite: lax`.
4. **Session row** — A row is inserted into `staff_security_sessions` / `doctor_security_sessions` with the bearer's IP and user-agent.
5. **Request validation** — Server-side helpers verify the JWT, check `session_version` against the staff row, and check the session is not revoked.
6. **Forced logout** — Admin actions set `revoked_at` + `revoked_reason='forced_logout'` (and/or bump `session_version`); the next request fails verification and bounces to `/`.
7. **Password reset** — `POST /api/login/reset` issues a `password_reset_token` with `password_reset_expires_at`.

## Cross-panel state

Three contexts at repo root (under `contexts/`):

- `PatientIdContext` — active patient and visit ids shared across reception/doctor panels
- `ClinicalDetailsContext` — OB/GYN form state
- `SidebarContext` — receptionist workspace tab/panel switching

These are imported via the `@/` alias (root-relative).

## Queue updates

`/api/queue/events` exposes Server-Sent Events. The client subscribes on mount and listens for queue mutations; if SSE drops, it polls every 45 seconds. Configuration is in `src/lib/server/queueConfig.ts`.

History: queue used to be polled. SSE was added in commit `e8839ba` ("Mar_21 moved queue from polling to Server side events + polling after 45s as a fallback").

## Timezone handling

- System-wide TZ resolved via `src/lib/server/systemTimezone.ts`, persisted in `system_settings`. Default `Asia/Karachi`.
- Client helpers: `src/lib/timezone/client.ts` (formatters) and `src/lib/timezone/useSystemTimezone.ts` (React hook).
- **ESLint blocks** `Date.prototype.toLocaleString`, `toLocaleDateString`, `toLocaleTimeString` to enforce going through these helpers.
- Attendance records snapshot the TZ into `policy_snapshot.timezone` at write time so retroactive policy changes don't corrupt history.

## Database access

`database/db.ts`:

```ts
import { Pool } from "pg";
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Supabase is the single source of truth for HMS.");
}
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
export const query = (text, params) => pool.query(text, params);
export default pool;
```

The SSL setting is unconditional — for fully local Postgres, see [setup.md](./setup.md) for the conditional version.

There is no transaction helper; multi-statement work uses `pool.connect()` directly with `BEGIN` / `COMMIT` / `ROLLBACK`. The `medicine_*` triggers handle the "stock side-effect" atomicity by virtue of being row-level AFTER triggers in the same statement.

## Why DB-first for stock

Three motivations:

1. **Multi-writer safety** — POS, purchases, returns, and admin adjustments all mutate stock; centralizing the math in a trigger means no caller can drift.
2. **Sub-unit math is non-trivial** — strips × tablets, packs × sub-units, etc. Doing it once in `fn_tg_stockquantity_generic()` avoids the bug surface area.
3. **Audit trail** — `medicine_transaction` is append-only; rebuilding stock from txns is straightforward when reconciling.

## Logical reads

Three views back the read-heavy UIs:

- `v_medicine_pos` — POS search & checkout
- `v_low_stock_medicines` — reorder dashboard
- `v_daily_sales_summary` — daily KPI cards

Plus the cross-source ledger:

- `admin_cash_collected_ledger_v1` — unions cashier `payment`/`reversal` txns with pharmacy `settlement_channel='pharmacy'` sales for finance reporting

## Known mismatches

- Some routes still write to `visit.status` directly instead of via `update_and_log_visit_status`. When refactoring a status change, audit every caller — `git grep "UPDATE visit" src/app/api`.
- The legacy `get_clinic_number()` and `get_clinic_number(p_patient_id)` overloads exist but ignore the patient id; new callers should use the `(p_visit_type)` overload.
- `getCurrentStaffId()` in `src/lib/utils.ts` is a hardcoded `1`. Use the JWT-derived id from `src/lib/server/auth.ts` instead.
- Two toast libraries are in `package.json` (`react-hot-toast`, `sonner`). Not yet consolidated.

## Where logic _doesn't_ live

- No background workers / cron — anything periodic is manual or admin-triggered. `cleanup_old_audit_logs(p_days)` exists but has no scheduler.
- No message bus / queue — SSE is the only event channel, and it's intra-request.
- No GraphQL / tRPC — all APIs are REST-ish route handlers returning JSON.
- No service worker / offline.
