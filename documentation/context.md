# Project Context

## What HMS is, today

A clinic-focused operational system. Strongest in pharmacy/POS and emerging admin / workforce features (staff directory v2, RBAC v2, roster, leave, payroll, attendance with policy snapshots, credentialing, employee lifecycle, document store, cashier settlement). Reception, doctor consultation, and lab workflows are functional foundations being progressively enriched.

## Current truths (verified)

- Live database: Supabase PostgreSQL `17.6.1`, project `vqhlyxhnjjipypzqfpiu`
- Live schema: **93** tables, **4** views, **15** routines (14 functions + 1 procedure), **17** triggers, **0** custom enums
- Frontend: Next.js `16.1.6`, React `19.1.0`, TypeScript `5`
- Backend: Next.js route handlers + `pg` pool (`database/db.ts`); no ORM in request path
- Auth: JWT cookie (`token`) signed with `jose`; scrypt password hashing with legacy plaintext auto-upgrade; session rows in `*_security_sessions` with `revoked_at` and `session_version` invalidation
- Real-time: `/api/queue/events` SSE with 45 s polling fallback
- Timezone: system-wide setting in `system_settings`, default `Asia/Karachi`; ESLint blocks `Date.toLocale*` to enforce going through `src/lib/timezone/client.ts`

## System character

- Online-only; no offline / service-worker path
- Not Electron — browser-based
- Not ORM-driven — raw SQL via `pg`
- Database is intentionally **load-bearing**: inventory math, search vectors, and visit-status audit live in triggers and a procedure
- Not yet fully consistent: route handlers, two toast libraries, mixed timestamp types (`timestamp` vs `timestamptz`), and the `update_and_log_visit_status` procedure is not consistently used

## What matters most when changing features

1. **Schema is the source of truth.** Read [`/database/snapshot/`](../database/snapshot/) or the live DB rather than older markdown.
2. **Don't bypass the inventory trigger chain.** Detail rows → `medicine_transaction` → `fn_tg_stockquantity_generic()` → `medicine_batch`. If you write to `medicine_batch.stock_quantity` directly, you'll desync the journal.
3. **Use `update_and_log_visit_status(…)`.** Direct UPDATEs on `visit.status` skip `visit_status_history`.
4. **Role gate paths.** Adding a new top-level segment requires updating both the middleware matcher and the per-prefix role check.
5. **Verify DB + API + UI together.** Many features touch all three; tests don't yet cover all paths.

## Recent activity (last few commits on main)

```
db679b7  Queue Error Fixed, Global Patient selected but visit not selected error
1af3589  Mar 25 — Roster tab fix, employee management additions (analytics, credentialing, documents), timezone fix
e59a4e6  Mar 23 — POs done, doctor & reception modules done, admin/cashier in progress, queue remaining
40152b5  Mar 23 — earlier checkpoint of same work
e8839ba  Mar 21 — moved queue from polling to SSE with 45 s fallback
```

## Where to look for context

- **Live schema** — `database/snapshot/` (regenerable via `scripts/introspect-db.mjs`)
- **Server logic** — `src/lib/server/*.ts`
- **Roadmap** — [next_steps.md](./next_steps.md)
- **Known debt** — [optimizations.md](./optimizations.md)
- **Recent decisions** — [memory.md](./memory.md)
