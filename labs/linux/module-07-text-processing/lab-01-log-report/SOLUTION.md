# Solution: Building a Traffic Report with grep, sort and uniq

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

There is no fault to repair — this is an extraction exercise. The skill being trained is composing filters: each tool does one small job (select lines, cut columns, count, sort) and the pipe operator turns them into a query. Whenever a 'dashboard' is missing, these pipelines are the fallback every operator falls back to.

## Step-by-Step Fix

### Step 1: Total requests

One line per request, so line count equals request count. Use input redirection so wc prints a bare number:

```bash
echo "total=$(wc -l < /var/log/app/access.log)" > /home/intern/report.txt
```

### Step 2: Count the 404s

grep -c prints only the count of lines containing ' 404 ' — spaces around the status code stop it matching file sizes:

```bash
echo "errors_404=$(grep -c ' 404 ' /var/log/app/access.log)" >> /home/intern/report.txt
```

### Step 3: Find the noisiest client

Cut the first column, count duplicates, sort numerically descending, keep the first row, then keep just the IP:

```bash
echo "top_client=$(awk '{print $1}' /var/log/app/access.log | sort | uniq -c | sort -rn | head -1 | awk '{print $2}')" >> /home/intern/report.txt
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Traffic Report from Raw Logs ===

✅ PASS [20%]: /home/intern/report.txt exists
✅ PASS [25%]: report states total=40
✅ PASS [25%]: report states errors_404=14
✅ PASS [30%]: report states top_client=10.0.0.5

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

grep/sort/uniq/awk pipelines are the swiss army knife of operations. They answer questions from logs in seconds without installing anything, and the same patterns scale from a 40-line file to a multi-gigabyte one. Interviewers love them because they prove you can think in data flows rather than in single commands.

## Common Mistakes

- **Mistake 1:** Using `grep -c 404` without spaces — it also matches sizes or bytes containing 404 and inflates the count.
- **Mistake 2:** Forgetting `sort` before `uniq -c`: uniq only collapses ADJACENT duplicates, so unsorted input reports every line as unique.
- **Mistake 3:** Using `sort -r` instead of `sort -rn` — a text sort would rank '9' above '10'.
