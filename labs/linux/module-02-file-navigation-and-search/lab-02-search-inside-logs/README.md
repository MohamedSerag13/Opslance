# Lab 02: Search Inside Logs for Errors

**Module:** 02 — File Navigation & Search  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  

---

## 🎯 What You Will Learn
- Use `grep` to search for patterns inside files.
- Use `grep -i` for case-insensitive searches.
- Use `grep -c` to count matching lines.
- Use `grep -r` to search recursively across directories.
- Redirect grep output to files.

---

## 🔥 Scenario
A web application has been misbehaving. Its logs are stored across multiple files in `/var/log/webapp/`. You need to hunt down errors and warnings using `grep`, count their occurrences, and save your findings.

---

## 🎯 Your Mission
Complete the following 4 tasks:

1. Find all lines containing `ERROR` (case-sensitive) in `/var/log/webapp/error.log`  
   → Save matching lines to `/home/intern/errors.txt`

2. Count the number of lines containing `WARNING` in `/var/log/webapp/error.log`  
   → Save the **number only** to `/home/intern/warning_count.txt`

3. Search recursively for the word `error` (case-insensitive) across **all files** in `/var/log/webapp/`  
   → Save all matching lines to `/home/intern/all_errors.txt`

4. Find all lines containing `500` in `/var/log/webapp/access.log`  
   → Save matching lines to `/home/intern/server_errors.txt`
