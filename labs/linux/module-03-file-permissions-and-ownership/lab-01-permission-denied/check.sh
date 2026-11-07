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
echo "=== Checking: Permission Denied ==="
echo ""

# CHECK 1 — secret.txt has read permission for the owner
[ -r /home/intern/secret.txt ]
run_check 50 "secret.txt has read permission for the owner" $?

# CHECK 2 — cat secret.txt outputs Secret Data
cat /home/intern/secret.txt 2>/dev/null | grep -q "Secret Data"
run_check 50 "cat secret.txt outputs Secret Data" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
