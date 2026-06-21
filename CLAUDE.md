# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — start Next.js dev server (Turbopack). Requires `.env.local` with `DATABASE_URL` and `secret_key`.
- `pnpm build` — production build (Turbopack).
- `pnpm start` — run the production build.
- `pnpm lint` — ESLint via `eslint.config.mjs`.
- `pnpm test` — run the Vitest suite once (jsdom environment, globals enabled).
- Single test: `pnpm test <path>` (e.g. `pnpm test src/features/admin/__tests__/auth.test.ts`) or `pnpm test -t "<test name>"`.
- `pnpm docs` — generate TypeDoc HTML into `docs/` (treated as derived output, not canonical).

There is no Prisma migration tooling wired up; `database/schema.prisma` is **not** the source of truth. Apply SQL changes via raw `.sql` files in `database/migrations/`.

### Database source of truth — local first, sync to Supabase on completion

- **The local Postgres DB is the source of truth during development.** `.env.local` points at the local DB (`localhost:5432`); `.env.local.supabase` points at the remote Supabase project (`*.pooler.supabase.com`).
- **Always read from and write to the local DB only** while working. Run scripts/migrations against `.env.local`. Do **not** touch the remote Supabase DB mid-task.
- **Every schema/data change still gets a committed migration** under `database/migrations/` (dated `YYYY_MM_DD_<name>.sql` + a paired `.down.sql`), applied to the local DB first.
- **When a piece of work or phase is done**, check whether it changed the DB (schema or seeded/config data). If it did, **apply the same migrations to the remote Supabase DB** (`.env.local.supabase`) so the two stay in sync. Confirm with the user before running against the remote DB, then report rows affected.

## Big-picture architecture

HMS is a **role-based Next.js 16 App Router app** that talks directly to a Supabase Postgres database via a `pg` pool. There is no ORM in the request path. Significant business logic — inventory math, search vectors, visit-status auditing — lives in the **database itself** (triggers, views, stored procedures). Route handlers and the database both write to the same tables, so changes in one layer usually require checking the other two.

### Layers

- `src/app/` — App Router. Top-level segments map to roles: `doctor/`, `lab/`, `receptionist/`, `pharmacy/`, `admin/`, `cashier/`, `attendance/`, plus `(auth)/` and `api/`. Each role segment has its own `layout.tsx` workspace.
- `src/app/api/` — route handlers grouped by domain (`patient`, `visit`, `prescription`, `pharmacy`, `pos`, `inventory`, `queue`, `lab`, `admin`, `attendance`, `employee`, ...). They import `query` / the default pool from `database/db.ts` and run raw SQL.
- `src/features/<role>/` — feature modules per role (`doctor/`, `laboratory/`, `pharmacy/`, `reception/`, `admin/`, `cashier/`, `Login/`, `shared/`). Co-located tests live in `__tests__/` subfolders.
- `src/components/ui/` — Radix-based UI primitives (shadcn-style).
- `src/lib/server/` — server-only domain helpers (auth, audit, visit lifecycle, cashier, doctor workspace, attendance, workforce finance, etc.). Prefer adding business logic here rather than inlining in route handlers.
- `src/lib/timezone/` — timezone helpers. **ESLint enforces** that `Date.toLocaleString`, `toLocaleDateString`, and `toLocaleTimeString` are not used directly — go through `src/lib/timezone/client.ts` instead.
- `contexts/` — top-level React contexts shared by role workspaces: `PatientIdContext`, `ClinicalDetailsContext`, `SidebarContext`. Imported via the `@/` alias (root-relative, see `tsconfig.json` paths).
- `database/db.ts` — single `pg.Pool` against `DATABASE_URL` (SSL with `rejectUnauthorized: false`). Throws on import if `DATABASE_URL` is missing.
- `database/migrations/*.sql` — hand-applied SQL migration history (dates in filenames). The current Supabase migration baseline is `20260303185544_fix_sale_return_detail_trigger`.

### Auth and middleware

