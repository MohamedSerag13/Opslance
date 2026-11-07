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
echo "=== Checking: High CPU Investigation ==="
echo ""

# Check 1 — culprit_pid.txt contains the correct PID (40pts)
result=1
if [ -f /home/intern/culprit_pid.txt ] && [ -f /tmp/.culprit_pid ]; then
  expected=$(cat /tmp/.culprit_pid | tr -d '[:space:]')
  actual=$(cat /home/intern/culprit_pid.txt | tr -d '[:space:]')
  if [ -n "$actual" ] && [ "$actual" = "$expected" ]; then
    result=0
  fi
fi
run_check 40 "culprit_pid.txt contains the correct yes process PID" $result

# Check 2 — the yes process is no longer running (60pts)
if pgrep -x yes >/dev/null 2>&1; then
  result=1
else
  result=0
fi
run_check 60 "yes process has been killed (no longer running)" $result

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
