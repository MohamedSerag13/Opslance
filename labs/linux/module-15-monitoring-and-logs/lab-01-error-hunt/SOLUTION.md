# Solution: Quantifying Errors in an Application Log

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

Not a fault but the first move of incident triage: quantify the problem before escalating. The log format (timestamp level component message) is the de-facto standard, and every question the template asks is answerable with one grep pipeline.

## Step-by-Step Fix

### Step 1: See the errors

Scan the matching lines to understand the failure pattern:

```bash
grep ERROR /var/log/app/app.log
```

### Step 2: Count them

grep -c emits just the number:

```bash
echo "error-count=$(grep -c ERROR /var/log/app/app.log)" > /home/intern/error-report.txt
```

### Step 3: Timestamp the last one

tail -1 picks the newest match; fields one and two are date and time:

```bash
echo "last-error=$(grep ERROR /var/log/app/app.log | tail -1 | awk '{print $1, $2}')" >> /home/intern/error-report.txt
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: The Error Hunt ===

✅ PASS [20%]: /home/intern/error-report.txt exists
✅ PASS [40%]: report states error-count=7
✅ PASS [40%]: report states last-error=2026-06-17 09:42:11

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

'How many, since when, what changed?' is the opening of every incident review, and application logs are where the answer lives when dashboards are missing or lying. The grep/awk extraction pattern here transfers unchanged to syslog, journalctl text output and any structured log you will meet.

## Common Mistakes

- **Mistake 1:** Counting with `grep ERROR file | wc -l` — fine here, but `grep -c` is the idiom and avoids an extra process.
- **Mistake 2:** Reporting the FIRST error (head) instead of the last (tail) — the timeline of the incident points the wrong way.
- **Mistake 3:** Copy-pasting the timestamp with a mangled space between date and time instead of extracting the two fields.
