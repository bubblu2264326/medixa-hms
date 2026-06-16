# Documentation Index

Deeper, topic-by-topic documentation. The high-level entry points are [`/README.md`](../README.md), [`/ARCHITECTURE.md`](../ARCHITECTURE.md), and [`/DATABASE.md`](../DATABASE.md) at the repo root.

## Files

| File | Scope |
|---|---|
| [setup.md](./setup.md) | Local dev setup: env vars, Supabase pull, Postgres-in-Docker for fully-local workflow, dump/restore |
| [architecture.md](./architecture.md) | Application layers in depth: routing, state, server helpers, queue SSE, timezone, auth lifecycle |
| [database.md](./database.md) | Database module-by-module table reference, expanded from the live snapshot |
| [features.md](./features.md) | Per-module feature inventory mapped to code and API surface |
| [frontend.md](./frontend.md) | Frontend organization, contexts, design conventions, ESLint constraints |
| [product.md](./product.md) | Product description, target users, workflow narrative |
| [context.md](./context.md) | Current state truths and what is / isn't true about the system today |
| [progress.md](./progress.md) | Snapshot of what's shipped and current focus |
| [optimizations.md](./optimizations.md) | Real technical debt and improvement targets |
| [next_steps.md](./next_steps.md) | Prioritized roadmap |
| [memory.md](./memory.md) | Implementation notes worth retaining (decisions, patterns) |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Deployment to Vercel + Supabase |
| [functionality-map.md](./functionality-map.md) | Surface-level feature inventory: workspaces → pages → APIs → server helpers |
| [feature-deep-dive.md](./feature-deep-dive.md) | Execution traces for 19 major flows (A–S) with edge cases, side effects, and audit coverage |
| [industry-comparison.md](./industry-comparison.md) | Feature comparison vs OpenMRS / Bahmni / OpenEMR / GNU Health / commercial SaaS; gaps + verdict |
| [issues-found.md](./issues-found.md) | High-level code-review findings: backend / frontend / DB issues with file:line refs and fix sketches |
| [code-review-detailed.md](./code-review-detailed.md) | Rigorous severity-graded findings (32 items, 5 Critical / 11 High / 10 Medium / 6 Low) — net-new beyond `issues-found.md` |
| [qa/](./qa/) | Manual test scripts (currently: pharmacy retail) |

## Canonical references

- **Schema shape** — [`/database/snapshot/`](../database/snapshot/) is generated from the live DB and is the source of truth. Regenerate with `node --env-file=.env.local scripts/introspect-db.mjs`.
- **Migrations history** — [`/database/migrations/`](../database/migrations/) (dated `.sql` files, hand-applied).
- **Server domain logic** — `src/lib/server/*.ts`.
