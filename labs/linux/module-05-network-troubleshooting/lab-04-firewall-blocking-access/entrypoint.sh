#!/bin/bash
# Lab 04 server entrypoint
# Sets up boot state: fake-ufw DENIES 8080, backend HTTP server on 8888,
# gatekeeper proxy on 8080.
#
# Do NOT use set -e here — background processes failing shouldn't kill the
# container boot before the student can investigate.

# ── 1. Initialize fake-ufw state ──────────────────────────────────────────────
mkdir -p /var/lib/fakeufw
chmod -R 777 /var/lib/fakeufw

# Boot state: ufw is active but port 8080 is DENIED
echo "active" > /var/lib/fakeufw/status
# Write the initial DENY rule in the same format as fakeufw.sh status output
printf "%-30s %-10s %s\n" "8080" "DENY" "Anywhere" > /var/lib/fakeufw/rules

echo "[entrypoint] Fake-ufw initialized: 8080 DENY"

# ── 2. Create a simple web root and start the backend HTTP server ──────────────
# Serve from /tmp/www so Python's http.server always returns 200 (index.html).
# Without --directory it runs from /home/intern which Python can't list and
# returns 404 "No permission to list directory" — which would break check.sh.
mkdir -p /tmp/www
cat > /tmp/www/index.html << 'HTML'
<!DOCTYPE html>
<html><head><title>Lab Server</title></head>
<body><h1>Lab 04 — Web Server is Running</h1>
<p>The service is healthy. You are connected via the gatekeeper proxy.</p>
</body></html>
HTML

python3 -m http.server 8888 --directory /tmp/www > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "[entrypoint] Backend HTTP server started on :8888 (pid=$BACKEND_PID, serving /tmp/www)"

# Give backend a moment to bind before gatekeeper tries to forward to it
sleep 0.5

# ── 3. Start the gatekeeper proxy on port 8080 (the exposed port) ─────────────
GATEKEEPER_LISTEN_PORT=8080 \
GATEKEEPER_BACKEND_PORT=8888 \
FAKEUFW_RULES_FILE=/var/lib/fakeufw/rules \
  python3 /usr/local/bin/gatekeeper.py > /tmp/gatekeeper.log 2>&1 &
GATE_PID=$!
echo "[entrypoint] Gatekeeper started on :8080 → :8888 (pid=$GATE_PID)"

sleep 0.5
echo ""
echo "==========================================================="
echo " Boot complete. State summary:"
echo "   Backend HTTP server : :8888 (internal, serving /tmp/www)"
echo "   Gatekeeper proxy    : :8080 (exposed, fake-ufw enforced)"
echo "   Fake-ufw state      : active, 8080 DENY"
echo ""
echo " Useful commands:"
echo "   ss -tulnp | grep 8080     — verify gatekeeper is listening"
echo "   curl localhost:8080        — test local (loopback) access"
echo "   sudo ufw status            — check firewall rules"
echo "   sudo ufw allow 8080        — open port 8080"
echo "   bash /check.sh             — verify completion"
echo "==========================================================="

# Keep the container alive as root so docker exec gives a full root shell
# with all tools (sudo, ss, ip, curl) available.
exec tail -f /dev/null
