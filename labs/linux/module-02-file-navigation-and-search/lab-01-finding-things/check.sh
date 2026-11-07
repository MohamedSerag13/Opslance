#!/bin/bash
PASSED_WEIGHT=0
run_check() {
  local weight=$1 description=$2 result=$3
  if [ "$result" -eq 0 ]; then
    echo "✅ PASS [${weight}%]: $description"
    PASSED_WEIGHT=$((PASSED_WEIGHT + weight))
  else
    echo "❌ FAIL [${weight}%]: $description"
  fi
}
echo "=== Checking: Finding Things ==="
echo ""

# Check config file found
grep -q "/etc/custom_app.conf" /home/intern/found_config.txt 2>/dev/null
run_check 25 "found_config.txt points to /etc/custom_app.conf" $?

# Check large log found
grep -q "/var/log/orphaned_app.log" /home/intern/found_largelog.txt 2>/dev/null
run_check 25 "found_largelog.txt points to /var/log/orphaned_app.log" $?

# Check script found
grep -q "/opt/tools/helper.sh" /home/intern/found_script.txt 2>/dev/null
run_check 25 "found_script.txt points to /opt/tools/helper.sh" $?

# Check bash location
[ -s /home/intern/bash_location.txt ] && grep -qE "(/bin/bash|/usr/bin/bash)" /home/intern/bash_location.txt
run_check 25 "bash_location.txt contains a valid path to bash executable" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
