# Solution: Creating an SSH Keypair with ssh-keygen

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

No key material exists yet — a provisioning task. The non-obvious half is permissions: ssh-keygen creates files with sane modes, but any later chmod accident breaks authentication with a confusing 'Permission denied (publickey)' on the server side. Setting 700/600 explicitly and knowing WHY is the portable skill.

## Step-by-Step Fix

### Step 1: Generate the keypair

One command: ed25519, empty passphrase, default location, a comment for identification:

```bash
ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519 -C intern@staging
```

### Step 2: Lock down the permissions

The directory must be owner-only and the private key unreadable by anyone else:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
```

### Step 3: Verify

Both files exist; the fingerprint command proves the public key parses:

```bash
ls -l ~/.ssh/
ssh-keygen -lf ~/.ssh/id_ed25519.pub
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Generate Your First SSH Key ===

✅ PASS [35%]: private key /home/intern/.ssh/id_ed25519 exists
✅ PASS [25%]: public key id_ed25519.pub exists
✅ PASS [25%]: private key permissions are 600
✅ PASS [15%]: .ssh directory permissions are 700

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

Keypair auth is the front door of every Linux fleet — servers, git hosts, CI runners. ed25519 is the modern default, and the 700/600 permission pair is enforced by sshd itself. Doing this once by hand, with the permission model understood, is what makes later automation (ansible, terraform provisioners) legible.

## Common Mistakes

- **Mistake 1:** Leaving the private key at 644 — sshd refuses it with 'UNPROTECTED PRIVATE KEY FILE' and auth fails.
- **Mistake 2:** Generating RSA-2048 'because the tutorial said so' when the policy asks for ed25519.
- **Mistake 3:** Sharing one private key between teammates — each identity gets its own keypair; the PUBLIC half is what gets distributed.
