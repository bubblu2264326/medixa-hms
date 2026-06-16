# Issues Found

Findings from a code review pass on the live tree (2026-05-23) across backend (route handlers + server helpers), frontend (App Router + features), and database (live snapshot in `database/snapshot/`). Items are prioritized by impact, with file:line references where relevant.

Each item ends with **Fix sketch** so you can act without re-discovering the diagnosis.

---

## Backend

### B1. ⚠️ **CRITICAL** — `/api/*` is not gated by middleware

[`src/middleware.ts:80`](../src/middleware.ts#L80):
```ts
export const config = { matcher: ["/doctor/:path*", "/lab/:path*", "/pharmacy/:path*", "/receptionist/:path*", "/admin/:path*", "/cashier/:path*", "/employee/:path*"], };
```

The matcher only covers frontend role paths. **`/api/*` routes are not gated by middleware**. They rely entirely on the route handler calling `requireAdminOrSuperAdmin` (or equivalent) itself.

**Count**: 38 of 159 API route files import an auth helper. That means **~121 API route files have no explicit auth check**. Many of those (login, logout, public reads) should be public — but most should not. Concrete examples I verified:

- [`src/app/api/visit/route.ts`](../src/app/api/visit/route.ts) — `POST` (create visit + bill), `PATCH` (update visit), `DELETE` (soft-delete) — **no auth check**.
- [`src/app/api/patient/route.ts`](../src/app/api/patient/route.ts) — patient CRUD — **no auth check**.
- [`src/app/api/pharmacy/prescription-sale/route.ts`](../src/app/api/pharmacy/prescription-sale/route.ts) — creates pharmacy sale — **no auth check**.
- [`src/app/api/prescription/route.ts`](../src/app/api/prescription/route.ts) — Rx CRUD — **no auth check**.

**Risk**: anyone reachable on the network (i.e. the public internet in production) can read/write patient data, create sales, modify visits, alter prescriptions — bypassing the entire role system.

**Fix sketch**:
1. Add `/api/:path*` to the middleware matcher and have it verify the JWT cookie (skip the public allowlist).
2. Maintain a small public-route allowlist inside middleware: `/api/login`, `/api/login/*`, `/api/logout`, `/api/public/*`.
3. Audit each handler that requires a specific role and add `requireRole(req, "Doctor" | "Pharmacist" | …)` calls.

---

### B2. ⚠️ Visit-status updates bypass the audited procedure

The DB has `update_and_log_visit_status(p_visit_id, p_status, p_updated_by_doctor, p_updated_by_staff)` which atomically updates `visit.status` **and** appends to `visit_status_history`. Some routes use it; others don't.

**Bypassing routes**:
- [`src/app/api/visit/route.ts:33-36`](../src/app/api/visit/route.ts#L33-L36) — `PATCH` runs `update visit set ... status = $5 ...` directly.
- [`src/app/api/visit/[patientId]/route.ts`](../src/app/api/visit/[patientId]/route.ts) — also runs direct UPDATEs.

**Compliant routes** (using the procedure or its helper):
- [`src/app/api/visit/status/route.ts`](../src/app/api/visit/status/route.ts)
- [`src/app/api/doctor/visit/[visitId]/soft-delete/route.ts`](../src/app/api/doctor/visit/[visitId]/soft-delete/route.ts)
- [`src/app/api/cashier/settle/route.ts`](../src/app/api/cashier/settle/route.ts)
- [`src/app/api/transactions/route.ts`](../src/app/api/transactions/route.ts)
- `src/lib/server/doctorWorkspace.ts`

**Risk**: status transitions through `PATCH /api/visit` are invisible to `visit_status_history` — auditors can't reconstruct the sequence.

**Fix sketch**: replace every direct `update visit set ... status` with a call to a shared helper in `src/lib/server/visitLifecycle.ts` that wraps the procedure.

---

### B3. ⚠️ Hardcoded JWT fallback secret

[`src/middleware.ts:3`](../src/middleware.ts#L3):
```ts
const JWT_Secret = new TextEncoder().encode(process.env.secret_key || "hms_super_secure_2026_clinic_key");
```

[`src/app/api/login/route.ts:7`](../src/app/api/login/route.ts#L7) has the same fallback.

**Risk**: if `process.env.secret_key` is ever unset in production, an attacker who reads the code can forge valid JWTs. This is committed to a public-by-default repo location.

**Fix sketch**: throw on startup if `process.env.secret_key` is missing in `NODE_ENV=production`. Remove the literal fallback entirely (or replace with a random per-process value in development only).

---

### B4. `getCurrentStaffId()` is a hardcoded `1` and is still imported in 14 API routes

[`src/lib/utils.ts:28-32`](../src/lib/utils.ts#L28-L32):
```ts
export function getCurrentStaffId(): number {
  // TODO: Get from session/auth
  return 1;
}
```

Still called in:
- `src/app/api/transactions/route.ts:34, 45`
- `src/app/api/transactions/[id]/route.ts:44`
- `src/app/api/transactions/return/route.ts:24`
- `src/app/api/transactions/return/[id]/route.ts:160`
- `src/app/api/transactions/hold/route.ts:98, 200, 312`
- `src/app/api/pharmacy/purchase/route.ts:20`
- `src/app/api/pharmacy/purchase/[id]/route.ts:133`
- `src/app/api/pharmacy/ledger/route.ts:118`
- `src/app/api/pos/receipt-config/route.ts:93`
- `src/app/api/print/receipt/route.ts:82`
- `src/app/api/hardware/cash-drawer/route.ts:13`

**Risk**: every audit / `recorded_by` / `created_by` from these routes attributes the action to `staff_id = 1`. The audit log is wrong in those paths. In production this corrupts attribution permanently.

**Fix sketch**: replace each call with a JWT-derived id via `src/lib/server/auth.ts` (or a new `requireStaff(req)` helper). Delete `getCurrentStaffId()` entirely once callers are migrated.

---

### B5. Multi-statement writes without transactions

[`src/app/api/visit/route.ts:65-67`](../src/app/api/visit/route.ts#L65-L67):
```ts
const v_res  = await query('insert into visit(...) values($1,...$6) returning *;', [...]);
const bill_res = await query("insert into bill(patient_id,visit_id,total_amount,payment_status) values($1,$2,$3,$4) returning *", [...]);
```

These are two separate auto-commit statements. If the `bill` insert fails (or the process dies between them), a visit exists without a bill.

Similar patterns appear in some pharmacy purchase and cashier routes — 27 files use `pool.connect()`, which is the prerequisite for `BEGIN`/`COMMIT`, but I did not audit every one.

**Fix sketch**: introduce a `withTransaction(cb)` helper in `database/db.ts`:
```ts
export async function withTransaction<T>(cb: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await cb(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
```
Then refactor multi-write routes to use it.

---

### B6. User-code prefix routing uses `includes("DOC")`

[`src/app/api/login/route.ts:32`](../src/app/api/login/route.ts#L32) and [`src/app/api/login/[userCode]/route.ts:10`](../src/app/api/login/[userCode]/route.ts#L10):
```ts
if (userCodeInput.includes("DOC")) { /* check doctor table */ }
else { /* check staff table */ }
```

**Risk**: a staff `user_code` that happens to contain `"DOC"` (e.g. a future `STAFFDOC1`) would be routed to the doctor table and fail to authenticate. A doctor whose code doesn't contain `DOC` (legacy?) would be missed.

**Fix sketch**: use `userCodeInput.startsWith("DOC")` or, better, store `account_type` ('doctor' / 'staff') on the row and query a unified view.

---

### B7. User enumeration via lookup endpoint

[`src/app/api/login/[userCode]/route.ts:17-19`](../src/app/api/login/[userCode]/route.ts#L17-L19) returns `404 "User code not found"` vs `200` for existing codes. Attackers can enumerate valid `STFNNN`/`DOCNNN` codes before brute-forcing passwords.

**Fix sketch**: return `200` with `{ exists: false, name: null }` for non-existent codes (no info leakage), or require successful login before revealing user details. Rate-limit either way.

---

### B8. No rate limiting on login

[`src/app/api/login/route.ts`](../src/app/api/login/route.ts) tracks failed attempts per user (`failed_login_attempts`, `account_locked_until`) but **does not limit by IP**. An attacker can brute-force across many user codes from a single IP without hitting any user-level lockout.

**Fix sketch**: add a per-IP token bucket (in-memory or Supabase-backed). Combine with the existing per-user lockout.

---

### B9. Cookie `secure: true` is unconditional

[`src/app/api/login/route.ts:198, 388`](../src/app/api/login/route.ts#L198) sets `secure: true` always. Browser will drop the cookie on plain HTTP, breaking local development unless served over HTTPS or accessed via `localhost` (which most browsers exempt).

**Fix sketch**:
```ts
secure: process.env.NODE_ENV === "production",
```

---

### B10. Direct DB SSL is unconditional in `database/db.ts`

[`database/db.ts:8-9`](../database/db.ts#L8-L9) sets `ssl: { rejectUnauthorized: false }` for **every** environment. Fine for Supabase, but breaks fully-local Postgres without TLS.

**Fix sketch** (already drafted in [`documentation/setup.md`](./setup.md)):
```ts
const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? "");
ssl: isLocal ? false : { rejectUnauthorized: false },
```

---

### B11. 243 `console.*` calls across 147 API route files

Mix of debug `console.log` left from development and `console.error` after `catch`. Production logs are unstructured noise.

**Fix sketch**: introduce a `src/lib/server/logger.ts` (pino, or JSON-on-console). Sweep `console.log` → debug logger; keep `console.error` → logger.error only where it's intentional. ESLint rule `no-console` (warning) prevents new ones.

---

### B12. `req.body` parsing without zod schemas

[`src/app/api/visit/route.ts:14, 50, 81`](../src/app/api/visit/route.ts):
```ts
const res = await req.json();
```
Then `res.visit_id`, `res.patient_id`, etc. are used directly. No type validation. Some routes (e.g. `src/app/api/admin/staff/v2/*`) do validate; many don't.

**Fix sketch**: a `parseBody(req, schema)` helper that runs the body through a zod schema and returns 400 on parse failure. Migrate routes incrementally, starting with mutations.

---

### B13. Inconsistent error response shapes

Throughout the API:
- `{ error: "..." }`
- `{ message: "..." }`
- `{ error: err.message }`
- `"failed to update visist"` (sic — [`src/app/api/visit/route.ts:45`](../src/app/api/visit/route.ts#L45))

Clients have to guess. A typo in `"visist"` would be caught by a typed response shape.

**Fix sketch**: a single helper `respond.error(status, code, message)` that returns `{ error: { code, message } }` with a discriminated union of error codes. Migrate incrementally.

---

### B14. `PATCH /api/visit` clobbers undefined fields

[`src/app/api/visit/route.ts:33-36`](../src/app/api/visit/route.ts#L33-L36):
```ts
const v_res = await query(
  "update visit set doctor_id = $2, visit_type = $3, clinic_number = $4, status = $5, reason = $6 where visit_id = $1 and is_deleted = false returning *",
  [res.visit_id, res.doctor_id, res.visit_type, res.clinic_number, res.status, res.reason]
);
```

If the client sends a partial payload (e.g. only `status`), the other columns get set to `undefined` → bound as `NULL`, overwriting the existing values.

**Fix sketch**: build the SET clause dynamically from defined keys, e.g. `COALESCE($2, doctor_id)` or only-include-fields-present.

---

### B15. `figma-mcp` is an unused dependency

`package.json:27` lists `"figma-mcp": "^0.1.4"` in dependencies. Grep finds no import.

**Fix sketch**: `pnpm remove figma-mcp` if truly unused. Saves install time and reduces supply-chain surface.

---

### B16. `pnpm` is listed as a project dependency

`package.json:33` lists `"pnpm": "^10.27.0"` in dependencies. This is unusual — pnpm is meant to be the package manager, not bundled into the app's runtime tree.

**Fix sketch**: move to `packageManager` field or use a corepack pin: `"packageManager": "pnpm@10.27.0"`. Remove from `dependencies`.

---

## Frontend

### F1. `Date.toLocale*` ESLint rule is `warn`, not `error` → 44 violations

The lint rule in [`eslint.config.mjs:24-43`](../eslint.config.mjs#L24-L43) is `"warn"` so violations accumulate. Current count: 44 across 17 files. Worst offenders:

- `src/app/admin/payroll/page.tsx` — 11
- `src/app/admin/analytics/page.tsx` — 6
- `src/features/pharmacy/purchase/components/MedicinePurchaseForm.tsx` — 4
- `src/features/pharmacy/purchaseReturn/components/PurchaseReturn.tsx` — 4

**Risk**: dates render in the user's browser locale, not the system timezone. A Karachi clinic where a user has a US locale will see dates shifted/formatted inconsistently with audit and DB records.

**Fix sketch**: change rule severity to `"error"`, then sweep the existing call sites. Use `src/lib/timezone/client.ts` helpers.

---

### F2. Two notification libraries coexist

`package.json` ships both:
- `react-hot-toast@^2.6.0`
- `sonner@^2.0.7`

Different modules import different ones. Visual inconsistency, larger bundle.

**Fix sketch**: pick one (`sonner` is newer + better-styled) and migrate. Remove the other dependency.

---

### F3. `reactStrictMode` is disabled

[`next.config.ts:5`](../next.config.ts#L5):
```ts
reactStrictMode: false,
```

Hides double-mount bugs that would surface in dev. With SSE subscriptions and form bookkeeping in play, this masks real issues.

**Fix sketch**: re-enable strict mode in dev, fix the resulting console warnings (most likely duplicate `EventSource` subscriptions, missed `useEffect` cleanups, and double-call mutations). Leaving it off in prod is fine — strict mode only fires in dev.

---

### F4. Reused DB-shape types are duplicated across features

Each feature redeclares its own `Patient`, `Visit`, `Medicine` types. They drift over time. There is no `types/db.ts` mirror of the schema.

**Fix sketch**: generate types from the live schema (e.g. `kysely-codegen` or a hand-written `src/lib/types/db.ts`) and have feature code import from there. Could also derive from `database/snapshot/tables.md` programmatically.

---

### F5. No loading / error states convention

A spot-check shows feature components handle loading/error inconsistently — some use `useState({ loading, error })`, some use TanStack Query patterns (without installing TanStack Query), some swallow errors silently.

**Fix sketch**: pick one of:
- Install `@tanstack/react-query` and use it universally,
- or define a `useApi(fn)` hook in `src/features/shared/` that returns `{ data, loading, error, refetch }`.

---

### F6. Accessibility not audited

Radix primitives give a good baseline, but custom UI in `src/components/ui/` and per-feature components hasn't been swept for:
- Keyboard navigation in tab/parallel-route workspaces
- `aria-label` on icon-only buttons
- Focus management in dialogs
- Color contrast in success/error states

**Fix sketch**: run `axe-core` against each role workspace, fix issues iteratively. Document at least keyboard-only navigation for the POS (high-traffic surface).

---

### F7. `figma-mcp` (frontend-side too)

Same dependency as B15 — `figma-mcp` is `import`-less in src/. Either remove or wire up.

---

## Database

### D1. Three overloads of `get_clinic_number`, two of them legacy

[`database/snapshot/routines.md`](../database/snapshot/routines.md):
- `get_clinic_number()` — returns next per-day clinic number (any visit_type)
- `get_clinic_number(p_patient_id integer)` — same body, **ignores** the argument
- `get_clinic_number(p_visit_type text)` — preferred; numbers per-day, per-visit-type

**Risk**: callers using the patient-id overload may believe the argument matters. It doesn't. The numbering is shared across all visit types if either of the first two are used.

**Fix sketch**: grep callers, migrate to the `(p_visit_type text)` overload, then `DROP FUNCTION get_clinic_number()` and `DROP FUNCTION get_clinic_number(integer)`.

---

### D2. Mixed timestamp types

Some tables use `timestamptz` (post-2026-03-25 timezone migration):
- `staff_attendance`, `doctor_attendance`
- `audit_logs`
- `staff_security_sessions`, `doctor_security_sessions`

Others still use `timestamp without time zone`:
- `visit`, `prescription`, `lab_order`, `pharmacy_sale`, `medicine_purchase`, `bill`

**Risk**: with a clinic in `Asia/Karachi` and Supabase on UTC, the legacy columns store local-but-untagged timestamps. When the same record is read by code that assumes UTC, it's off by 5 hours. Mixed types also make cross-table joins on time ranges brittle.

**Fix sketch**: continue the migration started by `2026_03_25_attendance_timestamptz_phase2.sql` — add migrations for `visit`, `pharmacy_sale`, `medicine_purchase`, `bill`, `prescription`, `lab_order`. Plan column-by-column to avoid lock storms.

---

### D3. `staff_permissions` is empty (legacy)

The table exists but has 0 rows in live data ([`database/snapshot/overview.md`](../database/snapshot/overview.md)). RBAC v2 uses `staff_permission_policies` (84 rows). The empty table is misleading documentation.

**Fix sketch**: either delete the table once you're certain nothing reads it, or annotate it as deprecated in a migration comment.

---

### D4. No custom enums; CHECK constraints used instead

Every status/type field uses CHECK constraints rather than pg enum types:
- `visit.status`, `visit_type`
- `lab_order.status`, `urgency`
- `medicine_transaction.txn_type`
- `patient.gender`

**Trade-off**: CHECKs are easier to alter (no `ALTER TYPE`), but lose pg's `enum`-typed columns in app code (drivers map enums to known TS types). Mixed clinical-state systems usually go enum.

**Fix sketch** (optional): no urgent change. If you want type safety in TS without a code-gen step, migrate the busiest CHECKs to enums.

---

### D5. The `is_deleted` column on `visit` is undocumented in earlier docs

The introspection snapshot now reflects it ([`database/snapshot/tables.md`](../database/snapshot/tables.md)) and code uses it (`is_deleted = false` filters in [`src/app/api/visit/route.ts`](../src/app/api/visit/route.ts)). Earlier markdown docs treated `visit` as without a soft-delete column. Resolved now that the snapshot is refreshed — flagged here so the pattern is visible.

**Soft-delete consistency check**: I did not verify whether *every* read of `visit` filters `is_deleted = false`. Some routes may surface deleted visits.

**Fix sketch**: grep all `from visit` reads; ensure each has `and is_deleted = false` (or `coalesce(is_deleted, false) = false`). Consider a view `visit_active` that hides the column.

---

### D6. FK columns may lack indexes

I didn't enumerate every FK column vs every existing index in this pass, but worth checking. With 17 trigger-driven side-effects updating `medicine_batch` and `medicine_transaction`, missing indexes on hot FKs (e.g. `medicine_transaction.ref_sale_id`, `medicine_transaction.batch_id`) cause sequential scans.

**Fix sketch**: run this query against Supabase:
```sql
SELECT conrelid::regclass AS table_name, conname AS fk_name, pg_get_constraintdef(oid)
FROM pg_constraint c
WHERE contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid
      AND (c.conkey[1] = ANY (i.indkey))
  );
```
Add indexes on any FK column the query returns. Highest priority: `medicine_transaction.*`, `pharmacy_sale_detail.sale_id`, `audit_logs.staff_id`.

---

### D7. JSONB columns are schema-less

- `staff.staff_tags`
- `*_attendance.policy_snapshot`
- `audit_logs.details`
- `employee_lifecycle_*.metadata`
- `employee_lifecycle_template_tasks.metadata`

These are valid uses of JSONB, but there's no enforcement of shape. Future code can write any structure.

**Fix sketch**: optional — add CHECK constraints with `jsonb_typeof()` and key existence (`?` operator) on the highest-value JSONB columns (`policy_snapshot`, `audit_logs.details`).

---

### D8. `cleanup_old_audit_logs(p_days)` exists but has no scheduler

A retention helper is defined but never auto-runs. `audit_logs` will grow unbounded.

**Fix sketch**: schedule a daily call via Supabase `pg_cron`:
```sql
SELECT cron.schedule('audit_log_cleanup', '0 3 * * *', $$SELECT cleanup_old_audit_logs(365)$$);
```
Or via Vercel cron hitting an admin-only endpoint.

---

### D9. No partial indexes for "active" filters

Many tables filter `is_active = true` (`medicine`, `staff_roles`, …). A regular index covers both `true` and `false`; a partial index `WHERE is_active = true` would be smaller and more selective.

**Fix sketch** (optional, only matters at scale):
```sql
CREATE INDEX idx_medicine_active ON medicine (medicine_id) WHERE is_active = true;
```

---

## Cross-cutting

### X1. No CI pipeline

I don't see a `.github/workflows/` directory or any other CI configuration. Lint + tests run only when a developer remembers to.

**Fix sketch**: add `.github/workflows/ci.yml` running `pnpm lint && pnpm test` on every push, `pnpm build` on PRs.

---

### X2. No `/api/healthz` endpoint

No way to ping the server for uptime / DB-pool health.

**Fix sketch**: add `src/app/api/healthz/route.ts` that runs `SELECT 1` against the pool and returns `{ status: "ok", db: "ok" }` with a 5-second timeout.

---

### X3. No external error reporting

Server errors hit `console.error` and disappear. No Sentry/Bugsnag wiring.

**Fix sketch**: wire Sentry server + client. Filter sensitive fields (request body, JWT cookie).

---

### X4. No metrics

No request timings, no DB-pool stats, no per-route success/error counters.

**Fix sketch**: instrument `src/lib/server/logger.ts` (once introduced) with route timing middleware, or add OpenTelemetry. Defer until traffic justifies it.

---

### X5. `docs/` (TypeDoc HTML output) is committed

The directory is generated by `pnpm docs`. Committing it bloats diffs and creates merge conflicts.

**Fix sketch**: add `/docs/` to `.gitignore`, build in CI if you want it published.

---

### X6. Stale artifacts at repo root

`backup.dump` (164 KB), `pg4.dbm`, `pg_modeler_hms.dbm`, `debug-output.css`, `database/schema.prisma`, `findings.md`, `task_plan.md`, root-level `progress.md` — listed in [optimizations.md](./optimizations.md) and kept per your preference. They're not technical issues, just clutter.

---

## Priority order

If you can only fix five things this week:

1. **B1** — Gate `/api/*` with middleware. Critical.
2. **B3** — Throw on missing `secret_key` in prod.
3. **B2** — Standardize visit-status writes through the procedure.
4. **B4** — Eliminate `getCurrentStaffId()` from the 14 routes that still call it.
5. **D2** — Continue the `timestamptz` migration for the remaining clinical tables (start with `visit`).

If you can do five more after that:

6. **B5** — `withTransaction` helper + use in multi-write routes.
7. **B11** — Structured logger replacing 243 `console.*` calls.
8. **F1** — Lint rule to `error`, sweep 44 `Date.toLocale*` violations.
9. **D1** — Drop legacy `get_clinic_number` overloads.
10. **X1** — CI pipeline.
