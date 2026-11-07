#!/bin/bash
# Acceptance criteria checker for: Zip the Webroot
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

echo "=== Checking: Zip the Webroot ==="
echo ""

# CHECK 1 (25%): /home/intern/webroot.zip exists
[ -f /home/intern/webroot.zip ]
run_check 25 "/home/intern/webroot.zip exists" $?

# CHECK 2 (25%): the file is a valid zip archive
unzip -l /home/intern/webroot.zip >/dev/null 2>&1
run_check 25 "the file is a valid zip archive" $?

# CHECK 3 (25%): the archive contains index.html
unzip -l /home/intern/webroot.zip 2>/dev/null | grep -q 'index\.html'
run_check 25 "the archive contains index.html" $?

# CHECK 4 (25%): the archive does NOT contain debug.log
! unzip -l /home/intern/webroot.zip 2>/dev/null | grep -q 'debug\.log'
run_check 25 "the archive does NOT contain debug.log" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
