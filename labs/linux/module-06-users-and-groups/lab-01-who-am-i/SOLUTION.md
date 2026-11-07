# Solution: Who Am I? Investigating and Repairing a User Account

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

The svc_backup account was created with the login shell /bin/false. Because /bin/false exits immediately, any interactive login for that account is terminated the moment it starts, which looks exactly like a broken account. The account itself, its group membership and its home permissions can be perfectly fine — only the shell field in /etc/passwd is wrong.

## Step-by-Step Fix

### Step 1: Document your own identity

The `id` command prints your uid, primary group and all supplementary groups. Redirect it into the audit report so the evidence is written down:

```bash
id > /home/intern/audit.txt
```

### Step 2: Append the account facts

Add your username and the svc_backup line from /etc/passwd. The seventh (last) colon-separated field of a passwd line is the login shell:

```bash
whoami >> /home/intern/audit.txt
grep svc_backup /etc/passwd >> /home/intern/audit.txt
```

### Step 3: Repair the login shell

`usermod -s` rewrites the shell field of an existing account. This needs root, so run it with sudo:

```bash
sudo usermod -s /bin/bash svc_backup
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Who Am I? Account Triage ===

✅ PASS [25%]: /home/intern/audit.txt exists
✅ PASS [25%]: audit.txt contains the output of id (uid=...)
✅ PASS [25%]: svc_backup login shell is /bin/bash in /etc/passwd
✅ PASS [25%]: svc_backup is a member of the backup group

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

Reading /etc/passwd and knowing what each colon-separated field means is the first step in almost every account-related incident. Half of all 'this user can't log in' tickets are caused by the wrong shell, an expired password or a missing group — all of which are visible in two commands: id and grep.

## Common Mistakes

- **Mistake 1:** Editing /etc/passwd by hand instead of using usermod — a typo in that file can lock every user out.
- **Mistake 2:** Forgetting sudo when running usermod; changing another user's shell always requires root.
- **Mistake 3:** Confusing /bin/false (blocks login entirely) with /usr/sbin/nologin (blocks login but prints a polite message).
