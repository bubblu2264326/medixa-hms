# HMS — Coding-Quality Audit

> Read-only, code-verified (2026-06-20). Findings confirmed by reading source, not just the project map. Business-logic correctness is covered separately in [business-logic-audit.md](business-logic-audit.md). Severity: CRITICAL / HIGH / MEDIUM / LOW.

## CRITICAL

### C1. Most `/api/*` routes have no authentication; middleware doesn't gate the API surface
**Files:** `src/middleware.ts:80`, `src/app/api/patient/*`, `src/app/api/prescription/*`, `src/app/api/visit/route.ts`, `src/app/api/queue/route.ts`, `src/app/api/lab/route.ts`, `src/app/api/clinicalDetails/**`
The matcher only covers page segments — `/api/*` is **not** in it, and most handlers don't call `getAuthenticatedUser`. Only ~53 of ~160 route files reference any auth helper (clustered in admin/cashier/employee/attendance). `/api/patient` GET runs `SELECT * FROM patient` with zero auth.
**Impact:** Unauthenticated callers can read/write patient records, prescriptions, visits, and the clinic queue — direct PHI/PII breach + integrity hole.
**Fix:** Add `getAuthenticatedUser`/`requireRoles` to every data route; 401 unauthenticated `/api` calls.

### C2. Unmasked PII returned everywhere, including unauthenticated endpoints
**Files:** `src/app/api/patient/route.ts:25`, `src/app/api/patient/[id]/route.ts:9`, `src/app/api/patient/search/route.ts:14`
Full **CNIC (national ID)** + phone returned to any caller; uses `SELECT *` (violates the no-`SELECT *` convention). Combined with C1, the entire patient base is exfiltratable.
**Fix:** Name explicit columns, mask CNIC/contact except where a role needs them, gate behind auth.

