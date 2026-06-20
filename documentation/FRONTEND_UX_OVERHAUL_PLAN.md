# Frontend UX Overhaul — Session Plan

Status: **DRAFT for owner review.** Execution is a dedicated ~5h focused session, run *after* the owner signs off on this plan and provides the inputs in §7.

---

## 1. Problem statement (what's actually wrong)

The color/token migration (design-system Phases A+B) is done and correct — but **density, hierarchy, and visual polish** were never tuned. Concretely, on a normal laptop at 100% browser zoom the app feels "zoomed in":

- **Absolute density is too loose.** Type scale, control heights (48px+), card paddings, header height, and inter-section gaps were all sized for a very large canvas. There is no deliberate density system — sizes were chosen ad-hoc per screen.
- The earlier `clamp()` rem-base fix only helps a *narrow* viewport. At a maximized ~1920px window it returns the full 16px → no visible change. **The fix is to set density deliberately, not auto-scale it.**
- **Layout/structure issues** beyond density: empty panels with no useful empty-state (e.g. the blank "Patient Queue" card), uneven column rhythm, oversized headings competing with content, inconsistent spacing between sibling screens, and components that don't share one density standard.
- **Consistency:** even after tokenization, each screen still hand-rolls its own paddings/heights, so the same control looks different across reception vs cashier vs admin.

**Definition of "professional / done":**
1. Comfortable information density at the owner's real resolution at **100% zoom** (no manual zoom-out).
2. One shared density standard (type scale, control heights, spacing rhythm, card/section padding, header height) applied everywhere.
3. Clear visual hierarchy on every screen; aligned grids; no dead whitespace; real empty/loading/error states.
4. Looks intentional and consistent across all eight workspaces, matching the quality bar of the reference apps the owner picks.

---

## 2. Approach: foundation first, then a screen-by-screen visual QA loop

We do **not** start by editing screens. We set the density foundation, lock the layout primitives, then iterate screen-by-screen against a live browser.

### Phase 1 — Density foundation (global, ~45 min)
Decide and encode an explicit density standard (in `globals.css` `@theme` + `documentation/DESIGN_SYSTEM.md`):
- **Base + type scale:** pick a target base (likely **14px**) and a tight modular scale (e.g. 12 / 13 / 14 / 16 / 18 / 20 / 24) with sensible line-heights. Stop relying on the browser 16px default.
- **Control heights:** standard input/select/button height **36–40px** (down from 48), with a dedicated `touch` size kept only for POS keypad controls.
- **Spacing rhythm:** standard card padding, section gap, page gutter, header height — as named tokens, not per-screen guesses.
- **Content width:** max-width for forms so they don't sprawl on wide screens.
- Re-tune (or remove) the responsive rem clamp so the *deliberate* density is the source of truth, with the clamp only nudging extremes.

### Phase 2 — Layout primitives (lock the patterns, ~45 min)
Make the density unavoidable by routing screens through shared primitives (extend the existing `src/components/ui/*`):
- `PageHeader` (compact), `FormField` (label+control+error in one rhythm), `FormGrid`, `Section`/`Card`, `Toolbar`, `EmptyState`, `DataTable`/`TableRow`.
- Each encodes the Phase 1 density. Screens compose these instead of bespoke divs.

### Phase 3 — Per-screen visual QA loop (the core, ~3 h)
For each screen, run the loop:
> open in browser at target resolution → capture screenshot + inspect DOM → audit against the checklist → fix in code → reload → re-verify → commit.

**Per-screen checklist:**
- [ ] Density comfortable at 100% zoom at target resolution.
- [ ] Hierarchy: one clear primary action; headings not oversized; secondary text muted.
- [ ] Grid/alignment: columns aligned, consistent gaps, no orphaned whitespace.
- [ ] Empty / loading / error states present and styled (no blank panels).
- [ ] All controls use the shared primitives + standard heights.
- [ ] No horizontal overflow; sane at 1280 / 1440 / 1920 widths.
- [ ] Money/numbers `font-mono tabular-nums`; semantic colors correct.
- [ ] Keyboard/focus states visible; touch targets adequate where used (POS).

