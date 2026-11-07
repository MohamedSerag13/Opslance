# Solution: Answering 'Did My Cron Job Run?' from Logs

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

The backup command exits non-zero on some runs (locked files), and nothing alerts on it — cron ran the job, the job failed, nobody looked. Reading scheduler logs and quantifying failures is the first step of every 'did it even run?' incident, and the grep pipeline answers it in seconds.

## Step-by-Step Fix

### Step 1: Read the raw log

Identify the line format: OK lines and CMD FAILED lines with exit statuses:

```bash
cat /var/log/cron.log
```

### Step 2: Count the failures

Two-stage grep keeps the count exact for this job:

```bash
echo "failed-backups=$(grep 'CMD FAILED' /var/log/cron.log | grep -c backup.sh)" > /home/intern/cron-report.txt
```

### Step 3: Timestamp the first failure

The earliest CMD FAILED line's first three fields are the syslog timestamp:

```bash
echo "first-failure=$(grep 'CMD FAILED' /var/log/cron.log | grep backup.sh | head -1 | awk '{print $1, $2, $3}')" >> /home/intern/cron-report.txt
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Cron Log Forensics ===

✅ PASS [20%]: /home/intern/cron-report.txt exists
✅ PASS [45%]: report states failed-backups=3
✅ PASS [35%]: report states first-failure=Jun 16 02:15:02

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

Schedulers fail silently by design — they run the command and go back to sleep regardless of exit status. Junior ops lives in these logs: correlating CMD lines, counting failures and pinning down first-occurrence timestamps is the bread and butter of incident triage.

## Common Mistakes

- **Mistake 1:** Counting CMD lines instead of CMD FAILED lines — 'the job ran' and 'the job succeeded' are different facts.
- **Mistake 2:** Reporting the LAST failure because you used tail instead of head.
- **Mistake 3:** Copying the timestamp by eye with the wrong spacing instead of extracting fields with awk.
