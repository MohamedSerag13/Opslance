# Lab 03: Recover a Crashed Service

**Module:** 04 — Processes & Services
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Points:** 100

---

## 🎯 What You Will Learn
- How to inspect the state of a service with `systemctl status`
- How to start a stopped service with `systemctl start`
- How to verify a web service is responding with `curl`
- How to enable a service for automatic startup with `systemctl enable`

---

## 📖 Background

On a Linux server, long-running programs like web servers are managed as **services**. `systemctl` is the command-line interface to the service manager. Every service has a **unit file** (e.g. `/etc/systemd/system/nginx.service`) that defines how to start, stop, and reload it.

A service can be in one of several states:

| State | Meaning |
|-------|---------|
| `active (running)` | The service is up and its process is alive |
| `inactive (dead)` | The service is stopped — no process is running |
| `failed` | The service tried to start but crashed |
| `enabled` | The service is configured to start automatically at boot |
| `disabled` | The service will **not** start at boot unless started manually |

`curl` is a command-line HTTP client. `curl http://localhost:8080` makes a GET request to the local machine on port 8080 — a quick sanity check that a web server is actually responding.

---

## 🔥 Scenario

The nginx web server is installed on this machine but is sitting in the `inactive` state — it was left stopped after a failed deployment last night. The monitoring dashboard is red. Customers are getting "connection refused" errors. You need to bring nginx back up and make sure it survives the next reboot.

---

## 💥 Symptoms
- `curl http://localhost:8080` returns `curl: (7) Failed to connect to localhost port 8080: Connection refused`
- `systemctl status nginx` shows `Active: inactive (dead)`
- The service is `disabled` — it will not start on reboot

---

## 🎯 Your Mission

1. Confirm the service is down: `systemctl status nginx`
2. Start the service: `systemctl start nginx`
3. Verify it is serving traffic: `curl http://localhost:8080`
4. Enable it for auto-start on reboot: `systemctl enable nginx`
5. Confirm the final state: `systemctl status nginx` should show `active (running)` and `enabled`

---

## ✅ Acceptance Criteria
| # | What is checked | Points |
|---|----------------|--------|
| 1 | nginx is serving HTTP responses on `localhost:8080` | 35% |
| 2 | `systemctl status nginx` reports `active (running)` | 35% |
| 3 | `systemctl enable nginx` was run (enabled marker present) | 30% |

---

## 📚 Command Reference
| Command | What it does |
|---------|-------------|
| `systemctl status <service>` | Show current state, PID, and recent log entries |
| `systemctl start <service>` | Start the service |
| `systemctl stop <service>` | Stop the service |
| `systemctl restart <service>` | Stop then start the service |
| `systemctl enable <service>` | Mark the service to start automatically at boot |
| `systemctl disable <service>` | Remove the auto-start marker |
| `curl http://localhost:8080` | Make an HTTP request to the local server on port 8080 |
| `journalctl -u nginx` | View the service's journal log entries |
| `journalctl -u nginx -n 20` | View the last 20 log lines for the service |
