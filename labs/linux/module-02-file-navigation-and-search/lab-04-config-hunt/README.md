# Lab 04: The Config Hunt (Capstone)

**Module:** 02 — File Navigation & Search  
**Difficulty:** ⭐⭐ Intermediate  
**Estimated Time:** 20 minutes  
**Points:** 100  

---

## 🎯 What You Will Learn
- Use `find` to locate config files by pattern.
- Use `grep` to extract specific values from config files.
- Use `grep -c` to count occurrences in log files.
- Use `tail` to capture the last N lines of a log.
- Combine `find`, `grep`, `head`, and `tail` in real-world scenarios.

---

## 🔥 Scenario
A new server has been handed to you. No documentation. You need to locate all config files, read critical values out of them using `grep`, and compile a report — combining `find`, `grep`, `head`, and `tail` together.

---

## 🎯 Your Mission
Complete the following 4 tasks:

1. Find all `.conf` files under `/etc/myapp/`  
   → Save their full paths to `/home/intern/conf_files.txt`

2. Extract the line containing `DB_HOST` from any conf file under `/etc/myapp/`  
   → Save the full matching line to `/home/intern/db_host.txt`

3. Count how many lines contain `ERROR` in `/opt/myapp/app.log`  
   → Save the **count only** to `/home/intern/error_count.txt`

4. Show the last 10 lines of `/opt/myapp/deploy.log`  
   → Save to `/home/intern/deploy_tail.txt`
