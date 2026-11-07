# Solution: Debugging a Broken Backup Script

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

Four independent defects: a corrupted shebang (#bash/bin), tar running without the z flag so the output is not gzipped, an echo advertising app-backup.gz while the archive is app-backup.tar, and no explicit exit status. Individually small, together they made last night's backup useless — exactly the kind of compound breakage you will meet in legacy cron scripts.

## Step-by-Step Fix

### Step 1: Diagnose without executing

Read the script and parse-check it. bash -n catches structural damage before anything runs:

```bash
cat /usr/local/bin/backup.sh
bash -n /usr/local/bin/backup.sh
```

### Step 2: Rewrite the script correctly

Fix the shebang, quote the variables, compress with tar czf, echo the real path, exit 0. sudo tee replaces the root-owned file:

```bash
sudo tee /usr/local/bin/backup.sh > /dev/null <<'EOF'
#!/bin/bash
SRC_DIR=/var/www/app
BACKUP_DIR=/tmp/backups
if [ ! -d "$BACKUP_DIR" ]; then
  mkdir -p "$BACKUP_DIR"
fi
tar czf "$BACKUP_DIR/app-backup.tar.gz" "$SRC_DIR"
echo "Backup complete: $BACKUP_DIR/app-backup.tar.gz"
exit 0
EOF
sudo chmod 755 /usr/local/bin/backup.sh
```

### Step 3: Prove the fix

Syntax-check, run once, and list the archive to confirm the app files are inside:

```bash
bash -n /usr/local/bin/backup.sh && echo 'syntax OK'
sudo /usr/local/bin/backup.sh
tar -tzf /tmp/backups/app-backup.tar.gz
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Debug the Backup Script ===

✅ PASS [25%]: backup.sh passes a bash syntax check (bash -n)
✅ PASS [20%]: backup.sh is executable
✅ PASS [35%]: running backup.sh produces /tmp/backups/app-backup.tar.gz
✅ PASS [20%]: the archive contains the app's index.html

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

Reading, understanding and repairing somebody else's shell script is a rite of passage. bash -n and bash -x let you debug without side effects; explicit exit codes turn a script from a fire-and-forget mystery into a component a scheduler can monitor. These two habits separate maintainable scripts from legacy time bombs.

## Common Mistakes

- **Mistake 1:** Editing the root-owned script without sudo and silently writing to a file nobody executes.
- **Mistake 2:** Adding the .gz extension to the filename without adding tar's z flag — the file is not actually compressed.
- **Mistake 3:** Leaving variables unquoted so a future path with spaces breaks the tar command silently.
