#!/bin/bash
# Acceptance criteria checker for: Package Forensics
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

echo "=== Checking: Package Forensics ==="
echo ""

# CHECK 1 (20%): /home/intern/forensics.txt exists
[ -f /home/intern/forensics.txt ]
run_check 20 "/home/intern/forensics.txt exists" $?

# CHECK 2 (40%): report correctly identifies coreutils as the owner of /bin/ls
grep -q '^ls-owner=coreutils$' /home/intern/forensics.txt
run_check 40 "report correctly identifies coreutils as the owner of /bin/ls" $?

# CHECK 3 (25%): report contains a plausible package-count (at least two digits)
grep -Eq '^package-count=[0-9]{2,}$' /home/intern/forensics.txt
run_check 25 "report contains a plausible package-count (at least two digits)" $?

# CHECK 4 (15%): report records the bash version
grep -q '^bash-version=' /home/intern/forensics.txt
run_check 15 "report records the bash version" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
