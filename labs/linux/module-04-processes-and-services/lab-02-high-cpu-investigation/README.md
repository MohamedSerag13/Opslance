# Lab 02: High CPU Investigation

**Module:** 04 — Processes & Services
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Points:** 100

---

## 🎯 What You Will Learn
- How to use `top` to view real-time CPU and memory usage per process
- How to use `htop` for a more interactive, colour-coded process view
- How to identify the process consuming the most CPU
- How to terminate a runaway process by PID

---

## 📖 Background

`top` and `htop` are **real-time process monitors**. Unlike `ps`, which takes a snapshot, they update continuously (every 1–3 seconds by default) so you can watch CPU consumption rise and fall. By default, both tools sort processes by CPU usage, putting the biggest consumer at the top of the list.

| Tool | Key feature |
|------|-------------|
| `top` | Ships with every Linux system; press `P` to sort by CPU, `q` to quit |
| `htop` | Colour bar graphs, mouse support, press `F10` or `q` to quit |
| `ps aux --sort=-%cpu` | One-shot snapshot sorted by CPU — useful for scripting |

The **PID** (Process ID) column is always the leftmost numeric column in both tools. Copy it down — you will need it to kill the process.

---

## 🔥 Scenario

The on-call engineer received a page: CPU usage on this server is pegged near 100% but the monitoring dashboard shows no known scheduled job is running. You have been dropped into the server to investigate. The runaway process is not labelled anything obviously suspicious — you need to use the CPU metrics to identify it.

---

## 💥 Symptoms
- Server CPU is near 100% — everything feels sluggish
- No obvious cause visible at first glance
- `top` or `htop` will reveal the offender at the top of the list

---

## 🎯 Your Mission

1. Run `top` or `htop` to identify the process consuming the most CPU.
2. Note its **PID**.
3. Write the PID to `/home/intern/culprit_pid.txt`.
4. Kill the process: `kill <PID>`.
5. Verify the CPU drops back to idle: run `top` again and confirm the process is gone.

---

## ✅ Acceptance Criteria
| # | What is checked | Points |
|---|----------------|--------|
| 1 | `culprit_pid.txt` contains the correct CPU-offending process PID | 40% |
| 2 | The runaway process has been killed (no longer running) | 60% |

---

## 📚 Command Reference
| Command | What it does |
|---------|-------------|
| `top` | Real-time process monitor sorted by CPU usage |
| `htop` | Interactive process monitor with colour bars (press `q` to quit) |
| `ps aux --sort=-%cpu \| head` | One-shot process list sorted by CPU, top 10 |
| `echo <PID> > /home/intern/culprit_pid.txt` | Save the PID to the required file |
| `kill <PID>` | Send SIGTERM to the process (graceful shutdown) |
| `kill -9 <PID>` | Send SIGKILL if SIGTERM is ignored |
| `pgrep yes` | Verify — should return nothing after killing |
