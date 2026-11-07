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
echo "=== Checking: CI/CD Pipeline Failed ==="
echo ""

# CHECK 1
[ -x /home/intern/deploy.sh ]
run_check 40 "deploy.sh is executable" $?

# CHECK 2
OUTPUT=$(/home/intern/deploy.sh 2>/dev/null)
echo "$OUTPUT" | grep -q "Deploying application..."
run_check 60 "Running deploy.sh outputs 'Deploying application...'" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
