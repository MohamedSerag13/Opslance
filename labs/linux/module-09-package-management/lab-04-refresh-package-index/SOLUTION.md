# Solution: Rebuilding the apt Package Index

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

Slim Docker images frequently delete /var/lib/apt/lists to save layers; the side effect is that apt has no metadata until someone runs update. The fix is always the same two commands — update, then query — and the candidate version you record is exactly what a subsequent apt install would deploy.

## Step-by-Step Fix

### Step 1: Reproduce the blindness

With no index files, apt-cache has nothing to say about nginx:

```bash
ls /var/lib/apt/lists/ | head
apt-cache policy nginx
```

### Step 2: Rebuild the index

apt-get update fetches fresh package lists from every configured repository:

```bash
sudo apt-get update
```

### Step 3: Record the candidate

Policy now shows what a fresh install would receive — capture it for the ticket:

```bash
echo "nginx-candidate=$(apt-cache policy nginx | grep 'Candidate:' | awk '{print $2}')" > /home/intern/pkg-report.txt
cat /home/intern/pkg-report.txt
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: The Empty Package Index ===

✅ PASS [45%]: package index files exist again under /var/lib/apt/lists
✅ PASS [20%]: /home/intern/pkg-report.txt exists
✅ PASS [35%]: report records the nginx candidate version

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

'Unable to locate package' right after building a container image confuses every junior once. Understanding that apt queries a LOCAL index (which slim images delete) rather than phoning home explains the error, the fix, and why update is the first command in every Dockerfile snippet.

## Common Mistakes

- **Mistake 1:** Running apt-get install nginx before update and reporting 'the repo must be down'.
- **Mistake 2:** Confusing update (index refresh) with upgrade (actual package updates) — they are different operations.
- **Mistake 3:** Forgetting sudo: as a regular user apt cannot write the new lists and the index stays empty.
