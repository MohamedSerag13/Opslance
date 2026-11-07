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
echo "=== Checking: Application Cannot Write Logs ==="
echo ""

# Check 1: /home/intern/logs/app.log is owned by intern
[ "$(stat -c %U /home/intern/logs/app.log 2>/dev/null)" = "intern" ]
run_check 40 "/home/intern/logs/app.log is owned by intern" $?

# Check 2: app.log contains the line "Application started"
grep -q "Application started" /home/intern/logs/app.log 2>/dev/null
run_check 60 "app.log contains the line 'Application started'" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
