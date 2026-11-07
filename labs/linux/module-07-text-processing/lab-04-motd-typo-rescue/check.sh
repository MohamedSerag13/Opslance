#!/bin/bash
# Acceptance criteria checker for: Message-of-the-Day Rescue
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

echo "=== Checking: Message-of-the-Day Rescue ==="
echo ""

# CHECK 1 (25%): the 'Welcom' typo is gone from /etc/motd
! grep -qw 'Welcom' /etc/motd
run_check 25 "the 'Welcom' typo is gone from /etc/motd" $?

# CHECK 2 (25%): banner correctly reads 'Welcome to the Opslance staging server.'
grep -q 'Welcome to the Opslance staging server.' /etc/motd
run_check 25 "banner correctly reads 'Welcome to the Opslance staging server.'" $?

# CHECK 3 (25%): existing banner lines were preserved
grep -q 'Unauthorized access is prohibited.' /etc/motd
run_check 25 "existing banner lines were preserved" $?

# CHECK 4 (25%): last line of /etc/motd is exactly 'Managed by Opslance.'
[ "$(tail -n 1 /etc/motd)" = 'Managed by Opslance.' ]
run_check 25 "last line of /etc/motd is exactly 'Managed by Opslance.'" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
