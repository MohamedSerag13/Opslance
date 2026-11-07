# Lab fix-authorized-keys-perms: Repairing authorized_keys Ownership and Permissions

**Module:** 13 — SSH & Remote Access
**Category:** Linux / ssh
**Difficulty:** ⭐⭐ Intermediate
**Estimated Time:** 20 minutes
**Skills Practiced:** authorized_keys, chmod, chown, sshd strict modes, stat

---

## Scenario

A teammate tried to install your public key for passwordless access but made a mess: ~/.ssh is world -writable (777), authorized_keys is world-writable (666) AND owned by root instead of by you. sshd's StrictModes refuses to trust such files and silently ignores them, so key login fails with no obvious error. Repair the permissions and ownership to what sshd requires.

## Environment

- **Container name:** lab-13-02-fix-authorized-keys-perms
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-13-02-fix-authorized-keys-perms bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- Key-based login attempts fail with 'Permission denied (publickey)'
- ~/.ssh permissions are 777 (world-writable)
- authorized_keys is 666 and owned by root:root
- Server logs mention 'Authentication refused: bad ownership or modes'

## Your Mission

1. Inspect the damage: `ls -la ~/.ssh` and `stat -c '%U %a' ~/.ssh/authorized_keys`.
2. Fix the directory: `chmod 700 ~/.ssh`.
3. Fix the file: `chmod 600 ~/.ssh/authorized_keys`.
4. Fix ownership: `sudo chown intern:intern ~/.ssh/authorized_keys`.
5. Verify all three with stat before declaring victory.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — sshd is strict</summary>
sshd refuses authorized_keys that are writable by others or owned by another user — StrictModes protects you from a tampered file. No error reaches the client; the key is just ignored.
</details>

<details>
<summary>Hint 2 — Two chmods</summary>
Directory: `chmod 700 ~/.ssh`. File: `chmod 600 ~/.ssh/authorized_keys`.
</details>

<details>
<summary>Hint 3 — Ownership matters too</summary>
The file must belong to the LOGIN user: `sudo chown intern:intern ~/.ssh/authorized_keys` — chown needs root even for your own file.
</details>

<details>
<summary>Hint 4 — Verify with stat</summary>
`stat -c &#x27;%U %G %a&#x27;` prints owner, group and mode in one line — all three must be right.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `ls -la ~/.ssh` | Inspect SSH directory contents and modes |
| `stat -c '%U %G %a' path` | Owner, group and numeric mode |
| `chmod 700 ~/.ssh` | Directory: owner-only access |
| `chmod 600 ~/.ssh/authorized_keys` | Key file: owner read/write only |
| `sudo chown user:user file` | Fix file ownership |

## Background Reading

- [sshd manual (StrictModes)](https://man7.org/linux/man-pages/man8/sshd.8.html)
