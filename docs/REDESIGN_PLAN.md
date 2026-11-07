# Opslance v2 — Redesign Plan (Step 0 deliverable)

> Phases run in this order on branch `redesign/v2`. Each phase ends with: tests green
> (the 58-test API suite as floor), app running, visual verification, a short report,
> and a commit series. Nothing merges to `main` and nothing deploys without your OK.

## Stack decision (kept, with two additions)

**Keep**: FastAPI + SQLAlchemy + Postgres + Redis + docker-compose worker (the lab
provisioning, grading, and terminal pipeline are the hard-won core — rewriting them
buys nothing and risks everything). Keep React 18 + Vite + TypeScript + Tailwind on the
frontend; the redesign is a rebuild of the UI layer on top of a token system, not a
framework swap.

**Add (justified)**:
1. `framer-motion` — scroll/entrance motion for landing + micro-interactions, honors
   `prefers-reduced-motion`. Chosen over CSS-only because the spec asks for
   scroll-driven animation and exit transitions; it is the smallest dep that does both.
2. `@react-three/fiber` + `three` — hero 3D (interactive cluster/node graph). Lazy-loaded
   via `React.lazy`, static SVG fallback, disabled on `prefers-reduced-motion` and
   low-device heuristics (`hardwareConcurrency <= 2` / `deviceMemory <= 2`), kept out of
   the main chunk.

**Deliberately NOT added**: Storybook (a `/design` route inside the app documents and
demos every component with zero infra and works in prod builds; DESIGN_SYSTEM.md links
to it), a UI kit like MUI/chakra (we are building our own tokens+components — a kit
would fight the KodeKloud/Linear feel), Next.js (an SSR marketing page is not worth a
framework migration; SEO needs are met with prerendered static meta, OG images,
sitemap.xml, robots.txt, JSON-LD from Vite).

## Phases

### Phase 1 — Design system + app shell (foundation)
- Tailwind extended with CSS-variable tokens: color scales (dark-first, light second),
  spacing, radii, shadows, type scale (display font + Inter-class UI + JetBrains Mono),
  motion durations, z-index. Theme toggle persisted (localStorage + `data-theme`).
- Component library in `src/components/ui/`: Button, Card, Badge, Tabs, Modal, Toast,
  Tooltip, Progress(+ring), Skeleton, Table, EmptyState, CommandPalette (Cmd/Ctrl+K).
  Keyboard nav + focus rings + ARIA baked in; WCAG AA checked.
- `/design` route showcasing every component (also serves as visual regression surface).
- App shell: new nav for student + admin, responsive, loading/error/empty states.
- **Exit**: old pages still work on the new shell; 58/58 tests; before/after screenshots.

### Phase 2 — Lab runner: question-by-question + schema migration (highest risk)
- New lab content schema v2 (`lab.yaml` per lab): `questions[]` with id, domain, weight,
  context, prompt, hints[3], solution, explanation, checks ref, time_target. Validator
  script + `docs/AUTHORING_LABS.md`.
- **Adapter, not replacement**: a generator script converts every existing lab's
  `metadata.json` (mission/acceptance_criteria/check.sh) into `lab.yaml` — each
  acceptance criterion becomes one question, weights parsed from the existing
  `check.sh` `run_check`/`task` lines so grading stays byte-identical.
- Per-question grading: run the SAME `check.sh`, map its per-check output lines to
  questions by order/description; no checker files change → existing behavior preserved.
- Lab runner UI: real-exam layout (left question panel + right terminal, top bar with
  timer/N-of-M/weight, flag-for-review, Prev/Next, navigator grid, per-question Check,
  cluster context banner, hints drawer, docs side panel toggle). Practice/Exam/Review
  modes; state persisted per question; resume after refresh; results screen with domain
  breakdown, pass threshold 66%, retry-failed-only.
- Backend: additive tables (`exam_attempts`, `question_states`) via new Alembic
  migrations; endpoints under `/api/sessions/...`; rate-limit checks per question.
- **Exit**: a 40-task CKA drill plays question-by-question end to end; old LabView still
  reachable behind a flag; E2E Playwright spec for the flow; 58/58 + new tests.

### Phase 3 — Dashboard + certification tracks
- New dashboard: welcome header, stats (labs, XP, streak), continue-where-you-left-off,
  learning paths with progress rings, recommended next lab, activity heatmap,
  leaderboard widget, settings. Certification track view (CKA/CKAD/CKS/KCNA/KCSA)
  with week-by-week plan + completion %. Search + filters; command palette wired.

