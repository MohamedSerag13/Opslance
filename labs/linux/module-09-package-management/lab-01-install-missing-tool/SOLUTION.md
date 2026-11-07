# Solution: Installing Software with apt

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

The server image was built minimal and curl was never added, so the monitoring agent cannot make HTTP requests. On Debian-family systems the fix is the two-step apt dance: update the index (metadata about what is available), then install (download and unpack the package and its dependencies).

## Step-by-Step Fix

### Step 1: Confirm the gap

Prove curl is missing before you change anything:

```bash
command -v curl || echo 'curl: missing'
```

### Step 2: Refresh the package index

apt-get update downloads current package lists. It upgrades nothing — it only refreshes metadata:

```bash
sudo apt-get update
```

### Step 3: Install curl

-y skips the confirmation prompt, which is how you would also do it in automation:

```bash
sudo apt-get install -y curl
```

### Step 4: Verify

A version string on stdout is the proof the tool actually runs:

```bash
command -v curl
curl --version | head -1
```

### Step 5: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Install the Missing Tool ===

✅ PASS [50%]: curl is installed and on the PATH
✅ PASS [30%]: curl runs and reports a version
✅ PASS [20%]: the healthcheck script is still in place

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

Installing software is the first thing you do on any new box, and 'apt: command not found' tickets are endless in junior roles. Knowing that update refreshes the index while install/upgrade changes the system — and that -y makes both scriptable — is table stakes for every Debian/Ubuntu server you will touch.

## Common Mistakes

- **Mistake 1:** Running apt-get install without update on a stale box and concluding the package 'does not exist'.
- **Mistake 2:** Typing apt-get update but then installing with a different tool (snap/yum) and wondering why nothing changed.
- **Mistake 3:** Forgetting -y inside scripts, leaving apt waiting forever on a confirmation prompt that will never come.
