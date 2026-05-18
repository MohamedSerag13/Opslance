# Lab 02: Command Not Found

**Module:** 01 — Linux Fundamentals  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  

---

## 🎯 What You Will Learn
- What `$PATH` is and how Linux locates commands.
- What `.bashrc` does.
- How to create an alias and export variables.

---

## 📖 Background

When you type a command, the shell searches every directory listed in the `$PATH` environment variable in order. `$PATH` is a colon-separated list like `/usr/bin:/usr/local/bin:/bin`. The `which` command tells you exactly which binary will run.

`command not found` simply means the binary isn't in any of those directories.

`.bashrc` is a script that runs every time you open a terminal. We use it to set up aliases (like `alias ll='ls -la'`) and export environment variables (like `export APP_ENV=staging`) so they are available to all child processes.

---

## 🔥 Scenario

A new server was customized by a colleague who then left. Now, several standard commands don't work, a custom script `deploy-check` is unreachable, the `ll` shortcut is gone, and the app is crashing because `APP_ENV` isn't set.

---

## 🎯 Task Description

You need to fix the environment configuration for the `student` user. Specifically, you must modify the `~/.bashrc` file to accomplish the following:

1. **Fix the PATH:** The directory `/usr/local/bin` is missing from the `$PATH` variable. You need to append it to the existing path so that custom scripts like `deploy-check` can be executed from anywhere.
2. **Restore Aliases:** The alias `ll` was accidentally removed. You need to recreate it as an alias for `ls -la` so it is permanently available.
3. **Set Environment Variables:** The application requires the `APP_ENV` variable to be set to `staging`. Export this variable in the `.bashrc` file.
4. **Generate a Report:** Once you have fixed the PATH, write the output of `echo $PATH` (or just ensure it contains `local`) into a file named `path-report.txt` in your home directory (`~`).

---

## ✅ Submission Acceptance Criteria

To successfully complete this lab, your environment will be evaluated against the following criteria:

| # | What is checked | Points |
|---|----------------|--------|
| 1 | `/usr/local/bin` is in the student's PATH | 30% |
| 2 | `ll` alias exists in `.bashrc` | 25% |
| 3 | `APP_ENV` is exported in `.bashrc` with value `staging` | 25% |
| 4 | `path-report.txt` contains the word `local` | 20% |
