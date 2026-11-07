# Opslance — Deployment Runbook

Operational guide for the docker-compose stack. Architecture details live in
`ARCHITECTURE.md`; lab authoring in `AUTHORING_LABS.md`.

## 1. First deploy

```bash
cp .env.example .env          # then edit ADMIN_EMAIL / ADMIN_PASSWORD
docker compose up -d --build
docker compose logs -f db-init backend   # first boot: migrations + seed + lab sync
```

- `secrets-init` generates `postgres_password` + `secret_key` into the
  `app_secrets` volume on first boot; `.env` values take precedence.
- `db-init` runs `alembic upgrade head` + seeds the admin account. If it exits
  non-zero, `docker compose logs db-init` names the failing step.
- Open `http://<host>/` (landing page) → `/login` (admin creds from `.env`).

**macOS / Docker Desktop**: set `LABS_HOST_PATH=/absolute/path/to/Opslance/labs`
in `.env` — labs using bind mounts cannot resolve Mac paths from inside the
container.

## 2. Environment variables

| Var | Default | Notes |
|---|---|---|
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | — | super-admin login; **change before first start** |
| `POSTGRES_PASSWORD`, `SECRET_KEY` | generated | pin in `.env` to override |
| `LABS_HOST_PATH` | auto-detected | host-absolute labs dir (required on macOS) |
| `BACKEND_PORT` | 8000 | host port for the API (UI stays on 80) |
| `CORS_ORIGINS` | *(empty = deny)* | comma-separated browser origins; only needed for external integrations. The app itself is same-origin. |
| `SENDGRID_API_KEY`, `EMAIL_FROM_*`, `FRONTEND_BASE_URL` | unset | email (welcome / completion / subscription). Unset ⇒ emails no-op. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID` | unset | billing |

## 3. Day-2 operations

```bash
docker compose ps                  # health: backend has a /api/health check
make migrate                       # alembic upgrade head inside the backend
make seed                          # re-run admin/group seeding (idempotent)
docker compose logs -f backend     # stdout logging (observability is stdout-only today)
```

- **Lab sync**: the backend syncs `metadata.json` from `/labs-repo` at startup;
  re-sync from the admin UI (`Sync Labs`) or restart the backend after adding
  labs. New labs with `lab.yaml` are immediately runner-capable.
- **Migrations are additive-only** by policy; never drop student data. The
  runner tables (`exam_attempts`, `question_states`) chain off the current head.
- **Backups**: `docker compose exec postgres pg_dump -U postgres lab_platform >
  backup.sql` (cron it); the `app_secrets` volume must survive alongside
  `postgres_data` or logins break (SECRET_KEY verifies JWTs).

## 4. Security posture (what's enforced where)

- **CSP + hardening headers** are set on the frontend nginx
  (`frontend/nginx.conf`) and flow through the port-80 proxy; the API adds
  nosniff / frame-deny / referrer / permissions-policy / COOP via
  `backend/security.py`.
  - If you edit the inline theme script in `frontend/index.html`, recompute the
    CSP hash: `python scripts/compute_csp_hash.py` and update both `add_header
    Content-Security-Policy` lines in `frontend/nginx.conf`, then rebuild the
    frontend image.
- **Rate limits** (Redis, see `backend/dependencies.py`):
  login 10 fails/15min per email+IP · spawn 1/5s + 8/10min · check 1/2s +
  30/5min · runner checks 2s gate + 40/5min/attempt · submit 10/5min ·
  blanket 60 req/min/student. Counters clear with Redis restarts.
- **TLS**: terminate TLS upstream of the port-80 proxy (load balancer /
  reverse proxy) and forward `X-Forwarded-Proto`; login throttle keys honor
  `X-Forwarded-For`'s first hop. Add HSTS at the TLS layer.

## 5. Verification after any change

```bash
make test          # 96 backend API tests (pytest, embedded Postgres + fakeredis)
cd frontend && npm test          # 17 component unit tests (vitest)
cd frontend && npm run build     # tsc + vite build (type gate)
make test-e2e      # 26 Playwright specs vs the seeded live backend
                   # (start scripts/live_backend_runner_p4.py first — see docs/TESTING.md)
```

## 6. Troubleshooting

| Symptom | First checks |
|---|---|
| Login 429 | login throttle tripped (10 fails/15min); wait or flush Redis keys `login_fail:*` |
| Lab start 429 "seconds between" | spawn burst gate; retry after 5s |
| Lab start 400 "Active lab session limit" | tier cap (free 1 / pro 3); stop another lab or upgrade |
| Lab never leaves "starting" | `docker compose logs lab-manager`; docker.sock mount; `LABS_HOST_PATH` |
| Checker output unmapped in runner | lab.yaml question count ≠ check.sh result-line count — see AUTHORING_LABS.md validator |
| 401 loops in the UI | SECRET_KEY changed after tokens were issued (users re-login) |
| db-init fails | `docker compose logs db-init`; usually DB reachability or a migration conflict |
