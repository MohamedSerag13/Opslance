# Lab 05: Wildcards and Globbing

**Module:** 01 — Linux Fundamentals  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  

---

## 🎯 What You Will Learn
- Match patterns using wildcards (`*`, `?`, `[ ]`).
- Perform batch file movements with wildcards.
- Clean up files using pattern matching.

---

## 🔥 Scenario
A messy automated backup tool dumped hundreds of mixed files into `/home/intern/inbox/`. We have logs, reports, meeting notes, and temporary `.tmp` cache files all in one place. Your job is to structure this directories!

---

## 🎯 Your Mission
1. Create directories: `/home/intern/logs`, `/home/intern/reports`, and `/home/intern/notes`.
2. Move all log files starting with `log-` into `/home/intern/logs`.
3. Move all report files starting with `report-` into `/home/intern/reports`.
4. Move all note files starting with `note-` into `/home/intern/notes`.
5. Delete all temporary files (ending in `.tmp`) inside `/home/intern/inbox`.
