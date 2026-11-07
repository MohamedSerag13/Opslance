# Solution: Bulk File Moves with a for Loop

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

The spool is unmanaged — a classic ops smell. The fix is a tiny idempotent script: glob the pattern, skip iterations where nothing matched, move each file. The `[ -e "$f" ] || continue` guard is what makes the script safe to run repeatedly (and on an empty spool), which is exactly how it will be used in production.

## Step-by-Step Fix

### Step 1: Survey the spool

Confirm the files to move and what must stay put:

```bash
ls -la /home/intern/spool
```

### Step 2: Write the loop

The glob expands once per match; the guard protects the empty-spool case; quotes protect odd filenames:

```bash
cat > /home/intern/cleanup.sh <<'EOF'
#!/bin/bash
for f in /home/intern/spool/*.tmp; do
  [ -e "$f" ] || continue
  mv "$f" /home/intern/spool/archive/
done
EOF
```

### Step 3: Run and verify

Make it executable, run it once, and count the results:

```bash
chmod +x /home/intern/cleanup.sh
./cleanup.sh
find /home/intern/spool -maxdepth 1 -name '*.tmp' | wc -l
find /home/intern/spool/archive -name '*.tmp' | wc -l
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Clean Up with a Loop ===

✅ PASS [20%]: /home/intern/cleanup.sh exists and is executable
✅ PASS [25%]: the script uses a for loop
✅ PASS [25%]: no .tmp files remain in the spool root
✅ PASS [30%]: all 6 .tmp files are now in spool/archive/

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

The for loop is 90% of shell automation: rotate logs, restart pods, rsync directories, purge caches. The two habits that keep those loops safe — quoting the loop variable and guarding the empty glob — are exactly what this lab drills.

## Common Mistakes

- **Mistake 1:** Writing the loop body with an unquoted $f — one filename with a space and mv moves the wrong things.
- **Mistake 2:** Hardcoding job-01.tmp … job-06.tmp in six mv commands instead of looping: it breaks the moment job-07 appears.
- **Mistake 3:** Using `for f in $(ls *.tmp)` — parsing ls breaks on spaces and is the classic shell anti-pattern.
