# Solution: Debug a Failed Systemd Service

## Root Cause

The unit file `/etc/systemd/system/broken-app.service` specifies `ExecStart=/opt/app/start.sh`, but `/opt/app/start.sh` does not exist — the deployment step that should have placed it there was never completed. The service manager reports this immediately as `failed (Result: exit-code)` and logs `No such file or directory`.

## Step-by-Step Fix

```bash
# 1. Attempt to start the service and observe the failure
systemctl start broken-app
# Output: Failed to execute command '/opt/app/start.sh': No such file or directory

# 2. Confirm the failed state
systemctl status broken-app
# Output:
# ● broken-app.service - Production Application Server
#      Loaded: loaded (/etc/systemd/system/broken-app.service; disabled; ...)
#      Active: failed (Result: exit-code)
#
#                   [2024-01-15 10:30:01] broken-app: Failed to execute command
#                   '/opt/app/start.sh': No such file or directory

# 3. Read the full journal for the unit to confirm the root cause
journalctl -u broken-app
# Output:
# [2024-01-15 10:30:01] broken-app: Failed to execute command '/opt/app/start.sh': No such file or directory

# 4. Read the unit file to confirm the expected path
cat /etc/systemd/system/broken-app.service
# Output:
# [Unit]
# Description=Production Application Server
#
# [Service]
# ExecStart=/opt/app/start.sh
# ...

# 5. Create the missing application script
#    It must keep running so the service stays active (systemctl tracks the PID)
cat > /opt/app/start.sh << 'EOF'
#!/bin/bash
echo "App starting up..."
echo "Production Application Server is running."
exec sleep infinity
EOF

# 6. Make the script executable (CRITICAL — service manager requires this)
chmod +x /opt/app/start.sh

# 7. Verify the file exists and has the right permissions
ls -l /opt/app/start.sh
# Output: -rwxr-xr-x 1 intern intern ... /opt/app/start.sh

# 8. Restart the service now that the fix is in place
systemctl restart broken-app
# Output: [ OK   ] Started Production Application Server.

# 9. Confirm the service is active
systemctl status broken-app
# Output:
# ● broken-app.service - Production Application Server
#      Loaded: loaded (/etc/systemd/system/broken-app.service; disabled; ...)
#      Active: active (running) since 2024-01-15T10:31:00 UTC
#     Main PID: 87
#                   [2024-01-15 10:30:01] broken-app: Failed to execute command ...
#                   [2024-01-15 10:31:00] broken-app: Started Production Application Server.

# 10. Optionally verify the journal shows both the failure and the fix
journalctl -u broken-app
```

Click the **Check** button on the left panel to verify and pass.
