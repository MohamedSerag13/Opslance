# Solution: Service Unreachable — Nothing on Port 8080

## Root Cause

No process is bound to port 8080. The container boots with no web server started — `curl localhost:8080` returns **Connection refused** because the TCP stack immediately rejects the connection rather than timing out. `ss -tulnp` confirms the port is completely absent from the listener table.

## Step-by-Step Fix

```bash
# 1. Confirm the failure
curl localhost:8080
# Output:
# curl: (7) Failed to connect to localhost port 8080 after 0 ms: Connection refused

# 2. Inspect the listener table — confirm nothing is on 8080
ss -tulnp
# Expected output (nothing showing :8080):
# Netid  State  Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
# (empty or only loopback entries for other ports)

# 3. Write the diagnosis to the required file
echo "No process listening on port 8080" > /home/intern/diagnosis.txt

# 4. Start the web server in the background
python3 -m http.server 8080 &
# Output: Serving HTTP on 0.0.0.0 port 8080 ...
# (the & returns control to your shell immediately)

# 5. Confirm the port is now bound
ss -tulnp | grep 8080
# Output:
# tcp   LISTEN  0   5   0.0.0.0:8080  0.0.0.0:*  users:(("python3",pid=42,...))

# 6. Verify the service responds
curl localhost:8080
# Output: (HTML directory listing — HTTP 200 OK)
```

Click the **Check** button on the left panel to verify and pass.
