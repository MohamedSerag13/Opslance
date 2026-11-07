#!/bin/bash
# Acceptance criteria checker for: Rotate Out the Rotated Logs
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

echo "=== Checking: Rotate Out the Rotated Logs ==="
echo ""

# CHECK 1 (20%): /var/log/app/archive directory exists
[ -d /var/log/app/archive ]
run_check 20 "/var/log/app/archive directory exists" $?

# CHECK 2 (30%): all 7 rotated logs are archived as .gz in archive/
[ "$(find /var/log/app/archive -name 'app.log.*.gz' | wc -l)" -eq 7 ]
run_check 30 "all 7 rotated logs are archived as .gz in archive/" $?

# CHECK 3 (30%): no uncompressed rotated logs remain in /var/log/app
[ "$(find /var/log/app -maxdepth 1 -name 'app.log.[0-9]' | wc -l)" -eq 0 ]
run_check 30 "no uncompressed rotated logs remain in /var/log/app" $?

# CHECK 4 (20%): the active app.log is untouched in place
[ -f /var/log/app/app.log ]
run_check 20 "the active app.log is untouched in place" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
