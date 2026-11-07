#!/bin/bash
# Acceptance criteria checker for: Health Snapshot
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

echo "=== Checking: Health Snapshot ==="
echo ""

# CHECK 1 (20%): /home/intern/health-report.txt exists
[ -f /home/intern/health-report.txt ]
run_check 20 "/home/intern/health-report.txt exists" $?

# CHECK 2 (40%): report contains the free -m Mem: row
grep -q '^Mem:' /home/intern/health-report.txt
run_check 40 "report contains the free -m Mem: row" $?

# CHECK 3 (40%): report contains the uptime load average line
grep -q 'load average' /home/intern/health-report.txt
run_check 40 "report contains the uptime load average line" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
