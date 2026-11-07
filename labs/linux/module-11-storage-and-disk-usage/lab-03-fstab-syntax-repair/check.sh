#!/bin/bash
# Acceptance criteria checker for: Repair the Broken fstab
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

echo "=== Checking: Repair the Broken fstab ==="
echo ""

# CHECK 1 (40%): every non-comment fstab line has exactly 6 fields
awk '!/^#/ && NF>0 { if (NF!=6) bad=1 } END { exit bad }' /etc/fstab
run_check 40 "every non-comment fstab line has exactly 6 fields" $?

# CHECK 2 (35%): the repaired entry mounts /dev/sdb1 on /mnt/data as ext4
grep -Eq '^/dev/sdb1[[:space:]]+/mnt/data[[:space:]]+ext4' /etc/fstab
run_check 35 "the repaired entry mounts /dev/sdb1 on /mnt/data as ext4" $?

# CHECK 3 (25%): the repaired entry ends with pass number 2
grep -Eq '^/dev/sdb1.*[[:space:]]2[[:space:]]*$' /etc/fstab
run_check 25 "the repaired entry ends with pass number 2" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
