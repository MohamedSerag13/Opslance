#!/bin/bash
# Acceptance criteria checker for: Remove the Rogue Package
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

echo "=== Checking: Remove the Rogue Package ==="
echo ""

# CHECK 1 (45%): sl is no longer registered in the package database
! dpkg -s sl >/dev/null 2>&1
run_check 45 "sl is no longer registered in the package database" $?

# CHECK 2 (35%): the sl binary is gone from the PATH
! command -v sl >/dev/null 2>&1
run_check 35 "the sl binary is gone from the PATH" $?

# CHECK 3 (20%): the dpkg package database is still readable and has installed packages
dpkg -l 2>/dev/null | grep -q '^ii'
run_check 20 "the dpkg package database is still readable and has installed packages" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
