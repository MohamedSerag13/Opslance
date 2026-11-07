#!/bin/bash
# Acceptance criteria checker for: Modern Scheduling with systemd Timers
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

echo "=== Checking: Modern Scheduling with systemd Timers ==="
echo ""

# CHECK 1 (25%): both app-maintenance.service and app-maintenance.timer exist
[ -f /etc/systemd/system/app-maintenance.service ] && [ -f /etc/systemd/system/app-maintenance.timer ]
run_check 25 "both app-maintenance.service and app-maintenance.timer exist" $?

# CHECK 2 (25%): the service unit runs /usr/local/bin/maintenance.sh
grep -q '^ExecStart=/usr/local/bin/maintenance.sh' /etc/systemd/system/app-maintenance.service
run_check 25 "the service unit runs /usr/local/bin/maintenance.sh" $?

# CHECK 3 (25%): the timer fires daily at 03:00 (OnCalendar)
grep -Eq '^OnCalendar=(daily|\*-\*-\* 03:00:00)' /etc/systemd/system/app-maintenance.timer
run_check 25 "the timer fires daily at 03:00 (OnCalendar)" $?

# CHECK 4 (25%): the timer is Persistent and wired to timers.target
grep -q 'WantedBy=timers.target' /etc/systemd/system/app-maintenance.timer && grep -q 'Persistent=true' /etc/systemd/system/app-maintenance.timer
run_check 25 "the timer is Persistent and wired to timers.target" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
