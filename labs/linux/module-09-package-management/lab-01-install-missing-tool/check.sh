#!/bin/bash
# Acceptance criteria checker for: Install the Missing Tool
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

echo "=== Checking: Install the Missing Tool ==="
echo ""

# CHECK 1 (50%): curl is installed and on the PATH
command -v curl >/dev/null 2>&1
run_check 50 "curl is installed and on the PATH" $?

# CHECK 2 (30%): curl runs and reports a version
curl --version >/dev/null 2>&1
run_check 30 "curl runs and reports a version" $?

# CHECK 3 (20%): the healthcheck script is still in place
[ -f /usr/local/bin/healthcheck.sh ]
run_check 20 "the healthcheck script is still in place" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
