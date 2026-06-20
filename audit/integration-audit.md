# HMS — Integration Audit (Frontend ↔ Backend ↔ Database)

> Read-only, both-sides-of-the-seam verified (2026-06-20). **The plumbing is sound:** all 90+ frontend endpoints map to existing route files, almost all SQL table/column references match `database/snapshot/`, and SSE is fully wired. Exposure concentrates at the **auth boundary** and a couple of **deploy-breakers**.

## Frontend call → route exists? → tables valid? (main flows)
All verified present and valid: `/api/queue` (+stream), `/api/visit`, `/api/visit/status` (proc), `/api/doctor/queue/stream`, `/api/doctor/prescriptions`, `/api/prescription` (⚠ H1), `/api/patient*`, `/api/clinicalDetails/.../currentPregnancy`, `/api/cashier/settle` (proc), `/api/admin/audit-logs/stream`, `/api/admin/staff/v2/*` (14), `/api/inventory/check-stock`, `/api/transactions`, `/api/pos/receipt-config`, `/api/medicine/search`.
**No frontend call targets a missing/renamed route.** The 410 `dispenseMedicine` route is no longer called (FE uses `/api/transactions`). Only contract quirk: `/api/visit/[patientId]` returns **400 (not 404)** for "no visit", and callers treat any non-2xx as a thrown error.

## CRITICAL
### C1. Patient/prescription/visit/queue/medicine APIs have NO authentication
FE fetches `/api/patient/search`, `/api/prescription`, `/api/visit` with `credentials:"include"`; BE handlers (`patient/route.ts:1-31` = `SELECT * FROM patient`, `prescription/route.ts:7`, `visit/route.ts`, `queue/route.ts`, `medicine/route.ts`) import only `query`/`pool` — no `getAuthenticatedUser`, and middleware matcher excludes `/api`. Unauthenticated caller can read all patient PII (incl. `cnic`, `contact_number`), create patients/visits/prescriptions, delete visits. *(Same as coding C1 / business H1 — confirmed from the frontend side too.)*

## HIGH
### H1. Hardcoded `http://localhost:3000` server-to-server fetch (deploy-breaker)
`prescription/route.ts:26`, `lab/route.ts:46`. Fails on Vercel/any non-localhost host → prescription & lab POST throw and roll back. Also note the target `/api/visit/[patientId]` returns `doctor_name` (not `doctor_id`) and **400 (not 404)** when no visit exists — callers treat 400 as `!ok` → throw. **Fix:** query the DB directly for the active visit; never self-fetch over HTTP.

### H2. Role-casing mismatch = page-gate vs API-gate disagreement (with a concrete breakage)
Login gives doctors titlecase `role:"Doctor"`; staff get `role: user.role` **raw from `staff.role`** (`login/route.ts:376`). API helpers compare titlecase (`auth.ts:122` "Admin"/"Super Admin"; `cashier.ts:9`; `doctor.ts:29` "Doctor") and return role **unnormalized** (`auth.ts:48`). Middleware normalizes to **lowercase**.
**Breakage:** if `staff.role` is ever stored lowercase (e.g. `"admin"`), the user passes the `/admin` **page** gate but every `/api/admin/*` call returns **403** — admin UI loads, all its data calls fail. Works today only because `staff.role` happens to be titlecase. **Fix:** normalize role once in `getAuthenticatedUser` (reuse `normalizeRole`); normalize on staff create.

### H3. `/api/visit/status` accepts any authenticated user (no role check)
`visit/status/route.ts:29` calls `getAuthenticatedUser` but does **no role check** — a receptionist token can drive a visit to `completed`. `/api/visit` PATCH has no auth at all (C1) yet validates the transition. **Fix:** restrict transitions to doctor/cashier/admin per the lifecycle.

## MEDIUM
- **M1.** Dual/triple visit-status write paths; `/api/visit` PATCH (`route.ts:34-36`) raw-updates `visit.status`, bypassing `update_and_log_visit_status` → no `visit_status_history` row. *(= coding H4 / business H1.)*
- **M2.** Integration stubs report success while doing nothing — `email/receipt` returns `{sent:true}`, `print/receipt:73` "sent to printer", `hardware/cash-drawer` logs to `pos_audit_log` with `getCurrentStaffId()=1`. **Mitigant: none are called from the frontend** (only a test imports `printReceipt`) — dormant, not active false-success. Return 501 or implement; fix `getCurrentStaffId()` before wiring.
- **M3.** Hardcoded JWT secret fallback (`middleware.ts:3`, `auth.ts:6`). *(= coding C3.)*
- **M4.** `secure:true` cookie hardcoded (`login/route.ts:198,388`) → on plain-HTTP local/intranet the browser drops the cookie; login "succeeds" but every request is unauthenticated. Gate on `NODE_ENV==="production"`.

## LOW
- **L1. `check_stock_available()` column drift** — selects `quantity, sub_quantity` but real columns are `stock_quantity, stock_sub_quantity` (`tables.md`); would throw if called. **No callers today** (stock checks use `v_medicine_pos`). Latent DB bug — fix in a migration before any caller is added. *(Relates to business M5.)*
- **L2.** `/api/visit/[patientId]` returns 400 (not 404) for "no visit" — callers throw a generic error instead of clean "no active visit".
- **L3.** `rejectUnauthorized:false` on DB SSL (`database/db.ts`).

## SSE wiring — verified correct ✅
Server (`queueEvents.ts:78-92`) emits `invalidate` / `ping` (25s heartbeat) / `connected`. Clients (`useQueue.ts:132`, `admin/page.tsx:364`, `admin/audit/page.tsx:82`) listen only for `invalidate` (correct). **45s polling fallback is real** (`useQueue.ts:116-118` `setInterval(loadQueue, 45000)`), plus 5s SSE reconnect and a `refresh-queue` window event. Event names match end-to-end.

## Prioritized Top 10
1. **C1** — auth on `/api/patient*`, `/api/prescription`, `/api/visit*`, `/api/queue`, `/api/medicine`.
2. **H1** — remove `localhost:3000` self-fetch (prescription/lab) — query DB directly.
3. **H2** — normalize role casing in `auth.ts`; align with middleware.
4. **H3** — role checks on `/api/visit/status` + visit PATCH.
5. **M3** — fail hard on missing `secret_key`.
6. **M1** — route all status writes through the proc.
7. **M4** — env-conditional `secure` cookie.
8. **M2** — 501/implement email/print/cash-drawer; fix `getCurrentStaffId()`.
9. **L1** — fix `check_stock_available()` columns before any caller.
10. **L3/L2** — tighten DB SSL; 404 for empty visit.

**Bottom line:** routes↔tables↔SSE plumbing is healthy — no missing routes, no schema drift in active code paths. Risk is the **auth boundary** (unauthenticated PII + role-casing coupling) and two **deploy-breakers** (localhost self-fetch, secure-cookie-on-http).
