#!/bin/bash
# Acceptance criteria checker for: Your First Script
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

echo "=== Checking: Your First Script ==="
echo ""

# CHECK 1 (25%): /home/intern/hello.sh exists
[ -f /home/intern/hello.sh ]
run_check 25 "/home/intern/hello.sh exists" $?

# CHECK 2 (25%): first line of the script is the shebang #!/bin/bash
[ "$(head -n 1 /home/intern/hello.sh)" = '#!/bin/bash' ]
run_check 25 "first line of the script is the shebang #!/bin/bash" $?

# CHECK 3 (20%): script has the executable bit set
[ -x /home/intern/hello.sh ]
run_check 20 "script has the executable bit set" $?

# CHECK 4 (30%): running the script prints exactly 'Opslance boot OK'
[ "$(bash /home/intern/hello.sh 2>/dev/null)" = 'Opslance boot OK' ]
run_check 30 "running the script prints exactly 'Opslance boot OK'" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
