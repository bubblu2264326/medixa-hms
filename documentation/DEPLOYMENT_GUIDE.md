# Deployment Guide

## Runtime assumptions

- **Frontend + API**: Next.js 16 app, runnable on any Node 20+ host. Production target is Vercel.
- **Database**: PostgreSQL 17.x — currently Supabase project `vqhlyxhnjjipypzqfpiu`.
- **Environment**: `DATABASE_URL` reachable from the server runtime; `secret_key` set for JWT signing.

## Required environment variables

```env
DATABASE_URL=postgresql://...                 # Supabase connection string (use pooler for prod)
secret_key=<long random string>               # used to sign JWTs
```

`DATABASE_URL` is required. `database/db.ts` throws on import if it's missing.

## Vercel deployment

1. Connect the repo as a Vercel project.
2. Add `DATABASE_URL` and `secret_key` in **Project Settings → Environment Variables** for Production (and Preview if you want PR deploys to talk to a non-prod DB).
3. Build command and output settings are picked up from `package.json` (`pnpm build`).
4. Node version: use the latest LTS supported by Vercel (Node 20+).
5. For local dev mirroring prod env, use:
   ```bash
   pnpm dlx vercel env pull .env.local
   ```

## Supabase setup

- Database baseline: PostgreSQL 17.6.1.
- Latest migration tracked by Supabase: `20260303185544_fix_sale_return_detail_trigger`.
- Subsequent migrations are applied manually as `.sql` files from [`/database/migrations/`](../database/migrations/) — there is **no automigrator**.
- Connection types:
  - **Direct** (port 5432, host `db.<project-ref>.supabase.co`) — used for `pg_dump` / `pg_restore`. Not for serverless functions.
  - **Session pooler** (port 5432 via `aws-...pooler.supabase.com`, username `postgres.<project-ref>`) — preferred for app traffic.
  - **Transaction pooler** (port 6543) — fine for stateless Vercel routes; some prepared-statement features differ.

## Connection pooling notes

- `database/db.ts` creates a single `pg.Pool` per Node process. On serverless deploys this means one pool per warm container — Vercel typically caps connections automatically.
- For high concurrency, prefer the Supabase **transaction pooler** as `DATABASE_URL` — it lets you scale function instances without exhausting Postgres connections.
- The pool currently uses `ssl: { rejectUnauthorized: false }` unconditionally; that is fine for Supabase and Vercel and intentionally tolerant.

## Migration workflow

1. Write the change as a dated `.sql` file in `database/migrations/`.
2. Apply it to Supabase via the SQL editor or `psql` against the Direct connection.
3. Verify with `node --env-file=.env.local scripts/introspect-db.mjs` to refresh [`/database/snapshot/`](../database/snapshot/).
4. Commit both the SQL file and the regenerated snapshot.

## Backup & restore

- See [setup.md](./setup.md) for the full `pg_dump` → Docker Postgres → `pg_restore` workflow.
- For production safekeeping, Supabase ships daily backups on paid tiers. On free tier, take periodic manual dumps.

## Pre-production checklist

- [ ] `secret_key` is a long random string in production env (do **not** rely on the middleware fallback in `src/middleware.ts`).
- [ ] All seeded user accounts have rotated off plaintext passwords (or you accept the auto-upgrade-on-login window).
- [ ] HTTPS is in front of the app — the auth cookie is `secure: true`.
- [ ] `DATABASE_URL` points to the right Supabase environment (Production, not Preview).
- [ ] You've confirmed the Supabase project is on a tier that **does not auto-pause** (free tier pauses after ~7 days idle).
- [ ] Disable Supabase row-level security policies that conflict with your direct-`postgres` access pattern, or migrate to an auth scheme that respects them.
- [ ] Any background scheduling (`cleanup_old_audit_logs`, payroll cycle close, etc.) is wired to a cron — Vercel cron, Supabase Edge Functions, or external scheduler.

## Production cautions

- **Do not skip HTTPS** — the `token` cookie has `secure: true` and will be dropped on plain HTTP.
- **Do not check in `.env.local`** — already covered by `.gitignore`, but worth re-stating.
- **Do not rely on `getCurrentStaffId()` returning `1`** — that placeholder is only safe for first-run seeding; production traffic must use JWT-derived ids.
- **Watch session-pooler connection limits** — Supabase caps inbound connections per project; bursts of Vercel cold starts can exhaust them. Move to the transaction pooler if you see `too many connections`.

## Local production check

Before deploying:

```bash
pnpm build
pnpm start
```

That runs the production server locally against the same `.env.local`. Hit `http://localhost:3000`, log in, and walk a representative flow (patient → visit → prescription → POS → settle).
