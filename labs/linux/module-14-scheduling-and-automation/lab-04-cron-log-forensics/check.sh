#!/bin/bash
# Acceptance criteria checker for: Cron Log Forensics
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

echo "=== Checking: Cron Log Forensics ==="
echo ""

# CHECK 1 (20%): /home/intern/cron-report.txt exists
[ -f /home/intern/cron-report.txt ]
run_check 20 "/home/intern/cron-report.txt exists" $?

# CHECK 2 (45%): report states failed-backups=3
grep -q '^failed-backups=3$' /home/intern/cron-report.txt
run_check 45 "report states failed-backups=3" $?

# CHECK 3 (35%): report states first-failure=Jun 16 02:15:02
grep -q '^first-failure=Jun 16 02:15:02$' /home/intern/cron-report.txt
run_check 35 "report states first-failure=Jun 16 02:15:02" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