**Screen order (highest-traffic / most-visible first):**
1. **Reception** — queue, register, appointments, vitals, clinical (the screen owner keeps hitting).
2. **Pharmacy POS** — already redesigned; density re-check against new standard.
3. **Cashier** — billing/settlement, money density.
4. **Doctor** — workspace + order forms + history.
5. **Lab** — orders + results.
6. **IPD** — bed board + chart (no logic changes).
7. **Admin** — dashboard + the heavy tables.
8. **Attendance / Login / shared shell**.

### Phase 4 — Cross-cutting polish (~30 min)
Empty-states everywhere, loading skeletons, scrollbar styling, focus rings, icon sizing consistency, final spacing-rhythm sweep, dark-mode spot check.

---

## 3. The visual-debug workflow ("Claude in Chrome")

The quality of this pass depends on a tight see→fix→re-see loop. Two ways to run it:

**A. Claude-in-Chrome extension (owner-driven).** The owner runs the Claude for Chrome extension on `localhost:3000`, navigates to each screen, and lets it capture the rendered screenshot + DOM/computed styles. Those findings (or screenshots) come back into this Claude Code session, where the actual code fixes are made. *Note: this Claude Code instance (in VS Code) cannot drive your Chrome directly — the extension is a separate surface. We bridge by pasting its screenshots/observations here.*

**B. Screenshot loop (simplest, always works).** Owner pastes a screenshot of the current screen at their real resolution; I audit + fix; owner reloads and pastes again. Slower per cycle but zero setup and exactly reproduces what the owner sees.

We can mix: extension for fast DOM/measurement inspection, manual screenshots for sign-off. Either way **the owner is the eyes at the target resolution** — critical, because the whole bug is resolution/density-dependent.

---

## 4. Guardrails (unchanged from the design system)

- Tokens only (no hardcoded colors); lucide not emoji; semantic colors for meaning.
- **Visual only** — no logic, props, data-flow, or DB changes. IPD patient-safety logic stays byte-for-byte.
- Per-area gate before commit: `tsc --noEmit` · `pnpm lint` (0 errors) · `pnpm build` · `pnpm test` (181/181).
- Commit per screen/area with the same pinned-push cadence; PR #4 stays the integration branch.

---

## 5. Acceptance criteria

- Owner confirms each screen reads comfortably at **100% zoom** at their resolution.
- All screens share one density standard; the same control looks identical across workspaces.
- No blank/oversized panels; empty/loading/error states exist.
- Full gate green after every batch; scenario suite + invariants unaffected (FE-only).

---

## 6. Time budget (≈5 h)

| Phase | Work | Time |
|------|------|------|
| 0 | Confirm baseline (resolution, stale-server check), capture "before" screenshots | 15 m |
| 1 | Density foundation (tokens + scale) | 45 m |
| 2 | Layout primitives | 45 m |
| 3 | Per-screen QA loop (8 screens) | 3 h |
| 4 | Cross-cutting polish | 30 m |
| — | Buffer / final verify / commits | 15 m |

---

## 7. What I need from you before we start

1. **Your real screen resolution + Windows display scaling** (Settings → Display → "Scale" and "Resolution"), or just tell me the laptop model. This sets the *exact* density target — without it I'm guessing.
2. **Screenshots of each workspace at 100% zoom** (so I have the real "before" for every screen, not just reception): Reception, Pharmacy POS, Cashier, Doctor, Lab, IPD, Admin, Login. Maximized window, 100% zoom.
3. **1–3 reference apps you think look right** — screenshots or names. If you want suggestions of clean, dense, professional references to pick from:
   - *Operational / SaaS density:* Linear, Stripe Dashboard, Vercel Dashboard, Retool.
   - *Clinical:* Doctolib, Practo (provider side), DrChrono, Tebra/Kareo.
   - *POS:* Square POS, Shopify POS, Lightspeed.
   Pick the ones whose density/feel you want and send shots; I'll match that bar.
4. **Which debug loop** (§3): Claude-in-Chrome extension, or paste-screenshots, or both.

Once I have (1) and at least the reference direction (3), we can start the session.

