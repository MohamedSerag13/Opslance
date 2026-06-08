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
echo "=== Checking: Links Hard and Soft ==="
echo ""

# Check check_1: current exists and is a symlink
[ -L /home/intern/current ]
run_check 40 "/home/intern/current is a symbolic link" $?

# Check check_2: current points to releases/v2.0
readlink /home/intern/current | grep -q "releases/v2.0"
run_check 20 "/home/intern/current points to releases/v2.0" $?

# Check check_3: hard link inode match
inode1=$(stat -c %i /home/intern/releases/v1.0/app.conf 2>/dev/null)
inode2=$(stat -c %i /home/intern/releases/v1.0/app.conf.bak 2>/dev/null)
[ -n "$inode1" ] && [ "$inode1" = "$inode2" ]
run_check 40 "app.conf.bak shares the same inode as app.conf" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
