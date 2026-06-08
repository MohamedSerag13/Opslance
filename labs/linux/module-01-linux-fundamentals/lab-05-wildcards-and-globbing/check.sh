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
echo "=== Checking: Wildcards and Globbing ==="
echo ""

# Check logs directory
[ -d /home/intern/logs ] && [ $(ls /home/intern/logs/log-* 2>/dev/null | wc -l) -gt 0 ]
run_check 25 "Logs directory contains log files" $?

# Check reports directory
[ -d /home/intern/reports ] && [ $(ls /home/intern/reports/report-* 2>/dev/null | wc -l) -gt 0 ]
run_check 25 "Reports directory contains report files" $?

# Check notes directory
[ -d /home/intern/notes ] && [ $(ls /home/intern/notes/note-* 2>/dev/null | wc -l) -gt 0 ]
run_check 25 "Notes directory contains note files" $?

# Check .tmp files deleted from inbox
[ -d /home/intern/inbox ] && [ $(ls /home/intern/inbox/*.tmp 2>/dev/null | wc -l) -eq 0 ]
run_check 25 "No .tmp files remain in /home/intern/inbox" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
