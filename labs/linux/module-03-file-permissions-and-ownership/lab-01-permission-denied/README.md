# Lab 01: Permission Denied

**Module:** 03 — File Permissions & Ownership  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  

---

## 🎯 What You Will Learn
- How to read permission bits using `ls -l`
- What the `rwx` notation means for owner, group, and others
- How to change file permissions using `chmod`

---

## 📖 Background
Every file on a Linux system has three sets of permissions — **read (r)**, **write (w)**, and **execute (x)** — applied to three categories: the file **owner**, the **group**, and **others**. When a permission is removed, the corresponding action is denied by the kernel, regardless of whether the user owns the file. The `ls -l` command displays these permission bits, and `chmod` is used to modify them.

---

## 🔥 Scenario
An intern saved important notes in `secret.txt`, but someone accidentally ran `chmod 000` on the file. Now every attempt to read it fails with **"Permission denied"**. You need to inspect the current permission bits and restore read access so the file can be viewed again.

---

## 💥 Symptoms
- `cat secret.txt` returns **Permission denied**
- The file exists but cannot be read

---

## 🎯 Your Mission
Run `cat secret.txt` and observe the Permission denied error. Use `ls -l` to inspect the permission bits, understand the `rwx` notation, then use `chmod` to restore read access to the file.

---

## ✅ Acceptance Criteria
| # | What is checked | Points |
|---|----------------|--------|
| 1 | `secret.txt` has read permission for the owner | 50% |
| 2 | `cat secret.txt` outputs `Secret Data` | 50% |

---

## 📚 Command Reference
| Command | What it does |
|---------|-------------|
| `ls -l <file>` | Shows detailed file info including permission bits |
| `stat <file>` | Displays file status including octal permissions |
| `chmod <mode> <file>` | Changes file permissions (e.g. `chmod 644 file`) |
| `chmod u+r <file>` | Adds read permission for the owner (symbolic mode) |
| `cat <file>` | Displays the contents of a file |
