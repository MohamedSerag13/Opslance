# Solution: Debugging Invalid cron.d Syntax

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

Two classic cron.d corruptions: a pasted line with EIGHT fields (the extra '*' makes cron read 'root' as the command and the script path as an argument — it never runs) and a */0 step, which is mathematically undefined and rejected. cron logs malformed lines but keeps running, so the jobs fail silently forever until someone reads the file.

## Step-by-Step Fix

### Step 1: See the malformations

Field counts of 8 (and the */0) confirm both diagnoses:

```bash
cat /etc/cron.d/nightly-report
awk '!/^#/ && NF>0 {print NF}' /etc/cron.d/nightly-report
```

### Step 2: Rewrite the file to spec

Two clean seven-field lines at the runbook times:

```bash
sudo tee /etc/cron.d/nightly-report > /dev/null <<'EOF'
# Sends the nightly ops report
30 3 * * * root /usr/local/bin/send-report.sh
# Clears old temp files
15 5 * * * root /usr/local/bin/cleanup-temp.sh
EOF
```

### Step 3: Validate

Every active line must now count exactly 7 fields:

```bash
awk '!/^#/ && NF>0 {print NF}' /etc/cron.d/nightly-report
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Fix the Broken Cron File ===

✅ PASS [40%]: the report job line is exactly '30 3 * * * root /usr/local/bin/send-report.sh'
✅ PASS [35%]: the cleanup job line is exactly '15 5 * * * root /usr/local/bin/cleanup-temp.sh'
✅ PASS [25%]: every active line has exactly 7 fields (5 time fields + username + command)

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

Most 'cron doesn't run my job' cases are syntax: wrong field count, a username missing (or doubled), or an impossible step. The 30-second awk field-count check plus reading cron's syslog lines catches all of them — and rewriting the whole small file beats risky partial edits.

## Common Mistakes

- **Mistake 1:** Deleting the username 'accidentally' while removing the extra field — now the command runs as the wrong user (or not at all).
- **Mistake 2:** Fixing the fields but leaving cron reloading an unparseable file — check with the field-count awk, not the naked eye.
- **Mistake 3:** Assuming */0 means 'never' and leaving it — it is invalid, not a pause.
