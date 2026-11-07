#!/bin/bash
# Acceptance criteria checker for: Traffic Report from Raw Logs
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

echo "=== Checking: Traffic Report from Raw Logs ==="
echo ""

# CHECK 1 (20%): /home/intern/report.txt exists
[ -f /home/intern/report.txt ]
run_check 20 "/home/intern/report.txt exists" $?

# CHECK 2 (25%): report states total=40
grep -q '^total=40$' /home/intern/report.txt
run_check 25 "report states total=40" $?

# CHECK 3 (25%): report states errors_404=14
grep -q '^errors_404=14$' /home/intern/report.txt
run_check 25 "report states errors_404=14" $?

# CHECK 4 (30%): report states top_client=10.0.0.5
grep -q '^top_client=10.0.0.5$' /home/intern/report.txt
run_check 30 "report states top_client=10.0.0.5" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
