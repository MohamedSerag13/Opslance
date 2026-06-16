# Lab 03: Application Cannot Write Logs

**Module:** 03 — File Permissions & Ownership  
**Difficulty:** ⭐⭐ Intermediate  
**Estimated Time:** 15 minutes  
**Points:** 100  

---

## 🎯 What You Will Learn
- How to inspect file ownership and permissions using `ls -l`.
- The difference between permissions and ownership.
- How to change file user and group ownership using `chown` with `sudo`.

---

## 📖 Background

### File Ownership in Linux
Every file and directory in Linux has two ownership attributes:
- **User owner** — the individual user account that owns the file.
- **Group owner** — the group associated with the file.

You can see both by running `ls -l`:
```
-rw-r--r-- 1 root root 0 Jun 15 10:00 app.log
              ^^^^  ^^^^
              user   group
```

### Permissions vs. Ownership
File permissions (`rw-r--r--`) define *what actions* are allowed, but they are evaluated *relative to ownership*:

| Category | Who it applies to |
|---|---|
| **User (u)** | The user owner of the file |
| **Group (g)** | Members of the group owner |
| **Other (o)** | Everyone else |

A file with permissions `644` (`rw-r--r--`) means:
- The **owner** can read and write.
- The **group** and **others** can only read.

So if a file is owned by `root:root` with permissions `644`, only `root` can write to it — even if the file sits inside a directory you own.

### Changing Ownership with `chown`
The `chown` (change owner) command changes the user and/or group owner of a file:
```bash
chown user:group filename
```
Because changing ownership is a privileged operation, you typically need `sudo`:
```bash
sudo chown intern:intern logs/app.log
```

---

## 🔥 Scenario

Your team deployed a small application that writes its output to `~/logs/app.log`. During the deployment, a setup script accidentally created the log file as `root`, so its ownership is `root:root`. Even though the file permissions are `644` (owner can read and write, everyone else can only read), the `intern` user cannot write to it because `intern` is not the owner.

When you try to append a message, you see:
```
$ echo "Application started" >> logs/app.log
bash: logs/app.log: Permission denied
```

---

## 💥 Symptoms
- `echo "Application started" >> logs/app.log` returns `Permission denied`.
- The log file exists but is owned by `root:root`.

---

## 🎯 Your Mission

Investigate why you cannot write to `~/logs/app.log`, fix the ownership so that `intern` owns the file, and then write `Application started` to it.

---

## ✅ Acceptance Criteria
| # | What is checked | Points |
|---|----------------|--------|
| 1 | `/home/intern/logs/app.log` is owned by `intern` | 40% |
| 2 | `/home/intern/logs/app.log` contains the line `Application started` | 60% |

---

## 📚 Command Reference
| Command | What it does |
|---------|-------------|
| `ls -l <file>` | Shows detailed file info including owner, group, permissions, and size |
| `chown user:group <file>` | Change the user and group owner of a file |
| `sudo <command>` | Run a command with superuser privileges |
| `stat <file>` | Display detailed file status including ownership and timestamps |
| `id` | Show the current user's UID, GID, and group memberships |
