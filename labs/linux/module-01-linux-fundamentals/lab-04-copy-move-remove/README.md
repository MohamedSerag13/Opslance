# Lab copy-move-remove: Copying, Moving, and Removing Files

**Module:** 01 — Linux Fundamentals
**Category:** Linux / Fundamentals
**Difficulty:** ⭐ Beginner
**Estimated Time:** 10–15 minutes
**Skills Practiced:** mv, cp, rm, mkdir -p, ls

---

## Scenario

A sysadmin left the server in a messy state before going on leave. Config files are in the wrong directories, old backups clutter the home directory, and a critical config needs to be copied to two locations. You need to clean up and organize the filesystem.

## Environment

- **Container name:** lab-04-copy-move-remove
- **Access:** `docker exec -it lab-04-copy-move-remove bash`
- **Starting point:** You are logged in as user `intern` (with sudo privileges) in `/home/intern`.

## Symptoms

- A file `~/staging.conf` exists in your home directory but is in the wrong place.
- The directory `/etc/app/` does not exist.
- Three backup files (`backup-2024-01.tar.gz`, `backup-2024-02.tar.gz`, `backup-2024-03.tar.gz`) are cluttering the home directory.
- The directory `/var/app/data` does not exist.

## Your Mission

1. Move `~/staging.conf` to `/etc/app/staging.conf` (create the directory if needed).
2. Copy `/etc/app/staging.conf` to `/etc/app/production.conf`.
3. Remove all files matching `backup-*.tar.gz` from the home directory.
4. Create the directory `/var/app/data`.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Where to look</summary>
Start by listing the files in your home directory with <code>ls -l</code> to find <code>staging.conf</code> and the backup files.
</details>

<details>
<summary>Hint 2 — What to check</summary>
Use <code>mkdir -p</code> to create the target directory `/etc/app` (the <code>-p</code> flag creates parent directories too). Then use <code>mv</code> to move <code>staging.conf</code> there.
</details>

<details>
<summary>Hint 3 — The fix</summary>
<pre>
sudo mkdir -p /etc/app
mv ~/staging.conf /etc/app/staging.conf
cp /etc/app/staging.conf /etc/app/production.conf
rm ~/backup-*.tar.gz
sudo mkdir -p /var/app/data
</pre>
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `mkdir -p /path/to/dir` | Create directory and all parent directories |
| `mv source dest` | Move a file from source to destination |
| `cp source dest` | Copy a file from source to destination |
| `rm file` | Remove a file |
| `rm pattern*` | Remove files matching a glob pattern |
| `ls -l` | List files in a directory |

## Background Reading

- [mkdir Manual Page](https://man7.org/linux/man-pages/man1/mkdir.1.html)
