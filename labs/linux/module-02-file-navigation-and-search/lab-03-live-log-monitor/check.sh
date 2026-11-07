#!/bin/bash
PASSED_WEIGHT=0
run_check() {
  local weight=$1 description=$2 result=$3
  if [ "$result" -eq 0 ]; then
    echo "✅ PASS [${weight}%]: $description"
    PASSED_WEIGHT=$((PASSED_WEIGHT + weight))
  else
    echo "❌ FAIL [${weight}%]: $description"
  fi
}
echo "=== Checking: Monitor a Live Log File ==="
echo ""

# Check 1: log_preview.txt exists and is non-empty (30pts)
[ -s /home/intern/log_preview.txt ]
run_check 30 "log_preview.txt exists and is non-empty" $?

# Check 2: deploy_event.txt exists and contains DEPLOY_SUCCESS (40pts)
grep -q "DEPLOY_SUCCESS" /home/intern/deploy_event.txt 2>/dev/null
run_check 40 "deploy_event.txt exists and contains DEPLOY_SUCCESS" $?

# Check 3: log_tail.txt exists and has at least 5 lines (30pts)
result=1
if [ -s /home/intern/log_tail.txt ]; then
  linecount=$(wc -l < /home/intern/log_tail.txt)
  if [ "$linecount" -ge 5 ]; then
    result=0
  fi
fi
run_check 30 "log_tail.txt exists and has at least 5 lines" $result

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
