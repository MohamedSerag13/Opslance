# Solution: Broken DNS Resolution

## Root Cause

`/etc/resolv.conf` was overwritten during migration with `nameserver 1.2.3.4` — a non-existent IP address. Every DNS query times out waiting for a response from a server that doesn't exist. The underlying network is fine; only name resolution is broken.

## Step-by-Step Fix

```bash
# 1. Back up the broken config (good habit — always do this)
cp /etc/resolv.conf /tmp/resolv.conf.bak
cat /tmp/resolv.conf.bak
# Output:
# nameserver 1.2.3.4

# 2. Prove DNS is broken (not the whole network)
dig google.com
# Output: (times out after ~5s)
# ;; connection timed out; no servers could be reached

# 3. Prove the IP network is alive
ping -c 3 8.8.8.8
# Output:
# PING 8.8.8.8 (8.8.8.8): 56 data bytes
# 64 bytes from 8.8.8.8: icmp_seq=0 ttl=... time=... ms
# → Network is UP. The problem is DNS only.

# 4. Read the broken resolv.conf to confirm
cat /etc/resolv.conf
# Output:
# nameserver 1.2.3.4

# 5. Fix /etc/resolv.conf with a working nameserver
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
# Output: nameserver 8.8.8.8
# (tee writes to the file AND prints to stdout)

# 6. Verify DNS now works
dig google.com
# Output:
# ;; ANSWER SECTION:
# google.com.     300  IN  A  142.250.80.46
# (actual IP may differ — as long as there's an ANSWER SECTION, DNS is working)

# 7. Optional: confirm with a full HTTP request
curl -s -o /dev/null -w "%{http_code}\n" https://google.com
# Output: 200 (or 301 redirect)
```

## Key Insight

The `ping 8.8.8.8` vs `dig google.com` isolation test is a fundamental debugging technique. Never assume "network is broken" — always test by IP first. If IP works but names don't, the problem is in the resolver configuration, not the network infrastructure.

Click the **Check** button on the left panel to verify and pass.
