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

echo "=== Checking: Service Unreachable — Nothing on Port 8080 ==="
echo ""

# CHECK 1 — diagnosis.txt exists and contains the right keyword (40pts)
if [ -f /home/intern/diagnosis.txt ]; then
  grep -qiE "no process|nothing listening|not listening|nothing is listening|connection refused|no.*listen|listen.*nothing" \
    /home/intern/diagnosis.txt 2>/dev/null
  result=$?
else
  result=1
fi
run_check 40 "diagnosis.txt exists and contains the diagnosis keyword" $result

# CHECK 2 — something is now listening on port 8080 (30pts)
ss -tulnp 2>/dev/null | grep -q ':8080'
run_check 30 "A process is now listening on port 8080" $?

# CHECK 3 — curl localhost:8080 returns HTTP 200 (30pts)
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null | grep -q "200"
run_check 30 "curl localhost:8080 returns HTTP 200" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
