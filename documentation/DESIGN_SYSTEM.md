# HMS Design System

The canonical design language for the HMS UI. Goal: a **trustworthy, calm, industry-grade clinical** look — professional enough for a hospital, distinctive (teal-forward) without decoration. Grounded in clinical-UX research (neutral base + one restrained accent + strictly-semantic safety colors; WCAG-AA; density with scannability; no decorative elements).

**Golden rule:** style with **design tokens / Tailwind theme utilities** — never hardcoded colors (`bg-emerald-600`, `bg-[#2c2c2c]`, `bg-pink-600`). The tokens live in `src/app/globals.css` (`@theme` + `:root`/`.dark`).

## Color (semantic — meaning, not decoration)
| Token / utility | Use |
|---|---|
| `bg-background` / `text-foreground` | page surface / primary text |
| `bg-card` `text-card-foreground` + `border-border` | cards, panels, tables |
| `bg-muted` / `text-muted-foreground` | secondary surfaces, secondary text, table headers |
| `bg-primary` / `text-primary-foreground` | **teal** — the one accent: primary buttons, active nav, focus (`ring`) |
| `bg-accent` / `text-accent-foreground` | soft teal tint — hover/selected rows, chips |
| `text-danger` `bg-danger` (`=destructive`) | **critical only**: allergies, critical lab values, errors, over-limit money |
| `bg-warning` `text-warning-foreground` | cautions, dues, abnormal-but-not-critical |
| `bg-success` `text-success-foreground` | normal/in-range, paid, confirmations |
| `bg-info` `text-info-foreground` | neutral informational highlights |

- **Color is never the sole signal** — pair with an icon and/or text (e.g. red dot + "Critical", not red alone).
- Use warm colors (danger/warning) **sparingly** — only for genuine clinical/financial urgency, or they lose meaning.
- POS money: totals neutral; **paid/change = success**, **due = warning**, **over-limit = danger**. Never pink/blue/red decoration.

## Typography
- Font: system sans via `--font-sans` (`font-sans`); numerics (money, qty, IDs) use `font-mono` + `tabular-nums` for column alignment.
- Scale (use Tailwind sizes; 1.5 line-height for body): `text-xs` 12 (captions/labels), `text-sm` 14 (table/body default), `text-base` 16 (primary body), `text-lg` 18 (card titles), `text-xl` 20 / `text-2xl` 24 (section/page headers).
- Weight: `font-semibold` for headings/labels, `font-medium`/normal for body. **Do not** use `font-black` + `uppercase tracking-widest` on small text — it hurts clinical readability. Page/section titles may be `font-semibold`, normal case.
- Minimums: body ≥ 14px; labels ≥ 12px.

## Spacing, radius, elevation
- **8-pt spacing**: prefer `gap-2/3/4/6` (8/12/16/24), `p-4` cards, `p-6` page gutters. Consistent, not ad-hoc.
- **Radius**: `rounded-md` (≈6px) default, `rounded-lg` (8px) for cards/modals. **Never** `rounded-[2.5rem]`/pill containers — reads consumer/casual.
- **Elevation**: `shadow-sm` for cards, `shadow-md` for popovers/modals. Avoid heavy custom `shadow-[...]` and stacked blurs.

## Density & layout
- High information density is good **if scannable**: tight tables, color on headers not cells, progressive disclosure for detail.
- Tables: `text-sm`, muted header row, right-align numeric columns (`tabular-nums`), zebra/hover via `bg-accent/50`, sticky header for long lists, status via `StatusBadge`.
- Role dashboards: a few KPI `StatCard`s up top → drill into tables.

## Iconography
- **lucide-react only. No emojis** anywhere in the UI (tabs, buttons, labels). Icons 16–20px, paired with text labels.

## Accessibility
- WCAG **AA**: ≥4.5:1 text, ≥3:1 large text/UI. Tokens are tuned for this on white.
- **Touch targets ≥44px** (POS/tablet use `lg`/touch button size, ~48px). Full keyboard nav; visible focus ring (`ring`/`ring-2 ring-ring`).

## Primitives (reuse — don't re-style ad hoc)
`src/components/ui/`: `Button` (variants: default(teal)/secondary/outline/ghost/destructive; sizes sm/md/lg + touch), `Card`, `Input`, `Label`, `FormField`, `Table`, `StatusBadge`, `PageHeader`, `StatCard`, `Dialog`. Compose these instead of bespoke markup.

## Do / Don't
- ✅ tokens, lucide, semantic color, sans font, 8-pt spacing, `rounded-md/lg`, AA contrast, 44px+ POS targets.
- ❌ hardcoded hex/named colors, emojis, `font-black uppercase tracking-widest` on small text, `rounded-[2.5rem]`, dark panels mid-light-app, decorative gradients/blur, color-only status.

See research notes + this file before any UI work. Reference: clinical-UX + enterprise design-system best practices (neutral base, one accent, semantic safety color, density-with-scannability, WCAG AA).
