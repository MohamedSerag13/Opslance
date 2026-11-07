# Solution: Auditing Key Fingerprints and Cleaning known_hosts

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

Host key rotation without cleanup leaves stale known_hosts entries. They are harmless until an IP is recycled, at which point users face 'REMOTE HOST IDENTIFICATION HAS CHANGED' warnings that train people to ignore security prompts. Regular fingerprint reporting (for humans) plus ssh-keygen -R (for the dead hosts) is the standard hygiene.

## Step-by-Step Fix

### Step 1: Produce the fingerprint report

-lf prints length, SHA256 fingerprint and type for the public key:

```bash
ssh-keygen -lf ~/.ssh/id_ed25519.pub > /home/intern/fingerprints.txt
cat /home/intern/fingerprints.txt
```

### Step 2: Remove the retired host

ssh-keygen -R edits known_hosts safely and preserves the old file as .old:

```bash
ssh-keygen -R 10.0.0.9
```

### Step 3: Verify both deliverables

The report exists with a SHA256 fingerprint; the stale host is gone:

```bash
grep -q 'SHA256:' /home/intern/fingerprints.txt && echo 'report OK'
grep 10.0.0.9 ~/.ssh/known_hosts || echo 'stale entry removed'
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Fingerprints and Stale Hosts ===

✅ PASS [25%]: /home/intern/fingerprints.txt exists
✅ PASS [30%]: the report contains the ED25519 key fingerprint
✅ PASS [25%]: the report contains a SHA256 fingerprint string
✅ PASS [20%]: the retired host 10.0.0.9 is gone from known_hosts

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

Fingerprints are how humans verify keys — every 'trust this host?' prompt is a fingerprint comparison, and compliance teams ask for them in writing. known_hosts hygiene matters in cloud environments where IPs churn: the -R command removes a host the supported way and keeps a backup, unlike hand-editing.

## Common Mistakes

- **Mistake 1:** Hand-editing known_hosts with vi and mangling the line format instead of using ssh-keygen -R.
- **Mistake 2:** Deleting the whole known_hosts file to 'fix' a warning — you lose every verified host at once.
- **Mistake 3:** Recording the PRIVATE key's fingerprint instead of the .pub — only public keys are shareable.
