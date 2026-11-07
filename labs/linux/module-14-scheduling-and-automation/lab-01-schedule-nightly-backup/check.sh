#!/bin/bash
# Acceptance criteria checker for: Schedule the Nightly Backup
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

echo "=== Checking: Schedule the Nightly Backup ==="
echo ""

# CHECK 1 (20%): /etc/cron.d/nightly-backup exists
[ -f /etc/cron.d/nightly-backup ]
run_check 20 "/etc/cron.d/nightly-backup exists" $?

# CHECK 2 (30%): every active line has the 7 fields /etc/cron.d requires (5 time fields + username + command)
awk '!/^#/ && NF>0 { if (NF!=7) bad=1 } END { exit bad }' /etc/cron.d/nightly-backup
run_check 30 "every active line has the 7 fields /etc/cron.d requires (5 time fields + username + command)" $?

# CHECK 3 (25%): the schedule line is exactly '0 2 * * * root /usr/local/bin/backup.sh'
grep -Eq '^0 2 \* \* \* root /usr/local/bin/backup.sh[[:space:]]*$' /etc/cron.d/nightly-backup
run_check 25 "the schedule line is exactly '0 2 * * * root /usr/local/bin/backup.sh'" $?

# CHECK 4 (25%): the scheduled backup script is executable
[ -x /usr/local/bin/backup.sh ]
run_check 25 "the scheduled backup script is executable" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
