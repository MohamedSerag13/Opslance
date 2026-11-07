# Lab 08: Disk Space Detective

**Module:** 01 — Linux Fundamentals  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  

---

## 🎯 What You Will Learn
- Check partition usage with `df`.
- Analyze file/directory sizing with `du`.
- Find files matching sizes and sort findings.

---

## 🔥 Scenario
The server partition space is running low. You need to analyze the `/home/intern/data` folder to pinpoint the highest disk-consuming directory and the single largest file, and print partition layout details.

---

## 🎯 Your Mission
1. Run `df` and write standard layout information to `/home/intern/df_output.txt`.
2. Identify the directory in `/home/intern/data/` that consumes the most disk space. Write its name (e.g. `backups`) inside `/home/intern/disk_report.txt`.
3. Locate the single largest file in `/home/intern/data/` and write its absolute path to `/home/intern/largest_file.txt`.
