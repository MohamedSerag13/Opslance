# Lab 02: Command Not Found

**Module:** 01 — Linux Fundamentals  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  

---

## 🎯 What You Will Learn
- What `.bashrc` does.
- How to create an alias and export variables.

---

## 📖 Background
`.bashrc` is a script that runs every time you open a terminal. We use it to set up aliases (like `alias ll='ls -la'`) and export environment variables (like `export APP_ENV=staging`) so they are available to all child processes.

---

## 🔥 Scenario
A colleague customized the server but left several shortcuts broken. The 'll' shortcut is missing, and the application is crashing because a required environment variable is not defined. Fix the shell profile.

---

## 🎯 Task Description
You need to fix the environment configuration for the `intern` user. Specifically, you must modify the `~/.bashrc` file to accomplish the following:

1. **Restore Aliases:** Recreate the `ll` shortcut as an alias for `ls -la` so it is permanently available.
2. **Set Environment Variables:** Export the `APP_ENV` variable to be set to `staging`.

---

## ✅ Submission Acceptance Criteria
| # | What is checked | Points |
|---|----------------|--------|
| 1 | `ll` alias exists in `.bashrc` | 50% |
| 2 | `APP_ENV` is exported in `.bashrc` with value `staging` | 50% |
