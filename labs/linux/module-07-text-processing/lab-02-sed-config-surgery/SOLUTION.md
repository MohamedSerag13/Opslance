# Solution: Editing Config Files In Place with sed

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

A stale configuration survived the release: the port never matched the load balancer and the debug flag was left on. The operational risk is not the edit itself but doing it carelessly — hence the backup requirement. sed is the right tool for precise, repeatable, auditable single-line changes.

## Step-by-Step Fix

### Step 1: Preserve the original

Change control wants the pre-edit file kept. Copy it into your home directory first:

```bash
cp /etc/app/settings.conf /home/intern/settings.conf.bak
```

### Step 2: Fix the port

Preview without -i first if you like, then commit the change in place with sudo (the file is root-owned):

```bash
sudo sed -i 's/^port=3000/port=8080/' /etc/app/settings.conf
```

### Step 3: Switch debug off

Same pattern for the debug flag:

```bash
sudo sed -i 's/^debug=true/debug=false/' /etc/app/settings.conf
```

### Step 4: Diff against the backup

The diff proves exactly two lines changed — your audit trail:

```bash
diff /home/intern/settings.conf.bak /etc/app/settings.conf
```

### Step 5: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Config Surgery with sed ===

✅ PASS [25%]: backup copy /home/intern/settings.conf.bak exists
✅ PASS [25%]: port is now 8080
✅ PASS [25%]: debug is now false
✅ PASS [25%]: other settings (app_name, max_connections) are untouched

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

sed -i is how production configs get changed on servers with no GUI and often no editor installed. Anchored substitutions plus a backup plus diff is the minimal safe-change workflow, and it works the same over SSH on one box or in a for-loop across a fleet.

## Common Mistakes

- **Mistake 1:** Skipping the anchor (`s/port=3000/port=8080/`) — it would also rewrite a commented example like '#port=3000'.
- **Mistake 2:** Forgetting the backup, then having no diff and no rollback when someone asks what changed.
- **Mistake 3:** Running sed without sudo on a root-owned file and 'fixing' the error by editing a copy that nothing reads.
