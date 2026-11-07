# Lab remove-rogue-package: Removing Unapproved Software with apt

**Module:** 09 — Package Management
**Category:** Linux / packages
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** apt remove, apt purge, dpkg -s, dpkg -l, autoremove

---

## Scenario

The quarterly software audit found the novelty package 'sl' (the steam locomotive) installed on this staging server. Policy says unapproved packages must be removed AND purged — removal alone leaves config files behind. Remove it, purge its leftovers, and confirm both the package record and the binary are gone.

## Environment

- **Container name:** lab-09-02-remove-rogue-package
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-09-02-remove-rogue-package bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- dpkg -s sl reports the package as installed
- Typing 'sl' by accident (instead of 'ls') launches a steam locomotive in the terminal
- Security policy requires the purge of config files, not just removal
- The audit ticket is not closed until dpkg no longer knows the package

## Your Mission

1. Show the package record: `dpkg -s sl` — note the 'Status: install ok installed' line.
2. Remove it: `sudo apt-get remove -y sl`.
3. Purge the leftovers: `sudo apt-get purge -y sl`.
4. Verify: `dpkg -s sl` now fails and `command -v sl` finds nothing.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Check before you change</summary>
`dpkg -s sl` prints the package record including its status; after a successful purge the same command exits non-zero.
</details>

<details>
<summary>Hint 2 — remove vs purge</summary>
`apt-get remove` deletes the program but keeps config files under /etc. `apt-get purge` deletes the program AND its configs.
</details>

<details>
<summary>Hint 3 — Verify both layers</summary>
The binary disappearing (`command -v sl`) proves removal; `dpkg -s sl` failing proves the package database is clean too.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `dpkg -s pkg` | Show a package's record and status |
| `dpkg -l | grep name` | Search the installed-package list |
| `sudo apt-get remove -y pkg` | Uninstall a package (keeps configs) |
| `sudo apt-get purge -y pkg` | Uninstall AND delete its config files |
| `sudo apt-get autoremove` | Drop dependencies that are no longer needed |

## Background Reading

- [apt-get manual](https://manpages.ubuntu.com/manpages/jammy/en/man8/apt-get.8.html)
- [dpkg query manual](https://man7.org/linux/man-pages/man1/dpkg-query.1.html)
