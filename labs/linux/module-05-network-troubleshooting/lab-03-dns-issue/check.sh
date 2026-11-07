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

echo "=== Checking: Broken DNS Resolution ==="
echo ""

# CHECK 1 — /etc/resolv.conf no longer contains the bad nameserver 1.2.3.4 (35pts)
if grep -q "^nameserver 1\.2\.3\.4" /etc/resolv.conf 2>/dev/null; then
  result=1
else
  result=0
fi
run_check 35 "/etc/resolv.conf no longer contains broken nameserver 1.2.3.4" $result

# CHECK 2 — /etc/resolv.conf contains a valid nameserver (8.8.8.8 or 1.1.1.1) (35pts)
if grep -qE "^nameserver (8\.8\.8\.8|8\.8\.4\.4|1\.1\.1\.1|1\.0\.0\.1)" /etc/resolv.conf 2>/dev/null; then
  result=0
else
  result=1
fi
run_check 35 "/etc/resolv.conf contains a known-good nameserver (8.8.8.8 or 1.1.1.1)" $result

# CHECK 3 — dig google.com now resolves successfully (30pts)
# Uses a short timeout to avoid hanging if network is unavailable
dig +time=5 +tries=1 google.com @8.8.8.8 > /dev/null 2>&1
run_check 30 "dig google.com resolves successfully" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
