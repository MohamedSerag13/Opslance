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
echo "=== Checking: The Config Hunt (Capstone) ==="
echo ""

# Check 1: conf_files.txt exists and contains .conf
grep -q "\.conf" /home/intern/conf_files.txt 2>/dev/null
run_check 25 "conf_files.txt exists and contains .conf" $?

# Check 2: db_host.txt exists and contains DB_HOST
grep -q "DB_HOST" /home/intern/db_host.txt 2>/dev/null
run_check 25 "db_host.txt exists and contains DB_HOST" $?

# Check 3: error_count.txt exists and contains a number > 0
result=1
if [ -s /home/intern/error_count.txt ]; then
  val=$(cat /home/intern/error_count.txt | tr -d '[:space:]')
  if echo "$val" | grep -qE '^[0-9]+$' && [ "$val" -gt 0 ]; then
    result=0
  fi
fi
run_check 25 "error_count.txt exists and contains a number greater than 0" $result

# Check 4: deploy_tail.txt exists and is non-empty
[ -s /home/intern/deploy_tail.txt ]
run_check 25 "deploy_tail.txt exists and is non-empty" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
