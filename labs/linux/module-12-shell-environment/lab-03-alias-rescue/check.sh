#!/bin/bash
# Acceptance criteria checker for: Bring Back the Aliases
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

echo "=== Checking: Bring Back the Aliases ==="
echo ""

# CHECK 1 (35%): .bashrc defines alias ll='ls -alF'
grep -qE "alias ll='ls -alF'" /home/intern/.bashrc
run_check 35 ".bashrc defines alias ll='ls -alF'" $?

# CHECK 2 (35%): .bashrc defines alias grep='grep --color=auto'
grep -qE "alias grep='grep --color=auto'" /home/intern/.bashrc
run_check 35 ".bashrc defines alias grep='grep --color=auto'" $?

# CHECK 3 (30%): sourcing .bashrc in a fresh shell defines the ll alias
[ -n "$(bash -c 'source /home/intern/.bashrc; alias ll' 2>/dev/null)" ]
run_check 30 "sourcing .bashrc in a fresh shell defines the ll alias" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
