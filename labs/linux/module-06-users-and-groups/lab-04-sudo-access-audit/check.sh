#!/bin/bash
# Acceptance criteria checker for: The Missing Sudo Grant
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

echo "=== Checking: The Missing Sudo Grant ==="
echo ""

# CHECK 1 (20%): jordan account exists
grep -q '^jordan:' /etc/passwd
run_check 20 "jordan account exists" $?

# CHECK 2 (40%): jordan is a member of the sudo group
grep '^sudo:' /etc/group | grep -q jordan
run_check 40 "jordan is a member of the sudo group" $?

# CHECK 3 (20%): /home/intern/sudo-audit.txt exists and mentions jordan
[ -f /home/intern/sudo-audit.txt ] && grep -q 'jordan' /home/intern/sudo-audit.txt
run_check 20 "/home/intern/sudo-audit.txt exists and mentions jordan" $?

# CHECK 4 (20%): audit file records the sudo privilege listing
grep -qiE '\(ALL|sudo' /home/intern/sudo-audit.txt
run_check 20 "audit file records the sudo privilege listing" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
