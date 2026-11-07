#!/bin/bash
# Acceptance criteria checker for: Read the Filesystem Report
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

echo "=== Checking: Read the Filesystem Report ==="
echo ""

# CHECK 1 (20%): /home/intern/df-report.txt exists
[ -f /home/intern/df-report.txt ]
run_check 20 "/home/intern/df-report.txt exists" $?

# CHECK 2 (25%): report contains the df header line
grep -q '^Filesystem' /home/intern/df-report.txt
run_check 25 "report contains the df header line" $?

# CHECK 3 (35%): report contains a machine-readable root-use=<N>% line
grep -Eq '^root-use=[0-9]+%$' /home/intern/df-report.txt
run_check 35 "report contains a machine-readable root-use=<N>% line" $?

# CHECK 4 (20%): report contains the root filesystem row (ending in /)
grep -Eq '/$' /home/intern/df-report.txt
run_check 20 "report contains the root filesystem row (ending in /)" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
