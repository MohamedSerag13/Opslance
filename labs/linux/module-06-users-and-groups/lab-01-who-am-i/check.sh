#!/bin/bash
# Acceptance criteria checker for: Who Am I? Account Triage
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

echo "=== Checking: Who Am I? Account Triage ==="
echo ""

# CHECK 1 (25%): /home/intern/audit.txt exists
[ -f /home/intern/audit.txt ]
run_check 25 "/home/intern/audit.txt exists" $?

# CHECK 2 (25%): audit.txt contains the output of id (uid=...)
grep -q 'uid=' /home/intern/audit.txt
run_check 25 "audit.txt contains the output of id (uid=...)" $?

# CHECK 3 (25%): svc_backup login shell is /bin/bash in /etc/passwd
grep '^svc_backup:' /etc/passwd | grep -q ':/bin/bash$'
run_check 25 "svc_backup login shell is /bin/bash in /etc/passwd" $?

# CHECK 4 (25%): svc_backup is a member of the backup group
grep '^backup:' /etc/group | grep -q svc_backup
run_check 25 "svc_backup is a member of the backup group" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
