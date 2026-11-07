#!/bin/bash
# Acceptance criteria checker for: Fingerprints and Stale Hosts
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

echo "=== Checking: Fingerprints and Stale Hosts ==="
echo ""

# CHECK 1 (25%): /home/intern/fingerprints.txt exists
[ -f /home/intern/fingerprints.txt ]
run_check 25 "/home/intern/fingerprints.txt exists" $?

# CHECK 2 (30%): the report contains the ED25519 key fingerprint
grep -q 'ED25519' /home/intern/fingerprints.txt
run_check 30 "the report contains the ED25519 key fingerprint" $?

# CHECK 3 (25%): the report contains a SHA256 fingerprint string
grep -Eq 'SHA256:[A-Za-z0-9+/=]+' /home/intern/fingerprints.txt
run_check 25 "the report contains a SHA256 fingerprint string" $?

# CHECK 4 (20%): the retired host 10.0.0.9 is gone from known_hosts
! grep -q '10\.0\.0\.9' /home/intern/.ssh/known_hosts
run_check 20 "the retired host 10.0.0.9 is gone from known_hosts" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