- Login (`src/app/api/login/route.ts`) issues a JWT signed with `process.env.secret_key` (fallback hardcoded in middleware) and sets it as the `token` HTTP-only cookie with `secure: true` (this complicates non-HTTPS local environments).
- `src/middleware.ts` gates `/doctor`, `/lab`, `/receptionist`, `/pharmacy`, `/admin`, `/cashier`, `/employee` by role. Role strings are normalized (e.g. `super admin`/`super_admin`, `lab technician`/`lab_technician`, `front desk`/`receptionist`) — match those casings when checking roles elsewhere.
- Known gap: login compares plaintext passwords against `doctor`/`staff` rows; `getCurrentStaffId()` in `src/lib/utils.ts` returns a hardcoded `1` placeholder. Treat both as TODOs, not finished auth.

### Database-first invariants

Pharmacy stock and POS integrity rely on a **trigger chain**, not application code:

1. Application writes to detail tables: `medicine_purchase_detail`, `pharmacy_sale_detail`, `purchase_return_detail`, `sale_return_detail`.
2. Per-table triggers (`tg_*_detail_to_txn`) mirror those rows into `medicine_transaction`.
3. `tg_stockquantity_generic` on `medicine_transaction` updates `medicine` and `medicine_batch` stock, handling whole-unit vs sub-unit math.

POS reads go through the `v_medicine_pos` view (active, non-expired stock joined with batches); reorder UIs read `v_low_stock_medicines`; daily reporting uses `v_daily_sales_summary`. Medicine full-text search relies on `medicine_search_vector_trigger` keeping `search_vector` current.

Visit status: the authoritative path is the `update_and_log_visit_status(p_visit_id, p_status, p_updated_by_doctor, p_updated_by_staff)` stored procedure, which writes both `visit.status` and `visit_status_history`. **Not every route uses it** — some handlers still update `visit.status` directly. When changing visit-status behavior, audit DB + API + frontend together.

Allowed status values: `waiting`, `seen_by_doctor`, `medicines_dispensed`, `lab_tests_done`, `payment_done`, `completed`, `admitted`, `discharged`. `visit.visit_type` is constrained to `OPD` or `Emergency`. `pharmacy_sale.visit_id` is nullable to support OTC sales.

### Testing

Vitest is configured for `jsdom` with globals; the `@` alias resolves to the repo root (so imports like `@/src/...`, `@/database/...`, `@/contexts/...` match the production paths). Tests are colocated under `__tests__/` directories alongside the feature they cover. There is no separate integration-test runner — DB-touching tests stub the pool.

### Queue / realtime

Queue updates were moved off polling to server-sent events with a 45-second polling fallback (see recent commits and `src/lib/server/queueEvents.ts`, `queueConfig.ts`).

## When making changes

- **Inventory, sales, returns, or visit status**: read the relevant trigger or stored procedure in `database/migrations/` before changing the route handler — the DB may already do what you're about to write, or may need to be updated alongside.
- **New role-gated routes**: update both the path prefix in `src/middleware.ts` matcher and the per-prefix role check.
- **Date/time formatting in client code**: use `src/lib/timezone/client.ts` helpers; the linter will flag the native `Date.toLocale*` methods.
- **New domain logic**: prefer adding to `src/lib/server/<domain>.ts` over inlining SQL in the route handler.

## Reference documents

The repository has hand-maintained docs that go deeper than this file. Consult them when relevant:

- [ARCHITECTURE.md](./ARCHITECTURE.md) — layers, auth, data flows, known limitations.
- [DATABASE.md](./DATABASE.md) — table groups, constraints, triggers, views, business-logic chains.
- [database/snapshot/](./database/snapshot/) — **canonical** auto-generated schema reference (93 tables, 4 views, 14 functions + 1 procedure, 17 triggers). Regenerate via `node --env-file=.env.local scripts/introspect-db.mjs`.
- [documentation/](./documentation/) — `architecture.md`, `database.md`, `features.md`, `frontend.md`, `setup.md`, `next_steps.md`, `memory.md`, etc.
- [README.md](./README.md) — short overview and links into the rest.
