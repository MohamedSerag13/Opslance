# Solution: Firewall Blocking Remote Access

## Root Cause

The fake-ufw boot state has `8080 DENY Anywhere`. The gatekeeper proxy enforces this rule for all non-loopback connections, meaning `curl localhost:8080` works (loopback is always permitted) but any connection from another machine or from the container's own eth0 IP is rejected with HTTP 403. The fix is to update the fake-ufw rules to `ALLOW 8080`.

## Step-by-Step Fix

```bash
# 1. Confirm the gatekeeper IS listening on port 8080
ss -tulnp | grep 8080
# Output:
# tcp   LISTEN  0   128  0.0.0.0:8080  0.0.0.0:*  users:(("python3",pid=12,...))
# → App is running. Problem is not "nothing listening" — it's the firewall.

# 2. Confirm local access works (loopback bypasses firewall rules)
curl localhost:8080
# Output:
# <!DOCTYPE html>
# <html>...
# <h1>Lab 04 — Web Server is Running</h1>
# ...
# (HTTP 200 — loopback always forwarded regardless of fake-ufw state)

# 3. Check the firewall state
sudo ufw status
# Output:
# Status: active
#
# To                             Action     From
# --                             ------     ----
# 8080                           DENY       Anywhere
# → Port 8080 is DENIED for remote access. Found the problem.

# 4. Allow port 8080 through the firewall
sudo ufw allow 8080
# Output: Rule added

# 5. Verify the rule was updated
sudo ufw status
# Output:
# Status: active
#
# To                             Action     From
# --                             ------     ----
# 8080                           ALLOW      Anywhere
# → Rule now shows ALLOW.

# 6. Test non-loopback (remote) access
# Find your non-loopback IP first:
ip addr show eth0 | grep 'inet '
# Output: inet 172.17.0.2/16 brd ... scope global eth0

# Curl via the non-loopback IP (gatekeeper treats this as a remote connection)
curl http://172.17.0.2:8080
# Output:
# <!DOCTYPE html>
# <html>...
# <h1>Lab 04 — Web Server is Running</h1>
# (HTTP 200 — remote access now works!)
```

## Why Loopback Was Always Allowed

In real `ufw` / `iptables`, traffic from 127.0.0.1 goes through the `lo` interface and is governed by different rules (usually the `loopback` chain always accepts). In this simulation, the gatekeeper proxy hard-codes the same behavior: peer IP `127.0.0.1` is always forwarded regardless of fake-ufw state. This is authentic to how real firewalls behave.

## Key Takeaway

"Works locally, broken remotely" almost always means a firewall rule is blocking the specific source IP or interface. Confirm with `ufw status` before touching anything else. One command (`sudo ufw allow PORT`) is the fix.

Click the **Check** button on the left panel to verify and pass.
