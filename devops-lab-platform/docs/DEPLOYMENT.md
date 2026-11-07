# Deployment

Build stamp: every image carries `backend/VERSION`; `/api/health` returns it so
a stale deploy is immediately visible.

## Standard deployment

```bash
docker compose down -v
docker compose up -d --build
curl -s http://localhost/api/health   # → {"status":"ok","build":"v2-final-…"}
```

First boot generates all secrets into the `app_secrets` volume
(`scripts/gen_secrets.sh`: postgres password, JWT signing key, Redis password).
Values in `.env` take precedence over generated ones.

## TLS (production)

The base stack serves plain HTTP on :80 for nginx. For real deployments, add
the TLS overlay (nginx terminates HTTPS, ACME webroot for certbot, automatic
renewal + reload):

```bash
mkdir -p deploy/tls/certbot/{conf,www}
# first certificate issuance (one-off, adjust domain + email):
docker compose -f docker-compose.yml -f deploy/tls/docker-compose.tls.yml run --rm --entrypoint sh certbot \
  -c "certbot certonly --webroot -w /var/www/certbot -d opslance.example.com --email you@example.com --agree-tos --no-eff-email"
docker compose -f docker-compose.yml -f deploy/tls/docker-compose.tls.yml up -d
```

`deploy/tls/nginx-tls.conf` adds HSTS, TLS 1.2/1.3 only, and an HTTP→HTTPS
redirect. Renewals run twice daily in the certbot sidecar; nginx reloads every
6h to pick up fresh certificates.

## Network posture (hardened)

- **backend has no published port** — it is reachable only through nginx, so
  the CSP headers and rate limiting cannot be bypassed from outside.
- **backend has no Docker socket** — verification execs and the terminal PTY
  are proxied to the lab-manager internal API (`lab-manager/api.py`, port 8100,
  compose-network only, shared `LAB_API_TOKEN`).
- **Redis requires a password** (generated secret) and runs with AOF
  persistence (`redis_data` volume) so leaderboard/rate-limit state survives
  restarts.
- **WebSocket auth uses one-time tickets** — REST `POST /api/ws/ticket`
  (Bearer-authenticated) issues a 30-second, single-use, session-pinned
  ticket; the JWT never appears in WS URLs or access logs.
- **Refresh tokens are revocable** — logout (and each refresh rotation)
  denylists the token's `jti` in Redis for its remaining validity.
- **Stripe webhooks fail closed** — without `STRIPE_WEBHOOK_SECRET` the
  endpoint returns 503 unless `STRIPE_DEV_MODE=1` is set explicitly.
- **Structured logging** — `LOG_FORMAT=json` (compose default) emits structlog
  JSON; every response carries `X-Request-ID` which correlates all log lines
  for that request.

## Local development

```bash
make up          # compose stack (HTTP, generated secrets)
make test        # backend suite: pytest + real Postgres (pgserver) + fakeredis
make test-e2e    # Playwright against the stub backend (scripts/live_backend_runner_p4.py)
# lab-manager pure-logic tests (no Docker daemon needed):
PYTHONPATH="lab-manager:backend" python -m pytest lab-manager/test_worker.py -q
```

The stub runner exports a fixed `SECRET_KEY` for local/E2E use; the app
refuses to start without one (no silent fallback since v2-final-7).
