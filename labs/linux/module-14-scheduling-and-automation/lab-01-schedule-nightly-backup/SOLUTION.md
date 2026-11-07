# Solution: Writing a /etc/cron.d Scheduled Job

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

Automation gap: a backup script nobody scheduled. The subtle part for juniors is the USERNAME field — /etc/cron.d lines have six fields (five time fields + user + command), unlike personal crontabs' five. Files under /etc/cron.d are also config-managed and survive image rebuilds, which is why the runbook demands this location.

## Step-by-Step Fix

### Step 1: Confirm the target script

Know what the schedule will invoke:

```bash
cat /usr/local/bin/backup.sh
```

### Step 2: Write the cron file

A comment for the next admin, then the seven-field schedule line — note the username field 'root':

```bash
sudo tee /etc/cron.d/nightly-backup > /dev/null <<'EOF'
# Nightly configuration backup (OPS runbook 7.1)
0 2 * * * root /usr/local/bin/backup.sh
EOF
```

### Step 3: Validate the format

Every active line must have exactly 7 fields — the field-count awk is the quick gate:

```bash
awk '!/^#/ && NF>0 {print NF}' /etc/cron.d/nightly-backup
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Schedule the Nightly Backup ===

✅ PASS [20%]: /etc/cron.d/nightly-backup exists
✅ PASS [30%]: every active line has the 7 fields /etc/cron.d requires (5 time fields + username + command)
✅ PASS [25%]: the schedule line is exactly '0 2 * * * root /usr/local/bin/backup.sh'
✅ PASS [25%]: the scheduled backup script is executable

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

Cron is the scheduler behind most 'it just happens' automation in Linux shops. Reading and WRITING its five-field time syntax is a hard requirement for juniors, and the /etc/cron.d username field is the classic trap — the same line works in crontab -e and fails in cron.d (or vice versa) without it.

## Common Mistakes

- **Mistake 1:** Writing six fields (no username) in /etc/cron.d — cron treats the script path as the user and the job never runs. The line needs seven: five time fields, the username, then the command.
- **Mistake 2:** Using `2 * * * *` (hour=2) instead of `0 2 * * *` — that runs at 02:00… no wait, it runs at MINUTE 2 of EVERY hour.
- **Mistake 3:** Forgetting to make /usr/local/bin/backup.sh executable — cron's invocation fails silently in /var/log/syslog.
