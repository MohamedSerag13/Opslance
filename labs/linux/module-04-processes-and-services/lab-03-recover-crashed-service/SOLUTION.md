# Solution: Recover a Crashed Service

## Root Cause

nginx is installed on this server but was intentionally left in the `inactive`
state and `disabled` — it was never started after last night's failed
deployment, and it is not configured to auto-start on boot. Nothing is
listening on port 8080, so every request gets `Connection refused`.

The fix is to **start** the service (so it serves traffic and reports
`active`) and **enable** it (so it survives a reboot).

## Step-by-Step Fix

```bash
# 1. Confirm nginx is stopped
systemctl status nginx
# ● nginx.service - The NGINX HTTP Server
#      Loaded: loaded (/etc/systemd/system/nginx.service; disabled; vendor preset: enabled)
#      Active: inactive (dead)

# 2. Confirm nothing is listening on port 8080
curl http://localhost:8080
# curl: (7) Failed to connect to localhost port 8080: Connection refused

# 3. Start nginx
systemctl start nginx
#          Starting The NGINX HTTP Server...
# [ OK   ] Started The NGINX HTTP Server.

# 4. Verify the service is now active
systemctl status nginx
# ● nginx.service - The NGINX HTTP Server
#      Loaded: loaded (/etc/systemd/system/nginx.service; disabled; vendor preset: enabled)
#      Active: active (running) since 2026-06-22T12:50:03 UTC
#     Main PID: 42

# 5. Verify nginx is actually serving traffic
curl http://localhost:8080
# <html><body><h1>nginx is running!</h1><p>Service recovered successfully.</p></body></html>

# 6. Enable nginx so it starts automatically on reboot
systemctl enable nginx
# Created symlink /etc/systemd/system/multi-user.target.wants/nginx.service → /etc/systemd/system/nginx.service.

# 7. Final check — status now shows BOTH enabled and active (running)
systemctl status nginx
# ● nginx.service - The NGINX HTTP Server
#      Loaded: loaded (/etc/systemd/system/nginx.service; enabled; vendor preset: enabled)
#      Active: active (running) since 2026-06-22T12:50:03 UTC
#     Main PID: 42

# (optional) Inspect the service journal
journalctl -u nginx
# [2026-06-22 12:50:03] nginx: Started The NGINX HTTP Server.
```

## Why the order matters

- `systemctl start` only affects the **current** run — it brings the service
  up now but does nothing about reboots.
- `systemctl enable` only affects **future boots** — it creates the auto-start
  marker but does not start the service now.

You need **both** to fully recover the service and prevent a repeat outage.

## Acceptance Criteria → Commands

| # | Check | Satisfied by |
|---|-------|--------------|
| 1 | nginx serving on `localhost:8080` (35%) | `systemctl start nginx` |
| 2 | `systemctl` reports nginx `active` (35%) | `systemctl start nginx` |
| 3 | nginx is enabled (30%) | `systemctl enable nginx` |

Click the **Check** button on the left panel to verify and pass (100/100).
