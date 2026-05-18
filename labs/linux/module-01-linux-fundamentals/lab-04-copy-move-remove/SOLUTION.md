# Solution: Copying, Moving, and Removing Files

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

The previous sysadmin left the server in a disorganized state: a critical config file has permissions set to `000` (no read/write/execute for anyone), the target directory `/etc/app/` doesn't exist, old backup files are cluttering the home directory, and a required data directory was never created.

## Step-by-Step Fix

### Step 1: Diagnose

List files in your home directory:

```bash
ls -la ~
```

Expected output shows:
```
---------- 1 intern intern  ... staging.conf
-rw-r--r-- 1 intern intern  ... backup-2024-01.tar.gz
-rw-r--r-- 1 intern intern  ... backup-2024-02.tar.gz
-rw-r--r-- 1 intern intern  ... backup-2024-03.tar.gz
```

Notice `staging.conf` has `----------` permissions — no one can read, write, or execute it.

### Step 2: Understand the issue

The `000` permissions mean even the file owner (intern) cannot access it. You must change permissions before you can move the file. Also, the target directory `/etc/app/` doesn't exist, so `mv` will fail if you try to move there directly.

### Step 3: Apply the fix

Fix permissions on the config file:

```bash
chmod 644 ~/staging.conf
```

Create the target directory (use `-p` to create parent directories):

```bash
sudo mkdir -p /etc/app
```

Move the config file:

```bash
mv ~/staging.conf /etc/app/staging.conf
```

Copy it to create the production config:

```bash
sudo cp /etc/app/staging.conf /etc/app/production.conf
```

Remove the old backup files:

```bash
rm ~/backup-*.tar.gz
```

Create the data directory:

```bash
sudo mkdir -p /var/app/data
```

### Step 4: Verify

```bash
check.sh
```

Expected output:
```
=== Checking: Copying, Moving, and Removing Files ===
✅ PASS: /etc/app/staging.conf exists
✅ PASS: /etc/app/production.conf exists
✅ PASS: No backup-*.tar.gz files remain in /home/intern
✅ PASS: /var/app/data directory exists

🎉 All checks passed! Lab complete.
```

---

## Why This Matters

In production, misconfigured permissions and disorganized filesystems are common causes of outages. Knowing how to quickly fix permissions, create directory structures, and clean up stale files is a fundamental sysadmin skill. The `mkdir -p` pattern is especially important — it's idempotent and safe to run even if directories already exist.

## Common Mistakes

- **Mistake 1:** Trying to `mv` a file with `000` permissions without first running `chmod`. The move will fail with "Permission denied".
- **Mistake 2:** Using `mkdir /etc/app` instead of `mkdir -p /etc/app`. Without `-p`, the command fails if any parent directory doesn't exist (though in this case `/etc` exists, so it would work — but `-p` is a safer habit).
