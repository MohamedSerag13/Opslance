#!/bin/bash
# Acceptance criteria checker for: Build Cache Cleanup
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

echo "=== Checking: Build Cache Cleanup ==="
echo ""

# CHECK 1 (35%): no *.o files remain anywhere under the build cache
[ "$(find /var/tmp/buildcache -name '*.o' | wc -l)" -eq 0 ]
run_check 35 "no *.o files remain anywhere under the build cache" $?

# CHECK 2 (25%): the sources (src/main.c) survived
[ -f /var/tmp/buildcache/src/main.c ]
run_check 25 "the sources (src/main.c) survived" $?

# CHECK 3 (25%): the output binary survived
[ -f /var/tmp/buildcache/output/binary ]
run_check 25 "the output binary survived" $?

# CHECK 4 (15%): cleanup report records object-files-removed=4
grep -q '^object-files-removed=4$' /home/intern/cleanup-report.txt
run_check 15 "cleanup report records object-files-removed=4" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
