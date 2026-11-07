# Solution: Fixing a Shared Project Folder with Group Permissions

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

The directory was created by root with the default 755: only root can write. Multi-user write access on Linux is modelled with groups — create a group, put the collaborators in it, hand the directory to that group, and set the setgid bit so files created later inherit the group instead of the creator's primary group. Without setgid, every new file would be group-owned by alice or bob personally and the other contractor would lose write access again.

## Step-by-Step Fix

### Step 1: Create the shared group

A dedicated per-project group keeps access tidy and revocable — removing a leaver is one usermod, not a chmod spree:

```bash
sudo groupadd projectx
```

### Step 2: Enrol the contractors

-aG appends each user to the group. Group changes apply on their next login:

```bash
sudo usermod -aG projectx alice
sudo usermod -aG projectx bob
```

### Step 3: Hand the directory to the group

chgrp -R switches the group of the tree from root to projectx:

```bash
sudo chgrp -R projectx /srv/projectx
```

### Step 4: Set setgid + group-write permissions

2770 on the directory enables the setgid inheritance bit; the recursive g+rwX gives the group read/write everywhere (X only adds execute where it already makes sense), and o-rwx closes the door for everyone else:

```bash
sudo chmod 2770 /srv/projectx
sudo chmod -R g+rwX,o-rwx /srv/projectx
```

### Step 5: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Shared Folder Access ===

✅ PASS [25%]: projectx group exists in /etc/group
✅ PASS [25%]: both alice and bob are members of projectx
✅ PASS [25%]: /srv/projectx group ownership is projectx
✅ PASS [25%]: /srv/projectx permissions are 2770 (setgid, group rwx, no access for others)

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

Shared directories are where juniors meet the difference between ownership and membership. The setgid bit is the standard answer to 'two people keep overwriting each other's permissions' and is used by every serious deployment for team-writable directories such as /srv, shared releases and CI workspaces.

## Common Mistakes

- **Mistake 1:** Forgetting the setgid bit — permissions look right today and silently break tomorrow when new files get the creator's primary group.
- **Mistake 2:** Using 770 without the leading 2, or chmod g+rwx on the directory only but not recursively on the contents.
- **Mistake 3:** Adding users to a group and testing immediately in the same SSH session — group membership is read at login time, so they must re-login or use `newgrp projectx`.
