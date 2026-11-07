#!/bin/bash
# Acceptance criteria checker for: SSH Ignores My Key
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

echo "=== Checking: SSH Ignores My Key ==="
echo ""

# CHECK 1 (30%): .ssh directory permissions are 700
[ "$(stat -c %a /home/intern/.ssh)" = "700" ]
run_check 30 ".ssh directory permissions are 700" $?

# CHECK 2 (30%): authorized_keys permissions are 600
[ "$(stat -c %a /home/intern/.ssh/authorized_keys)" = "600" ]
run_check 30 "authorized_keys permissions are 600" $?

# CHECK 3 (25%): authorized_keys is owned by intern
[ "$(stat -c %U /home/intern/.ssh/authorized_keys)" = "intern" ]
run_check 25 "authorized_keys is owned by intern" $?

# CHECK 4 (15%): authorized_keys still contains the public key
grep -q '^ssh-ed25519' /home/intern/.ssh/authorized_keys
run_check 15 "authorized_keys still contains the public key" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
