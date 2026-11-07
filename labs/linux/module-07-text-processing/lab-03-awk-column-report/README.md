# Lab awk-column-report: Column Arithmetic and Reports with awk

**Module:** 07 — Text Processing & Pipelines
**Category:** Linux / text-processing
**Difficulty:** ⭐⭐ Intermediate
**Estimated Time:** 20 minutes
**Skills Practiced:** awk, awk -F, NR, sum columns, printf

---

## Scenario

Finance dropped /var/log/app/sales.csv on the ops box and needs two numbers for the weekly call: the total revenue and the number of sales rows (the header line does not count). There is no spreadsheet software on the server — but awk was literally built for exactly this job.

## Environment

- **Container name:** lab-07-03-awk-column-report
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-07-03-awk-column-report bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- sales.csv has a header line that must not be counted or summed
- The amount is the third comma-separated column
- The report must be machine-readable: total=… and rows=… lines
- The finance team needs the total formatted with exactly two decimals

## Your Mission

1. Look at the file first: `head -3 /var/log/app/sales.csv`.
2. Sum column 3 while skipping the header: `awk -F, 'NR>1 {s+=$3} END {printf "total=%.2f\n", s}'`.
3. Count the data rows: `awk 'END {print NR-1}'` or `tail -n +2 | wc -l`.
4. Write both lines into `/home/intern/sales-total.txt`.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Choose a field separator</summary>
`awk -F,` splits each line on commas, so $1 is the date, $2 the region and $3 the amount.
</details>

<details>
<summary>Hint 2 — Skip the header</summary>
`NR&gt;1` is true from the second record on — the header never enters the sum.
</details>

<details>
<summary>Hint 3 — Accumulate and print at END</summary>
The pattern `{s+=$3}` accumulates; the `END {…}` block runs after the last line and prints the result. Use `printf &quot;%.2f&quot;` for two decimals.
</details>

<details>
<summary>Hint 4 — Row count</summary>
NR is the number of records seen, so `END {print NR-1}` is the data-row count (header excluded).
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `awk -F, '{print $3}' file` | Print the third comma-separated field |
| `awk '{s+=$1} END {print s}' file` | Sum the first column |
| `awk 'END {print NR}' file` | Print the record (line) count |
| `printf "%.2f\n" value` | Format a number with two decimals |
| `tail -n +2 file` | Skip the first line |

## Background Reading

- [awk manual](https://man7.org/linux/man-pages/man1/awk.1.html)
- [GNU awk user guide](https://www.gnu.org/software/gawk/manual/gawk.html)
