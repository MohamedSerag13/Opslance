# Lab date-stamped-backup: Date-Stamped Backups with Command Substitution

**Module:** 10 — Archiving & Compression
**Category:** Linux / archiving
**Difficulty:** ⭐⭐ Intermediate
**Estimated Time:** 20 minutes
**Skills Practiced:** date +%F, command substitution $(), tar czf, mkdir -p

---

## Scenario

The retention policy requires every config backup to be named etc-YYYY-MM-DD.tar.gz (today's real date) under /tmp/backups, so old backups sort chronologically and a rotation script can purge them. Yesterday's backup was named 'backup-final-final.tar.gz' and was rejected. Archive /etc/app with the date embedded via command substitution.

## Environment

- **Container name:** lab-10-04-date-stamped-backup
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-10-04-date-stamped-backup bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- /tmp/backups does not exist yet
- No backup of /etc/app exists at all
- The naming convention etc-YYYY-MM-DD.tar.gz is not negotiable — the rotation script globs it
- The archive must be gzip-compressed

## Your Mission

1. Check today's date format: `date +%F` prints YYYY-MM-DD.
2. Create the backup directory: `mkdir -p /tmp/backups`.
3. Create the archive: `sudo tar -czf /tmp/backups/etc-$(date +%F).tar.gz /etc/app`.
4. Verify: list /tmp/backups and test the archive with `tar -tzf`.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — date +%F</summary>
`date +%F` prints the current date as YYYY-MM-DD — exactly the convention the rotation script expects.
</details>

<details>
<summary>Hint 2 — Command substitution</summary>
`$(command)` runs the command and pastes its output into the surrounding line — that is how today&#x27;s date lands in the filename.
</details>

<details>
<summary>Hint 3 — Quotes matter</summary>
Put quotes around the path but NOT around the substitution: `tar -czf &quot;/tmp/backups/etc-$(date +%F).tar.gz&quot;` — quoted &#x27;$(date)&#x27; would stay literal text.
</details>

<details>
<summary>Hint 4 — Verify the name</summary>
`ls /tmp/backups/` must show etc-2026-06-17-style naming matching TODAY&#x27;s date.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `date +%F` | Print today's date as YYYY-MM-DD |
| `$(command)` | Command substitution — paste a command's output into a line |
| `mkdir -p /tmp/backups` | Create the backup directory |
| `tar -czf out.tar.gz /etc/app` | Archive and compress a config directory |
| `ls -lh /tmp/backups` | Confirm the date-stamped filename |

## Background Reading

- [date manual](https://man7.org/linux/man-pages/man1/date.1.html)
- [Bash command substitution](https://www.gnu.org/software/bash/manual/html_node/Command-Substitution.html)
