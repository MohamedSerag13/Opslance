# Lab who-am-i: Who Am I? Investigating and Repairing a User Account

**Module:** 06 — Users, Groups & Sudo
**Category:** Linux / users
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** whoami, id, groups, /etc/passwd, usermod, account audit

---

## Scenario

It is your first day as a junior sysadmin. Before you get access to anything, your lead asks you to prove you understand Linux user accounts: document your own identity from the shell, then repair a service account called svc_backup whose login shell was accidentally set to /bin/false, which breaks any interactive troubleshooting login.

## Environment

- **Container name:** lab-06-01-who-am-i
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-06-01-who-am-i bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- The service account svc_backup cannot be used for interactive logins
- /etc/passwd shows svc_backup with the shell /bin/false
- Nobody on the team has written down which groups svc_backup belongs to
- Your own account details (uid, groups) have never been documented

## Your Mission

1. Save the output of `id` into `/home/intern/audit.txt`.
2. Append your username with `whoami` and the `svc_backup` line from `/etc/passwd` to the same file.
3. Change the svc_backup login shell to `/bin/bash` with `usermod`.
4. Confirm the fix by reading the svc_backup entry in `/etc/passwd` again.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Start with who you are</summary>
Run `id` and `whoami` — `id` prints uid, gid and all supplementary groups in one line.
</details>

<details>
<summary>Hint 2 — Where accounts live</summary>
Every local account is one line in /etc/passwd. Filter it with: `grep svc_backup /etc/passwd`. The last field is the login shell.
</details>

<details>
<summary>Hint 3 — Change the shell</summary>
Use: `sudo usermod -s /bin/bash svc_backup` — the `-s` flag sets the login shell. Verify with grep again afterwards.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `id` | Show your uid, gid and group memberships |
| `whoami` | Print your effective username |
| `grep user /etc/passwd` | Show one account line: name:x:uid:gid:comment:home:shell |
| `sudo usermod -s /bin/bash USER` | Change a user's login shell |
| `groups USER` | List the groups a user belongs to |

## Background Reading

- [/etc/passwd file format](https://man7.org/linux/man-pages/man5/passwd.5.html)
- [usermod manual](https://man7.org/linux/man-pages/man8/usermod.8.html)
