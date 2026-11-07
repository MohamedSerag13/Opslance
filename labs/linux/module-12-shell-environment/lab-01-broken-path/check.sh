#!/bin/bash
# Acceptance criteria checker for: The Broken PATH
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

echo "=== Checking: The Broken PATH ==="
echo ""

# CHECK 1 (35%): the PATH-wiping line is gone from .bashrc
! grep -qE '^export PATH=/usr/local/apps/bin$' /home/intern/.bashrc
run_check 35 "the PATH-wiping line is gone from .bashrc" $?

# CHECK 2 (25%): .bashrc now appends usr/local/apps/bin to the existing $PATH
grep -qE 'PATH=.*\$PATH.*usr/local/apps/bin' /home/intern/.bashrc
run_check 25 ".bashrc now appends usr/local/apps/bin to the existing $PATH" $?

# CHECK 3 (20%): a clean shell sourcing .bashrc still finds system tools (ls)
env -i HOME=/home/intern bash -c 'source /home/intern/.bashrc; command -v ls' >/dev/null 2>&1
run_check 20 "a clean shell sourcing .bashrc still finds system tools (ls)" $?

# CHECK 4 (20%): a clean shell sourcing .bashrc finds the deploy command
env -i HOME=/home/intern bash -c 'source /home/intern/.bashrc; command -v deploy' >/dev/null 2>&1
run_check 20 "a clean shell sourcing .bashrc finds the deploy command" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
