# Solution: App on the Wrong Port

## Root Cause

The web server was started with `python3 -m http.server 8081` at container boot. It is fully healthy and serving requests — but on port **8081**, not the expected port 8080. `curl localhost:8080` gets a Connection refused because port 8080 is completely unbound. The fix is to identify the correct port and confirm the app works on it (not to restart anything — the app is fine).

## Step-by-Step Fix

```bash
# 1. Confirm the expected port fails
curl localhost:8080
# Output:
# curl: (7) Failed to connect to localhost port 8080 after 0 ms: Connection refused

# 2. Check if the process is running at all
ps aux | grep python
# Output:
# intern  17  0.0  ...  python3 -m http.server 8081

# 3. Find which port it is actually listening on
ss -tulnp
# Output:
# Netid  State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
# tcp    LISTEN  0       5       0.0.0.0:8081        0.0.0.0:*          users:(("python3",pid=17,...))
# → The app is on port 8081, not 8080.

# 4. Record the actual port
echo "8081" > /home/intern/actual_port.txt

# 5. Confirm the application responds correctly on the real port
curl localhost:8081
# Output: (HTML directory listing — HTTP 200 OK)
```

## Key Insight

Always use `ss -tulnp` before declaring a service "down". Connection refused on the expected port doesn't tell you whether the **application** is broken — it only tells you that port is vacant. The process may be healthy on a different port.

Click the **Check** button on the left panel to verify and pass.
