#!/bin/bash
# Acceptance criteria checker for: Scripts That Take Arguments
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

echo "=== Checking: Scripts That Take Arguments ==="
echo ""

# CHECK 1 (25%): /home/intern/greet.sh exists and is executable
[ -x /home/intern/greet.sh ]
run_check 25 "/home/intern/greet.sh exists and is executable" $?

# CHECK 2 (35%): greet.sh Sam prints exactly 'Hello, Sam!'
[ "$(bash /home/intern/greet.sh Sam 2>/dev/null)" = 'Hello, Sam!' ]
run_check 35 "greet.sh Sam prints exactly 'Hello, Sam!'" $?

# CHECK 3 (25%): calling greet.sh without an argument exits non-zero
bash /home/intern/greet.sh >/dev/null 2>&1; [ $? -ne 0 ]
run_check 25 "calling greet.sh without an argument exits non-zero" $?

# CHECK 4 (15%): the no-argument run prints a Usage message
bash /home/intern/greet.sh 2>/dev/null | grep -q 'Usage'
run_check 15 "the no-argument run prints a Usage message" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
