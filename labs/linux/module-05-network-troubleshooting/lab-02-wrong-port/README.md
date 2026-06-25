# Lab 02: App on the Wrong Port

**Module:** 05 — Network & Connectivity Troubleshooting
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Points:** 100

---

## 🎯 What You Will Learn
- How to distinguish between "no process running" vs "process running on the wrong port"
- How to use `ss -tulnp` to discover every port a system is listening on
- How to read the output of `ss` to identify processes by name and port
- The importance of verifying your actual listening port before assuming a service is down

---

## 📖 Background

### The "Connection Refused" Trap
A **Connection Refused** error means no process is bound to that specific port at that IP. But it does **not** mean the application is down. The app could be running and healthy, just bound to a different port than you expect.

### Reading `ss -tulnp` output

```
Netid  State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
tcp    LISTEN  0       5       0.0.0.0:8081        0.0.0.0:*          users:(("python3",pid=17,...))
```

The **Local Address:Port** column tells you exactly what port this process is listening on. `0.0.0.0` means it accepts connections on all interfaces.

### Why this happens in production
Common causes of wrong-port issues:
- A config file was updated but the service was restarted before the change took effect
- A default port in code doesn't match the documented/expected port
- Multiple environments (dev/staging/prod) use different ports and someone mixed them up

---

## 🔥 Scenario

A colleague deployed a new web service and told you it's running on port 8080. Your monitoring system is alerting — `curl localhost:8080` fails with Connection refused. But when you check the process table, there IS a python3 process running. The app is alive — it's just not where anyone thought it was.

---

## 💥 Symptoms
- `curl localhost:8080` returns `curl: (7) Failed to connect ... Connection refused`
- `ps aux | grep python` shows a python3 process IS running
- `ss -tulnp` shows a listener — but NOT on port 8080

---

## 🎯 Your Mission

1. Run `curl localhost:8080` — observe the connection refused error.
2. Run `ss -tulnp` — find which port the python3 process is **actually** listening on.
3. Write the actual port to a file: `echo "8081" > /home/intern/actual_port.txt`
4. Confirm the app works: `curl localhost:8081`

---

## ✅ Acceptance Criteria
| # | What is checked | Points |
|---|----------------|--------|
| 1 | `/home/intern/actual_port.txt` contains `8081` | 40% |
| 2 | Port 8081 is currently listening | 30% |
| 3 | `curl localhost:8081` returns HTTP 200 | 30% |

---

## 📚 Command Reference
| Command | What it does |
|---------|-------------|
| `curl localhost:8080` | Test a connection to port 8080 |
| `curl localhost:8081` | Test a connection to port 8081 |
| `ss -tulnp` | List all listening sockets with owning processes |
| `ss -tulnp \| grep python` | Filter for python-owned sockets |
| `ps aux \| grep python` | Verify the python process is alive |
| `echo "8081" > /home/intern/actual_port.txt` | Record the actual port to the required file |
