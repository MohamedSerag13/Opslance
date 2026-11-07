# Lab 04: Debug a Failed Systemd Service

**Module:** 04 — Processes & Services
**Difficulty:** ⭐⭐ Intermediate
**Estimated Time:** 25 minutes
**Points:** 150

---

## 🎯 What You Will Learn
- How to trigger a service failure and read its status with `systemctl status`
- How to inspect a service's journal log with `journalctl -u`
- How to read a unit file to understand what a service is configured to run
- How to create a runnable script and set the execute permission with `chmod +x`
- How to restart a fixed service and confirm it reaches the `active (running)` state

---

## 📖 Background

### Systemd unit files

Every service managed by systemctl is defined by a **unit file** stored under `/etc/systemd/system/`. The most important field is `ExecStart=` — it is the exact command the service manager runs when you call `systemctl start`. If that binary or script does not exist, the service fails immediately.

```ini
[Unit]
Description=Production Application Server

[Service]
ExecStart=/opt/app/start.sh

[Install]
WantedBy=multi-user.target
```

### Reading failure logs

When a service fails, the details are in the **journal**. Two commands are essential:

| Command | What it shows |
|---------|--------------|
| `systemctl status <unit>` | State, PID, and last few journal lines |
| `journalctl -u <unit>` | Full journal for that unit — the definitive failure trace |

### The debugging loop

A reliable pattern for fixing broken services:

1. **Start** → observe the error
2. **Status / journal** → read the root cause
3. **Fix** → correct the underlying problem
4. **Restart** → confirm the service is now running

---

## 🔥 Scenario

A new microservice called `broken-app` was deployed to this server. The CI pipeline wrote the unit file correctly but the deployment step that copies the application script to `/opt/app/start.sh` failed silently. Every time someone tries to start the service, systemctl reports `failed` within seconds. The engineering team is waiting for the service to come up. Your job is to diagnose the failure through the journal, apply the fix, and get the service running.

---

## 💥 Symptoms
- `systemctl start broken-app` exits with an error message
- `systemctl status broken-app` shows `Active: failed (Result: exit-code)`
- `journalctl -u broken-app` shows `No such file or directory` for the ExecStart command
- No `broken-app` process appears in `ps aux`

---

## 🎯 Your Mission

1. Run `systemctl start broken-app` — observe the failure.
2. Run `systemctl status broken-app` to confirm the `failed` state.
3. Run `journalctl -u broken-app` to find the exact error message.
4. Read the unit file (`cat /etc/systemd/system/broken-app.service`) to find the expected script path.
5. Create `/opt/app/start.sh` — a valid bash script that keeps running (e.g. `sleep infinity`).
6. Make it executable: `chmod +x /opt/app/start.sh`.
7. Run `systemctl restart broken-app` and confirm `active (running)`.

---

## ✅ Acceptance Criteria
| # | What is checked | Points |
|---|----------------|--------|
| 1 | `systemctl status broken-app` reports `active (running)` | 40% |
| 2 | `/opt/app/start.sh` exists and is executable | 30% |
| 3 | The broken-app journal log contains a successful `Started` entry | 30% |

---

## 📚 Command Reference
| Command | What it does |
|---------|-------------|
| `systemctl start <unit>` | Attempt to start the service |
| `systemctl restart <unit>` | Stop then start the service |
| `systemctl status <unit>` | Show state, PID, and recent log lines |
| `systemctl --failed` | List all units currently in the failed state |
| `journalctl -u <unit>` | Show the full journal log for a specific unit |
| `journalctl -u <unit> -n 20` | Show the last 20 log lines for the unit |
| `cat /etc/systemd/system/<unit>.service` | Read the unit file definition |
| `nano /opt/app/start.sh` | Create or edit the application script |
| `chmod +x /opt/app/start.sh` | Add the execute permission bit to the script |
| `ls -l /opt/app/` | Verify the script exists and its permissions |
