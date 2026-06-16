# Code Review — Detailed Findings

Rigorous, confidence-filtered review of the HMS codebase. Findings here are *in addition to* the high-level issues already documented in [`issues-found.md`](./issues-found.md). Verified 2026-05-23.

## Severity legend & counts

- **Critical** — Data loss, financial corruption, authentication bypass, or production outage
- **High** — Security, concurrency, or correctness bugs triggered under normal usage
- **Medium** — Real bugs that require specific conditions
- **Low** — Structural issues creating future risk

**Total: 32 findings — Critical: 5 · High: 11 · Medium: 10 · Low: 6**

> Issues already covered in `issues-found.md` (e.g. middleware `/api/*` gap, `getCurrentStaffId()` stub, direct `visit.status` updates) are referenced where they create new bugs, not re-listed.

---

## 1. Race conditions

### 1.1 — Double check-in race: attendance has no `BEGIN/COMMIT`, no `SELECT ... FOR UPDATE`
**Severity:** High · **Confidence:** High
**File:** [`src/lib/server/attendance.ts:465-537`](../src/lib/server/attendance.ts#L465-L537)

```ts
const existingResult = await query(
  `SELECT * FROM ${info.tableName} WHERE ${info.idColumn} = $1 AND date = $2::date LIMIT 1`,
  [subject.personId, date]
);
const existing = existingResult.rows[0] ?? null;
// ... INSERT or UPDATE follows on a separate query call
```

Two concurrent check-in requests for the same employee on the same date both read `existing = null` and both INSERT. If the table has a unique `(person_id, date)` constraint this surfaces as a 500; if not, duplicate rows corrupt daily summaries.

**Fix:** Wrap SELECT → INSERT/UPDATE in `BEGIN/COMMIT` on an explicit client and use `INSERT ... ON CONFLICT (person_id, date) DO UPDATE`.

---

### 1.2 — Return route: no `FOR UPDATE` lock on batch stock before trigger insert
**Severity:** High · **Confidence:** High
**File:** [`src/app/api/transactions/return/route.ts:95-119`](../src/app/api/transactions/return/route.ts#L95-L119)

The route opens `BEGIN/COMMIT` but never locks `medicine_batch` rows before inserting `sale_return_detail` that fires the stock-increment trigger. Two simultaneous returns of the same sale items **double-increment stock**. The sale path uses `FOR UPDATE`; the return path doesn't.

**Fix:** Add `SELECT batch_id FROM medicine_batch WHERE batch_id = $1 FOR UPDATE` before each `INSERT INTO sale_return_detail` inside the transaction.

---

### 1.3 — Purchase route: check-then-insert batch is TOCTOU
**Severity:** Medium · **Confidence:** High
**File:** [`src/app/api/pharmacy/purchase/route.ts:73-154`](../src/app/api/pharmacy/purchase/route.ts#L73-L154)

The SELECT for an existing batch isn't `FOR UPDATE`. The `23505` retry path correctly catches the constraint violation, but it throws `BATCH_MISMATCH (Race)` which fails the entire purchase for what was an innocuous race.

**Fix:** Use `INSERT ... ON CONFLICT (medicine_id, batch_number, party_id) DO NOTHING RETURNING batch_id` then SELECT if no row returned.

---

## 2. N+1 queries

### 2.1 — Payroll: one DB query per employee in a sequential for-loop
**Severity:** High · **Confidence:** High
**File:** [`src/lib/server/workforceFinance.ts:257-285`](../src/lib/server/workforceFinance.ts#L257-L285)

```ts
for (const profile of profiles) {
  if (salaryModel === "per_patient_seen") {
    patientCount = await getSeenPatientCount(profile.doctor_id, ...);  // 1/doctor
  }
  if (salaryModel === "fixed_monthly") {
    unpaidDays = await getUnpaidLeaveDays(profile.account_type, ...);  // 1/staff
  }
}
```

For 50 employees this is 50+ sequential round-trips. Worse: these calls use the module-level `query()` (a *different* connection from the open transaction's `client`), so reads are inconsistent with the in-progress payroll write snapshot.

**Fix:** Batch with `WHERE doctor_id = ANY($1::int[])` / `WHERE person_id = ANY($1::int[])`, join results in JS.

---

### 2.2 — Payroll run inserts line items one-by-one
**Severity:** Medium · **Confidence:** High
**File:** [`src/app/api/admin/payroll/runs/route.ts:102-170`](../src/app/api/admin/payroll/runs/route.ts#L102-L170)

50 staff = 50 sequential INSERT round-trips inside one open transaction. Combined with 2.1, total transaction duration for a 50-person payroll can exceed several seconds, holding locks and a pool connection.

**Fix:** Single multi-row INSERT with `UNNEST(…)` or `VALUES (…),(…),(…)`.

---

## 3. Missing / buggy WHERE clauses

### 3.1 — 🚨 DELETE `/api/visit/[patientId]` deletes by `visit_id` using a param named `patientId`
**Severity:** Critical · **Confidence:** High
**File:** [`src/app/api/visit/[patientId]/route.ts:21-36`](../src/app/api/visit/[patientId]/route.ts#L21-L36)

```ts
const id = (await params).patientId;  // segment is [patientId]
const res = await query(
  "update visit set is_deleted = true where visit_id = $1 ...",
  [id]  // id came from the patientId URL segment
);
```

The GET handler in the same file uses `WHERE patient_id = $1`. The DELETE uses `WHERE visit_id = $1`. They disagree about what the URL segment is. **If the frontend passes a `patient_id` matching the segment name, the DELETE silently soft-deletes the visit with `visit_id = patient_id` — potentially a completely different patient's visit.**

**Fix:** Rename segment to `[visitId]` and align both handlers, or move DELETE to accept `visit_id` from the request body.

---

### 3.2 — `PATCH /api/visit` has no auth and clobbers fields
**Severity:** High · **Confidence:** High
**File:** [`src/app/api/visit/route.ts:13-47`](../src/app/api/visit/route.ts#L13-L47)

Any unauthenticated caller who knows a `visit_id` can reassign it to any doctor, change visit type, and change status (bypassing `update_and_log_visit_status` audit). If `res.doctor_id = null` is passed, the FK becomes NULL.

**Fix:** Add `await getAuthenticatedUser(req)` and validate each field.

---

### 3.3 — `POST /api/visit` has no auth, creates a bill without authorization
**Severity:** High · **Confidence:** High
**File:** [`src/app/api/visit/route.ts:49-77`](../src/app/api/visit/route.ts#L49-L77)

Any unauthenticated caller can create visits with any `patient_id` + any `doctor_id` and the route automatically creates a linked bill.

**Fix:** Add `getAuthenticatedUser(req)` and validate role.

---

## 4. Implicit auth assumptions (impersonation)

### 4.1 — 🚨 `/api/visit/status` accepts `updated_by_doctor` / `updated_by_staff` from request body
**Severity:** High · **Confidence:** High
**File:** [`src/app/api/visit/status/route.ts:92-101`](../src/app/api/visit/status/route.ts#L92-L101)

```ts
let updatedByDoctor = data.updated_by_doctor ?? null;
let updatedByStaff  = data.updated_by_staff  ?? null;

if (!updatedByDoctor && !updatedByStaff) {
  if (user.role === "Doctor") { updatedByDoctor = await resolveDoctorIdByUserCode(...); }
```

If the client sends `updated_by_doctor: 7`, the server **trusts it** and passes directly to the stored procedure. Any authenticated user (even a receptionist) can attribute visit status changes to any doctor, corrupting the clinical audit trail.

**Fix:** Remove the body-field fallback. Always resolve actor from the JWT.

---

### 4.2 — 🚨 Prescription + lab routes trust `doctor_id` from request body with no auth at all
**Severity:** High · **Confidence:** High
**File:** [`src/app/api/prescription/route.ts:15-39`](../src/app/api/prescription/route.ts#L15-L39) and [`src/app/api/lab/route.ts:35-63`](../src/app/api/lab/route.ts#L35-L63)

```ts
// prescription
const doctor_id = prescriptions[0]?.doctor_id;  // from body, no auth check
// lab
const doctor_id = tests[0]?.doctor_id;  // from body, no auth check
```

Neither route calls `getAuthenticatedUser()`. **Any caller can create prescriptions or lab orders attributed to any doctor.** Total authentication bypass on two clinically critical write paths.

**Fix:** `getAuthenticatedUser(req)` → verify `account_type === 'doctor'` → resolve `doctor_id` from `user.user_code` → ignore body-supplied id.

---

## 5. Audit gaps

### 5.1 — Visit creation/PATCH/DELETE have zero audit logging
**Severity:** High · **Confidence:** High
**File:** `src/app/api/visit/route.ts` (all three handlers)

The status-only route uses `update_and_log_visit_status` correctly, but the raw PATCH (which changes `doctor_id` and `clinic_number`) is completely silent.

**Fix:** Call `logAuditEvent` after each successful write.

---

### 5.2 — Prescription + lab order creation are silent
**Severity:** High · **Confidence:** High
**File:** `src/app/api/prescription/route.ts`, `src/app/api/lab/route.ts`

Neither imports `logAuditEvent`. Clinical orders leave no record in the central `audit_logs` table.

---

### 5.3 — Sale return writes `pos_audit_log` but not central `audit_logs`
**Severity:** Medium · **Confidence:** High
**File:** [`src/app/api/transactions/return/route.ts:122-135`](../src/app/api/transactions/return/route.ts#L122-L135)

Admin audit stream (backed by `audit_logs`) never sees return events.

---

## 6. Trigger chain bypass / stock logic

### 6.1 — 🚨 Payroll counts only `seen_by_doctor` visits, misses every completed visit
**Severity:** High · **Confidence:** High
**File:** [`src/lib/server/workforceFinance.ts:193-207`](../src/lib/server/workforceFinance.ts#L193-L207)

```sql
WHERE v.doctor_id = $1
  AND v.status = 'seen_by_doctor'   -- ONLY this status
  AND v.visit_timestamp >= $2::date
```

Once a visit progresses to `medicines_dispensed` or `completed`, the doctor is no longer counted. A doctor who saw 40 patients today — all of whose visits progressed to `completed` — gets paid for **0 patients** if payroll is run after the shift ends.

**Fix:** `AND v.status != 'waiting'`, or count visits that ever had `seen_by_doctor` via `visit_status_history`.

---

### 6.2 — Stock float cast to `::integer` truncates fractional stock
**Severity:** Medium · **Confidence:** High
**File:** [`src/app/api/transactions/stockValidation.ts:307-310`](../src/app/api/transactions/stockValidation.ts#L307-L310)

```sql
COALESCE(mb.stock_quantity, 0)::integer     AS stock_quantity,
COALESCE(mb.stock_sub_quantity, 0)::integer AS stock_sub_quantity,
```

If `medicine_batch.stock_quantity` is `numeric(10,2)`, casting to `::integer` truncates. A batch with `0.5` becomes `0` and is skipped by FEFO as empty.

**Fix:** Use `::numeric` or `::float8`.

---

## 7. JSONB schema drift

### 7.1 — `policy_snapshot` is written but never read back during recompute
**Severity:** Medium · **Confidence:** High
**File:** [`src/lib/server/attendance.ts:368-440`](../src/lib/server/attendance.ts#L368-L440)

```ts
// recomputeAndPersistAttendance:
const roster = await getRosterForAttendance(...);
const evaluated = evaluateAttendance({ ..., roster }, policy);  // policy re-fetched from DB
// policy_snapshot column exists in the row but is never READ here
```

When attendance is retroactively recomputed (e.g. after admin correction), the function uses the **current** policy, not the snapshot stored at check-in. **A policy change after check-in retroactively alters all historical attendance evaluations** — defeating the entire point of `policy_snapshot`.

**Fix:** Read `policy_snapshot` from the attendance row and use it when present.

---

### 7.2 — Cashier idempotency lookup scoped to `bill_id`
**Severity:** Medium · **Confidence:** Medium
**File:** [`src/app/api/cashier/settle/route.ts:93-112`](../src/app/api/cashier/settle/route.ts#L93-L112)

```ts
WHERE idempotency_key = $1 AND endpoint = $2 AND bill_id = $3
```

The same key can settle two different bills. Industry standard is global uniqueness per client.

**Fix:** Remove `bill_id` from the WHERE; return 422 if a matching key exists for a different bill.

---

## 8. SSE leaks / EventSource cleanup

### 8.1 — Admin audit SSE: `source` ref may be null at cleanup if closed between reconnects
**Severity:** Medium · **Confidence:** High
**File:** [`src/app/admin/audit/page.tsx:71-106`](../src/app/admin/audit/page.tsx#L71-L106), [`src/app/admin/page.tsx:354-385`](../src/app/admin/page.tsx#L354-L385)

If cleanup runs while `source === null` (errored, reconnect timer not yet fired), `source?.close()` is a no-op. Common case OK; fragile under fast React re-mounts (e.g. Strict Mode if re-enabled).

**Fix:** Store in a `useRef` so cleanup always captures the latest value.

---

### 8.2 — SSE stream `controller.enqueue` has no error handling for already-closed stream
**Severity:** Low · **Confidence:** Medium
**File:** [`src/lib/server/queueEvents.ts:55-65`](../src/lib/server/queueEvents.ts#L55-L65)

If client disconnects between `if (closed)` and `controller.enqueue(...)`, the enqueue throws.

**Fix:** Wrap in `try/catch` that calls `cleanup()` on error.

---

## 9. Number / string coercion

### 9.1 — 🚨 Float arithmetic on currency amounts in settle route
**Severity:** High · **Confidence:** High
**File:** [`src/app/api/cashier/settle/route.ts:114-135`](../src/app/api/cashier/settle/route.ts#L114-L135)

```ts
const billTotal = Number(bill.total_amount ?? 0);    // pg returns numeric as string
const paidBefore = Number(paidBeforeResult.rows[0]?.paid_total ?? 0);
const outstandingBefore = Math.max(billTotal - paidBefore, 0);
if (amount > outstandingBefore) { /* overpayment block */ }
```

`Number("10.10") - Number("9.90") === 0.19999999999999929`. The overpayment guard can allow or block legitimate payments for non-round amounts.

**Fix:** Integer cent arithmetic, or do the math in Postgres (`SELECT GREATEST(b.total_amount - COALESCE(SUM(t.amount),0), 0)`).

---

### 9.2 — 🚨 Return route uses `getCurrentStaffId()=1` with no auth whatsoever
**Severity:** Critical · **Confidence:** High
**File:** [`src/app/api/transactions/return/route.ts:24`](../src/app/api/transactions/return/route.ts#L24)

The entire return path — stock-increment triggers, `sale_return`, `sale_return_detail` — runs without authentication. **Any unauthenticated POST to `/api/transactions/return` can corrupt pharmacy inventory.**

**Fix:** Use the `resolveStaffIdFromRequest(request, client)` pattern from `POST /api/transactions/route.ts`.

---

### 9.3 — 🚨 Purchase route uses `getCurrentStaffId()` with no auth
**Severity:** Critical · **Confidence:** High
**File:** [`src/app/api/pharmacy/purchase/route.ts:20`](../src/app/api/pharmacy/purchase/route.ts#L20)

Same as 9.2 — all medicine purchase creation and stock-increment triggers run without auth.

---

## 10. Date / timezone bugs

### 10.1 — New visit duplicate guard uses PostgreSQL `current_date`, not clinic timezone
**Severity:** Medium · **Confidence:** High
**File:** [`src/app/api/visit/route.ts:53-55`](../src/app/api/visit/route.ts#L53-L55)

```sql
WHERE patient_id = $1
  AND (visit_timestamp > current_date AND visit_timestamp < current_date + interval '1 day')
```

`current_date` follows the server's timezone (UTC on Supabase). A clinic in Asia/Karachi (UTC+5) creating a visit at 11 PM local time has `visit_timestamp` in UTC the next day. The guard misses the open visit. **After 7 PM local, two visits can be created for the same patient.**

**Fix:** Compute `start_of_day`/`end_of_day` in clinic TZ in app code, pass as params.

---

### 10.2 — `combineDateTime` parses without timezone → local-time interpretation on server
**Severity:** Medium · **Confidence:** High
**File:** [`src/lib/server/attendance.ts:77-83`](../src/lib/server/attendance.ts#L77-L83)

```ts
function combineDateTime(date: string, hhmmss: string | null) {
  const parsed = new Date(`${date}T${normalized}`);  // no timezone suffix
  return parsed;
}
```

`new Date("2026-05-23T08:00:00")` is parsed as **local time** in Node. On Vercel (UTC), a shift starting at `08:00 Asia/Karachi` is treated as `08:00 UTC` = 1 PM Karachi. **All late/overtime calculations are 5 hours off.**

**Fix:** Use `zonedDateTimeToUtc()` from `src/lib/server/systemTimezone.ts`.

---

## 11. Stock math edge cases (see also 6.2)

### 11.1 — Reversal loop reads `pharmacy_sale.due_amount` without locking rows
**Severity:** Medium · **Confidence:** Medium
**File:** [`src/app/api/cashier/reversal/route.ts:153-203`](../src/app/api/cashier/reversal/route.ts#L153-L203)

```ts
for (const alloc of allocationResult.rows) {
  await client.query(`UPDATE pharmacy_sale SET due_amount = GREATEST(due_amount + $2, 0) ...`);
}
```

No `SELECT ... FOR UPDATE` on `pharmacy_sale` rows. Two concurrent reversals of the same payment's allocations read the same stale `due_amount` and produce incorrect final settlement status.

**Fix:** `SELECT sale_id FROM pharmacy_sale WHERE sale_id = $1 FOR UPDATE` at top of allocation loop.

---

## 12. Lab parameter validation

### 12.1 — 🚨 Lab + prescription routes use `http://localhost:3000` self-calls (PRODUCTION OUTAGE)
**Severity:** Critical · **Confidence:** High
**File:** [`src/app/api/lab/route.ts:46`](../src/app/api/lab/route.ts#L46), [`src/app/api/prescription/route.ts:26`](../src/app/api/prescription/route.ts#L26)

```ts
const visit_res = await fetch(`http://localhost:3000/api/visit/${patient_id}`);
```

On Vercel, there is no process listening on `localhost:3000`. **Every lab order creation and prescription creation fails in production with a network connection error.** These routes have never worked in production.

**Fix:** Replace with direct SQL:
```ts
const visitRow = await client.query(
  `SELECT visit_id FROM visit WHERE patient_id = $1
   AND date_trunc('day', visit_timestamp) = current_date
   AND is_deleted = false LIMIT 1`,
  [patient_id]
);
```

---

### 12.2 — Lab order PATCH accepts arbitrary status values with no validation or auth
**Severity:** Medium · **Confidence:** High
**File:** [`src/app/api/lab/route.ts:91-130`](../src/app/api/lab/route.ts#L91-L130)

Any status string can be written to `lab_order.status`. No role check, no allowed-values validation, no auth.

**Fix:** `getAuthenticatedUser`, allowed-status enum, input validation.

---

## 13. Roster / attendance edge cases

### 13.1 — Attendance corrections API supports only staff, silently excludes doctors
**Severity:** Medium · **Confidence:** High
**File:** [`src/app/api/admin/staff/v2/attendance-corrections/route.ts:60-92`](../src/app/api/admin/staff/v2/attendance-corrections/route.ts#L60-L92)

The table only has a `staff_id` column. **Doctor attendance corrections cannot be submitted**, even though attendance explicitly supports doctors (separate `doctor_attendance` table).

**Fix:** Add `account_type`/`person_id` columns to `attendance_regularization_requests`. Mirror the leave-request pattern.

---

### 13.2 — Night shift adds `24*60*60*1000` ms, breaks on DST transitions
**Severity:** Low · **Confidence:** Medium
**File:** [`src/lib/server/attendance.ts:307-308`](../src/lib/server/attendance.ts#L307-L308)

```ts
if (start && end && end.getTime() <= start.getTime()) {
  end = new Date(end.getTime() + 24 * 60 * 60 * 1000);  // assumes 24-hour day
}
```

Adding exactly 86,400,000 ms fails on DST nights (23h or 25h days). Late/overtime minutes off by ±60 minutes on DST boundaries. (Pakistan doesn't observe DST currently, but other deployments may.)

**Fix:** Use `zonedDateTimeToUtc` to compute next-day end time in clinic timezone.

---

## 14. Payroll immutability

### 14.1 — "void" action on finalized payroll requires only Admin role, no reason
**Severity:** Medium · **Confidence:** High
**File:** [`src/app/api/admin/payroll/runs/[id]/route.ts:67-118`](../src/app/api/admin/payroll/runs/[id]/route.ts#L67-L118)

```ts
if (existing.rows[0].status === "finalized" && body?.action !== "void") {
  return NextResponse.json({ error: "Finalized payroll run is immutable" }, { status: 409 });
}
if (body?.action === "void") {
  await query(`UPDATE payroll_run SET status = 'void' ...`);
```

**Any Admin can void a finalized payroll.** No Super Admin guard, no `void_reason` validation, no check whether disbursement already occurred. The immutability test only covers the `adjustment` path — the `void` bypass is untested.

**Fix:** Require `role === 'Super Admin'` for void of finalized. Require `void_reason`.

---

## 15. Cashier reversal edge cases

### 15.1 — Reversal does not revert `visit.status` from `payment_done`
**Severity:** Medium · **Confidence:** High
**File:** [`src/app/api/cashier/reversal/route.ts:206-224`](../src/app/api/cashier/reversal/route.ts#L206-L224)

After successful payment, visit becomes `payment_done`. After reversal, `bill.payment_status` reverts to `Unpaid` but `visit.status` remains `payment_done`. Cashier worklist filters on bill status so it surfaces back, but clinical-side "payment done" reporting will be wrong.

**Fix:** After updating bill, if `paymentStatus !== 'Paid'` and `visitId` is set, call `update_and_log_visit_status` to transition the visit back.

---

## 16. Session validation completeness

### 16.1 — 🚨 `requireAdminOrSuperAdmin` checks mixed-case role strings that don't match normalized JWT role
**Severity:** Critical · **Confidence:** High
**File:** [`src/lib/server/auth.ts:117-127`](../src/lib/server/auth.ts#L117-L127)

```ts
// auth.ts: checks raw DB value
if (user.role !== "Admin" && user.role !== "Super Admin") {
  throw new AuthError("Forbidden", 403);
}

// middleware.ts: normalizes to lowercase
if (role === "admin") return "admin";
if (role === "super admin" || role === "super_admin") return "super_admin";

// cashier.ts: mixed case
const CASHIER_ALLOWED_ROLES = ["Cashier", "Admin", "Super Admin"]
```

`getAuthenticatedUser()` returns `String(payload.role ?? "")` — the raw JWT value set at login from the DB column. **If the DB stores `"admin"` (lowercase), `requireAdminOrSuperAdmin` throws 403 — admin accounts are locked out of all admin APIs.** The two normalization paths can drift independently.

**Fix:** Apply `normalizeRole()` inside `getAuthenticatedUser()`; update all permission checks to use normalized values.

---

## 17. CSRF protection

### 17.1 — All state-changing routes use `SameSite=Lax` with no CSRF token
**Severity:** Medium · **Confidence:** High
**File:** [`src/app/api/login/route.ts:196-202`](../src/app/api/login/route.ts#L196-L202)

`SameSite=Lax` protects top-level cross-site POSTs but not cross-site GETs with side effects or same-site subdomain attacks. All mutation routes rely entirely on the cookie. For a medical records system, residual risk is unacceptable even with `httpOnly`.

**Fix:** Upgrade to `SameSite=strict`, or add an `X-CSRF-Token` double-submit cookie pattern.

---

## 18. Error handling that swallows context

### 18.1 — Lab + prescription routes return "Database error" / "Server error" with no actionable detail
**Severity:** Low · **Confidence:** High
**File:** `src/app/api/lab/route.ts:81`, `src/app/api/prescription/route.ts:72`

Given the `localhost:3000` failure (Finding 12.1), every production call returns `{ error: "Database error" }`. Monitoring can't distinguish localhost-fetch failure from real DB error.

**Fix:** Return distinguishable error code. Log full error with `err.code` server-side.

---

## 19. SQL injection risk

### 19.1 — `attendanceTableInfo` interpolates table/column names from controlled enum (safe today, fragile pattern)
**Severity:** Low · **Confidence:** Medium
**File:** [`src/lib/server/attendance.ts:107-125`](../src/lib/server/attendance.ts#L107-L125), used throughout

```ts
`SELECT * FROM ${info.tableName} WHERE ${info.idColumn} = $1`
```

Not currently exploitable (values come from a controlled switch), but any future callsite that passes an external value through this pattern would be SQL-injectable.

**Fix:** Add runtime guard: `if (tableName !== 'staff_attendance' && tableName !== 'doctor_attendance') throw new Error('Invalid table')`.

---

## 20. Hardcoded magic strings

### 20.1 — Role strings defined in three places with different casings
**Severity:** Medium · **Confidence:** High
**Files:** `src/middleware.ts`, `src/lib/server/auth.ts`, `src/lib/server/cashier.ts`

```ts
// middleware.ts: lowercase normalized
"admin", "super_admin", "cashier"
// auth.ts: mixed case DB values
"Admin", "Super Admin"
// cashier.ts: mixed case
["Cashier", "Admin", "Super Admin"]
```

Three definitions, three casings. A deployment where `staff.role` stores `"cashier"` will pass middleware but fail `CASHIER_ALLOWED_ROLES.includes()`.

**Fix:** One `ROLES` const + normalize in `getAuthenticatedUser()`.

---

## 21. Test coverage gaps

### 21.1 — Zero tests for visit creation/deletion, status, prescription, lab, return, purchase
**Severity:** Medium · **Confidence:** High

No test files for:
- `src/app/api/visit/route.ts`
- `src/app/api/visit/[patientId]/route.ts`
- `src/app/api/lab/route.ts`
- `src/app/api/prescription/route.ts`
- `src/app/api/transactions/return/route.ts`
- `src/app/api/pharmacy/purchase/route.ts`

These are the routes with the most critical bugs found here. Zero coverage → bugs survive indefinitely.

**Priority test targets:** (1) POST `/api/visit` duplicate guard, (2) DELETE `/api/visit/[patientId]` param mismatch, (3) POST `/api/lab` localhost failure, (4) POST `/api/transactions/return` missing auth.

---

### 21.2 — FEFO allocation under concurrent load has no tests
**Severity:** Low · **Confidence:** Medium
**File:** `src/app/api/transactions/stockValidation.ts`

The FEFO with `FOR UPDATE` is the most complex concurrency-sensitive code. No tests for: concurrent depletion of the same batch, `sub_unit_price = null` fallback (line 362 divides `batch.unit_price / subUnitsPerUnit` with no null guard), behavior when `remainingSubUnits > 0` after exhausting all batches.

---

## Top 10 to fix this quarter

| Priority | Finding | Severity | Why |
|---|---|---|---|
| 1 | **12.1** — `localhost:3000` self-call in lab + prescription | Critical | **Production outage**: all lab order + prescription creation fails on Vercel right now |
| 2 | **9.2 / 9.3** — Return + Purchase routes: no auth, hardcoded `staffId=1` | Critical | Unauthenticated write access to pharmacy stock |
| 3 | **3.2 / 3.3** — `/api/visit` PATCH and POST: no auth | Critical/High | Any unauthenticated caller can create / corrupt visit records and bills |
| 4 | **16.1** — Role case mismatch: `requireAdminOrSuperAdmin` checks `"Admin"` but DB may store `"admin"` | Critical | Admin accounts can be locked out of admin APIs |
| 5 | **3.1** — DELETE `/api/visit/[patientId]` uses `visit_id` from a param named `patientId` | Critical | Deletes wrong visit — data loss risk |
| 6 | **4.1 / 4.2** — Impersonation via body-supplied `doctor_id` and `updated_by_doctor` | High | Any authenticated user can attribute actions to any doctor |
| 7 | **6.1** — Payroll counts only `seen_by_doctor` status, misses completed visits | High | Doctors underpaid on every per-patient payroll run |
| 8 | **9.1** — Float arithmetic on currency amounts in settle route | High | Overpayment guard allows / blocks legitimate payments due to float drift |
| 9 | **1.1** — Attendance check-in: no transaction, duplicate row risk | High | Corrupts attendance records on double-tap / device replay |
| 10 | **15.1** — Reversal does not revert visit from `payment_done` | Medium | Visit permanently shows as paid after reversal |
