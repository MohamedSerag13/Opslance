# Solution: Copying, Moving, and Removing Files

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

The previous sysadmin left the server in a disorganized state: a critical config file is in the wrong directory (`/home/intern` instead of `/etc/app`), the target directory `/etc/app/` doesn't exist, old backup files are cluttering the home directory, and a required data directory was never created.

## Step-by-Step Fix

### Step 1: Create the target configuration directory

Create the target directory (use `-p` to create parent directories):

```bash
sudo mkdir -p /etc/app
```

### Step 2: Move the config file

Move `staging.conf` to the new directory:

```bash
mv ~/staging.conf /etc/app/staging.conf
```

### Step 3: Copy the config file to create the production config

Copy it to create the production config:

```bash
sudo cp /etc/app/staging.conf /etc/app/production.conf
```

### Step 4: Remove the old backup files

Remove all backup tarballs from the home directory:

```bash
rm ~/backup-*.tar.gz
```

### Step 5: Create the data directory

Create the directory `/var/app/data`:

```bash
sudo mkdir -p /var/app/data
```

### Step 6: Verify

Run the checker script to verify everything is correct:

```bash
check.sh
```

Expected output:
```
=== Checking: Copy, Move, Remove ===

✅ PASS [25%]: /etc/app/staging.conf exists
✅ PASS [25%]: /etc/app/production.conf exists
✅ PASS [25%]: no backup-*.tar.gz files remain in /home/intern
✅ PASS [25%]: /var/app/data directory exists

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

In production, disorganized filesystems are common causes of configuration mistakes. Knowing how to quickly create directory structures, copy files, move files, and clean up stale files is a fundamental sysadmin skill. The `mkdir -p` pattern is especially important — it's idempotent and safe to run even if directories already exist.

## Common Mistakes

- **Mistake 1:** Using `mkdir /etc/app` instead of `mkdir -p /etc/app`. Without `-p`, the command fails if any parent directory doesn't exist.
