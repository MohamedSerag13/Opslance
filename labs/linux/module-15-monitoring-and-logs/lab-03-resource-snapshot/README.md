# Lab resource-snapshot: Capturing Memory and Load with free and uptime

**Module:** 15 — System Monitoring & Logs
**Category:** Linux / monitoring
**Difficulty:** ⭐ Beginner
**Estimated Time:** 10 minutes
**Skills Practiced:** free -m, uptime, load average, health checks

---

## Scenario

Morning standup needs today's health snapshot of the staging box: memory state and the load averages. Produce /home/intern/health-report.txt containing the full output of `free -m` (memory in megabytes) and `uptime` (load averages) — the two commands behind every 'how is the box doing?' conversation.

## Environment

- **Container name:** lab-15-03-resource-snapshot
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-15-03-resource-snapshot bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- Standup asks 'how is staging actually doing?' and nobody has numbers
- The health report file does not exist yet
- The team standard: free -m for memory, uptime for load average

## Your Mission

1. Run each command once to read the output: `free -m` and `uptime`.
2. Capture both into the report: `{ free -m; uptime; } > /home/intern/health-report.txt`.
3. Verify the report contains the Mem: row and the 'load average' line.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — free -m</summary>
Shows total/used/free memory in MEGABYTES (-m). The Mem: row is the one everyone quotes.
</details>

<details>
<summary>Hint 2 — uptime</summary>
The three load averages (1/5/15-minute) appear after &#x27;load average:&#x27; — the quick pulse of CPU pressure.
</details>

<details>
<summary>Hint 3 — Group redirection</summary>
`{ free -m; uptime; } &gt; file` runs both commands and sends their COMBINED output to one file.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `free -m` | Memory usage in megabytes |
| `free -h` | Memory usage, human-readable units |
| `uptime` | Uptime and 1/5/15-min load averages |
| `{ cmd1; cmd2; } > file` | Capture multiple commands into one file |
| `cat file` | Review the report |

## Background Reading

- [free manual](https://man7.org/linux/man-pages/man1/free.1.html)
- [Understanding load average](https://www.brendangregg.com/blog/2017-08-08/linux-load-averages.html)
