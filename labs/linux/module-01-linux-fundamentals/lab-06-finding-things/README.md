# Lab 06: Finding Things

**Module:** 01 — Linux Fundamentals  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  

---

## 🎯 What You Will Learn
- Use `find` to locate files by name, type, and size.
- Locate executables using `which` or `type`.
- Save absolute paths to text files.

---

## 🔥 Scenario
The server has several files scattered about: a legacy application config file in `/etc`, an orphaned log file larger than 50KB in `/var/log`, and a shell utility script in `/opt`. You need to find them and save their paths.

---

## 🎯 Your Mission
Locate:
1. `custom_app.conf` under `/etc` -> Save path to `/home/intern/found_config.txt`
2. An orphaned log file in `/var/log` that is larger than 50KB -> Save path to `/home/intern/found_largelog.txt`
3. A helper script `helper.sh` under `/opt` -> Save path to `/home/intern/found_script.txt`
4. The `bash` executable -> Save path to `/home/intern/bash_location.txt`
