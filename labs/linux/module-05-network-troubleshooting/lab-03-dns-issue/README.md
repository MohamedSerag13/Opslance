# Lab 03: Broken DNS Resolution

**Module:** 05 — Network & Connectivity Troubleshooting
**Difficulty:** ⭐⭐ Intermediate
**Estimated Time:** 20 minutes
**Points:** 125

> **⚠️ Infrastructure Note:** This lab requires the container to have **outbound internet access** (`network_mode: bridge`). It will not work in an air-gapped or offline environment. The platform sets this via `resource_limits.network: "bridge"` in metadata.json. If `dig google.com` times out even after your fix, ask your platform administrator to verify that outbound UDP/53 and TCP/53 are permitted from lab containers.

---

## 🎯 What You Will Learn
- The critical difference between a DNS failure and a full network outage
- How to use `dig` to test DNS resolution and read its output
- How to use `ping` to verify the IP-layer network path is functional
- How `/etc/resolv.conf` controls DNS resolution and how to fix it
- Safe practices: backing up config files before editing them

---

## 📖 Background

### `/etc/resolv.conf` — the DNS control file

Every DNS lookup on a Linux system goes through `/etc/resolv.conf`. The key field is:

```
nameserver <IP>
```

This tells the resolver which DNS server to send queries to. If the IP is wrong, unreachable, or non-existent, **every hostname lookup fails** — even though the network itself is perfectly healthy.

### Isolating DNS vs. Network failures

| Test | Works? | Conclusion |
|------|--------|-----------|
| `ping 8.8.8.8` | ✅ Yes | IP-layer network is up |
| `dig google.com` | ❌ No | DNS resolver is broken |
| `ping google.com` | ❌ No | Fails because DNS fails (not network!) |

This isolation technique is fundamental: **always test by IP first, then by name**.

### Reading `dig` output

```
;; ANSWER SECTION:
google.com.     300  IN  A  142.250.80.46
```

If you see an ANSWER SECTION with IP addresses, DNS is working. If `dig` returns `SERVFAIL`, `NXDOMAIN`, or times out — DNS is broken.

---

## 🔥 Scenario

A server was migrated last night. This morning, all applications that use domain names are failing. The migration engineer says "the network is fine" — and they're right, the IP layer is functional. But `/etc/resolv.conf` was overwritten with a dummy nameserver (`1.2.3.4`) during the migration, breaking all hostname resolution. Your job is to prove this is a DNS-layer issue (not a full outage) and fix it.

---

## 💥 Symptoms
- `dig google.com` times out or returns a failure status
- `curl https://google.com` fails with `Could not resolve host`
- `ping google.com` fails (because the name can't be resolved)
- `ping 8.8.8.8` **succeeds** (proving the network is alive)
- `cat /etc/resolv.conf` shows `nameserver 1.2.3.4` (non-existent server)

---

## 🎯 Your Mission

1. Back up the broken config: `cp /etc/resolv.conf /tmp/resolv.conf.bak`
2. Confirm DNS is broken: `dig google.com` (should fail / timeout)
3. Confirm the network itself is fine: `ping -c 3 8.8.8.8` (should succeed)
4. Read the broken file: `cat /etc/resolv.conf` — identify the bad nameserver
5. Fix it: `echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf`
6. Verify: `dig google.com` — should now show an ANSWER SECTION

---

## ✅ Acceptance Criteria
| # | What is checked | Points |
|---|----------------|--------|
| 1 | `/etc/resolv.conf` no longer contains `nameserver 1.2.3.4` | 35% |
| 2 | `/etc/resolv.conf` contains a valid nameserver (`8.8.8.8` or `1.1.1.1`) | 35% |
| 3 | `dig google.com` resolves successfully | 30% |

---

## 📚 Command Reference
| Command | What it does |
|---------|-------------|
| `cat /etc/resolv.conf` | Read the current DNS resolver configuration |
| `cp /etc/resolv.conf /tmp/resolv.conf.bak` | Back up the config before editing |
| `dig google.com` | Test DNS resolution for google.com |
| `dig +short google.com` | Shorter dig output — just the IP addresses |
| `ping -c 3 8.8.8.8` | Send 3 ICMP pings to 8.8.8.8 (IP — no DNS needed) |
| `ping -c 3 google.com` | Ping google.com (requires DNS — will fail if DNS broken) |
| `echo "nameserver 8.8.8.8" \| sudo tee /etc/resolv.conf` | Replace resolv.conf with a working nameserver |
| `nslookup google.com` | Alternative DNS lookup tool |
