#!/bin/bash
# Acceptance criteria checker for: Feed the App Its Environment
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

echo "=== Checking: Feed the App Its Environment ==="
echo ""

# CHECK 1 (30%): .bashrc sets APP_ENV=production
grep -q 'APP_ENV=production' /home/intern/.bashrc
run_check 30 ".bashrc sets APP_ENV=production" $?

# CHECK 2 (30%): .bashrc sets API_PORT=8443
grep -q 'API_PORT=8443' /home/intern/.bashrc
run_check 30 ".bashrc sets API_PORT=8443" $?

# CHECK 3 (40%): runapp.sh now starts and prints 'app starting in production on port 8443'
[ "$(bash /home/intern/runapp.sh 2>/dev/null)" = 'app starting in production on port 8443' ]
run_check 40 "runapp.sh now starts and prints 'app starting in production on port 8443'" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
