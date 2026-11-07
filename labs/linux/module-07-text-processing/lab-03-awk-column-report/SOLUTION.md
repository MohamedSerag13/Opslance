# Solution: Column Arithmetic and Reports with awk

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

Not a fault but a data extraction task. The traps are the header row (it must not be summed or counted), the comma separator (awk defaults to whitespace) and presentation (finance wants two decimals, not floating-point noise). awk handles all three in one short program.

## Step-by-Step Fix

### Step 1: Inspect the data

Always look before you compute — confirm the header and the column order:

```bash
head -3 /var/log/app/sales.csv
```

### Step 2: Sum the amount column

-F, selects comma as the separator, NR>1 skips the header, and the END block prints the accumulated sum with two decimals:

```bash
awk -F, 'NR>1 {s+=$3} END {printf "total=%.2f\n", s}' /var/log/app/sales.csv > /home/intern/sales-total.txt
```

### Step 3: Count the data rows

NR counts every record, so subtract one for the header:

```bash
echo "rows=$(awk 'END {print NR-1}' /var/log/app/sales.csv)" >> /home/intern/sales-total.txt
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Sales Totals with awk ===

✅ PASS [20%]: /home/intern/sales-total.txt exists
✅ PASS [45%]: report states total=3373.51
✅ PASS [35%]: report states rows=20

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

awk is the most underrated tool in the junior toolbox. Anything that lives in columns — logs, CSVs, vmstat output, docker stats — can be aggregated with a one-liner instead of a spreadsheet. The pattern/action model (NR>1 {…} END {…}) is also your first taste of real programming in the shell.

## Common Mistakes

- **Mistake 1:** Forgetting -F, so awk splits on whitespace and $3 is empty — the total silently comes out as 0.
- **Mistake 2:** Summing with NR>0, which adds the word 'amount' (treated as 0) but keeps the row count off by one.
- **Mistake 3:** Printing with `print s` and getting 4589.75 or 4589.749 depending on accumulation order instead of using printf for a fixed format.
