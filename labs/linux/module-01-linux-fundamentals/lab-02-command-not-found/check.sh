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
grep -q "/usr/local/bin" /home/intern/.bashrc
run_check 30 "/usr/local/bin is in the student's PATH" $?

# CHECK 2
grep -q "alias ll=" /home/intern/.bashrc
run_check 25 "ll alias exists in .bashrc" $?

# CHECK 3
grep -q 'export APP_ENV=staging' /home/intern/.bashrc
run_check 25 "APP_ENV is exported in .bashrc with value staging" $?

# CHECK 4
grep -q "local" /home/intern/path-report.txt 2>/dev/null
run_check 20 "/home/intern/path-report.txt exists and contains 'local'" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi