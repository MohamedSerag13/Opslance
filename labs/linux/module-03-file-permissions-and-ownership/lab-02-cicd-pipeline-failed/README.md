# Lab 02: CI/CD Pipeline Failed

**Module:** 03 — File Permissions & Ownership  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  

---

## 🎯 What You Will Learn
- How to read file permissions with `ls -l`.
- What the execute (`x`) permission bit means.
- How to add executable permissions with `chmod`.

---

## 📖 Background

Every file in Linux has three sets of permission bits: **read** (`r`), **write** (`w`), and **execute** (`x`). These are assigned to three categories: the **owner**, the **group**, and **others**. You can see them by running `ls -l`:

```
-rw-r--r--  1 intern intern  42 Jun 15 08:00 deploy.sh
```

The first column (`-rw-r--r--`) shows the permissions. The first character is the file type (`-` for a regular file, `d` for a directory). The next nine characters are three groups of `rwx`:
- **Owner** (`rw-`): can read and write, but **not** execute.
- **Group** (`r--`): can only read.
- **Others** (`r--`): can only read.

The **execute bit** (`x`) tells Linux whether a file can be run as a program. A shell script like `deploy.sh` might have the correct `#!/bin/bash` shebang line and valid code inside, but if the execute bit is not set, running `./deploy.sh` will fail with `Permission denied`.

To add the execute permission, you use the `chmod` command:
```bash
chmod +x deploy.sh      # adds execute for owner, group, and others
chmod u+x deploy.sh     # adds execute for the owner only
```

---

## 🔥 Scenario

The CI/CD pipeline calls a deploy script that was working fine yesterday, but today the deployment stage fails immediately. The `deploy.sh` script is still on the server but it refuses to run.

---

## 💥 Symptoms
- `./deploy.sh` returns `Permission denied`.
- The script file exists but cannot be executed.

---

## 🎯 Your Mission

Investigate why `deploy.sh` cannot run, fix the permissions, and execute it successfully to see the deployment message.

---

## ✅ Acceptance Criteria
| # | What is checked | Points |
|---|----------------|--------|
| 1 | deploy.sh is executable | 40% |
| 2 | Running deploy.sh outputs 'Deploying application...' | 60% |

---

## 📚 Command Reference
| Command | What it does |
|---------|-------------|
| `ls -l` | List files with permissions, ownership, and size |
| `chmod +x file` | Add execute permission to a file |
| `file deploy.sh` | Show the file type (e.g. Bash script) |
| `bash deploy.sh` | Run a script using bash directly (bypasses execute bit) |
