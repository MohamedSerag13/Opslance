# Lab log-report: Building a Traffic Report with grep, sort and uniq

**Module:** 07 — Text Processing & Pipelines
**Category:** Linux / text-processing
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** grep, wc, sort, uniq, awk, pipes

---

## Scenario

The monitoring dashboard is down, but the product team needs traffic numbers right now for the staging API. The raw access log is at /var/log/app/access.log. Everything they asked for can be answered by chaining small text tools — the classic Unix way — and writing the answers into a report file.

## Environment

- **Container name:** lab-07-01-log-report
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-07-01-log-report bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- The dashboard is unavailable, so numbers must be pulled from raw logs
- /var/log/app/access.log holds one line per HTTP request
- The product team wants: total requests, how many were 404s, and the noisiest client IP
- The answers must land in /home/intern/report.txt in key=value form

## Your Mission

1. Count every line of the log: `wc -l /var/log/app/access.log`.
2. Count only the 404 responses: `grep -c ' 404 ' /var/log/app/access.log`.
3. Find the noisiest client IP: `awk '{print $1}' ... | sort | uniq -c | sort -rn | head -1`.
4. Write the three answers to `/home/intern/report.txt` as `total=…`, `errors_404=…`, `top_client=…` lines.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Count lines</summary>
`wc -l` counts lines. The report format is total=&lt;number&gt;, e.g. total=42.
</details>

<details>
<summary>Hint 2 — Filter then count</summary>
`grep -c &#x27; 404 &#x27;` prints only a count of matching lines. The status is surrounded by spaces in the log, which keeps the match exact.
</details>

<details>
<summary>Hint 3 — Top talker pipeline</summary>
`awk &#x27;{print $1}&#x27;` takes the first column (the IP). Piping through `sort | uniq -c | sort -rn | head -1` yields the most frequent one. Prefix the report line as top_client=&lt;ip&gt;.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `wc -l file` | Count lines in a file |
| `grep -c 'PATTERN' file` | Count matching lines |
| `awk '{print $1}' file` | Print the first column of every line |
| `sort | uniq -c | sort -rn` | Count occurrences and sort most-frequent first |
| `head -1` | Keep only the first line |

## Background Reading

- [grep manual](https://man7.org/linux/man-pages/man1/grep.1.html)
- [sort manual](https://man7.org/linux/man-pages/man1/sort.1.html)
- [awk manual](https://man7.org/linux/man-pages/man1/awk.1.html)
