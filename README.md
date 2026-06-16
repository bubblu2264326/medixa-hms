# HMS

Hospital Management System covering reception, doctor consultations, lab workflow, pharmacy/POS retail, cashier settlement, and workforce management (staff/doctor directory, attendance, roster, leave, payroll, credentialing, employee lifecycle).

## Stack

- **Frontend**: Next.js `16.1.6` (App Router, Turbopack), React `19.1.0`, TypeScript `5`, Tailwind CSS `4`
- **UI**: Radix UI primitives + custom shadcn-style components in `src/components/ui`, Lucide icons, `react-hot-toast` + `sonner`, `react-hook-form` + `zod`
- **Backend**: Next.js route handlers under `src/app/api`, direct SQL via `pg` pool (`database/db.ts`) — no ORM in request path
- **Database**: Supabase PostgreSQL `17.6.1` (live project is the source of truth)
- **Auth**: JWT cookie (`token`) signed with `jose`, role-checked in [src/middleware.ts](src/middleware.ts); scrypt hashing for new passwords with legacy plaintext auto-upgrade on successful login

## Live database baseline

Verified live by `scripts/introspect-db.mjs` (snapshot in [database/snapshot/](database/snapshot/)):

- **93** tables in `public`
- **4** views (`admin_cash_collected_ledger_v1`, `v_medicine_pos`, `v_low_stock_medicines`, `v_daily_sales_summary`)
- **15** functions/procedures (1 procedure: `update_and_log_visit_status`)
- **17** triggers across 6 tables
- **0** custom enums (status fields use CHECK constraints, not enums)

## Modules

- **Reception** — patient registration, queue entry, vitals, OB/GYN clinical forms (menstrual/obstetric/para/current pregnancy)
- **Doctor** — queue review, patient details, encounter notes, prescription + lab ordering, past visits, attendance check-in
- **Lab** — lab orders, parameter-based result entry, result approvals
- **Pharmacy** — batch-aware POS, OTC + prescription sales, purchase intake, sale/purchase returns, held transactions, receipts, audit
- **Cashier** — patient bill settlement with multi-allocation, draft/settle/reverse flow, shift open/close, idempotency keys
- **Admin** — staff directory v2, RBAC v2 (roles, role assignments, permission policies + audit), attendance v2 with policy snapshots, roster (shift templates + assignments), leave (requests/approvals/balances/quotas), payroll, employee credentialing, employee documents, employee lifecycle (onboarding/offboarding templates), expense ledger, dashboards
- **Employee self-service** — personal profile, attendance, roster, leave, payroll
- **Attendance** — separate device endpoint for kiosk/biometric check-in

## Local setup

```bash
pnpm install
# create .env.local with DATABASE_URL + secret_key (see documentation/setup.md)
pnpm dev
```

For a fully local Postgres workflow (dump from Supabase, restore into Docker), see [documentation/setup.md](documentation/setup.md).

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — application layers, role workspaces, auth, data flows
- [DATABASE.md](./DATABASE.md) — live schema summary by module, key constraints, business logic chains
- [documentation/](./documentation/) — deeper per-topic docs (architecture, database, features, frontend, setup, deployment, optimization debt, roadmap)
- [database/snapshot/](./database/snapshot/) — auto-generated from the live DB; the **canonical reference** for table shapes, routines, triggers, views, indexes, and sample data

## Scripts

- `pnpm dev` — Next.js dev server (Turbopack)
- `pnpm build` — production build
- `pnpm start` — run production build
- `pnpm lint` — ESLint
- `pnpm test` — Vitest suite (one-off: `pnpm test <path>` or `pnpm test -t "<name>"`)
- `pnpm docs` — TypeDoc to `docs/` (derived output, not canonical)
- `node --env-file=.env.local scripts/introspect-db.mjs` — refresh `database/snapshot/` from the live DB
