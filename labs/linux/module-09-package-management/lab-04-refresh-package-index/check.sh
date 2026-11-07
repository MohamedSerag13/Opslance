#!/bin/bash
# Acceptance criteria checker for: The Empty Package Index
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

echo "=== Checking: The Empty Package Index ==="
echo ""

# CHECK 1 (45%): package index files exist again under /var/lib/apt/lists
[ -n "$(find /var/lib/apt/lists -name '*Packages*' 2>/dev/null)" ]
run_check 45 "package index files exist again under /var/lib/apt/lists" $?

# CHECK 2 (20%): /home/intern/pkg-report.txt exists
[ -f /home/intern/pkg-report.txt ]
run_check 20 "/home/intern/pkg-report.txt exists" $?

# CHECK 3 (35%): report records the nginx candidate version
grep -q '^nginx-candidate=' /home/intern/pkg-report.txt
run_check 35 "report records the nginx candidate version" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
