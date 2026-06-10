# Lab 03: Monitor a Live Log File

**Module:** 02 — File Navigation & Search  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  

---

## 🎯 What You Will Learn
- Use `head -n` to preview the start of a file.
- Use `tail -f` to follow a log file in real time.
- Use `grep -m 1` to capture the first match from a live stream.
- Use `tail -N` to view the last N lines of a file.

---

## 🔥 Scenario
A background service is writing events to `/var/log/service/events.log`. Your job is to monitor the log in real time and capture the moment a `DEPLOY_SUCCESS` event appears.

> **Tip:** Read `/home/intern/README_HINT.txt` for a quick start hint.

---

## 🎯 Your Mission
Complete the following 3 tasks:

1. Preview the first 5 lines of `/var/log/service/events.log`  
   → Save the output to `/home/intern/log_preview.txt` **(30 pts)**

2. Monitor the log with `tail -f` until `DEPLOY_SUCCESS` appears, then capture that line  
   → Save the matching line to `/home/intern/deploy_event.txt` **(40 pts)**

3. After the event has appeared, use `tail -20` to get the last 20 lines of the log  
   → Save the output to `/home/intern/log_tail.txt` **(30 pts)**