### Phase 4 — Landing page + 3D
- Public marketing route: hero (headline, CTA, live terminal animation), 3D cluster
  scene (R3F, lazy + fallback + degrade), how it works, learning paths, exam-simulator
  showcase, feature grid, pricing (free/pro/enterprise), testimonials, FAQ, CTA, footer.
- SEO: meta/OG images, sitemap, robots, JSON-LD; Lighthouse budget Perf ≥90 / A11y ≥95.

### Phase 5 — Polish, tests, performance, a11y
- Error boundaries everywhere, optimistic UI where safe, skeletons; code-splitting +
  bundle report; Playwright E2E suite (signup/login, start lab, answer, check, flag,
  navigate, finish exam, results); unit tests for grader adapter + components; CSP
  headers, rate-limit hardening on spawn/check, dependency audit.

### Phase 6 — Docs + release prep
- README, ARCHITECTURE.md (updated to v2), AUTHORING_LABS.md, DESIGN_SYSTEM.md,
  deployment runbook, migration notes, known-gaps list.

## Status (final — all phases closed)

- **Phase 1 (design system + shell)** — done: tokens, `src/components/ui`, `/design`,
  app nav + ⌘K palette, theme persistence. Documented in `docs/DESIGN_SYSTEM.md`.
- **Phase 2 (lab content v2 + runner)** — done: `lab.yaml` for all 72 labs generated
  from the checkers (grading byte-identical), question-by-question runner
  (`/labs/:id/run`) with practice/exam modes, server-side timer, retry-failed;
  classic `LabView` untouched.
- **Phase 3 (dashboard + tracks)** — done: `GET /progress/dashboard` aggregate,
  track registry (Linux path + CKA 8-week), redesigned dashboard with continue strip,
  week stepper, module grid, 12-week heatmap, leaderboard widget.
- **Phase 4 (landing + 3D)** — done, with one substitution: the hero cluster is a
  hand-rolled canvas 3D projection (`Cluster3D.tsx`), not R3F — same interaction
  (drag-to-rotate, theme-aware) at ~0 dependencies and ~5 KB instead of ~600 KB.
- **Phase 5 (polish/tests/a11y/perf)** — done. Progress + Leaderboard pages on tokens,
  skip link + `aria-current` + focus-visible + reduced-motion, route-level code
  splitting (entry ≈239 kB / 81 kB gzip). Hardening closed out: CSP + hardening
  headers (API middleware + frontend nginx, theme bootstrap CSP-hashed),
  default-deny CORS (`CORS_ORIGINS`), rate-limit hardening on spawn/check/submit +
  login brute-force throttle, 96-test backend suite (`backend/tests/`), 17 vitest
  component tests, 26-spec Playwright E2E suite.
- **Phase 6 (docs/release)** — done: `ARCHITECTURE.md` (v2 as-built),
  `AUTHORING_LABS.md`, `DESIGN_SYSTEM.md`, `DEPLOYMENT.md` runbook, `TESTING.md`,
  README, Makefile targets (`test` / `test-e2e`).
- **Post-plan additions**: admin analytics (`/admin/analytics` + aggregate API),
  achievements UI (`/achievements` + catalog-aware profile endpoint + 3 new
  milestone badges), E2E runner committed to the repo
  (`scripts/live_backend_runner_p4.py`).

## Risks
1. **Grader mapping** (Phase 2): parsing check.sh output ↔ question attribution is the
   riskiest piece — mitigated by the adapter generating lab.yaml FROM the checkers, and
   per-question checks run the identical script end-to-end.
2. **Sessions on refresh/resume**: question state must survive reloads → server-side
   persistence, not localStorage-only.
3. **Terminal + 3D performance**: both are heavy; 3D never loads inside `/labs/:id`,
   and terminal keeps its current WS path untouched.
4. **Alembic merge-heads history** is messy; new migrations chain off the current head
   only, additive, reviewed before applying.
5. **Lighthouse on the landing page**: R3F is the main threat; static fallback + lazy
   chunk + no 3D on low-end/mobile.

## Decisions made without asking (flag any you disagree with)
- `/design` route instead of Storybook.
- YAML (not JSON) for lab authoring; one `lab.yaml` per lab dir, coexisting with
  metadata.json during migration.
- Exam mode timer stored server-side (anti-cheat friendly), resume across devices.
- `Enter` in terminal does NOT paste-multiline without confirmation (PSI-exam-like
  paste guard), documented in the runner.
- The unused `LabCard.tsx` and root-level legacy generator scripts stay untouched on
  `main`; cleanup PRs go on `redesign/v2` only after the phases above.
