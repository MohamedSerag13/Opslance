# Solution: Hunting the Biggest File with du and find

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

A crashing process left a 40 MB core dump in /var/backups, and nothing rotates that directory. The workflow is the standard disk-triage loop: rank with du, confirm the culprit, document the finding, delete surgically, and verify the neighbours survived. Wildcard deletions in shared directories are how backups die.

## Step-by-Step Fix

### Step 1: Rank the offenders

The du | sort -rh pipeline lists every item under /var biggest-first — the dump towers over everything:

```bash
sudo du -ah /var 2>/dev/null | sort -rh | head -5
```

### Step 2: Record the evidence

The ticket wants the size documented before anything is deleted:

```bash
echo 'largest=40MB' > /home/intern/findings.txt
```

### Step 3: Delete the culprit — precisely

One exact path, no wildcards. The legitimate backup stays untouched:

```bash
sudo rm /var/backups/core.dump
ls -lh /var/backups/
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: What's Eating the Disk? ===

✅ PASS [20%]: /home/intern/findings.txt exists
✅ PASS [40%]: findings records largest=40MB
✅ PASS [25%]: the 40MB core.dump has been deleted
✅ PASS [15%]: the legitimate backup old-2024.tar.gz survived

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

'Disk full' is the most common production fire a junior is handed. du/sort/head finds the offender in seconds, and the record-then-delete discipline protects you when someone later asks what you removed and why. The same pipeline works on log dirs, container storage and CI caches.

## Common Mistakes

- **Mistake 1:** Deleting with `sudo rm -rf /var/backups/*` — the legitimate backup goes with the dump.
- **Mistake 2:** Reporting the directory size (/var/backups) instead of the single biggest FILE.
- **Mistake 3:** Skipping the findings file — after deletion there is no evidence of what freed the space.
