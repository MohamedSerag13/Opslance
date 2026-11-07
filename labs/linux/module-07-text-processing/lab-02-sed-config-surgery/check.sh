#!/bin/bash
# Acceptance criteria checker for: Config Surgery with sed
# All checks run independently — no set -e

PASSED_WEIGHT=0

run_check() {
  local weight=$1
  local description=$2
  local result=$3   # 0=pass 1=fail
  if [ "$result" -eq 0 ]; then
    echo "✅ PASS [${weight}%]: $description"
    PASSED_WEIGHT=$((PASSED_WEIGHT + weight))
  else
    echo "❌ FAIL [${weight}%]: $description"
  fi
}

echo "=== Checking: Config Surgery with sed ==="
echo ""

# CHECK 1 (25%): backup copy /home/intern/settings.conf.bak exists
[ -f /home/intern/settings.conf.bak ]
run_check 25 "backup copy /home/intern/settings.conf.bak exists" $?

# CHECK 2 (25%): port is now 8080
grep -q '^port=8080$' /etc/app/settings.conf
run_check 25 "port is now 8080" $?

# CHECK 3 (25%): debug is now false
grep -q '^debug=false$' /etc/app/settings.conf
run_check 25 "debug is now false" $?

# CHECK 4 (25%): other settings (app_name, max_connections) are untouched
grep -q '^app_name=orders-api$' /etc/app/settings.conf && grep -q '^max_connections=50$' /etc/app/settings.conf
run_check 25 "other settings (app_name, max_connections) are untouched" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
