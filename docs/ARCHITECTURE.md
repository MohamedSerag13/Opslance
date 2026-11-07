# Opslance / DevOps Lab Platform — Architecture (v2, as-built on `redesign/v2`)

> Originally written during the Step-0 discovery pass ("as found on main"), then kept
> current as the redesign landed. Everything here describes the **shipped state of
> `redesign/v2`** and is verified against the code, not assumed. The Step-0 baseline
> is preserved at the bottom (§9) where it still matters.

## 1. What this is

A self-hosted, container-based DevOps learning platform: students log in through a
marketing landing page, are assigned labs via groups, spawn **isolated per-student
Docker environments** with an in-browser terminal, and are graded by shell checkers
that verify **live state** (filesystem state in linux labs, live Kubernetes objects in
CKA labs). The v2 redesign added a token-based design system, a public landing page, a
question-by-question exam-style lab runner, a certification-track dashboard,
achievements, admin analytics, and a full hardening pass (security headers, rate
limits, login throttling, test suites).

## 2. Runtime topology (docker-compose, 7 services)

```
browser ── :80 nginx ──┬── /            → frontend (Vite build served by nginx:alpine,
                       │                  sets CSP + hardening headers for the SPA)
                       ├── /api/ws/     → backend:8000  (WebSocket upgrade, 24h read timeout)
                       └── /api/        → backend:8000  (hardening headers from the API middleware)
                                  │
        backend ──┬── PostgreSQL 15 (postgres_data volume, secrets from app_secrets volume)
                  ├── Redis 7 ──── LPUSH lab_jobs / BRPOP lab_jobs + rate-limit counters
                  └── /labs-repo (ro bind of ../labs) + /var/run/docker.sock
                                  │
        lab-manager (worker, same Docker socket):
            start_lab: copy lab dir → /tmp/lab-envs/<student>-<lab>, rewrite compose
            (strip container_name, rewrite relative binds via labs host path, inject
            resource limits OR privileged mode, tty+stdin), `docker-compose -p
            <name>-<shortid> up -d --build`, pick first service as terminal container,
            inject restricted sudoers, mark session running.
            check/stop/cleanup: exec verification, compose down -v, idle/hard expiry.
```

- `secrets-init` (alpine one-shot) generates `postgres_password` / `secret_key` into the
  `app_secrets` volume on first boot; `.env` values take precedence.
- `db-init` (one-shot) runs `alembic upgrade head` + `scripts/seed_admin.py`.
- nginx uses Docker's embedded DNS (`resolver 127.0.0.11`) so services can start in any
  order; WS gets `proxy_read_timeout 86400`.
- Deploy story = this compose stack + `Makefile` (up/down/build/seed/logs/clean/migrate/
  status/test/test-e2e). No CI server yet — the suites run locally (`make test`,
  `make test-e2e`, `npm test`).

## 3. Backend (FastAPI + SQLAlchemy + Alembic)

