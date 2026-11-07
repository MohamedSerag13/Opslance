#!/bin/bash
# Acceptance criteria checker for: Tar Up the Logs
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

echo "=== Checking: Tar Up the Logs ==="
echo ""

# CHECK 1 (25%): /home/intern/app-logs.tar.gz exists
[ -f /home/intern/app-logs.tar.gz ]
run_check 25 "/home/intern/app-logs.tar.gz exists" $?

# CHECK 2 (25%): the file is a valid gzipped tar archive
tar -tzf /home/intern/app-logs.tar.gz >/dev/null 2>&1
run_check 25 "the file is a valid gzipped tar archive" $?

# CHECK 3 (25%): the archive contains app.log
tar -tzf /home/intern/app-logs.tar.gz 2>/dev/null | grep -q 'app\.log'
run_check 25 "the archive contains app.log" $?

# CHECK 4 (25%): the archive contains audit.log
tar -tzf /home/intern/app-logs.tar.gz 2>/dev/null | grep -q 'audit\.log'
run_check 25 "the archive contains audit.log" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
