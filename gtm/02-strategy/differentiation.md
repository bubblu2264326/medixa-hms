# Differentiation & Moats

## The core differentiator
**Integration depth + database-enforced integrity, at an emerging-market price.** Most alternatives are either (a) enterprise and unaffordable, (b) open-source but self-hosted/IT-heavy, or (c) single-module point tools. We are integrated, managed, and regionally priced.

## Differentiators (each must stay code-true)

| # | Differentiator | Why it's hard to copy | Evidence |
|---|---|---|---|
| 1 | One database across clinical + pharmacy + lab + billing + HR | Architectural; competitors bolt modules together | `database/` single Postgres, shared schema |
| 2 | DB-trigger-enforced stock/POS/visit integrity | Most apps enforce in app code (drifts) | trigger chain + stored procs |
| 3 | Full role suite already built | Breadth takes years | 7 role workspaces shipped |
| 4 | Real-time queue (SSE) | UX polish | `queueEvents.ts` |
| 5 | Built-for-region price + support | Incumbents can't reprice down easily | pricing strategy |

## Moats over time (build deliberately)
- **Data gravity / switching cost** — once a provider runs daily ops + history on us, leaving is painful.
- **Local trust & references** — case studies + word-of-mouth in tight provider networks.
- **Onboarding/migration capability** — getting providers off paper is a repeatable skill = moat.
- **Partner channel** — pharmacy/medical suppliers as a distribution moat.
- **Compliance fit** — meeting local regulatory/data needs `[RESEARCH NEEDED]`.

## Honest weaknesses (don't hide — plan for them)
- Auth/security not yet hardened (must-fix).
- No telemedicine/insurance/patient app yet.
- Integrations/hardware maturity unverified.
- Brand/trust = zero at start; references must be earned.

## What is NOT a moat (don't rely on these)
- Feature count alone (copyable).
- Being "cheaper" alone (race to the bottom) — cheap **plus** integrated + supported is the position.
