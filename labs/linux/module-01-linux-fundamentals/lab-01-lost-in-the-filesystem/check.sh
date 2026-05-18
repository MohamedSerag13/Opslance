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
echo "=== Checking: Lost in the Filesystem ==="
echo ""

# CHECK 1
grep -q "I navigated the Linux filesystem" /home/intern/found.txt 2>/dev/null
run_check 35 "/home/intern/found.txt exists and contains 'I navigated the Linux filesystem'" $?

# CHECK 2
[ -s /home/intern/etc-count.txt ]
run_check 35 "/home/intern/etc-count.txt exists and is not empty" $?

# CHECK 3
[ -f /home/intern/projects/alpha/beta/gamma/visited.txt ]
run_check 30 "/home/intern/projects/alpha/beta/gamma/visited.txt exists" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi