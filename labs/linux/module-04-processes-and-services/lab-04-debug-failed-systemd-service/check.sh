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
echo "=== Checking: Debug a Failed Systemd Service ==="
echo ""

# Check 1 — broken-app state is active (40pts)
state=$(cat /var/lib/fakesystemd/state/broken-app 2>/dev/null | tr -d '[:space:]')
if [ "$state" = "active" ]; then
  result=0
else
  result=1
fi
run_check 40 "systemctl reports broken-app as active (running)" $result

# Check 2 — /opt/app/start.sh exists and is executable (30pts)
if [ -x /opt/app/start.sh ]; then
  result=0
else
  result=1
fi
run_check 30 "/opt/app/start.sh exists and is executable" $result

# Check 3 — journal log contains a successful start entry (not just the failure) (30pts)
# We look for the "Started" line that the fake systemctl writes on success.
# An earlier "No such file or directory" failure line may also be present — that is fine.
if grep -q "Started Production Application Server" /var/log/fakesystemd/broken-app.log 2>/dev/null; then
  result=0
else
  result=1
fi
run_check 30 "broken-app journal log contains a successful start entry" $result

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