Entry `backend/main.py` — 12 routers. CORS is now **default-deny** (`CORS_ORIGINS` env,
comma-separated, enables listed origins with credentials; empty = no cross-origin grant
— the app is same-origin through nginx and authenticates with Bearer headers).
`security.py` adds `SecurityHeadersMiddleware` (pure ASGI) to every API response:
`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
`Permissions-Policy`, `Cross-Origin-Opener-Policy`.

| Router | Prefix | Notable routes |
|---|---|---|
| auth | /api/auth | login (**10-fail/15min throttle per email+IP**), refresh, logout, me, preferences, reset-password |
| billing | /api/billing | Stripe checkout session, webhook, status |
| admin_groups | /api/admin/groups | CRUD + per-group lab visibility, unlock order, show/hide all |
| admin_students | /api/admin/students | CRUD, bulk create, reset-password, patch points, patch plan (free/pro/enterprise) |
| admin_labs | /api/admin/labs | list, edit, `/sync` (rescan /labs-repo metadata.json into `labs` table) |
| admin_environments | /api/admin/environments | list lab containers, force-delete |
| **admin_analytics** | /api/admin/analytics | one aggregate: overview KPIs, daily activity series, per-lab performance, group comparison, recent submissions (`?days=7/14/30/90`) |
| labs | /api/labs | student lab list (group-gated, visibility-ordered), detail, solution |
| sessions | /api/sessions | create (**idempotent same-lab return → tier gate → active-session cap → spawn burst gate 1/5s + window 8/10min**), active, get, stop, **check** (1/2s gate + 30/5min), **submit** (10/5min; records Submission, XP/level/streak/achievements/email), hints (3 levels, reveal + 10pt penalty), help queue, extend (pro-only), **attempts API** (runner) |
| progress | /api | progress, leaderboard, summary, modules, activity, **dashboard aggregate** (summary, continue-where-you-left-off, tracks, 84-day activity, group-or-global leaderboard with my_rank) |
| gamification | /api/gamification | **profile (xp/level/streak + full achievement catalog with earned flags and progress bars)**, leaderboard by scope, daily challenges (auto-seeded), challenge mode (frozen leaderboards) |
| websocket | /api/ws | `/terminal/{session_id}` (JWT via query param → `docker exec /bin/bash` tty pipe → xterm; logs commands, heartbeats `last_activity_at`), `/events` |

### Auth & RBAC
JWT HS256 (access + refresh), bcrypt hashes, `OAuth2PasswordBearer`.
`dependencies.py`: `get_current_user` → `get_current_student` (403 if admin) /
`require_admin` / `rate_limit_student` (60 req/min/student) / `enforce_rate_limit`
(shared fixed-window helper used by login, spawn, check, submit, runner checks).
Students have `must_reset_password` forced flow. **Tiers**: free (module 1 only,
1 active session) / pro (all labs, 3 sessions, session extend) / enterprise.

### Data model (12 tables)
`groups`, `students` (xp, level, streaks, tier, …), `achievements` +
`student_achievements`, `daily_challenges`, `labs`, `group_labs`, `lab_sessions`,
`submissions`, `command_history`, **`exam_attempts`** (mode practice/exam, server-side
timer `expires_at`, pass_mark, score_total/earned, question_ids subset) and
**`question_states`** (per-question status, checks_run, hints_revealed, flagged,
first_passed_at — the runner's refresh/reload survival layer). 10 Alembic revisions
incl. a manual `merge_heads`; the runner migrations chain off the current head,
additive only.

## 4. Grading engine (the thing we must not break)

- **linux labs** (`labs/linux/module-XX-*/lab-*`, 64 labs): single workstation container
  per lab. `check.sh` emits per-check lines + `SCORE: <n>/100`, exit 0 ≥70.
- **CKA labs** (`labs/kubernetes/cka-week-XX-*`, 8 labs, modules 21–28): **two-container**
  compose — `cka-workstation` (terminal) + `k3s-server` (privileged, kubeconfig on a
  shared volume). `check.sh` uses `check_lib.sh::task <weight> "<desc>" '<cmd>'`,
  pass mark 66.
- Backend `run_verification_in_container` does `docker exec <terminal-container>
  bash /check.sh`, parses the `SCORE:` line, stores a Submission.
- The runner's per-question checks run the **same** `check.sh` and attribute its result
  lines to questions **by order** (`lab_content.map_output_to_questions`); a line-count
  mismatch marks output "unmapped" and changes no state (safe fallback).
- Verification always runs **inside the student's own container** — live state only.

## 5. Lab content schema v2 + the runner

- Every lab ships `lab.yaml` (schema_version 2): `questions[]` with id, order, domain,
  weight, prompt, context, hints[3], solution, explanation, time_target_minutes.
  Generated from the existing checkers by `scripts/migrate_labs_to_yaml.py` (weights
  parsed from check.sh) so grading stays byte-identical; validated by
  `scripts/validate_lab_yaml.py`; authoring guide in `docs/AUTHORING_LABS.md`.
- `GET /api/labs/{id}/run` frontend route: mode picker (Practice / Exam), left question
  panel + right terminal, navigator grid, flag-for-review, hints drawer (practice only),
  exam timer chip, results screen with domain breakdown and retry-failed-only.
- Attempt lifecycle (`/api/sessions/{sid}/attempts`): create → per-question check/hint/
  flag/navigate → `finish` (one authoritative final check.sh run, scores against
  `pass_mark`, records a Submission through the same gamification path) →
  `retry-failed` (subset attempt). Expired exam attempts auto-finish on next read;
  container-gone finish grades from persisted question states.
- Classic `LabView` (`/labs/:id`) remains fully functional; the runner is additive.

## 6. Frontend (React 18 + Vite 5 + TS + Tailwind 3)

- **Design system**: semantic tokens as CSS variables (`src/index.css`, dark-first +
  light, `data-theme` on `<html>`, pre-paint bootstrap script — CSP-hashed),
  `tailwind.config.js` maps them to utilities; 13-component kit in
  `src/components/ui` (Button, Card, Badge, Tabs, Modal, Toast, Tooltip,
  ProgressBar/Ring, Skeleton, EmptyState, Input, ThemeToggle, Logo) with keyboard nav,
  focus rings, `prefers-reduced-motion` handling. Documented in
  `docs/DESIGN_SYSTEM.md` + the `/design` showcase route.
- **Routes**: `/` landing (hero with live terminal demo + canvas 3D cluster, paths,
  exam showcase, pricing, FAQ, SEO/OG/JSON-LD, sitemap/robots), `/login`,
  `/reset-password`, `/design`; students: `/dashboard` (stats, continue strip, exam
  countdown, CKA week stepper, module grid, 12-week heatmap, leaderboard widget),
  `/labs/:id`, `/labs/:id/run`, `/progress`, `/achievements`, `/leaderboard`,
  `/billing`; admin: `/admin`, `/admin/analytics`, groups(+detail), students(+detail),
  labs, environments, leaderboard. All page-level routes lazy-split (entry ≈239 kB,
  81 kB gzip); `framer-motion` and `xlsx` are isolated chunks.
- **Command palette** (⌘K / Ctrl+K): labs, pages (incl. Achievements), theme + logout
  actions.
- State: `zustand` (`authStore`, `labStore`); axios client with access/refresh token
  interceptors; leaderboard + terminal over same-origin `/api/ws`.

## 7. Security hardening (v2)

- **Security headers**: API middleware (above) + full CSP on the SPA nginx
  (`frontend/nginx.conf`): `default-src 'self'`, `script-src 'self' 'sha256-…'` (the
  pre-paint theme script is hashed — recompute via
  `scripts/compute_csp_hash.py`-style extraction if index.html changes),
  `style-src 'self' 'unsafe-inline'` (xterm inline style attrs), `connect-src 'self'
  ws: wss:` (terminal + events), `frame-ancestors 'none'`, plus nosniff/frame-deny/
  referrer/permissions-policy. The port-80 proxy adds nothing, so headers flow through.
- **Rate limits** (Redis fixed windows, `dependencies.enforce_rate_limit`):
  login 10 fails/15min per email **and** per IP (successful login resets);
  spawn 1/5s burst + 8/10min (only on real spawn paths; same-lab re-calls are
  idempotent and never count); classic check 1/2s + 30/5min; runner question-check
  2s gate + 40/5min per attempt; submit 10/5min; blanket 60 req/min/student.
- **CORS**: default-deny (see §3).
- **Per-student isolation**: unique compose project + network per session (unchanged
  from the baseline; see §9).

## 8. Testing & ops posture (v2)

- **Backend API suite** — `backend/tests/`, 96 pytest tests on a real Postgres
  (`pgserver`) + fakeredis, Docker exec stubbed: auth + login throttle, RBAC, session
  lifecycle + tier gates, grading + gamification (XP/level/streak/achievements),
  hints, runner attempt lifecycle (incl. timer, expiry auto-finish, retry-failed,
  review payload), progress/dashboard aggregates, achievements catalog, challenge
  mode, admin CRUD + analytics, every rate limiter, security headers, default-CORS
  posture. Run: `cd backend && PYTHONPATH="$PWD" python -m pytest tests/ -q`
  (`make test`; deps in `backend/requirements-dev.txt`).
- **Component unit tests** — vitest + Testing Library (`frontend/tests/unit/`), 17
  tests over the UI kit + theme helper. Run: `cd frontend && npm test`.
- **E2E** — Playwright, 26 specs against the production build served by `vite preview`
  with the **seeded live backend** (`scripts/live_backend_runner_p4.py`, committed to
  the repo): landing, dashboard, palette, progress, leaderboard, runner, themes,
  **achievements** (nav + palette + earned/locked render), **admin analytics** (KPIs,
  chart, tables, RBAC redirect). Run: `cd frontend && npx playwright test`
  (`make test-e2e`).
- Email is SendGrid-templated and no-ops without `SENDGRID_API_KEY`; observability is
  still stdout logging (structured logging + metrics remain a known gap).

## 9. Step-0 baseline notes that still apply

1. Grading is `check.sh` verifying live container state via docker exec — never move
   it out of the student container.
2. Existing labs remain playable; schema changes ship as additive Alembic migrations
   (the lab.yaml v2 rollout is the reference implementation of "adapter, not
   replacement").
3. User data, progress, points, tiers, auth keep working; the DB migrations for the
   runner (`exam_attempts`, `question_states`) are additive.
4. Per-student environment isolation (unique compose project + network) is untouched.
5. The regression floor grows with each phase: 96 API tests + 17 unit + 26 E2E must
   stay green.
