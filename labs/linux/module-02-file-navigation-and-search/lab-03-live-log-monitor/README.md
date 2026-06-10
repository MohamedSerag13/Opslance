# Lab 03: Monitoring a Live Service Log

**Module:** 02 — File Navigation & Search
**Difficulty:** ⭐⭐ Beginner+
**Estimated Time:** 15 minutes
**Points:** 100

---

## Scenario

A deployment pipeline is running on this server. A background service writes timestamped events to `/var/log/service/events.log` every few seconds as the deployment progresses through its stages. The platform team needs confirmation that the current deployment completed successfully — specifically, they need the `DEPLOY_SUCCESS` event captured the moment it appears.

Before monitoring the live stream, you should preview the log to understand its format and confirm the file is being written to. After the event is captured, you will take a snapshot of the most recent entries so the team has a record of what followed the deployment.

This is a common real-world task: operations engineers regularly tail logs during deployments to verify services come up cleanly. The skills you practice here apply directly to monitoring application restarts, database migrations, and CI/CD pipelines.

> **Note:** The log file is being written to continuously by a background process. Events appear every few seconds. The `DEPLOY_SUCCESS` event will appear within approximately 30 seconds of starting the lab. Do not close the terminal while waiting.

---

## Learning Objectives

By completing this lab, you will learn how to:

- Use `head -n` to preview the beginning of a file
- Use `tail -N` to view the last N lines of a file
- Use `tail -f` to follow a file and see new lines as they are written
- Use `grep -m 1` combined with `tail -f` to capture the first occurrence of a pattern and stop automatically
- Understand the difference between static file reading and live log following

---

## Mission

| Task | Save result to | Points |
|---|---|---|
| Preview first 5 lines of `/var/log/service/events.log` | `~/log_preview.txt` | 30 |
| Capture the `DEPLOY_SUCCESS` line the moment it appears | `~/deploy_event.txt` | 40 |
| Capture last 20 lines of the log after the event | `~/log_tail.txt` | 30 |

---

## Requirements

### Task 1 — Preview the log file structure

Before monitoring anything live, preview the log file to understand its structure. Read only the first 5 lines so you can see the format of each event entry.

File:
```
/var/log/service/events.log
```

Save the first 5 lines to:
```
~/log_preview.txt
```

---

### Task 2 — Capture the deployment success event (40 pts)

Monitor the log file in real time and capture the exact line containing `DEPLOY_SUCCESS` the moment it appears. The saved file must contain that line for the check to pass. This is the most critical task — it confirms the deployment completed without errors.

File to monitor:
```
/var/log/service/events.log
```

Pattern to capture: `DEPLOY_SUCCESS`

Save the matching line to:
```
~/deploy_event.txt
```

> **Tip:** Using `grep -m 1 'DEPLOY_SUCCESS' <(tail -f /var/log/service/events.log)` will automatically stop as soon as the first match is found and save it, so you do not need to watch the screen and press `Ctrl+C` manually.

---

### Task 3 — Snapshot the most recent log entries

After the deploy event has appeared, take a snapshot of the last 20 lines of the log. This gives the team a record of what happened in the moments following the deployment — including any post-deploy checks or warnings that were emitted.

File:
```
/var/log/service/events.log
```

Save the last 20 lines to:
```
~/log_tail.txt
```

---

## Hints

1. **Previewing a file** — `head -5 filename` prints the first 5 lines. The `-5` is shorthand for `-n 5`. Both forms work identically.

2. **Following a live file** — `tail -f filename` keeps the terminal open and prints new lines as they are appended to the file. Press `Ctrl+C` to stop when you have seen what you need.

3. **Capturing a specific event automatically** — Combine `tail -f` with `grep -m 1` to wait for a pattern and stop as soon as it is found. The `-m 1` flag means "stop after the first match", so the command exits on its own without you needing to press `Ctrl+C`.

4. **Getting the last N lines** — `tail -20 filename` prints the last 20 lines. Unlike `tail -f`, this is a one-shot read with no live following — it reads the current state of the file and exits immediately.

5. **Bonus** — Try `tail -f /var/log/service/events.log | grep --line-buffered 'DEPLOY'` to filter the live stream so that only lines matching a pattern are shown. The `--line-buffered` flag ensures output is printed immediately rather than being held in a buffer.
