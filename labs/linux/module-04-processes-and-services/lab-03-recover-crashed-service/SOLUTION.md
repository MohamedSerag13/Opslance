# Solution: Recover a Crashed Service

## Root Cause

nginx was installed on this server but intentionally left in the `inactive` state and `disabled` — it was never started and is not configured to auto-start on boot.

## Step-by-Step Fix

```bash
# 1. Confirm nginx is stopped
systemctl status nginx
# Output:
# ● nginx.service - The NGINX HTTP Server
#      Loaded: loaded (/etc/systemd/system/nginx.service; disabled; ...)
#      Active: inactive (dead)

# 2. Also confirm nothing is listening on port 8080
curl http://localhost:8080
# Output: curl: (7) Failed to connect to localhost port 8080: Connection refused

# 3. Start nginx
systemctl start nginx
# Output: [ OK   ] Started The NGINX HTTP Server.

# 4. Verify the service is now active
systemctl status nginx
# Output:
# ● nginx.service - The NGINX HTTP Server
#      Loaded: loaded (/etc/systemd/system/nginx.service; disabled; ...)
#      Active: active (running) since 2024-01-15T10:30:00 UTC
#     Main PID: 42

# 5. Verify nginx is actually serving traffic
curl http://localhost:8080
# Output: <html><body><h1>nginx is running!</h1>...

# 6. Enable nginx so it starts automatically on reboot
systemctl enable nginx
# Output: Created symlink /etc/systemd/system/multi-user.target.wants/nginx.service → ...

# 7. Final check — status now shows enabled
systemctl status nginx
# Output:
# ● nginx.service - The NGINX HTTP Server
#      Loaded: loaded (/etc/systemd/system/nginx.service; enabled; ...)
#      Active: active (running) since ...
```

Click the **Check** button on the left panel to verify and pass.
