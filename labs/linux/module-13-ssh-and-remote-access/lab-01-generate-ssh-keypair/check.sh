#!/bin/bash
# Acceptance criteria checker for: Generate Your First SSH Key
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

echo "=== Checking: Generate Your First SSH Key ==="
echo ""

# CHECK 1 (35%): private key /home/intern/.ssh/id_ed25519 exists
[ -f /home/intern/.ssh/id_ed25519 ]
run_check 35 "private key /home/intern/.ssh/id_ed25519 exists" $?

# CHECK 2 (25%): public key id_ed25519.pub exists
[ -f /home/intern/.ssh/id_ed25519.pub ]
run_check 25 "public key id_ed25519.pub exists" $?

# CHECK 3 (25%): private key permissions are 600
[ "$(stat -c %a /home/intern/.ssh/id_ed25519)" = "600" ]
run_check 25 "private key permissions are 600" $?

# CHECK 4 (15%): .ssh directory permissions are 700
[ "$(stat -c %a /home/intern/.ssh)" = "700" ]
run_check 15 ".ssh directory permissions are 700" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
