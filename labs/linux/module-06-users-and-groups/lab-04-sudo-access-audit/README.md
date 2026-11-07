# Lab sudo-access-audit: Granting and Auditing sudo Access

**Module:** 06 — Users, Groups & Sudo
**Category:** Linux / users
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** sudo, usermod, groups, sudo -l, privilege audit

---

## Scenario

Jordan from the on-call rotation was promised sudo access on this staging box, but every elevated command he runs fails with 'permission denied'. On Debian/Ubuntu systems sudo is granted by membership of the sudo group — and he is not in it. Fix the membership, then write down exactly what he is now allowed to run so the change is auditable.

## Environment

- **Container name:** lab-06-04-sudo-access-audit
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-06-04-sudo-access-audit bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- jordan's sudo commands fail even though he knows his password
- `groups jordan` does not list the sudo group
- The operations handbook requires a written record of every sudo grant
- No audit file exists for this change yet

## Your Mission

1. Confirm jordan exists and check his current groups with `groups jordan`.
2. Add him to the sudo group: `sudo usermod -aG sudo jordan`.
3. List his effective sudo privileges with `sudo -l -U jordan`.
4. Save both outputs into `/home/intern/sudo-audit.txt` as the audit record.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — The sudo group</summary>
On Ubuntu, membership of the sudo group is what allows a user to escalate. Check it with `groups jordan`.
</details>

<details>
<summary>Hint 2 — Grant it</summary>
`sudo usermod -aG sudo jordan` — the same -aG pattern as any other group.
</details>

<details>
<summary>Hint 3 — Ask sudo itself</summary>
`sudo -l -U jordan` shows exactly which commands the user may run — ideal evidence for an audit record. You can run it because your intern account has passwordless sudo in this lab.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `groups user` | List a user's group memberships |
| `sudo usermod -aG sudo user` | Grant sudo via group membership |
| `sudo -l -U user` | List which commands a user may run with sudo |
| `grep '^sudo:' /etc/group` | Show everyone in the sudo group |

## Background Reading

- [sudo manual](https://www.sudo.ws/docs/man/sudo.man/)
- [How sudo group works on Ubuntu](https://wiki.ubuntu.com/Security/Features#sudo)
