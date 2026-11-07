# Solution: Capturing and Interpreting df Output

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

No fault — a reporting exercise on the single most-read storage command. The twist is extraction: the same df output must serve both humans (the full table) and machines (the root-use=NN% line), which practises tail+awk column surgery on command output.

## Step-by-Step Fix

### Step 1: Look at the data

Identify the columns — Filesystem, Size, Used, Avail, Use%, Mounted on:

```bash
df -h
```

### Step 2: Capture the full snapshot

Redirect the whole table as the evidence section:

```bash
df -h > /home/intern/df-report.txt
```

### Step 3: Extract the root usage

Filter to the root filesystem, drop the header, take column 5, and append it with the root-use= prefix:

```bash
echo "root-use=$(df -h / | tail -1 | awk '{print $5}')" >> /home/intern/df-report.txt
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Read the Filesystem Report ===

✅ PASS [20%]: /home/intern/df-report.txt exists
✅ PASS [25%]: report contains the df header line
✅ PASS [35%]: report contains a machine-readable root-use=<N>% line
✅ PASS [20%]: report contains the root filesystem row (ending in /)

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

df is the first command run in every capacity incident, and the Use% column is what managers repeat back to you. Being able to slice a command's tabular output with tail/awk — and write it somewhere durable — turns a terminal session into a report other people can act on.

## Common Mistakes

- **Mistake 1:** Reading the wrong column — $4 is Avail, $5 is Use%; a one-column slip inverts the story.
- **Mistake 2:** Parsing `df -h` header-included output with tail missing, so the extraction grabs 'Use%' instead of a number.
- **Mistake 3:** Overwriting the report with the extraction (using > twice) and losing the full table.
