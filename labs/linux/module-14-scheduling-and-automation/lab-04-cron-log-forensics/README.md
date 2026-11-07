# Lab cron-log-forensics: Answering 'Did My Cron Job Run?' from Logs

**Module:** 14 — Job Scheduling & Automation
**Category:** Linux / scheduling
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** log analysis, grep, awk timestamps, cron logging

---

## Scenario

The backup script 'ran' all night according to cron, yet this morning's restore attempt failed. Analyse /var/log/cron.log: count how many backup.sh runs FAILED, and record the timestamp of the first failure. Write both answers to /home/intern/cron-report.txt as `failed-backups=<n>` and `first-failure=<timestamp>`.

## Environment

- **Container name:** lab-14-04-cron-log-forensics
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-14-04-cron-log-forensics bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- The nightly restore failed even though cron shows the job ran
- /var/log/cron.log records CMD OK and CMD FAILED lines per run
- Nobody knows how many runs failed or when the failures started
- The incident ticket wants the answers in /home/intern/cron-report.txt

## Your Mission

1. View the log: `cat /var/log/cron.log`.
2. Count failed backup runs: `grep 'CMD FAILED' /var/log/cron.log | grep -c backup.sh`.
3. Find the first failure's timestamp: `grep 'CMD FAILED' /var/log/cron.log | grep backup.sh | head -1` — the first three space-separated fields are the timestamp.
4. Write both lines into the report.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Filter twice</summary>
First select the failure lines (`grep &#x27;CMD FAILED&#x27;`), then narrow to this job (`grep backup.sh`) — combining both in one regex also works: `grep &#x27;CMD FAILED.*backup.sh&#x27;`.
</details>

<details>
<summary>Hint 2 — Timestamps are the first three fields</summary>
Syslog lines start with &#x27;Month Day Time&#x27; — awk &#x27;{print $1, $2, $3}&#x27; extracts it: Jun 16 02:15:02.
</details>

<details>
<summary>Hint 3 — head -1 after sorting by time</summary>
Log lines are chronological, so the first failure is the first matching line.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `grep 'PATTERN' file` | Select matching log lines |
| `grep -c 'PATTERN' file` | Count matching lines |
| `head -1` | First (earliest) match |
| `awk '{print $1, $2, $3}'` | Extract the syslog timestamp |
| `sort | uniq -c` | Count occurrences per value |

## Background Reading

- [cron logging (Debian wiki)](https://wiki.debian.org/Cron)
