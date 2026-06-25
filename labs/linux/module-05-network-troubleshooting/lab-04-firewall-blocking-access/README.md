# Lab 04: Firewall Blocking Remote Access

**Module:** 05 — Network & Connectivity Troubleshooting
**Difficulty:** ⭐⭐ Intermediate / Advanced
**Estimated Time:** 25 minutes
**Points:** 150

> **🔬 Simulation Notice:** The firewall in this lab is a **realistic simulation** of `ufw` for training purposes — **not a real kernel-level firewall**. No `iptables` or `nftables` rules are created. Enforcement is handled by a Python proxy (the "gatekeeper") that reads the fake-ufw rules file and decides whether to forward connections. The README, SOLUTION, and commands all use real `ufw` syntax. See the [`_shared/fakeufw/`](../_shared/fakeufw/) directory for implementation details.

---

## 🎯 What You Will Learn
- The classic "works locally, broken remotely" firewall pattern
- How to check firewall state with `ufw status`
- How to open a port with `ufw allow`
- How to find your container's non-loopback IP with `ip addr`
- How a firewall can block external traffic while allowing localhost connections

---

## 📖 Background

### Why "works locally" but "broken remotely"?

When `ufw` (Uncomplicated Firewall) has a DENY rule for a port, it drops inbound packets from **external** sources. However, traffic from `localhost` (127.0.0.1) bypasses firewall rules — and in this lab, the gatekeeper proxy explicitly always allows loopback connections. This creates the classic pattern:

```
curl localhost:8080           → HTTP 200  ✅  (loopback — always allowed)
curl http://172.17.0.2:8080   → HTTP 403  ❌  (non-loopback — blocked by fake-ufw DENY)
```

This "works for me, not for others" pattern is one of the most common production firewall bugs.

### `ufw` basics

```bash
sudo ufw status         # Show current firewall state and rules
sudo ufw allow 8080     # Allow connections to port 8080
sudo ufw deny 8080      # Deny connections to port 8080
```

The boot state for this lab is:

```
Status: active

To                             Action     From
--                             ------     ----
8080                           DENY       Anywhere
```

### Architecture of this lab

```
[loopback: 127.0.0.1]  →  [gatekeeper :8080]  →  [backend :8888]  ✅ always forwarded
[eth0 IP: 172.17.x.x]  →  [gatekeeper :8080]  →  reads /var/lib/fakeufw/rules → DENY ❌ / ALLOW ✅
```

The gatekeeper enforces fake-ufw rules **only for non-loopback sources**. Connecting via the eth0 IP simulates what a remote machine would experience.

---

## 🔥 Scenario

Your team deployed a new API server. From the server itself, everything looks fine — `curl localhost:8080` returns a valid response. But the rest of the team reports they can't connect. The server's firewall was left in a hardened state after a security audit — port 8080 is blocked for all non-local connections.

---

## 💥 Symptoms
- `curl localhost:8080` returns HTTP 200 (loopback always allowed)
- Connections via the non-loopback IP get `HTTP 403 Forbidden` with the message "Access denied by firewall rule"
- `ss -tulnp | grep 8080` shows the gatekeeper IS listening (app is up)
- `sudo ufw status` shows `8080  DENY  Anywhere`

---

## 🎯 Your Mission

1. Confirm the app is running: `ss -tulnp | grep 8080`
2. Confirm local access works: `curl localhost:8080` → should return HTTP 200
3. Check the firewall: `sudo ufw status` → note the DENY rule
4. Open port 8080: `sudo ufw allow 8080`
5. Verify the rule changed: `sudo ufw status` → should now show ALLOW
6. Test non-loopback access:

```bash
# Find your eth0 (non-loopback) IP — this is what a remote machine would connect to
ip addr show eth0 | grep 'inet '
# Example: inet 172.17.0.2/16

# Curl via the eth0 IP — gatekeeper treats this as a remote connection
curl http://172.17.0.2:8080
# Should now return HTTP 200 (previously was 403)
```

---

## ✅ Acceptance Criteria
| # | What is checked | Points |
|---|----------------|--------|
| 1 | Gatekeeper is listening on port 8080 | 25% |
| 2 | fake-ufw rules show port 8080 as `ALLOW` | 35% |
| 3 | `curl localhost:8080` returns HTTP 200 | 20% |
| 4 | Non-loopback (eth0 IP) access to port 8080 returns HTTP 200 | 20% |

---

## 📚 Command Reference
| Command | What it does |
|---------|-------------|
| `ss -tulnp \| grep 8080` | Verify the gatekeeper is listening on 8080 |
| `curl localhost:8080` | Test local (loopback) access |
| `sudo ufw status` | Show the current fake-ufw rule table |
| `sudo ufw allow 8080` | Add an ALLOW rule for port 8080 |
| `sudo ufw deny 8080` | Add a DENY rule for port 8080 |
| `ip addr show eth0` | Show the eth0 network interface and its IP |
| `ip addr show eth0 \| grep 'inet '` | Extract just the IPv4 address |
| `curl http://172.17.0.2:8080` | Test via non-loopback bridge IP (replace with your actual IP) |
