# Lab crash-timeline: Correlating Service Crashes in System Logs

**Module:** 15 — System Monitoring & Logs
**Category:** Linux / monitoring
**Difficulty:** ⭐⭐ Intermediate
**Estimated Time:** 20 minutes
**Skills Practiced:** log correlation, grep, awk, systemd log lines, incident timeline

---

## Scenario

orders-api keeps dying on the staging box and the post-mortem needs a timeline. In the extracted system log /var/log/syslog, every crash of the service appears as an 'orders-api[N]: Segmentation fault' line. Count the crashes and timestamp the first one, writing `crash-count=<n>` and `first-crash=<timestamp>` to /home/intern/crash-report.txt.

## Environment

- **Container name:** lab-15-02-crash-timeline
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-15-02-crash-timeline bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- orders-api restarts repeatedly on staging
- /var/log/syslog contains systemd unit failures and the app's own output
- Crashes manifest as 'Segmentation fault' lines from the orders-api process
- The post-mortem needs the crash count and the first crash timestamp

## Your Mission

1. Find the crash lines: `grep 'Segmentation fault' /var/log/syslog`.
2. Confirm they all belong to orders-api.
3. Count them and write `crash-count=<n>` to the report.
4. Extract the first crash's syslog timestamp and write `first-crash=<timestamp>`.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Correlate two log sources</summary>
systemd&#x27;s &#x27;Failed with result&#x27; lines and the app&#x27;s own &#x27;Segmentation fault&#x27; lines tell one story — grep each and compare timestamps.
</details>

<details>
<summary>Hint 2 — Count precisely</summary>
`grep -c &#x27;Segmentation fault&#x27; /var/log/syslog` counts the crashes. Check the preceding lines to confirm the process is orders-api.
</details>

<details>
<summary>Hint 3 — First occurrence</summary>
Syslog is chronological: the first crash is `grep &#x27;Segmentation fault&#x27; /var/log/syslog | head -1`, and its timestamp is the first three fields.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `grep 'Segmentation fault' file` | Find crash lines |
| `grep -B2 pattern file` | Show 2 lines of context BEFORE each match |
| `grep -c pattern file` | Count matches |
| `head -1` | Earliest match in a chronological log |
| `awk '{print $1, $2, $3}'` | Extract the syslog timestamp |

## Background Reading

- [journalctl guide](https://www.loggly.com/ultimate-guide/using-journalctl/)
