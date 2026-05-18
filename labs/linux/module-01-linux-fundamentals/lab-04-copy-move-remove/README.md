# Lab copy-move-remove: Copying, Moving, and Removing Files

**Module:** 01 — Linux Fundamentals
**Category:** Linux / Fundamentals
**Difficulty:** ⭐ Beginner
**Estimated Time:** 10–15 minutes
**Skills Practiced:** mv, cp, rm, mkdir -p, ls, chmod

---

## Scenario

A sysadmin left the server in a messy state before going on leave. Config files are in the wrong directories, old backups clutter the home directory, and a critical config needs to be copied to two locations. You need to clean up and organize the filesystem.

## Environment

- **Container name:** lab-04-copy-move-remove
- **Access:** `docker exec -it lab-04-copy-move-remove bash`
- **Starting point:** You are logged in as user `intern` (with sudo privileges) in `/home/intern`.

## Symptoms

- A file `~/staging.conf` exists but you cannot read or move it (permissions are `000`).
- The directory `/etc/app/` does not exist.
- Three backup files (`backup-2024-01.tar.gz`, `backup-2024-02.tar.gz`, `backup-2024-03.tar.gz`) are cluttering the home directory.
- The directory `/var/app/data` does not exist.

## Your Mission

1. Fix the permissions on `~/staging.conf` so you can work with it.
2. Move `~/staging.conf` to `/etc/app/staging.conf` (create the directory if needed).
3. Copy `/etc/app/staging.conf` to `/etc/app/production.conf`.
4. Remove all files matching `backup-*.tar.gz` from the home directory.
5. Create the directory `/var/app/data`.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Where to look</summary>
Start by listing the files in your home directory with <code>ls -la</code>. Notice the permissions on <code>staging.conf</code>.
</details>

<details>
<summary>Hint 2 — What to check</summary>
You need to change permissions before you can move the file. Use <code>chmod</code> to give yourself read/write access. Then use <code>mkdir -p</code> to create the target directory (the <code>-p</code> flag creates parent directories too).
</details>

<details>
<summary>Hint 3 — The fix</summary>
<pre>
chmod 644 ~/staging.conf
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
| `chmod 644 file` | Set read/write for owner, read for others |
| `mkdir -p /path/to/dir` | Create directory and all parent directories |
| `mv source dest` | Move a file from source to destination |
| `cp source dest` | Copy a file from source to destination |
| `rm file` | Remove a file |
| `rm pattern*` | Remove files matching a glob pattern |
| `ls -la` | List files with detailed permissions |

## Background Reading

- [Linux File Permissions](https://www.linux.com/training-tutorials/understanding-linux-file-permissions/)
- [mkdir Manual Page](https://man7.org/linux/man-pages/man1/mkdir.1.html)
