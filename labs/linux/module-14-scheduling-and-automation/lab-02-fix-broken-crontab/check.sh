#!/bin/bash
# Acceptance criteria checker for: Fix the Broken Cron File
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

echo "=== Checking: Fix the Broken Cron File ==="
echo ""

# CHECK 1 (40%): the report job line is exactly '30 3 * * * root /usr/local/bin/send-report.sh'
grep -Eq '^30 3 \* \* \* root /usr/local/bin/send-report.sh[[:space:]]*$' /etc/cron.d/nightly-report
run_check 40 "the report job line is exactly '30 3 * * * root /usr/local/bin/send-report.sh'" $?

# CHECK 2 (35%): the cleanup job line is exactly '15 5 * * * root /usr/local/bin/cleanup-temp.sh'
grep -Eq '^15 5 \* \* \* root /usr/local/bin/cleanup-temp.sh[[:space:]]*$' /etc/cron.d/nightly-report
run_check 35 "the cleanup job line is exactly '15 5 * * * root /usr/local/bin/cleanup-temp.sh'" $?

# CHECK 3 (25%): every active line has exactly 7 fields (5 time fields + username + command)
awk '!/^#/ && NF>0 { if (NF!=7) bad=1 } END { exit bad }' /etc/cron.d/nightly-report
run_check 25 "every active line has exactly 7 fields (5 time fields + username + command)" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
