# Solution: Onboarding a New Developer Account

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

The account simply does not exist yet — this is a standard provisioning task rather than a fault. The risk in onboarding is doing it partially: creating the user without -m (no home directory), without -s (wrong shell), forgetting -aG so the group replace wipes other memberships, or leaving the account locked so the user's first login fails.

## Step-by-Step Fix

### Step 1: Create the account with home, shell and comment

One useradd invocation covers the whole ticket: -m creates /home/amara from /etc/skel, -s sets the shell, -c sets the GECOS comment:

```bash
sudo useradd -m -s /bin/bash -c "Amara Okafor - Platform Team" amara
```

### Step 2: Add her to the developers group

-aG appends to the group list. Run it once the account exists:

```bash
sudo usermod -aG developers amara
```

### Step 3: Set the temporary password

chpasswd reads user:password pairs on stdin, which is scriptable and avoids interactive prompts:

```bash
echo 'amara:ChangeMe123!' | sudo chpasswd
```

### Step 4: Verify everything

Check the three artifacts the ticket asked for — home directory, passwd line, group membership:

```bash
ls -ld /home/amara
grep amara /etc/passwd
grep developers /etc/group
```

### Step 5: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Onboard a New Developer ===

✅ PASS [30%]: /home/amara home directory exists
✅ PASS [40%]: amara has a bash shell and the correct GECOS comment in /etc/passwd
✅ PASS [30%]: amara is a member of the developers group

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

User onboarding is one of the most frequent junior sysadmin tasks, and almost every later access problem ('she can't write to the repo', 'his cron jobs don't run') traces back to a half-finished useradd. Doing it as one correct, verifiable command sequence — then checking /etc/passwd and /etc/group — is a habit worth building on day one.

## Common Mistakes

- **Mistake 1:** Forgetting -m on useradd, so the account has no home directory and login drops into /.
- **Mistake 2:** Using `usermod -G` instead of `usermod -aG`, which replaces the user's groups instead of appending.
- **Mistake 3:** Leaving the GECOS field empty — real names in /etc/passwd save hours when auditing who did what.
