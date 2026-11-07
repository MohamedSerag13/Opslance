# Opslance Design System (v2)

The system is CSS-variable **semantic tokens** + a small component kit. It is
dark-first with a full light theme, WCAG-AA checked, and documented live by the
`/design` route inside the app (renders every token and component in both
themes — treat that page as the executable spec).

## 1. Tokens

Defined in `frontend/src/index.css` as RGB channel triplets on
`:root` (dark defaults) and `[data-theme="light"]`; `tailwind.config.js` maps
them to utility names with `<alpha-value>` so opacity modifiers work.

| Token | Purpose |
|---|---|
| `bg` | page background |
| `surface` / `surface-2` | cards / wells, inputs, table header bands |
| `border` | hairlines, card borders |
| `content` / `muted` | primary text / secondary text |
| `primary` (+ `primary-strong`) | brand actions, active states, links |
| `accent` (+ `accent-soft`) | highlights, gamification, "earned" states |
| `success` / `warn` / `danger` | pass / caution / fail semantics |

Theme switching flips `data-theme` on `<html>`; an inline pre-paint script in
`index.html` reads `localStorage['ops-theme']` (falling back to
`prefers-color-scheme`) before first paint to avoid flashes. That script is the
only inline script allowed by CSP — its sha256 is pinned in
`frontend/nginx.conf`; if you edit it, recompute the hash
(`python scripts/compute_csp_hash.py`) and update the CSP header.

## 2. Typography

Self-hosted, preloaded WOFF2 (`frontend/public/fonts/`):

- **Space Grotesk** — display face (`font-display`): headings, stat numbers,
  logo. Marketing scale: `text-display-lg` / `text-display-md` (clamp-based).
- **Inter** — UI text (`font-sans`).
- **JetBrains Mono** — terminals, command snippets, tabular numbers
  (`font-mono`; numeric KPIs use `tabular-nums`).

## 3. Component kit (`frontend/src/components/ui`)

Button (6 variants × 3 sizes, loading spinner, focus ring), Card (+ `interactive`
hover lift, `glow` top edge, `CardHeader`), Badge (7 variants, optional status
dot), Tabs (ARIA tablist), Modal (portal, Escape close, focus move, scroll
lock), Toast (context provider + `useToast`), Tooltip, ProgressBar +
ProgressRing (gradient stroke, centered label), Skeleton, EmptyState (icon /
title / description / action), Input, ThemeToggle, Logo.

Conventions baked in: `focus-visible` rings on every interactive element,
`aria-current="page"` navigation, `prefers-reduced-motion` collapses all
animation (including the landing hero's 3D cluster, which renders a single
static frame), labels on all progress indicators, 4.5:1 minimum text contrast
in both themes.

## 4. Motion

Durations: 150ms (hover/focus), 200–300ms (cards, modals), 500–700ms (progress
fills). `framer-motion` powers landing scroll/entrance choreography and is a
separate lazy chunk. Reduced-motion collapses transforms and pulses app-wide.

## 5. Patterns

- **Page frame**: `AppNav` (student) or admin header + `max-w-7xl` container,
  `space-y-8` sections, skip-to-content link (`#main`).
- **KPI stat cards**: `Card p-6` + uppercase muted label + `font-display text-3xl`
  value + muted sub-line. Used on dashboard, progress, achievements, analytics.
- **Data tables**: full-width, `divide-y divide-border`, uppercase muted header
  band on `bg-surface-2/50`, right-aligned numerics with `tabular-nums`.
- **Charts**: dependency-free inline SVG using token colors
  (`fill-primary`, `stroke-border`, …) — see `AdminAnalytics` `DailyChart` and
  the dashboard `Heatmap`; every `<svg role="img">` carries an `aria-label`.
- **Loading / empty / error**: every page ships Skeleton grids for first paint,
  `EmptyState` for no-data (with a primary action) and for retryable failures.
- **Grading feedback**: success/danger badges with dots, `+N XP` accent badges.

## 6. Adding a component

1. Build it on tokens only — no raw hex values, no `text-gray-*`.
2. Wire keyboard + ARIA + focus ring + reduced-motion before merging.
3. Add it to `ui/index.ts` exports and to the `/design` showcase page
   (`frontend/src/pages/DesignSystem.tsx`).
4. Add/extend a unit test in `frontend/tests/unit/`.
