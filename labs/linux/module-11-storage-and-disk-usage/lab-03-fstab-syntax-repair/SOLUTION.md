# Solution: Fixing a Malformed /etc/fstab Entry

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

cloud-init's edit script died between appending the device name and the rest of the line, leaving a one-field orphan. fstab's parser is strict — every active line needs all six fields — so one malformed line blocks mount -a and every future boot. The field-count awk is the standard pre-reboot check that would have caught it.

## Step-by-Step Fix

### Step 1: See the damage

The last line has one field instead of six:

```bash
cat /etc/fstab
awk '!/^#/ && NF>0 {print NF}' /etc/fstab
```

### Step 2: Replace the orphan

Substitute the whole broken line with the intended six-field entry:

```bash
sudo sed -i 's|^//10.0.0.30/share$|/dev/sdb1 /mnt/data ext4 defaults 0 2|' /etc/fstab
```

### Step 3: Run the pre-reboot gate

The awk check must now pass for every line:

```bash
awk '!/^#/ && NF>0 { if (NF!=6) bad=1 } END { exit bad }' /etc/fstab && echo 'fstab OK'
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Repair the Broken fstab ===

✅ PASS [40%]: every non-comment fstab line has exactly 6 fields
✅ PASS [35%]: the repaired entry mounts /dev/sdb1 on /mnt/data as ext4
✅ PASS [25%]: the repaired entry ends with pass number 2

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

A single malformed fstab line can make a server unbootable — the classic 3 a.m. incident. The six-field format and the awk field-count check are the two facts that keep you safe, and they apply verbatim when you add NFS mounts, swap files or object-storage mounts later.

## Common Mistakes

- **Mistake 1:** Deleting the orphan line entirely instead of restoring the intended mount — the data disk stays unmounted.
- **Mistake 2:** Using the wrong field order (options before type) — the check counts 6 fields but mount still fails.
- **Mistake 3:** Forgetting the two trailing numeric fields (dump and pass) — five fields is still broken.
