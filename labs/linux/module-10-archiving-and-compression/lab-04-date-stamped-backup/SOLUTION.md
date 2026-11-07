# Solution: Date-Stamped Backups with Command Substitution

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

The backup never met the retention contract: no timestamp in the name means the rotation script's etc-*.tar.gz glob cannot manage it. Embedding $(date +%F) in the filename at creation time makes every backup self-describing, sortable, and automatically subject to the existing purge policy.

## Step-by-Step Fix

### Step 1: Check the convention

date +%F is the ISO short format the policy wants:

```bash
date +%F
```

### Step 2: Create the target directory

mkdir -p is idempotent — safe to re-run:

```bash
mkdir -p /tmp/backups
```

### Step 3: Archive with the date in the name

The $(date +%F) substitution is evaluated when the line runs, so the filename always carries the real current date:

```bash
sudo tar -czf /tmp/backups/etc-$(date +%F).tar.gz /etc/app
```

### Step 4: Verify

Confirm the name and test the archive's integrity:

```bash
ls -lh /tmp/backups/
tar -tzf /tmp/backups/etc-$(date +%F).tar.gz
```

### Step 5: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: The Date-Stamped Backup ===

✅ PASS [20%]: /tmp/backups directory exists
✅ PASS [45%]: etc-<today>.tar.gz exists in /tmp/backups (name matches today's date)
✅ PASS [20%]: the backup is a valid gzipped archive
✅ PASS [15%]: the archive contains db.conf

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

Command substitution turning `date` into a filename is the doorway from running commands to programming the shell. Date-stamped names are the backbone of every rotation scheme — from logrotate to database dumps — because they make 'delete anything older than N days' a one-liner that cannot misfire.

## Common Mistakes

- **Mistake 1:** Quoting the substitution (`'$(date +%F)'`) so the filename literally contains '$(date +%F)'.
- **Mistake 2:** Hardcoding the date — it works today and betrays you the first time the command runs tomorrow.
- **Mistake 3:** Using +%D or +%m/%d/%y and producing a name the rotation glob does not recognise.
