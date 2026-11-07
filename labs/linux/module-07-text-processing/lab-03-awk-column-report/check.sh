#!/bin/bash
# Acceptance criteria checker for: Sales Totals with awk
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

echo "=== Checking: Sales Totals with awk ==="
echo ""

# CHECK 1 (20%): /home/intern/sales-total.txt exists
[ -f /home/intern/sales-total.txt ]
run_check 20 "/home/intern/sales-total.txt exists" $?

# CHECK 2 (45%): report states total=3373.51
grep -q '^total=3373.51$' /home/intern/sales-total.txt
run_check 45 "report states total=3373.51" $?

# CHECK 3 (35%): report states rows=20
grep -q '^rows=20$' /home/intern/sales-total.txt
run_check 35 "report states rows=20" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
