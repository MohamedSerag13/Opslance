#!/bin/bash
# Acceptance criteria checker for: The Date-Stamped Backup
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

echo "=== Checking: The Date-Stamped Backup ==="
echo ""

# CHECK 1 (20%): /tmp/backups directory exists
[ -d /tmp/backups ]
run_check 20 "/tmp/backups directory exists" $?

# CHECK 2 (45%): etc-<today>.tar.gz exists in /tmp/backups (name matches today's date)
[ -f "/tmp/backups/etc-$(date +%F).tar.gz" ]
run_check 45 "etc-<today>.tar.gz exists in /tmp/backups (name matches today's date)" $?

# CHECK 3 (20%): the backup is a valid gzipped archive
tar -tzf "/tmp/backups/etc-$(date +%F).tar.gz" >/dev/null 2>&1
run_check 20 "the backup is a valid gzipped archive" $?

# CHECK 4 (15%): the archive contains db.conf
tar -tzf "/tmp/backups/etc-$(date +%F).tar.gz" 2>/dev/null | grep -q 'db\.conf'
run_check 15 "the archive contains db.conf" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
