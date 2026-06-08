#!/bin/bash
# Acceptance criteria checker for: What is My System?
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

echo "=== Checking: What is My System? ==="
echo ""

# CHECK 1 (20%): system-report.txt exists and is not empty
[ -f /home/intern/system-report.txt ] && [ -s /home/intern/system-report.txt ]
run_check 20 "system-report.txt exists and is not empty" $?

# CHECK 2 (20%): report contains username 'intern'
grep -qi "Username:.*intern" /home/intern/system-report.txt 2>/dev/null
run_check 20 "report contains username 'intern'" $?

# CHECK 3 (20%): report contains the system hostname
grep -qi "Hostname:.*$(hostname)" /home/intern/system-report.txt 2>/dev/null
run_check 20 "report contains system hostname" $?

# CHECK 4 (20%): report contains home directory '/home/intern'
grep -qi "Home:.*/home/intern" /home/intern/system-report.txt 2>/dev/null
run_check 20 "report contains home directory '/home/intern'" $?

# CHECK 5 (20%): report contains working directory '/home/intern'
grep -qi "PWD:.*/home/intern" /home/intern/system-report.txt 2>/dev/null
run_check 20 "report contains working directory '/home/intern'" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
