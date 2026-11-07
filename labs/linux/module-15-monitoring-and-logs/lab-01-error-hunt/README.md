# Lab error-hunt: Quantifying Errors in an Application Log

**Module:** 15 — System Monitoring & Logs
**Category:** Linux / monitoring
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** grep -c, tail, awk timestamp extraction, log triage

---

## Scenario

Users report intermittent failures on the staging API. Before escalating, the incident template requires two hard numbers from /var/log/app/app.log: how many ERROR lines occurred today, and the exact timestamp of the LAST error. Produce /home/intern/error-report.txt with `error-count=<n>` and `last-error=<YYYY-MM-DD HH:MM:SS>`.

## Environment

- **Container name:** lab-15-01-error-hunt
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-15-01-error-hunt bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- Users report intermittent API failures
- app.log mixes INFO, WARN and ERROR lines
- The incident template demands an error count and the last error's timestamp
- No monitoring dashboard covers this app yet

## Your Mission

1. Survey the log: `grep ERROR /var/log/app/app.log`.
2. Count the errors: `grep -c ERROR /var/log/app/app.log`.
3. Find the last error: `grep ERROR /var/log/app/app.log | tail -1` — the first two fields are the timestamp.
4. Write both lines into the report file.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Count with grep -c</summary>
`grep -c ERROR file` prints only the number of matching lines — exactly the incident template&#x27;s error-count.
</details>

<details>
<summary>Hint 2 — Log lines are chronological</summary>
The LAST error is the last matching line: pipe the matches through `tail -1`.
</details>

<details>
<summary>Hint 3 — Extract the timestamp</summary>
Each line starts &#x27;YYYY-MM-DD HH:MM:SS LEVEL ...&#x27;, so `awk &#x27;{print $1, $2}&#x27;` on that one line gives &#x27;2026-06-17 09:42:11&#x27;.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `grep ERROR file` | Show all error lines |
| `grep -c ERROR file` | Count error lines |
| `tail -1` | The chronologically last match |
| `awk '{print $1, $2}'` | Extract date and time fields |
| `grep ERROR file | tail -1` | The last error line |

## Background Reading

- [grep manual](https://man7.org/linux/man-pages/man1/grep.1.html)
