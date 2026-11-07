#!/bin/bash
# Acceptance criteria checker for: The Error Hunt
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

echo "=== Checking: The Error Hunt ==="
echo ""

# CHECK 1 (20%): /home/intern/error-report.txt exists
[ -f /home/intern/error-report.txt ]
run_check 20 "/home/intern/error-report.txt exists" $?

# CHECK 2 (40%): report states error-count=7
grep -q '^error-count=7$' /home/intern/error-report.txt
run_check 40 "report states error-count=7" $?

# CHECK 3 (40%): report states last-error=2026-06-17 09:42:11
grep -q '^last-error=2026-06-17 09:42:11$' /home/intern/error-report.txt
run_check 40 "report states last-error=2026-06-17 09:42:11" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
