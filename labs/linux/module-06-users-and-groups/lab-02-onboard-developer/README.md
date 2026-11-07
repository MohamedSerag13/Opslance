# Lab onboard-developer: Onboarding a New Developer Account

**Module:** 06 — Users, Groups & Sudo
**Category:** Linux / users
**Difficulty:** ⭐ Beginner
**Estimated Time:** 20 minutes
**Skills Practiced:** useradd, usermod, groupadd, chpasswd, /etc/passwd, /etc/group

---

## Scenario

A new platform engineer named Amara Okafor starts today. HR has raised the standard onboarding ticket: create her local account on the shared staging box, give her a bash shell with a home directory, put her GECOS comment in the standard 'Full Name - Team' format, add her to the developers group and set a temporary password she must change on first login.

## Environment

- **Container name:** lab-06-02-onboard-developer
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-06-02-onboard-developer bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- There is no amara account on the server yet
- The developers group already exists but has no new members
- The onboarding ticket requires the GECOS comment 'Amara Okafor - Platform Team'
- Without an account Amara cannot even SSH into the staging box

## Your Mission

1. Create the account: `sudo useradd -m -s /bin/bash -c "Amara Okafor - Platform Team" amara`.
2. Add amara to the existing `developers` group with `usermod -aG`.
3. Set a temporary password with chpasswd (e.g. `echo 'amara:ChangeMe123!' | sudo chpasswd`).
4. Verify: home directory exists, /etc/passwd shows the right shell and comment, /etc/group shows her in developers.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Create, don&#x27;t edit</summary>
Use `useradd -m` — the `-m` flag creates /home/&lt;name&gt; and copies the skeleton files. Never edit /etc/passwd directly.
</details>

<details>
<summary>Hint 2 — GECOS comment</summary>
The `-c` flag of useradd sets the comment (real name) field: `-c &quot;Amara Okafor - Platform Team&quot;`.
</details>

<details>
<summary>Hint 3 — Append to a group</summary>
`usermod -aG developers amara` — the `-a` (append) is critical: without it you REPLACE all her groups.
</details>

<details>
<summary>Hint 4 — Temporary password</summary>
`echo &#x27;amara:ChangeMe123!&#x27; | sudo chpasswd` sets the password non-interactively.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `sudo useradd -m -s /bin/bash -c "Comment" name` | Create a user with home dir, shell and comment |
| `sudo usermod -aG group user` | Append a user to a supplementary group |
| `echo 'user:pass' | sudo chpasswd` | Set a password non-interactively |
| `grep user /etc/group` | Check group membership |
| `sudo passwd -S user` | Show password status (L=locked, P=set) |

## Background Reading

- [useradd manual](https://man7.org/linux/man-pages/man8/useradd.8.html)
- [group file format](https://man7.org/linux/man-pages/man5/group.5.html)
