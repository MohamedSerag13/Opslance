# Solution: Granting and Auditing sudo Access

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

jordan was created but never added to the sudo group, so sudo's default policy (='%sudo ALL=(ALL:ALL) ALL' in /etc/sudoers) does not match him and every elevation attempt is rejected. The secondary issue is procedural: the grant was never documented, which is why the handbook demands an audit file.

## Step-by-Step Fix

### Step 1: Confirm the current state

`groups jordan` shows his memberships — sudo will be missing, which is the whole ticket:

```bash
groups jordan
```

### Step 2: Grant sudo via group membership

The sudo group is the supported way to grant root escalation on Ubuntu — no editing of /etc/sudoers required:

```bash
sudo usermod -aG sudo jordan
```

### Step 3: Record the audit evidence

Capture the new memberships and the effective privilege listing in one file. `-U jordan` asks sudo what JORDAN may run (uppercase U), rather than what you may run:

```bash
{ groups jordan; sudo -l -U jordan; } > /home/intern/sudo-audit.txt 2>&1
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: The Missing Sudo Grant ===

✅ PASS [20%]: jordan account exists
✅ PASS [40%]: jordan is a member of the sudo group
✅ PASS [20%]: /home/intern/sudo-audit.txt exists and mentions jordan
✅ PASS [20%]: audit file records the sudo privilege listing

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

'Why can't this user sudo?' is a daily junior question with a two-command answer: groups user and sudo -l -U user. Just as important is the audit habit — privilege grants that nobody wrote down are how servers end up with mystery admins six months later.

## Common Mistakes

- **Mistake 1:** Editing /etc/sudoers directly (or with anything other than visudo) — a syntax error there can break sudo for everyone.
- **Mistake 2:** Forgetting that group changes need a fresh login: jordan must log out and back in before sudo works for him.
- **Mistake 3:** Granting NOPASSWD blanket access when a scoped rule would do — always grant the least privilege that unblocks the work.
