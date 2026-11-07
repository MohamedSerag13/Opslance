# Solution: Capturing Memory and Load with free and uptime

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

Nothing broken — the lab establishes the two pulse commands. free -m answers 'is memory exhausted?', uptime answers 'is the CPU queue backing up?'. Together they are the 10-second triage before any deeper tool comes out.

## Step-by-Step Fix

### Step 1: Read the pulses

Run each command and learn to eyeball the numbers:

```bash
free -m
uptime
```

### Step 2: Capture the snapshot

Group redirection writes both outputs into one timestamped-ish report:

```bash
{ free -m; uptime; } > /home/intern/health-report.txt
```

### Step 3: Verify

Both signatures must be present:

```bash
grep 'Mem:' /home/intern/health-report.txt
grep 'load average' /home/intern/health-report.txt
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Health Snapshot ===

✅ PASS [20%]: /home/intern/health-report.txt exists
✅ PASS [40%]: report contains the free -m Mem: row
✅ PASS [40%]: report contains the uptime load average line

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

free and uptime are the first commands any senior runs on an unfamiliar box — before top, before logs. Learning to read Mem: rows and load averages (roughly: load > core count means work is queuing) gives you a baseline instinct for 'is this box healthy?' in ten seconds.

## Common Mistakes

- **Mistake 1:** Reading the 'free' column of free -m as 'free memory' — Linux caches aggressively; the 'available' column is the truth.
- **Mistake 2:** Panicking at a load average without knowing the core count — load 8 is idle on 16 cores and on fire on 4.
- **Mistake 3:** Redirecting only one command into the report (the classic `{ }` grouping is easy to forget).
