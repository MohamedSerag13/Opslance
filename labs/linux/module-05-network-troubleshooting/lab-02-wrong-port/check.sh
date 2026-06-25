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

echo "=== Checking: App on the Wrong Port ==="
echo ""

# CHECK 1 — actual_port.txt contains "8081" (40pts)
grep -q "8081" /home/intern/actual_port.txt 2>/dev/null
run_check 40 "actual_port.txt contains '8081'" $?

# CHECK 2 — port 8081 is genuinely listening (30pts)
ss -tulnp 2>/dev/null | grep -q ':8081'
run_check 30 "Port 8081 is currently listening" $?

# CHECK 3 — curl localhost:8081 returns HTTP 200 (30pts)
curl -s -o /dev/null -w "%{http_code}" http://localhost:8081 2>/dev/null | grep -q "200"
run_check 30 "curl localhost:8081 returns HTTP 200" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
