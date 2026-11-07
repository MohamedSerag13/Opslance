#!/bin/sh
# Generate random secrets on the first `docker compose up -d`.
# Files are persisted in the `app_secrets` volume and reused afterwards:
# existing non-empty files are never overwritten, so restarting the stack
# keeps the same database password and JWT signing key.
set -e

SECRETS_DIR="${SECRETS_DIR:-/secrets}"
mkdir -p "$SECRETS_DIR"

gen_secret() {
    # $1 = output file, $2 = length
    if [ -s "$1" ]; then
        echo "  - $1 already exists, reusing"
        return 0
    fi
    # Write to a temp file first so a half-written secret is never picked up
    tr -dc 'A-Za-z0-9' < /dev/urandom | head -c "$2" > "$1.tmp"
    mv "$1.tmp" "$1"
    chmod 600 "$1"
    echo "  - generated $1"
}

echo "[secrets-init] Ensuring generated secrets in $SECRETS_DIR ..."
gen_secret "$SECRETS_DIR/postgres_password" 32
gen_secret "$SECRETS_DIR/secret_key" 64
gen_secret "$SECRETS_DIR/redis_password" 24
echo "[secrets-init] Done."
