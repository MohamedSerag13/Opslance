#!/bin/bash
# Acceptance criteria checker for: Tame the Hostnames
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

echo "=== Checking: Tame the Hostnames ==="
echo ""

# CHECK 1 (20%): ~/.ssh/config exists
[ -f /home/intern/.ssh/config ]
run_check 20 "~/.ssh/config exists" $?

# CHECK 2 (25%): a 'Host staging' block is defined
grep -qiE '^[[:space:]]*Host[[:space:]]+staging$' /home/intern/.ssh/config
run_check 25 "a 'Host staging' block is defined" $?

# CHECK 3 (20%): HostName is set to 10.20.0.5
grep -qiE '^[[:space:]]*HostName[[:space:]]+10\.20\.0\.5' /home/intern/.ssh/config
run_check 20 "HostName is set to 10.20.0.5" $?

# CHECK 4 (35%): the block sets User deploy, Port 2222 and an IdentityFile
grep -qiE '^[[:space:]]*User[[:space:]]+deploy' /home/intern/.ssh/config && grep -qiE '^[[:space:]]*Port[[:space:]]+2222' /home/intern/.ssh/config && grep -qiE '^[[:space:]]*IdentityFile' /home/intern/.ssh/config
run_check 35 "the block sets User deploy, Port 2222 and an IdentityFile" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