---

## 8. Reference research (done) + the density spec it produced

Measured live DOMs of professional UIs at 1536px via `scripts/ux-research.mjs`
(screenshots in `ux-shots/ref-*.png`):

| Reference | Body | Control h | Radius |
|---|---|---|---|
| shadcn/ui dashboard (our lineage) | 14px | 32px | 8px |
| Linear | 12–13px | 20–28px | 2–6px |
| Tailwind docs | 13px | — | — |
| GitHub | 14–16px | 40px | 6px |
| Square POS | 14–16px | 36–63px (touch) | 4–10px |

→ Adopted as **DESIGN_SYSTEM.md "Density & sizing — v2"** (authoritative): 14px
body / 12px labels / 36px desk controls / 44–48px POS-only / 8px card & 6px
control radius / `p-4`–`p-5` cards / modest headings / capped form widths /
compact empty states. **Root stays 16px** — density comes from the scale, not a
shrink. (The earlier vw clamp in `globals.css` is a no-op at wide viewports and
will be removed in Phase 1.)

## 9. The execution engine: screenshot loop (validated)

`scripts/ux-shots.mjs` mints a token cookie per role and screenshots every
workspace at **1536×864** (owner's effective viewport) into `ux-shots/`. The
loop per screen:
1. `node --env-file=.env.local scripts/ux-shots.mjs` (dev server must be up on :3000; Turbopack reflects edits).
2. **Read** the relevant `ux-shots/NN-*.png` — audit against the v2 spec + the per-screen checklist (§ Phase 3).
3. Fix code → re-run harness → re-Read → iterate until it passes.
4. Gate (`tsc`/`lint`/`build`/`test`) → commit that screen → pinned push.

## 10. Locked decisions (from owner)

- **Accent:** teal stays primary (brand); blue = `info` only. Do NOT switch primary to blue.
- **Navigation:** keep per-role workspaces; polish nav to be clean + consistent. Do NOT build a unified module shell.
- **Density:** uniform power-user density per the v2 spec (not role-varied).
- **Reference feel:** healthcare-first (Doctolib/Practo/DrChrono) + SaaS polish (Linear/Retool/Stripe); POS borrows Square/Shopify touch density.

## 11. `/goal` prompt for the 6-hour session

> Run the HMS frontend UX overhaul per documentation/FRONTEND_UX_OVERHAUL_PLAN.md
> and the DESIGN_SYSTEM.md "Density & sizing — v2" + "Reference stack" sections.
> Honor the locked decisions: teal stays primary (blue = info only), keep per-role
> nav (no unified shell), uniform power-user density, healthcare-first + SaaS-polish
> feel. Use the screenshot loop (node --env-file=.env.local scripts/ux-shots.mjs at
> 1536×864) as the verification engine — actually Read the ux-shots/*.png and iterate
> until each screen matches the spec. Phase 1 density foundation (remove the no-op vw
> clamp; encode the 14px-anchored scale + 36px desk control heights) → Phase 2
> primitives (h-9 desk controls; FormField/FormGrid/PageHeader/EmptyState/Toolbar/
> DataTable + a consistent Dialog/modal + StatusBadge usage) → Phase 3 screen-by-screen
> (Reception → Pharmacy POS [fix the still-purple ADD TO BILL button] → Cashier →
> Doctor → Lab → IPD → Admin → Attendance/Login) → Phase 4 polish + an ESLint guard
> banning hardcoded Tailwind palette colors. Visual only; no logic/props/DB changes;
> IPD patient-safety logic byte-for-byte. Gate every screen (npx tsc --noEmit, pnpm
> lint 0 errors, pnpm build, pnpm test 181/181) and commit per screen with pinned push
> to feat/hms-completion (gh auth switch --user bubblu2264326 before each push). Keep
> going until all screens meet the v2 density spec at 1536px and the full gate is green.

## 12. Pre-flight before starting `/goal`

- Dev server running on **:3000** (the harness targets it). If down: `pnpm dev`.
- On `feat/hms-completion`, working tree clean (this plan + harness committed).
- `ux-shots/` is gitignored (artifacts never committed).
