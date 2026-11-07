#!/bin/bash
# Acceptance criteria checker for: Copy, Move, Remove
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

echo "=== Checking: Copy, Move, Remove ==="
echo ""

# CHECK 1 (25%): /etc/app/staging.conf exists
[ -f /etc/app/staging.conf ]
run_check 25 "/etc/app/staging.conf exists" $?

# CHECK 2 (25%): /etc/app/production.conf exists
[ -f /etc/app/production.conf ]
run_check 25 "/etc/app/production.conf exists" $?

# CHECK 3 (25%): no backup-*.tar.gz files remain in /home/intern
[ $(find /home/intern -maxdepth 1 -name 'backup-*.tar.gz' 2>/dev/null | wc -l) -eq 0 ]
run_check 25 "no backup-*.tar.gz files remain in /home/intern" $?

# CHECK 4 (25%): /var/app/data directory exists
[ -d /var/app/data ]
run_check 25 "/var/app/data directory exists" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
