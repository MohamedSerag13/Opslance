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
echo "=== Checking: Command Not Found ==="
echo ""

# CHECK 1
grep -q "alias ll=" /home/intern/.bashrc
run_check 50 "ll alias exists in .bashrc" $?

# CHECK 2
grep -q 'export APP_ENV=staging' /home/intern/.bashrc
run_check 50 "APP_ENV is exported in .bashrc with value staging" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi