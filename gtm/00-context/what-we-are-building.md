# What We're Building

## One-line definition

An **all-in-one Hospital Management System (HMS)** for clinics, hospitals, pharmacies, and labs in Pakistan / South Asia — one system that runs the full patient journey (front desk → doctor → lab → pharmacy → billing) plus the back office (inventory, workforce, attendance, finance), at a price point built for cost-sensitive emerging-market providers.

## The problem we're solving

Small and mid-size private healthcare providers in the region typically run on a patchwork: paper registers, standalone billing software, a separate pharmacy POS, Excel for inventory, and WhatsApp for coordination. The result is:

- Lost revenue from untracked dispensing, stock leakage, and billing gaps.
- No single view of a patient across visits, prescriptions, lab results, and bills.
- Manual queues and front-desk chaos.
- Workforce/attendance/payroll managed off-system.

Global incumbents (Epic, Cerner/Oracle Health) are priced and scoped for large Western hospitals — out of reach. Local point solutions cover one slice (just billing, or just pharmacy) and don't integrate.

## Our answer

A **single integrated system** where the clinical, pharmacy, lab, billing, and workforce modules share one database — so stock, money, and patient state stay consistent automatically. Key design choices already in the build:

- **Database-enforced integrity** — pharmacy stock, POS, and visit-status are governed by database triggers and stored procedures, not just app code, so the numbers can't silently drift.
- **Role-based workspaces** — each role (doctor, reception, pharmacy, lab, cashier, admin, attendance) gets a purpose-built screen.
- **Real-time queue** — live patient queue via server-sent events.
- **Audit logging + RBAC** throughout.

## What it is NOT (scope guardrails)

- Not a Western-hospital EHR competitor (Epic/Cerner class). We win on **fit + price for emerging markets**, not feature-for-feature parity with enterprise EHRs.
- Not (yet) a telemedicine or insurance-claims clearinghouse platform — those are roadmap candidates, see [02-strategy/gtm-thesis.md](../02-strategy/gtm-thesis.md).

## Why now

- Rising private healthcare volume in South Asia and digitization pressure on providers. `[RESEARCH NEEDED: cite market growth + digitization stats — log in 05-research]`
- Cloud + low-cost SaaS make a regionally-priced integrated HMS viable where on-prem enterprise systems never were.

## Working name

Product/brand name **TBD** — see naming in [05-research/open-questions.md](../05-research/open-questions.md). Referred to as "the HMS" / "the Product" throughout until decided.
