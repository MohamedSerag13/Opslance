# Lab 01: Rogue Process Hunt

**Module:** 04 — Processes & Services
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Points:** 100

---

## 🎯 What You Will Learn
- How to list all running processes with `ps aux`
- How to search for a specific process using `grep` and `pgrep`
- How to terminate a process by PID with `kill`
- How to kill all processes matching a name with `pkill`

---

## 📖 Background

Every program running on a Linux system is a **process**. Each process has a unique **PID** (Process ID) assigned by the kernel. The `ps` command snapshots the current list of processes. `pgrep` searches the process list by name and returns matching PIDs. `kill` sends a signal (default: SIGTERM) to a single process, while `pkill` does the same to every process matching a name pattern.

| Concept | Meaning |
|---------|---------|
| **PID** | Unique numeric ID for a running process |
| **SIGTERM (15)** | Default signal sent by `kill` — polite shutdown request |
| **SIGKILL (9)** | Forceful kill with `kill -9` — cannot be caught or ignored |
| **`ps aux`** | Show all processes for all users with CPU/memory usage |
| **`pgrep`** | Search process list by name and print matching PIDs |
| **`pkill`** | Send a signal to all processes matching a name |

---

## 🔥 Scenario

Three rogue `sleep 1000` processes were accidentally left running on a production server. They are consuming process-table slots and cluttering the audit log. A senior engineer has raised an incident ticket and asked you to:

1. Locate all three processes and **record their PIDs** for the incident report.
2. **Terminate them cleanly** so the server is back to a known-good state.

---

## 💥 Symptoms
- `ps aux | grep sleep` shows multiple unexpected `sleep 1000` processes
- Process table is cluttered with processes that serve no function
- `pgrep sleep` returns several PIDs

---

## 🎯 Your Mission

1. Use `ps aux` and/or `pgrep sleep` to find all three rogue processes.
2. Write their PIDs to `/home/intern/pids_found.txt` — one PID per line.
3. Kill **one** of them individually using `kill <PID>`.
4. Terminate the rest using `pkill sleep`.
5. Verify they are all gone: `pgrep sleep` should return nothing.

---

## ✅ Acceptance Criteria
| # | What is checked | Points |
|---|----------------|--------|
| 1 | `pids_found.txt` exists and lists at least 3 sleep process PIDs | 40% |
| 2 | All rogue `sleep` processes have been killed (none remain) | 60% |

---

## 📚 Command Reference
| Command | What it does |
|---------|-------------|
| `ps aux` | Show all processes for all users with PID, CPU, and memory |
| `ps aux \| grep sleep` | Filter the process list to show only `sleep` entries |
| `pgrep sleep` | Print the PIDs of all processes named `sleep` |
| `pgrep sleep > file.txt` | Save the PIDs directly to a file |
| `kill <PID>` | Send SIGTERM to a single process (graceful shutdown) |
| `kill -9 <PID>` | Send SIGKILL to a single process (forceful, instant) |
| `pkill sleep` | Kill all processes whose name matches `sleep` |
| `pgrep sleep` | Verify — should print nothing when all are gone |
