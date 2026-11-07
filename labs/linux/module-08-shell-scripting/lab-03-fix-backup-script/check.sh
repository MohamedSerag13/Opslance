#!/bin/bash
# Acceptance criteria checker for: Debug the Backup Script
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

echo "=== Checking: Debug the Backup Script ==="
echo ""

# CHECK 1 (25%): backup.sh passes a bash syntax check (bash -n)
bash -n /usr/local/bin/backup.sh
run_check 25 "backup.sh passes a bash syntax check (bash -n)" $?

# CHECK 2 (20%): backup.sh is executable
[ -x /usr/local/bin/backup.sh ]
run_check 20 "backup.sh is executable" $?

# CHECK 3 (35%): running backup.sh produces /tmp/backups/app-backup.tar.gz
rm -rf /tmp/backups; bash /usr/local/bin/backup.sh >/dev/null 2>&1 && [ -f /tmp/backups/app-backup.tar.gz ]
run_check 35 "running backup.sh produces /tmp/backups/app-backup.tar.gz" $?

# CHECK 4 (20%): the archive contains the app's index.html
tar -tzf /tmp/backups/app-backup.tar.gz 2>/dev/null | grep -q 'index.html'
run_check 20 "the archive contains the app's index.html" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
