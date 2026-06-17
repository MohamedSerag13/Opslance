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
echo "=== Checking: Recover a Crashed Service ==="
echo ""

# Check 1 — nginx is actually serving on localhost:8080 (35pts)
curl -s --max-time 5 http://localhost:8080 | grep -qi "nginx\|html\|running" 2>/dev/null
run_check 35 "nginx is serving HTTP responses on localhost:8080" $?

# Check 2 — fake systemctl state file shows nginx as active (35pts)
state=$(cat /var/lib/fakesystemd/state/nginx 2>/dev/null | tr -d '[:space:]')
if [ "$state" = "active" ]; then
  result=0
else
  result=1
fi
run_check 35 "systemctl reports nginx as active" $result

# Check 3 — nginx has been enabled (enabled marker file exists) (30pts)
if [ -f /var/lib/fakesystemd/enabled/nginx ]; then
  result=0
else
  result=1
fi
run_check 30 "nginx is enabled (systemctl enable nginx was run)" $result

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
