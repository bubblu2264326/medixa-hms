# Contributing

## Prerequisites

- Node.js `20+`
- `pnpm`
- PostgreSQL `17+` recommended
- `psql`

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create a local database named `hms`.

3. Load schema and optional seed data:

```bash
psql -d hms -f db_structure.sql
psql -d hms -f seed_data.sql
```

4. Create `.env.local`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/hms
secret_key=replace-me
```

5. Start the app:

```bash
pnpm dev
```

## Contribution Rules

- Verify database, backend route, and frontend behavior together before changing a feature
- Do not assume the docs are right if code or live Supabase disagree
- Preserve trigger-driven inventory behavior unless the change explicitly redesigns it
- Prefer parameterized SQL and keep route handlers aligned with live schema names
- If you touch documentation, update the corresponding HMS skill references when the change affects project-specific rules
- Timezone governance (mandatory):
  - `system_settings.system_timezone` is the only timezone source of truth.
  - Server business-day/range logic must use timezone helpers from `src/lib/server/systemTimezone.ts`.
  - Client date/time rendering must use helpers from `src/lib/timezone/client.ts` (avoid raw `toLocale*` calls).
  - APIs should return normalized ISO UTC timestamps for instants; UI handles timezone rendering.

## Useful Commands

```bash
pnpm lint
pnpm docs
```

## Notes

- `database/schema.prisma` is not the authoritative schema
- `dump.sql` and `db_structure.sql` are secondary references; live Supabase is the primary source when available
