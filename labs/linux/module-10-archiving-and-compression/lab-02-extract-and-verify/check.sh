#!/bin/bash
# Acceptance criteria checker for: Deploy from a Tarball
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

echo "=== Checking: Deploy from a Tarball ==="
echo ""

# CHECK 1 (35%): /var/www/site/index.html exists after extraction
[ -f /var/www/site/index.html ]
run_check 35 "/var/www/site/index.html exists after extraction" $?

# CHECK 2 (25%): /var/www/site/css/style.css exists
[ -f /var/www/site/css/style.css ]
run_check 25 "/var/www/site/css/style.css exists" $?

# CHECK 3 (25%): /var/www/site/js/app.js exists
[ -f /var/www/site/js/app.js ]
run_check 25 "/var/www/site/js/app.js exists" $?

# CHECK 4 (15%): index.html content is intact (contains <h1>)
grep -q '<h1>' /var/www/site/index.html
run_check 15 "index.html content is intact (contains <h1>)" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
