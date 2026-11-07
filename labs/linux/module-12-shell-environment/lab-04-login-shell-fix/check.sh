#!/bin/bash
# Acceptance criteria checker for: The Silent Login Shell
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

echo "=== Checking: The Silent Login Shell ==="
echo ""

# CHECK 1 (35%): .profile references .bashrc (the wiring exists)
grep -q 'bashrc' /home/intern/.profile
run_check 35 ".profile references .bashrc (the wiring exists)" $?

# CHECK 2 (40%): a login shell (bash -l) sees APP_MODE=training
[ "$(bash -lc 'echo $APP_MODE' 2>/dev/null)" = 'training' ]
run_check 40 "a login shell (bash -l) sees APP_MODE=training" $?

# CHECK 3 (25%): .profile passes a bash syntax check
bash -n /home/intern/.profile
run_check 25 ".profile passes a bash syntax check" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
