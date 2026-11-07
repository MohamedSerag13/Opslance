# Lab 04: Production Troubleshooting Challenge

**Module:** 03 — File Permissions & Ownership  
**Difficulty:** ⭐⭐⭐ Advanced  
**Estimated Time:** 25 minutes  
**Points:** 200  

---

## 🎯 What You Will Learn
- How to inspect file permissions and ownership with `ls -l` and `stat`.
- How to check user context and group memberships using `whoami` and `id`.
- How to change file permissions with `chmod`.
- How to change file owner and group ownership using `chown` with `sudo`.
- How to diagnose and troubleshoot multi-layered permission and ownership issues in a realistic workspace.

---

## 📖 Background

### File Permissions
Every file in Linux has three sets of permissions: **owner**, **group**, and **others**. Each set can have **read** (`r`), **write** (`w`), and **execute** (`x`) permissions. When you run `ls -l`, permissions are displayed as a 10-character string like `-rw-r--r--`:

| Position | Meaning |
|---|---|
| 1 | File type (`-` = file, `d` = directory) |
| 2-4 | Owner permissions (rwx) |
| 5-7 | Group permissions (rwx) |
| 8-10 | Others permissions (rwx) |

Permissions can also be expressed as octal numbers: `r=4`, `w=2`, `x=1`. For example, `644` means `rw-r--r--` (owner can read/write, everyone else can only read), and `600` means `rw-------` (only the owner can read and write).

### File Ownership
Every file has an **owner** and a **group**. Only the owner (or root) can change permissions. To change ownership, you need `sudo` because only root can transfer file ownership. Use `chown user:group file` to set both owner and group at once.

### sudo
The `sudo` command lets you run a command as root (the superuser). You need `sudo` for operations like changing ownership of files you do not own, or modifying permissions on files owned by root.

---

## 🔥 Scenario

A production project has landed on your desk with an urgent ticket: nothing works. The project lives in `/home/intern/project/` and contains three critical components — a configuration file, a backup script, and a data output file. Each one is broken in a different way due to incorrect file permissions and ownership:

1. The configuration file `config/settings.conf` cannot be read.
2. The backup script `scripts/backup.sh` refuses to execute.
3. The data file `data/output.csv` cannot be modified/updated.

---

## 💥 Symptoms
- `cat project/config/settings.conf` returns `Permission denied`.
- `./project/scripts/backup.sh` returns `Permission denied`.
- Trying to write to `project/data/output.csv` returns `Permission denied`.

---

## 🎯 Your Mission

Diagnose each issue, identify the root causes, and apply the correct fixes to restore the project to full operation under `/home/intern/project/`.

---

## ✅ Acceptance Criteria
| # | What is checked | Points |
|---|----------------|--------|
| 1 | `settings.conf` is readable by `intern` | 25% |
| 2 | `backup.sh` is executable | 25% |
| 3 | `backup.sh` outputs `Backup completed successfully` | 25% |
| 4 | `output.csv` is owned by `intern` | 25% |

---

## 📚 Command Reference
| Command | What it does |
|---------|-------------|
| `ls -l` | List files with permissions, ownership, and size |
| `ls -la` | Same as `ls -l` but includes hidden files |
| `chmod <mode> <file>` | Change file permissions (e.g. `chmod +x script.sh`, `chmod 644 file`) |
| `chown <user>:<group> <file>` | Change file owner and group |
| `sudo <command>` | Run a command as root |
| `whoami` | Print the current username |
| `id` | Print user ID, group ID, and group memberships |
| `stat <file>` | Display detailed file status including permissions and ownership |
| `cat <file>` | Display file contents (useful to test read access) |
