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
echo "=== Checking: Search Inside Logs for Errors ==="
echo ""

# Check 1: errors.txt exists and is non-empty
[ -s /home/intern/errors.txt ]
run_check 25 "errors.txt exists and is non-empty" $?

# Check 2: warning_count.txt exists and contains a number > 0
result=1
if [ -s /home/intern/warning_count.txt ]; then
  val=$(cat /home/intern/warning_count.txt | tr -d '[:space:]')
  if echo "$val" | grep -qE '^[0-9]+$' && [ "$val" -gt 0 ]; then
    result=0
  fi
fi
run_check 25 "warning_count.txt exists and contains a number greater than 0" $result

# Check 3: all_errors.txt exists and is non-empty
[ -s /home/intern/all_errors.txt ]
run_check 25 "all_errors.txt exists and is non-empty" $?

# Check 4: server_errors.txt exists and contains 500
grep -q "500" /home/intern/server_errors.txt 2>/dev/null
run_check 25 "server_errors.txt exists and contains 500" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
