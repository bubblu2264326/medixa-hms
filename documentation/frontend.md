# Frontend

## Stack

- **Next.js** 16.1.6 App Router with Turbopack
- **React** 19.1.0 (StrictMode disabled in `next.config.ts`)
- **TypeScript** 5
- **Tailwind CSS** 4 via `@tailwindcss/postcss` + `tw-animate-css`
- **Radix UI** primitives wrapped shadcn-style in `src/components/ui/`
- **Lucide** icons
- **react-hook-form** + **zod** + `@hookform/resolvers` for forms
- **react-hot-toast** and **sonner** for notifications (two libs, not yet consolidated)
- **react-select** for non-Radix select cases
- **react-to-print** for POS and report printing
- **@headlessui/react** in places where Radix doesn't fit

## Source layout

```
src/
  app/                          # routes (layouts + pages)
    (auth)/page.tsx             # login
    receptionist/layout.tsx
    doctor/layout.tsx
    lab/layout.tsx
    pharmacy/layout.tsx
    cashier/layout.tsx
    admin/layout.tsx
    employee/...
    attendance/...
    api/...                     # see features.md
  features/                     # per-role implementation
    Login/
    reception/
    doctor/
    laboratory/
    pharmacy/
    cashier/
    admin/
    shared/
  components/ui/                # shadcn-style primitives
contexts/                       # PatientIdContext, ClinicalDetailsContext, SidebarContext
public/                         # static assets including logo
```

## Routing model

- Each role has a dedicated layout under `src/app/<role>/layout.tsx` that defines the workspace shell (sidebar, header, theming).
- The `(auth)` route group keeps the login URL at `/` without exposing an `auth` URL segment.
- The middleware (`src/middleware.ts`) gates `/doctor`, `/lab`, `/receptionist`, `/pharmacy`, `/admin`, `/cashier`, and `/employee` by role.
- Feature components live under `src/features/<role>/` and are imported into the corresponding `src/app/<role>/.../page.tsx`.

## Cross-panel state

Top-level contexts under `contexts/` (imported via `@/contexts/...`):

- `PatientIdContext` — active patient and visit ids; consumed by reception, doctor, pharmacy.
- `ClinicalDetailsContext` — OB/GYN form state shared across reception sub-panels.
- `SidebarContext` — receptionist workspace tab/panel state.

Feature-local state otherwise stays in component / hook scope. There is no global store (Redux/Zustand) in use.

## Real-time updates

Queue updates use **Server-Sent Events** at `/api/queue/events`, with a 45-second polling fallback if SSE drops. The configuration is in `src/lib/server/queueConfig.ts`. Consumers (reception + doctor queue widgets) subscribe in `useEffect` on mount and disconnect on unmount.

## Forms

- React Hook Form throughout for non-trivial forms
- Zod schemas via `@hookform/resolvers/zod`
- Tailwind + Radix labels / inputs from `src/components/ui/`

## Timezone & date formatting

**Hard rule (ESLint)**: do not use:
- `Date.prototype.toLocaleString`
- `Date.prototype.toLocaleDateString`
- `Date.prototype.toLocaleTimeString`

Use helpers from [`src/lib/timezone/client.ts`](../src/lib/timezone/client.ts) instead. They resolve the system timezone (default `Asia/Karachi`) consistently across client and server.

The hook `useSystemTimezone()` (from `src/lib/timezone/useSystemTimezone.ts`) gives the active TZ in client components.

## Notifications

Two libraries currently coexist:

- `react-hot-toast` — used by older modules
- `sonner` — used in newer admin and cashier flows

Don't introduce a third. Consolidating to one is on the optimization list.

## Printing

POS receipts and pharmacy reports use `react-to-print`. See `/api/pos/print`, `/api/receipts/*`, and `/api/print/*`.

## UI maturity, honestly

- **Most polished**: pharmacy POS, cashier worklist, admin staff directory & roster
- **Mid**: reception, doctor consultation panels, lab order entry
- **Sparse**: doctor analytics, employee self-service, certain admin tabs

Visual language is being unified toward the pharmacy / admin v2 patterns but not all modules have caught up.

## Performance notes

- Turbopack dev cold start ~2–3 s on this codebase; HMR is sub-second
- Strict mode is intentionally off in `next.config.ts` — double-mount effects were causing duplicate SSE subscriptions and form-state bugs during the migration
- No code splitting work has been done explicitly; relying on Next.js defaults

## Conventions

- File names: kebab-case in `app/`, PascalCase for component files in `features/` and `components/ui/`.
- Import alias: `@/` resolves to the repo root (see [`tsconfig.json`](../tsconfig.json)), so feature code imports look like:
  ```ts
  import { Button } from "@/src/components/ui/button";
  import { query } from "@/database/db";
  import { PatientIdContext } from "@/contexts/PatientIdContext";
  ```
- Server components only when needed (data-heavy reads with no interactivity).
- Avoid client-only libraries in server components.

## What this isn't

- Not a design system. There's no token registry, no Storybook, no documented spacing/color scale.
- Not internationalized. UI strings are English-only.
- Not accessibility-audited. Radix primitives bring solid baseline a11y, but the broader codebase hasn't been swept.
- Not offline-capable.
