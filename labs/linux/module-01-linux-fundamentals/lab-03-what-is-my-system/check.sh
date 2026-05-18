#!/bin/bash
# Acceptance criteria checker for: What is My System?
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

echo "=== Checking: What is My System? ==="
echo ""

# CHECK 1 (40%): system-report.txt exists and is not empty
[ -f /home/intern/system-report.txt ] && [ -s /home/intern/system-report.txt ]
run_check 40 "system-report.txt exists and is not empty" $?

# CHECK 2 (30%): report contains the username 'intern'
grep -qi "intern" /home/intern/system-report.txt 2>/dev/null
run_check 30 "report contains username 'intern'" $?

# CHECK 3 (30%): report contains 'Ubuntu' (OS identified)
grep -qi "ubuntu" /home/intern/system-report.txt 2>/dev/null
run_check 30 "report contains 'Ubuntu' (OS identified)" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
