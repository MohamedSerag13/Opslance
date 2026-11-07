# Lab shared-folder-access: Fixing a Shared Project Folder with Group Permissions

**Module:** 06 — Users, Groups & Sudo
**Category:** Linux / users
**Difficulty:** ⭐⭐ Intermediate
**Estimated Time:** 20 minutes
**Skills Practiced:** groupadd, usermod, chgrp, chmod, setgid bit, stat

---

## Scenario

Two contractors, alice and bob, must collaborate on /srv/projectx. The directory is currently owned by root:root with 755 permissions, so neither of them can write to it. Files they will create must stay editable by both — which is exactly what a shared group plus the setgid bit is for. There is no projectx group yet.

## Environment

- **Container name:** lab-06-03-shared-folder-access
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-06-03-shared-folder-access bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- bob gets 'Permission denied' when saving files in /srv/projectx
- alice can read but not write either
- Files created by one of them are not editable by the other
- No shared group for the project exists in /etc/group

## Your Mission

1. Create the group: `sudo groupadd projectx`.
2. Add both contractors: `sudo usermod -aG projectx alice` and the same for bob.
3. Change the group ownership: `sudo chgrp -R projectx /srv/projectx`.
4. Set permissions: `sudo chmod 2770 /srv/projectx` then `sudo chmod -R g+rwX,o-rwx /srv/projectx`.
5. Verify with `stat` and by checking /etc/group.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — One group to rule them all</summary>
Create the group first with `sudo groupadd projectx`, then add both users with `usermod -aG`.
</details>

<details>
<summary>Hint 2 — Group ownership</summary>
`chgrp -R projectx /srv/projectx` changes the group of the directory and everything inside it.
</details>

<details>
<summary>Hint 3 — The setgid bit</summary>
On a directory, chmod 2770 sets the setgid bit: every NEW file inside automatically inherits the directory&#x27;s group, so alice and bob stay in the same group without manual chgrp.
</details>

<details>
<summary>Hint 4 — Verify like an admin</summary>
`stat -c &#x27;%U %G %a&#x27; /srv/projectx` shows owner, group and numeric permissions in one line.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `sudo groupadd NAME` | Create a new group |
| `sudo usermod -aG group user` | Append a user to a group |
| `sudo chgrp -R group dir` | Change group ownership recursively |
| `sudo chmod 2770 dir` | rwx for owner+group, setgid, nothing for others |
| `stat -c '%U %G %a' path` | Show owner, group and permission bits |

## Background Reading

- [Understanding setgid on directories](https://www.gnu.org/software/coreutils/manual/html_node/Directory-Setuid-and-Setgid.html)
- [chmod manual](https://man7.org/linux/man-pages/man1/chmod.1.html)
