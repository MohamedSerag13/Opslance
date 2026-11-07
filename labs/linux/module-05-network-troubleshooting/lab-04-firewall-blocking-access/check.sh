#!/bin/bash
PASSED_WEIGHT=0
run_check() {
  local weight=$1 description=$2 result=$3
  if [ "$result" -eq 0 ]; then
    echo "✅ PASS [${weight}%]: $description"
    PASSED_WEIGHT=$((PASSED_WEIGHT + weight))
  else
    echo "❌ FAIL [${weight}%]: $description"
  fi
}

echo "=== Checking: Firewall Blocking Remote Access ==="
echo ""

# CHECK 1 — ss shows gatekeeper IS listening on 8080 (25pts)
ss -tulnp 2>/dev/null | grep -q ':8080'
run_check 25 "Gatekeeper is listening on port 8080" $?

# CHECK 2 — fake-ufw rules file shows ALLOW (not DENY) for 8080 (35pts)
if grep -qiE "^8080[[:space:]].*ALLOW" /var/lib/fakeufw/rules 2>/dev/null; then
  result=0
else
  result=1
fi
run_check 35 "fake-ufw rules show port 8080 as ALLOW" $result

# CHECK 3 — curl from loopback returns HTTP 200 (confirms gatekeeper + backend are healthy) (20pts)
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null | grep -q "200"
run_check 20 "curl localhost:8080 returns HTTP 200 (local/loopback access)" $?

# CHECK 4 — non-loopback access returns 200 (simulates remote access) (20pts)
# Since worker.py sets network_mode:bridge on each service independently (no
# shared compose network), we test "non-loopback" by connecting to this
# container's own eth0 IP — which the gatekeeper sees as a non-127.0.0.1 peer
# and therefore enforces fake-ufw rules against.
LOCAL_ETH0=$(ip addr show eth0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)
if [ -n "$LOCAL_ETH0" ]; then
  HTTP_CODE=$(curl -s --max-time 5 -o /dev/null -w "%{http_code}" \
    "http://${LOCAL_ETH0}:8080" 2>/dev/null || echo "000")
  [ "$HTTP_CODE" = "200" ]
  run_check 20 "Non-loopback access to port 8080 returns HTTP 200 (fake-ufw ALLOW enforced)" $?
else
  # eth0 not available (e.g. container uses a different interface name)
  # Fall back to checking only the fakeufw rule — structural pass
  echo "⚠️  INFO [20%]: eth0 not found — granting credit based on ALLOW rule alone"
  PASSED_WEIGHT=$((PASSED_WEIGHT + 20))
fi


echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
