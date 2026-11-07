# Lab fix-broken-crontab: Debugging Invalid cron.d Syntax

**Module:** 14 — Job Scheduling & Automation
**Category:** Linux / scheduling
**Difficulty:** ⭐⭐ Intermediate
**Estimated Time:** 20 minutes
**Skills Practiced:** cron syntax debugging, /etc/cron.d, field validation, awk

---

## Scenario

Two scheduled jobs on this box have never fired, and syslog shows cron discarding their lines as malformed. /etc/cron.d/nightly-report has a line with SEVEN fields (an extra '*' someone pasted in) and a cleanup line using the nonsense step '*/0'. Repair both lines to the runbook targets: the report job at 03:30 daily and the cleanup job at 05:15 daily, both as root.

## Environment

- **Container name:** lab-14-02-fix-broken-crontab
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-14-02-fix-broken-crontab bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- Neither send-report.sh nor cleanup-temp.sh has ever run
- The first active line of /etc/cron.d/nightly-report has 7 fields
- The second line uses an invalid '*/0' step value
- cron logs warn about malformed lines every time it reloads

## Your Mission

1. Read the broken file: `cat /etc/cron.d/nightly-report`.
2. Count fields to see the damage: `awk '!/^#/ && NF>0 {print NF}' /etc/cron.d/nightly-report`.
3. Fix line 1: remove the extra field so it reads `30 3 * * * root /usr/local/bin/send-report.sh`.
4. Fix line 2: replace the bad schedule with `15 5 * * * root /usr/local/bin/cleanup-temp.sh`.
5. Re-run the field count — every active line must print 6.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Eight fields is one too many</summary>
/etc/cron.d lines have exactly seven: five time fields, the username, then the command. The broken line has EIGHT — an extra &#x27;*&#x27; shifts everything and cron reads a wrong username.
</details>

<details>
<summary>Hint 2 — Step values can&#x27;t be zero</summary>
`*/0` means &#x27;every 0 minutes&#x27; — undefined. Valid steps look like */5, */15, */10. Here the runbook simply wants a fixed time: 15 5 * * *.
</details>

<details>
<summary>Hint 3 — Rewrite the whole file</summary>
With only two active lines, the safest fix is rewriting the file cleanly with sudo tee rather than surgical seds.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `cat /etc/cron.d/file` | Read the broken schedule |
| `awk '!/^#/ && NF>0 {print NF}' file` | Field count per active line |
| `sudo tee /etc/cron.d/file` | Rewrite the file cleanly |
| `grep -n '*' /etc/cron.d/file` | Spot suspicious schedule fields |

## Background Reading

- [crontab format](https://man7.org/linux/man-pages/man5/crontab.5.html)
