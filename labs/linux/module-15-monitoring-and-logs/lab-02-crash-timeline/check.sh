#!/bin/bash
# Acceptance criteria checker for: Build the Crash Timeline
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

echo "=== Checking: Build the Crash Timeline ==="
echo ""

# CHECK 1 (20%): /home/intern/crash-report.txt exists
[ -f /home/intern/crash-report.txt ]
run_check 20 "/home/intern/crash-report.txt exists" $?

# CHECK 2 (40%): report states crash-count=3
grep -q '^crash-count=3$' /home/intern/crash-report.txt
run_check 40 "report states crash-count=3" $?

# CHECK 3 (40%): report states first-crash=Jun 16 14:05:32
grep -q '^first-crash=Jun 16 14:05:32$' /home/intern/crash-report.txt
run_check 40 "report states first-crash=Jun 16 14:05:32" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
