#!/bin/bash
# Acceptance criteria checker for: Shared Folder Access
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

echo "=== Checking: Shared Folder Access ==="
echo ""

# CHECK 1 (25%): projectx group exists in /etc/group
grep -q '^projectx:' /etc/group
run_check 25 "projectx group exists in /etc/group" $?

# CHECK 2 (25%): both alice and bob are members of projectx
grep '^projectx:' /etc/group | grep -q alice && grep '^projectx:' /etc/group | grep -q bob
run_check 25 "both alice and bob are members of projectx" $?

# CHECK 3 (25%): /srv/projectx group ownership is projectx
[ "$(stat -c %G /srv/projectx)" = "projectx" ]
run_check 25 "/srv/projectx group ownership is projectx" $?

# CHECK 4 (25%): /srv/projectx permissions are 2770 (setgid, group rwx, no access for others)
[ "$(stat -c %a /srv/projectx)" = "2770" ]
run_check 25 "/srv/projectx permissions are 2770 (setgid, group rwx, no access for others)" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
