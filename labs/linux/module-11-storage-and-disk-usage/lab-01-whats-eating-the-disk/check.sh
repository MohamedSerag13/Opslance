#!/bin/bash
# Acceptance criteria checker for: What's Eating the Disk?
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

echo "=== Checking: What's Eating the Disk? ==="
echo ""

# CHECK 1 (20%): /home/intern/findings.txt exists
[ -f /home/intern/findings.txt ]
run_check 20 "/home/intern/findings.txt exists" $?

# CHECK 2 (40%): findings records largest=40MB
grep -q '^largest=40MB$' /home/intern/findings.txt
run_check 40 "findings records largest=40MB" $?

# CHECK 3 (25%): the 40MB core.dump has been deleted
[ ! -f /var/backups/core.dump ]
run_check 25 "the 40MB core.dump has been deleted" $?

# CHECK 4 (15%): the legitimate backup old-2024.tar.gz survived
[ -f /var/backups/old-2024.tar.gz ]
run_check 15 "the legitimate backup old-2024.tar.gz survived" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
