# Pharmacy Module — UX deep pass (plan)

Status: **plan for a dedicated `/goal` session.** Same method as the reception
pass: screenshot-loop verify, page-by-page, commit per sub-tab. Spec =
DESIGN_SYSTEM.md "Density & sizing — v2". Decisions locked earlier (teal primary,
per-role nav, uniform density).

## Why this module feels broken (inspected via the harness at 1536×864)
The pharmacy shell stacks **three full-width bars** before content, each padded
`p-6`, inside a `rounded-[2.5rem]` glass card:
1. Clinic header (un-migrated: gradient title, emerald logo, `py-3`).
2. **"Dashboard View / ACTIVE MODULE: X" bar + tab switcher** — the big left
   icon + "Dashboard View" label is redundant chrome (the switcher already names
   the module). `p-6` makes it ~80px tall.
3. Each sub-view's own header (e.g. "Products Management", "Medicine
   Transactions") with another large icon tile.
Plus the whole module is un-migrated (`bg-[#f8fafc]`, indigo/emerald/slate/blue,
`backdrop-blur`, `shadow-2xl`, `p-6` nesting). Net: content is squeezed and
nothing fits at 1536px.

## The fix — ordered

### A. Shell (`src/app/pharmacy/layout.tsx`) — biggest win, do first
- **Clinic header**: tokenize (gradient → `text-foreground`/`text-primary`,
  emerald → `bg-primary/10`), `py-3 → py-2`, logo `h-10 → h-9`, title
  `text-xl → text-base`. (Mirror the reception header.)
- **Collapse the module bar**: drop the big `Layout` icon + "Dashboard View /
  ACTIVE MODULE" block. Keep one compact toolbar row = just the tab switcher
  (pills `px-3 py-1.5`, no `scale-[1.05]`, tokenized active = `bg-card
  text-primary border`), optionally a small left-aligned module title. Bar
  padding `p-6 → px-5 py-2.5`.
- **Outer card**: `rounded-[2.5rem] → rounded-lg`, drop `backdrop-blur` +
  `shadow-2xl → shadow-sm`, `bg-white/60 → bg-card`, border token.
- **Paddings**: main wrapper `p-6 → p-4`; content wrapper `p-6 → p-4`; remove
  `animate-in ... duration-500`; page `bg-[#f8fafc] → bg-background`.
- Reclaims ~110–130px of vertical space immediately.

### B. Sub-tabs (page-by-page; tokenize + densify + fit). Verify each via
`/pharmacy?tab=<id>` screenshot, gate, commit.
| Tab | id | Files | Work |
|---|---|---|---|
| Retail | `retail` | retail/** | mostly done; re-check density in the new shell |
| Purchases | `purchases` | purchase/MedicinePurchaseForm, PurchaseMedicineSearch | big entry form — tighten control heights, grid, tokenize; dropdown click fixed |
| Transactions | `transactions` | transactions/TransactionsView | shrink the icon-header, tokenize status badges (PURCHASE IN/SALE OUT/RETURN → info/success/warning), adopt DataTable density, tokenize filter pills |
| Parties | `addParty` | parties/** | tokenize, FormField/FormGrid, DataTable |
| P. Return | `purchaseReturn` | purchaseReturn/PurchaseReturn | tokenize (rose→destructive), rounded-3xl→lg, dropdown click fixed |
| Products | `medicines` | (medicines slot) | indigo Add Product → primary; category pills → tokens; DataTable density; Add-Product modal → Dialog |
| Reports | `reports` | (reports slot) | tokenize, align cards/charts |
| Settings | `settings` | settings/SettingsView | tokenize, FormField rhythm |

### C. Per-view headers
Each sub-view repeats a big icon-tile + title + subtitle. Standardize to the
compact `PageHeader` primitive (or a slim inline header): smaller icon, title
`text-base/lg`, drop oversized subtitles. Removes the 3rd stacked bar's bulk.

## Guardrails (unchanged)
Visual only — no logic/props/data-flow/DB changes. Tokens not palette colors
(clears lint-guard warnings as a bonus). Gate every sub-tab: `tsc` /
`pnpm lint` (0 errors) / `pnpm build` / `pnpm test` (181/181). Commit per
sub-tab, pinned push to `feat/hms-completion` (gh auth switch bubblu2264326).

## `/goal` prompt for the pharmacy session
> Run the pharmacy-module UX deep pass per documentation/PHARMACY_UX_PASS.md and
> DESIGN_SYSTEM.md "Density & sizing — v2". Honor locked decisions (teal primary,
> per-role nav, uniform density). Use the screenshot loop
> (node --env-file=.env.local scripts/ux-shots.mjs at 1536×864; pharmacy sub-tabs
> are the ph-* labels via ?tab=) — Read the PNGs and iterate. Order: A) shell
> (src/app/pharmacy/layout.tsx) — slim clinic header, collapse the redundant
> "Dashboard View" bar to a compact tab switcher, rounded-[2.5rem]->rounded-lg,
> drop backdrop-blur/shadow-2xl, p-6->p-4, tokens; then B) each sub-tab page-by-
> page (Retail, Purchases, Transactions, Parties, P.Return, Products, Reports,
> Settings) — tokenize colors (indigo/emerald/slate/blue -> primary + semantic),
> adopt DataTable density for tables, standardize per-view headers to compact
> PageHeader, fit content at 1536px; C) Add-Product modal -> Dialog primitive.
> Visual only; no logic/DB changes. Gate every sub-tab (tsc/lint 0 errors/build/
> test 181) and commit per sub-tab with pinned push to feat/hms-completion
> (gh auth switch --user bubblu2264326 first). Keep going until the pharmacy shell
> + all 8 sub-tabs meet the v2 density spec at 1536px and the gate is green.

## After pharmacy
Repeat module-by-module, **page-by-page and field-by-field**, per the full
coverage matrix + field/form/table checklists in
`FRONTEND_UX_OVERHAUL_PLAN.md` §13 (one `/goal` session per module: reception,
doctor, lab, cashier, IPD, admin sub-pages, employee/auth). The prior session
made the *landing* screens pass the v2 spec; §13 drives them to full depth —
every tab, every form, every field, every table/modal.
