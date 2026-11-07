#!/bin/bash
# Acceptance criteria checker for: Onboard a New Developer
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

echo "=== Checking: Onboard a New Developer ==="
echo ""

# CHECK 1 (30%): /home/amara home directory exists
[ -d /home/amara ]
run_check 30 "/home/amara home directory exists" $?

# CHECK 2 (40%): amara has a bash shell and the correct GECOS comment in /etc/passwd
grep '^amara:' /etc/passwd | grep -q ':/bin/bash$' && grep '^amara:' /etc/passwd | grep -q 'Amara Okafor'
run_check 40 "amara has a bash shell and the correct GECOS comment in /etc/passwd" $?

# CHECK 3 (30%): amara is a member of the developers group
grep '^developers:' /etc/group | grep -q amara
run_check 30 "amara is a member of the developers group" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
