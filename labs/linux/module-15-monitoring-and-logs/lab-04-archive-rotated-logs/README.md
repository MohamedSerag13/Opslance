# Lab archive-rotated-logs: Compressing and Archiving Rotated Logs

**Module:** 15 — System Monitoring & Logs
**Category:** Linux / monitoring
**Difficulty:** ⭐⭐ Intermediate
**Estimated Time:** 20 minutes
**Skills Practiced:** gzip, for loops, mv, log hygiene, wildcards

---

## Scenario

The app's rotated logs (app.log.1 through app.log.7) are eating space in /var/log/app and this host has no logrotate config yet. Compress each rotated log with gzip, then move the .gz files into /var/log/app/archive/ (create the directory). The ACTIVE app.log must stay exactly where it is, uncompressed.

## Environment

- **Container name:** lab-15-04-archive-rotated-logs
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-15-04-archive-rotated-logs bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- /var/log/app holds the active app.log plus seven rotated logs
- The rotated logs are uncompressed and waste space
- The house convention: compressed logs live in /var/log/app/archive/
- The active app.log must never be compressed or moved

## Your Mission

1. Survey: `ls -la /var/log/app/`.
2. Create the archive directory: `sudo mkdir -p /var/log/app/archive`.
3. Compress the rotated logs in place: `cd /var/log/app && for f in app.log.[0-9]; do sudo gzip "$f"; done`.
4. Move the results: `sudo mv /var/log/app/app.log.*.gz /var/log/app/archive/`.
5. Verify: 7 .gz files in archive/, zero app.log.N in /var/log/app, app.log still present.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Match the rotated set precisely</summary>
The glob `app.log.[0-9]` matches app.log.1-7 but NOT the active app.log — that precision is the whole game.
</details>

<details>
<summary>Hint 2 — gzip in place</summary>
`gzip file` replaces the file with file.gz — no extra cleanup needed before the mv.
</details>

<details>
<summary>Hint 3 — Wildcard the move</summary>
After gzip, `app.log.*.gz` matches exactly the seven archives; move them into the archive directory in one mv.
</details>

<details>
<summary>Hint 4 — Why the [0-9] matters</summary>
`app.log.*` would ALSO match the active log — one careless glob and the live log is compressed mid-write.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `gzip file` | Compress a file in place (adds .gz) |
| `for f in app.log.[0-9]; do ...; done` | Loop over exactly the rotated set |
| `mv *.gz dest/` | Move all archives at once |
| `ls -la dir` | Verify before/after state |
| `find dir -name pattern | wc -l` | Count matches precisely |

## Background Reading

- [gzip manual](https://man7.org/linux/man-pages/man1/gzip.1.html)
- [logrotate (the proper tool)](https://man7.org/linux/man-pages/man8/logrotate.8.html)
