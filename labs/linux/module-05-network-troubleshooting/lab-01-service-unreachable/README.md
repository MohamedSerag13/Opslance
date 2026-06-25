# Lab 01: Service Unreachable — Nothing on Port 8080

**Module:** 05 — Network & Connectivity Troubleshooting
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Points:** 100

---

## 🎯 What You Will Learn
- How to use `curl` to detect a connection-refused error and what it means
- How to use `ss -tulnp` to inspect which processes are listening on which ports
- The difference between "a service is down" and "no process is bound to that port"
- How to start a simple HTTP server process and push it to the background with `&`
- How to record a structured diagnosis before taking action

---

## 📖 Background

### Connection Refused vs. Timeout
When `curl` reports **Connection refused**, the TCP connection was actively rejected by the OS — meaning **no process is bound to that port**. This is different from a timeout (no route / firewall drop) or a DNS error. Connection refused is the fastest diagnosis: the process simply isn't running.

### Inspecting port bindings with `ss`
`ss` (socket statistics) is the modern replacement for `netstat`. To see all listening TCP/UDP ports:

```bash
ss -tulnp
```

| Flag | Meaning |
|------|---------|
| `-t` | Show TCP sockets |
| `-u` | Show UDP sockets |
| `-l` | Only listening sockets |
| `-n` | Numeric addresses (no DNS lookup) |
| `-p` | Show owning process |

The **Local Address:Port** column tells you exactly what address and port each process is bound to.

### Starting a background process
```bash
python3 -m http.server 8080 &
```
The trailing `&` sends the process to the background immediately, returning control to the shell.

---

## 🔥 Scenario

You have been handed access to a production server that should be serving a web application on port 8080. The on-call engineer escalated with a single note: *"Connection refused on 8080, no idea why."* You SSH in and begin your investigation. Nothing has been started — the outage IS the starting state.

---

## 💥 Symptoms
- `curl localhost:8080` returns `curl: (7) Failed to connect ... Connection refused`
- `ss -tulnp` shows no entry for `:8080`
- No web service process visible in `ps aux`

---

## 🎯 Your Mission

1. Run `curl localhost:8080` — observe and note the error.
2. Run `ss -tulnp` — confirm nothing is listening on port 8080.
3. Write your diagnosis: `echo "No process listening on port 8080" > /home/intern/diagnosis.txt`
4. Fix it: `python3 -m http.server 8080 &`
5. Run `ss -tulnp` again — port 8080 should now appear.
6. Verify: `curl localhost:8080` — should return an HTML page.

---

## ✅ Acceptance Criteria
| # | What is checked | Points |
|---|----------------|--------|
| 1 | `/home/intern/diagnosis.txt` exists with the diagnosis keyword | 40% |
| 2 | A process is listening on port 8080 | 30% |
| 3 | `curl localhost:8080` returns HTTP 200 | 30% |

---

## 📚 Command Reference
| Command | What it does |
|---------|-------------|
| `curl localhost:8080` | Attempt an HTTP connection to port 8080 |
| `curl -v localhost:8080` | Verbose — shows the full connection attempt and headers |
| `ss -tulnp` | List all listening TCP/UDP sockets with owning process |
| `ss -tulnp \| grep 8080` | Filter for a specific port |
| `echo "text" > /home/intern/diagnosis.txt` | Write a diagnosis note to the required file |
| `python3 -m http.server 8080 &` | Start a simple HTTP server on port 8080 in the background |
| `ps aux \| grep python` | Confirm the python process is running |
| `jobs` | List background jobs in the current shell |
