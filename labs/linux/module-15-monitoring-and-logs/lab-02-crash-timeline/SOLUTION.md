# Solution: Correlating Service Crashes in System Logs

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

orders-api crashes with a segmentation fault and systemd restarts it, leaving a repeating crash-restart signature in the system log. The timeline artefacts — count and first occurrence — are what a post-mortem needs first, and both are extractable from a single file with two grep pipelines. On a live systemd host the same story lives in journalctl -u orders-api.

## Step-by-Step Fix

### Step 1: Locate the crash signature

The application's own lines carry the Segmentation fault marker:

```bash
grep 'Segmentation fault' /var/log/syslog
```

### Step 2: Count the crashes

One line per crash — grep -c is the count:

```bash
echo "crash-count=$(grep -c 'Segmentation fault' /var/log/syslog)" > /home/intern/crash-report.txt
```

### Step 3: Pin the first crash

The log is chronological, so head -1 is the earliest:

```bash
echo "first-crash=$(grep 'Segmentation fault' /var/log/syslog | head -1 | awk '{print $1, $2, $3}')" >> /home/intern/crash-report.txt
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Build the Crash Timeline ===

✅ PASS [20%]: /home/intern/crash-report.txt exists
✅ PASS [40%]: report states crash-count=3
✅ PASS [40%]: report states first-crash=Jun 16 14:05:32

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

Correlating application lines with systemd unit lines in one timeline is exactly what journalctl does interleaved on a live host — learning the skill on a static file first makes journalctl's output-legible later. The count + first-occurrence pattern repeats in every post-mortem template.

## Common Mistakes

- **Mistake 1:** Counting 'Failed with result' systemd lines instead of the process's own crash lines — restarts and crashes must match, but only one is the event.
- **Mistake 2:** Using tail for 'first crash' — logs are chronological, so head finds the first.
- **Mistake 3:** Reporting the timestamp of the systemd restart line (seconds later) rather than the crash itself.
