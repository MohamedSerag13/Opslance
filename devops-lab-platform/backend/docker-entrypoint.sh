#!/bin/sh
# Entry point for the backend and lab-manager containers.
# Fills DATABASE_URL / SECRET_KEY from the auto-generated secrets produced by
# the `secrets-init` service (app_secrets volume) unless they are already
# provided explicitly through the environment (.env / shell overrides win).
#
# Backend role (DB_WAIT=1): also waits until Postgres actually accepts
# connections and refreshes the lab catalog. A lab-sync failure is logged but
# never takes the API down; migrations and seeding live in the one-shot
# db-init service instead of this container.
set -e

# First log line = build identity, so a stale deploy is immediately visible
# in `docker compose logs backend` even if the app fails later.
BUILD_FILE="$(pwd)/VERSION"
if [ -r "$BUILD_FILE" ]; then
    echo ">>> build: $(cat "$BUILD_FILE")"
fi

SECRETS_DIR="${SECRETS_DIR:-/secrets}"

if [ -z "${SECRET_KEY:-}" ] && [ -s "$SECRETS_DIR/secret_key" ]; then
    SECRET_KEY="$(cat "$SECRETS_DIR/secret_key")"
    export SECRET_KEY
fi

if [ -z "${POSTGRES_PASSWORD:-}" ] && [ -s "$SECRETS_DIR/postgres_password" ]; then
    POSTGRES_PASSWORD="$(cat "$SECRETS_DIR/postgres_password")"
fi

if [ -z "${DATABASE_URL:-}" ] && [ -n "${POSTGRES_PASSWORD:-}" ]; then
    # +psycopg2 pinned: SQLAlchemy >= 2.1 would otherwise pick psycopg (v3),
    # which is not installed in this image
    DATABASE_URL="postgresql+psycopg2://postgres:${POSTGRES_PASSWORD}@postgres:5432/lab_platform"
    export DATABASE_URL
fi

if [ "${DB_WAIT:-0}" = "1" ] && [ -n "${DATABASE_URL:-}" ]; then
    echo ">>> waiting for database to accept connections..."
    i=0
    # raw psycopg2 does not understand the SQLAlchemy "+psycopg2" scheme suffix
    until python -c "import os, sys, psycopg2; psycopg2.connect(os.environ['DATABASE_URL'].replace('+psycopg2', '')).close()" >/dev/null 2>&1; do
        i=$((i+1))
        if [ "$i" -ge 30 ]; then
            echo "ERROR: database not reachable after 30 attempts" >&2
            exit 1
        fi
        sleep 2
    done
    echo ">>> database reachable"

    echo ">>> syncing lab catalog (non-fatal)..."
    PYTHONPATH="${PYTHONPATH:-$(pwd)}" python scripts/sync_labs.py \
        || echo "WARNING: lab sync failed; API continues without the refreshed catalog" >&2
fi

exec "$@"
