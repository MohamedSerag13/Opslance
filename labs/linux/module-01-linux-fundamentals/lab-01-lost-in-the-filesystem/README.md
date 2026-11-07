# Lab 01: Lost in the Filesystem

**Module:** 01 — Linux Fundamentals  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  

---

## 🎯 What You Will Learn
- What the shell prompt tells you.
- Determine your location with `pwd`.
- Navigate using absolute and relative paths.

---

## 📖 Background

**What is Linux?** It's an operating system kernel that powers servers, phones, and most of the internet. A **distribution** (like Ubuntu, Debian, RHEL, or Alpine) is just different packaging around the same core Linux kernel.

When you open a terminal, you see a prompt like `intern@hostname:~$`. This means you are logged in as the user `intern` on the machine `hostname`, and your current directory is `~`. The tilde (`~`) is a universal shortcut for your home directory (usually `/home/intern`).

The Linux filesystem is a tree. The very top is `/` (the root). Everything hangs off it:
- `/home` (user files)
- `/etc` (config files)
- `/var` (logs and runtime data)
- `/tmp` (temporary files)
- `/usr` (programs)

An **absolute path** starts from `/` and works from anywhere (e.g. `/home/intern/file.txt`). A **relative path** starts from where you are right now (e.g. `../file.txt`).

---

## 🔥 Scenario

A junior developer was exploring the filesystem and got lost. They were somewhere deep in the directory tree and ran `cd /` by accident. Now they can't find their way back to their home directory where their work file `mission.txt` is waiting.

---

## 💥 Symptoms
- You are not in your home directory.
- You do not know where `mission.txt` is.

---

## 🎯 Your Mission

Navigate back to your home directory, read `mission.txt`, and complete all the tasks requested inside it.

---

## ✅ Acceptance Criteria
| # | What is checked | Points |
|---|----------------|--------|
| 1 | /home/intern/found.txt exists and contains target text | 35% |
| 2 | /home/intern/etc-count.txt exists and is not empty | 35% |
| 3 | /home/intern/projects/alpha/beta/gamma/visited.txt exists | 30% |

---

## 📚 Command Reference
| Command | What it does |
|---------|-------------|
| `pwd` | Print working directory |
| `ls -la` | List files including hidden |
| `cd ~` | Go home |
| `cd ..` | Go up one directory |
