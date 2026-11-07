# Solution: Removing Unapproved Software with apt

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

Someone installed a joke package on a shared server and it slipped through. The audit angle is what matters: remove undoes the program, purge also destroys its config, and the difference shows up later when stale configs resurrect behaviour after a reinstall. Verification must cover BOTH the dpkg database and the PATH.

## Step-by-Step Fix

### Step 1: Confirm the finding

Reproduce the audit's evidence before changing anything:

```bash
dpkg -s sl | head -3
command -v sl
```

### Step 2: Remove the package

apt-get remove -y uninstalls the program binaries:

```bash
sudo apt-get remove -y sl
```

### Step 3: Purge the leftovers

purge deletes the package's configuration files as well — policy requires a clean slate:

```bash
sudo apt-get purge -y sl
```

### Step 4: Close the ticket with proof

Both checks must fail now — the package record and the binary:

```bash
dpkg -s sl || echo 'sl is gone'
command -v sl || echo 'no sl binary'
```

### Step 5: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Remove the Rogue Package ===

✅ PASS [45%]: sl is no longer registered in the package database
✅ PASS [35%]: the sl binary is gone from the PATH
✅ PASS [20%]: the dpkg package database is still readable and has installed packages

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

 Knowing remove vs purge (and autoremove for orphaned dependencies) is basic hygiene on Debian-family hosts. The same triad matters in reverse when you are the one installing: everything you apt install today is something an auditor may ask you to account for tomorrow.

## Common Mistakes

- **Mistake 1:** Stopping at remove and leaving the config files behind — the audit will still flag the package.
- **Mistake 2:** Removing by hand (`rm /usr/games/sl`) instead of via apt — the dpkg database now disagrees with reality.
- **Mistake 3:** Running purge without -y in a script and having it hang on the confirmation prompt.
