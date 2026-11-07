# Testing

Three test layers, all runnable from the repo: the backend API suite (pytest),
the frontend component suite (vitest), and the end-to-end browser suite
(Playwright). Every layer runs against real code paths — no mocked grading.

## Backend — pytest (96 tests)

```bash
cd devops-lab-platform/backend
pip install -r requirements.txt -r requirements-dev.txt
PYTHONPATH="$PWD" python -m pytest tests/ -q
```

The suite spins up an embedded Postgres (`pgserver`), runs the alembic
migrations, and stubs only the Docker exec layer (canned `check.sh` output), so
auth, grading, XP/streaks/achievements, sessions, exam attempts, progress,
analytics and every rate limiter are exercised for real against
`fastapi.testclient`. Files:

| File | Covers |
|---|---|
| `test_health_security.py` | health, hardening headers, default-deny CORS |
| `test_auth.py` | login/refresh/me, reset-password flow, **brute-force throttle** |
| `test_rbac.py` | anonymous/student/admin boundaries on both route families |
| `test_sessions.py` | session lifecycle, tier gates, check/submit, **gamification awards**, hints + deduction, extend, help queue |
| `test_attempts.py` | runner: practice/exam attempts, per-question checks + mapping, flags, hints gated in exam, **exam timer**, expiry auto-finish, finish + submission, review payload, retry-failed |
| `test_progress.py` | progress/summary/modules/activity, dashboard aggregate (continue/retry/tracks/leaderboard), group scope |
| `test_gamification.py` | profile + achievement catalog, milestone awards, daily challenges, challenge-mode freeze, admin leaderboard |
| `test_admin.py` | students CRUD/bulk/points/plan, groups, environments, lab catalog, **analytics aggregate** |
| `test_rate_limits.py` | spawn burst gate + window, check gates, submit window, runner check gate, 60/min budget |

Shared-DB conventions: fixtures use get-or-create for fixed ids, tests assert
deltas for global counters, and `db.expire_all()` refreshes identity-map state
after API commits.

## Frontend — component unit tests (17 tests, vitest)

```bash
cd devops-lab-platform/frontend
npm install
npm test
```

`tests/unit/ui.test.tsx` (jsdom + Testing Library + jest-dom) covers Button,
Badge, Card, ProgressBar/Ring, EmptyState, Tabs, Modal, Skeleton and the
`theme` helper. Tests live outside `src/` so the production `tsc -b` build
never type-checks them; `vitest.config.ts` wires the environment.

## Frontend — E2E (Playwright, 26 specs)

The suite drives the **production build** (`vite preview`) against a **live
backend** on `127.0.0.1:8123` — no mocks in the browser path.

One-time setup:

```bash
cd devops-lab-platform/frontend
npm install
npx playwright install chromium
pip install pgserver fakeredis        # for the seeded backend runner
```

Run it:

```bash
# 1. build the frontend (vite preview serves dist/)
npm run build

# 2. start the seeded backend (blocks; keep running)
python ../scripts/live_backend_runner_p4.py &
#    -> seeds real Postgres + fakeredis: admin@opslance.local / Admin@2025!,
#       visual@opslance.local / VisualPass1! (Pro, 9 passes + 1 fail, running
#       sessions, active CKA mock exam attempt with a live timer, 2 earned
#       badges) and rival@opslance.local; waits for readiness at
#       /tmp/opslance_e2e_ready

# 3. run the suite (starts/stops vite preview on :4178 itself)
npx playwright test
```

Specs (`frontend/e2e/`):

| Spec | Covers |
|---|---|
| `landing.spec.ts` | hero copy, 3D cluster canvas painted, lazy terminal chunk, section anchors |
| `dashboard.spec.ts` | stat cards, continue strip with live exam countdown, CKA week stepper, heatmap, leaderboard widget, `aria-current` nav, skip link focus, logout, session reload |
| `palette.spec.ts` | Ctrl+K open, fuzzy lab search, Enter navigation, Escape close |
| `progress.spec.ts` | computed stats (pass rate), track summaries, heatmap, history table + passed/failed filter tabs |
| `leaderboard.spec.ts` | session podium, all-time reorder (rival overtakes), live status chip |
| `runner.spec.ts` | `/labs/:id/run` mode picker renders for a lab with a live session |
| `achievements.spec.ts` | nav + palette entry, earned badges with dates and XP, locked catalog with progress |
| `admin-analytics.spec.ts` | admin login, KPI cards, daily activity chart, lab/group tables, window refetch, student-redirect RBAC |
| `theme-design.spec.ts` | theme toggle + persistence across reload, `/design` showcase, mobile viewport without horizontal overflow |

Reports land in `frontend/playwright-report/` (HTML), traces retained on
failure.

## Manual visual QA

The design system page at `/design` documents every token and component.
Dark/light themes are driven by `data-theme` on `<html>` (pre-paint script in
`index.html`), and `prefers-reduced-motion` collapses all animation including
the hero's 3D cluster (it renders a single static frame).
