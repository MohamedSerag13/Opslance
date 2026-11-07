#!/bin/bash
# Acceptance criteria checker for: Clean Up with a Loop
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

echo "=== Checking: Clean Up with a Loop ==="
echo ""

# CHECK 1 (20%): /home/intern/cleanup.sh exists and is executable
[ -x /home/intern/cleanup.sh ]
run_check 20 "/home/intern/cleanup.sh exists and is executable" $?

# CHECK 2 (25%): the script uses a for loop
grep -qE 'for [a-zA-Z_]+ in' /home/intern/cleanup.sh
run_check 25 "the script uses a for loop" $?

# CHECK 3 (25%): no .tmp files remain in the spool root
[ "$(find /home/intern/spool -maxdepth 1 -name '*.tmp' | wc -l)" -eq 0 ]
run_check 25 "no .tmp files remain in the spool root" $?

# CHECK 4 (30%): all 6 .tmp files are now in spool/archive/
[ "$(find /home/intern/spool/archive -name '*.tmp' | wc -l)" -eq 6 ]
run_check 30 "all 6 .tmp files are now in spool/archive/" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
