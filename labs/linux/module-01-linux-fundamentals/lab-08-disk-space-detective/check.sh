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
echo "=== Checking: Disk Space Detective ==="
echo ""

# Check df_output.txt
[ -s /home/intern/df_output.txt ] && grep -qi "Filesystem" /home/intern/df_output.txt
run_check 30 "df_output.txt contains Filesystem header" $?

# Check disk_report.txt contains backups
[ -s /home/intern/disk_report.txt ] && grep -qi "backups" /home/intern/disk_report.txt
run_check 35 "disk_report.txt identifies 'backups' directory" $?

# Check largest_file.txt contains the largest file path
[ -s /home/intern/largest_file.txt ] && grep -q "/home/intern/data/backups/archive.tar" /home/intern/largest_file.txt
run_check 35 "largest_file.txt identifies /home/intern/data/backups/archive.tar" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
