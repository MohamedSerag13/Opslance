# Solution: Fixing the Login Banner with nano, vim or sed

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

A one-character typo and a missing line in /etc/motd — trivial content, but the exercise trains two survival skills: making a precise edit as root (with nano or vim) and appending to a root-owned file from a shell one-liner with tee -a. Both come up weekly in real ops work.

## Step-by-Step Fix

### Step 1: Fix the typo

With an editor (sudo nano /etc/motd → edit → Ctrl+O, Enter, Ctrl+X) or with a sed one-liner:

```bash
sudo sed -i 's/Welcom/Welcome/' /etc/motd
```

### Step 2: Append the footer

Regular redirection (>>) needs write permission, so for a root-owned file pipe through sudo tee -a instead:

```bash
echo 'Managed by Opslance.' | sudo tee -a /etc/motd
```

### Step 3: Verify

The last line must match exactly — including the trailing period:

```bash
tail -n 1 /etc/motd
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Message-of-the-Day Rescue ===

✅ PASS [25%]: the 'Welcom' typo is gone from /etc/motd
✅ PASS [25%]: banner correctly reads 'Welcome to the Opslance staging server.'
✅ PASS [25%]: existing banner lines were preserved
✅ PASS [25%]: last line of /etc/motd is exactly 'Managed by Opslance.'

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

You will not always have an editor on a hardened server — but nano or vi is always there, and tee -a works even when nothing else does. Editing root-owned files without breaking them, and verifying with tail/diff afterwards, is a reflex every junior needs before touching /etc for real.

## Common Mistakes

- **Mistake 1:** Opening the file without sudo, editing happily, then failing to save — nano cannot write a root-owned file.
- **Mistake 2:** Appending with `echo ... >> /etc/motd` as intern and getting 'Permission denied' instead of piping through sudo tee -a.
- **Mistake 3:** Saving vim with ZZ out of habit before noticing which mode you are in — when stuck, press Esc a few times and type :q! to bail out.
