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
echo "=== Checking: Rogue Process Hunt ==="
echo ""

# Check 1 — pids_found.txt exists and contains at least 3 numeric PIDs (40pts)
result=1
if [ -f /home/intern/pids_found.txt ]; then
  count=$(grep -cE '^[0-9]+$' /home/intern/pids_found.txt 2>/dev/null)
  [ "${count:-0}" -ge 3 ] && result=0
fi
run_check 40 "pids_found.txt exists and lists at least 3 sleep process PIDs" $result

# Check 2 — no sleep 1000 processes are still running (60pts)
if pgrep -f 'sleep 1000' >/dev/null 2>&1; then
  result=1
else
  result=0
fi
run_check 60 "all rogue sleep processes have been killed (none remain)" $result

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
