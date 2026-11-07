# Solution: Repairing authorized_keys Ownership and Permissions

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

sshd's StrictModes refuses authorized_keys that are group/world-writable or owned by anyone other than the account — the check exists so a tamperer cannot inject keys into a writable file. The teammate fixed the CONTENT but not the container: 777 on ~/.ssh, 666 + root ownership on the file. sshd then silently ignores the key, producing the least helpful error in Linux.

## Step-by-Step Fix

### Step 1: Inspect all three attributes

Mode of the directory, mode of the file, owner of the file — any one wrong breaks login:

```bash
ls -la ~/.ssh
stat -c '%U %G %a' ~/.ssh/authorized_keys
```

### Step 2: Fix the directory and file modes

700 on the directory, 600 on the file:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### Step 3: Fix ownership

The file must belong to the logging-in user; chown needs sudo:

```bash
sudo chown intern:intern ~/.ssh/authorized_keys
```

### Step 4: Verify like sshd would

All three attributes in one line:

```bash
stat -c '%U %G %a' ~/.ssh ~/.ssh/authorized_keys
```

### Step 5: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: SSH Ignores My Key ===

✅ PASS [30%]: .ssh directory permissions are 700
✅ PASS [30%]: authorized_keys permissions are 600
✅ PASS [25%]: authorized_keys is owned by intern
✅ PASS [15%]: authorized_keys still contains the public key

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

'My key is in authorized_keys but I still get Permission denied' is a top-five junior SSH ticket, and the answer is almost always StrictModes: permissions or ownership. Reading the server side (/var/log/auth.log or journalctl -u ssh) confirms it — but knowing the 700/600/owner trio in advance gets you there without a round trip.

## Common Mistakes

- **Mistake 1:** Fixing only the file and leaving ~/.ssh at 777 — sshd checks the whole path.
- **Mistake 2:** Forgetting ownership: a root-owned authorized_keys in your home directory is ignored even with perfect modes.
- **Mistake 3:** Debugging from the client only — the truth lives in the server's auth log.