### C3. Hardcoded JWT secret fallback in four places
**Files:** `src/middleware.ts:3`, `src/lib/server/auth.ts:5-7`, `src/lib/server/doctor.ts:5-7`, `src/app/api/login/route.ts:7`
`process.env.secret_key || "hms_super_secure_2026_clinic_key"`. If `secret_key` is unset anywhere, anyone can forge a JWT for any role (incl. Super Admin). Duplicated 4× so fixing one isn't enough.
**Fix:** One module that throws on import if missing (mirror `database/db.ts`'s `DATABASE_URL` guard); remove all fallbacks.

## HIGH

### H1. `getCurrentStaffId()` hardcoded to `1`, used for audit attribution
`src/lib/utils.ts:28-32` → used in `src/app/api/hardware/cash-drawer/route.ts:13`. Every cash-drawer event is attributed to staff_id 1 — falsified audit trail on a cash subsystem. (`/api/transactions` only falls back to this under `NODE_ENV==='test'`, which is fine.)

### H2. Server-side `fetch('http://localhost:3000/...')` inside DB transactions
`src/app/api/prescription/route.ts:26`, `src/app/api/lab/route.ts:46`. Hardcoded `localhost:3000` **breaks in production** (Vercel/any non-local host); holds a pooled connection open across a network round-trip; re-enters an unauthenticated route. Likely cause of past "visit not selected" errors.
**Fix:** Replace with a direct SQL query for the visit id on the same `client`.

### H3. No request-body validation in the API layer
`zod` is imported only in `src/features/reception/.../types.ts` — **zero** API routes validate input. Bodies are trusted casts (`as Transaction`) then `parseInt(data.age)` → NaN inserts / 500s.
**Fix:** zod `safeParse` per write route, 400 on failure.

### H4. `/api/visit` PATCH bypasses the authoritative `update_and_log_visit_status` proc
`src/app/api/visit/route.ts:33-36` writes `visit.status` directly (no `visit_status_history` row), and the route has no auth. The correct path `src/app/api/visit/status/route.ts:107` calls the proc. It does call `assertVisitStatusTransition`, so the transition is validated but the audit row is lost.

### H5. Raw DB error objects leaked to clients
`src/app/api/lab/route.ts:16`, `lab/order/[patientId]/route.ts:40`, `lab/testParameters/[test_id]/route.ts:16`, `prescription/[patientId]/route.ts:45` — `return NextResponse.json({error: err}, …)` leaks SQL/table/column names.
**Fix:** log server-side, return generic message.

### H6. Role-string casing mismatch between middleware and auth helpers
`src/middleware.ts:5-15` normalizes to lowercase; `src/lib/server/auth.ts:122` compares titlecase `"Admin"`/`"Super Admin"`; `doctor.ts:29` compares `"Doctor"`. Two independent schemes that must agree; login writes `user.role` verbatim from DB. Brittle → likely "access denied" bugs or future bypass.
**Fix:** one shared `normalizeRole`, compare normalized values only.

## MEDIUM
- **M1.** Duplicated queue query logic with divergent auth — `src/app/api/queue/route.ts:23-62` (no auth, exposes bills/dues) vs `doctor/queue/route.ts:10-35` (authed). Extract shared builder; add auth to `/api/queue`.
- **M2.** `getAuthenticatedDoctor` (`doctor.ts:18-85`) is a weaker copy of `getAuthenticatedUser` (`auth.ts:28-115`); throws plain `Error` so callers string-match messages for status codes.
- **M3.** `error: any` + unsafe casts pervasive (165 occurrences / 70 files), incl. `(item as any)` on the financial transactions path.
- **M4.** `transactions` POST runs `ROLLBACK` even if it threw before `BEGIN` (`transactions/route.ts:128` vs `:146`).
- **M5.** Throwing on empty result set — `lab/route.ts:9-11` returns 500 for an empty `lab_test` table.
- **M6.** Inconsistent `params` typing across dynamic routes (Promise vs non-Promise) — wrong for Next 15/16.

## LOW
- **L1.** `rejectUnauthorized:false` on DB SSL (`database/db.ts:11`) — use the Supabase CA cert.
- **L2.** 22 stray `console.log` across 17 routes, some logging PII/bodies.
- **L3.** No rate limiting (login relies on account lockout only; PII search unthrottled).
- **L4.** Integration stubs (email/print/cash-drawer) unimplemented; `dispenseMedicine` 410 is intentional.
- **L5.** Hardcoded `secure:true` cookie blocks local non-HTTPS login (`login/route.ts:198,388`) — make env-conditional.

## Top 10 (prioritized)
1. **C1** — auth on all data routes *(largest blast radius)*
2. **C3** — remove JWT secret fallback; fail-fast
3. **C2** — mask/scope PII; kill `SELECT *` on patient
4. **H2** — replace `localhost:3000` self-calls with direct SQL *(breaks in prod)*
5. **H4** — route `/api/visit` PATCH status through the proc
6. **H3** — zod body validation on writes
7. **H6** — unify role normalization
8. **H1** — real staff id in cash-drawer
9. **H5** — stop leaking raw DB errors
10. **M1/M2** — de-duplicate queue query + auth helpers

## Test-coverage gaps
**Has tests:** admin (auth, password, attendance, payroll, financials, middleware role, dashboard), pharmacy (transactions, prescription-sale, cashier, returns, receipts, retail stock), doctor (prescriptions, history, labs, workflow-repair), reception (api-hardening, visit-status-guard, queue), shared queue.
**No tests (critical):** `/api/patient` + search (PII+auth), `/api/prescription` POST (txn + self-fetch), `/api/visit` POST/PATCH/DELETE (the bypassing direct status write), `/api/lab` order creation, `/api/clinicalDetails/**`, `/api/queue` (unauthed), cash-drawer audit attribution.
**Note:** no integration runner — DB tests stub the pool, so C1/H2 wouldn't be caught without an integration harness.
