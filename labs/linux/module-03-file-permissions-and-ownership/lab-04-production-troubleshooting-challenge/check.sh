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
echo "=== Checking: Production Troubleshooting Challenge ==="
echo ""

# Check 1: settings.conf is readable by intern
su -s /bin/bash -c '[ -r /home/intern/project/config/settings.conf ]' intern
run_check 25 "settings.conf is readable by intern" $?

# Check 2: backup.sh is executable
[ -x /home/intern/project/scripts/backup.sh ]
run_check 25 "backup.sh is executable" $?

# Check 3: Running backup.sh outputs "Backup completed successfully"
result=1
output=$(su -s /bin/bash -c '/home/intern/project/scripts/backup.sh 2>/dev/null' intern)
if [ "$output" = "Backup completed successfully" ]; then
  result=0
fi
run_check 25 "backup.sh outputs 'Backup completed successfully'" $result

# Check 4: output.csv is owned by intern
owner=$(stat -c %U /home/intern/project/data/output.csv 2>/dev/null)
if [ "$owner" = "intern" ]; then
  result=0
else
  result=1
fi
run_check 25 "output.csv is owned by intern" $result

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
