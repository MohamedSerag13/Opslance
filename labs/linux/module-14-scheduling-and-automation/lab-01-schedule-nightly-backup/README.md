# Lab schedule-nightly-backup: Writing a /etc/cron.d Scheduled Job

**Module:** 14 — Job Scheduling & Automation
**Category:** Linux / scheduling
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** cron syntax, /etc/cron.d, crontab fields, scheduling

---

## Scenario

The ops runbook requires nightly configuration backups at 02:00. The backup script itself is ready at /usr/local/bin/backup.sh — what is missing is the schedule. Create /etc/cron.d/nightly-backup with a valid cron entry that runs the script as root every day at 02:00. Remember: /etc/cron.d files need the username field that plain crontabs don't have.

## Environment

- **Container name:** lab-14-01-schedule-nightly-backup
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-14-01-schedule-nightly-backup bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- /usr/local/bin/backup.sh exists but never runs
- No cron file references the backup script
- The runbook requires 02:00 nightly, as root
- The job must live in /etc/cron.d/nightly-backup (config-managed, survives reboots)

## Your Mission

1. Review the script the schedule will call: `cat /usr/local/bin/backup.sh`.
2. Create the file: `sudo tee /etc/cron.d/nightly-backup` with a comment and the schedule line.
3. The line must read: `0 2 * * * root /usr/local/bin/backup.sh`.
4. Verify the fields: `awk '!/^#/ && NF>0 {print NF}' /etc/cron.d/nightly-backup` prints 7 (5 time fields + username + command).

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — The five time fields</summary>
minute hour day-of-month month day-of-week — `0 2 * * *` means 02:00 every day. Stars mean &#x27;every&#x27;.
</details>

<details>
<summary>Hint 2 — cron.d needs a username</summary>
Unlike a personal crontab, every /etc/cron.d line names the USER the job runs as, right after the schedule: `0 2 * * * root /usr/local/bin/backup.sh` — seven fields total (5 time fields + username + command).
</details>

<details>
<summary>Hint 3 — tee for root files</summary>
`echo ... | sudo tee /etc/cron.d/nightly-backup` writes a root-owned file from your shell.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `min hour dom mon dow` | The five cron time fields |
| `0 2 * * *` | Every day at 02:00 |
| `sudo tee /etc/cron.d/file` | Write a root-owned cron file |
| `awk '!/^#/ && NF>0 {print NF}'` | Field-count check for cron.d lines |
| `cat /etc/cron.d/file` | Review the final entry |

## Background Reading

- [cron manual](https://man7.org/linux/man-pages/man8/cron.8.html)
- [crontab format](https://man7.org/linux/man-pages/man5/crontab.5.html)
