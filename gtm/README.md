# GTM Workspace — HMS Product

This folder holds the **go-to-market thinking** for the HMS product: what we're building, the market we're entering, and how we sell and market it. It is the single home for product-strategy, market, sales, and marketing context.

> **Status:** Scaffold + first research pass folded in (2026-06-20) — real vendors, architecture decision (hybrid local-first + sync), and a regulatory checklist are now sourced. Remaining unknowns marked `[RESEARCH NEEDED]`/`VERIFY` (market size, 3 legal facts). See [05-research/open-questions.md](05-research/open-questions.md) and [05-research/research-log.md](05-research/research-log.md).

## How this is organized

| Folder | What lives here |
|---|---|
| [00-context/](00-context/) | What we're building, the real feature inventory, shared glossary |
| [01-market/](01-market/) | Market landscape, competitor analysis, **regulatory checklist**, strategic direction |
| [02-strategy/](02-strategy/) | The GTM thesis, positioning, ICP/segments, differentiation, pricing |
| [03-sales/](03-sales/) | Sales playbook, pipeline process, objection handling, outreach templates |
| [04-marketing/](04-marketing/) | Messaging, channels, content calendar, launch plan |
| [05-research/](05-research/) | Research log (with sources) + open questions to resolve |
| [assets/](assets/) | Decks, logos, one-pagers (binaries) |

## Locked decisions (the brief this workspace is built on)

- **Intent:** Real product to **commercialize** — sell/deploy to real clinics & hospitals.
- **Primary geography:** **Pakistan / South Asia** first.
- **Segments (full range, sequenced as a wedge):** small clinics → pharmacies/labs → mid-size private hospitals → diagnostic / multi-specialty chains.
- **Strategy shape:** **wedge-and-expand** — land with the fastest-to-sell segment + standalone modules, expand into the full hospital suite.

## Ground rules for everything in here

1. **No fabrication.** Never invent market figures, customer counts, competitor pricing, or quotes. Mark unknowns `[RESEARCH NEEDED]` and log them in `05-research/open-questions.md`.
2. **Claims trace to the code.** Product/marketing claims must match what the system actually does — see [00-context/product-capabilities.md](00-context/product-capabilities.md).
3. **Keep it current.** When a decision changes, update the relevant doc *and* the project memory so future sessions stay in sync.

## Working with this workspace in Claude Code

- Skill **`gtm-context`** loads this strategy before any GTM/sales/marketing task.
- Skill **`hms-product-truth`** keeps claims honest against the codebase.
- Agents **`market-researcher`**, **`gtm-strategist`**, **`gtm-content-writer`** do the heavy lifting.
- Durable decisions live in project memory (`MEMORY.md` → `gtm-commercialization.md`).
