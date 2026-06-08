# Lab 07: Links Hard and Soft

**Module:** 01 — Linux Fundamentals  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  

---

## 🎯 What You Will Learn
- The differences between Symbolic (soft) and Hard links.
- Create soft links to point directories or files.
- Create hard links that share direct filesystem inodes.

---

## 🔥 Scenario
An application is deployed inside `/home/intern/releases/` with `v1.0` and `v2.0` directory trees. To implement zero-downtime upgrades, we will point a symbolic link named `current` to `releases/v2.0`. In addition, we need a hard-link backup of `v1.0/app.conf`.

---

## 🎯 Your Mission
1. Create a soft/symbolic link named `current` inside your home directory that points to `/home/intern/releases/v2.0/`.
2. Create a hard link named `app.conf.bak` inside `/home/intern/releases/v1.0/` that links directly to `/home/intern/releases/v1.0/app.conf`.
