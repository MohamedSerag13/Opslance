# Lab whats-eating-the-disk: Hunting the Biggest File with du and find

**Module:** 11 — Storage & Disk Usage
**Category:** Linux / storage
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** du, du -ah, sort -rh, find -size, rm

---

## Scenario

A monitoring alert says the data volume is nearly full. Your lead suspects a runaway core dump under /var. Find the biggest file below /var (du + sort is the classic pipeline), record its size in /home/intern/findings.txt as largest=40MB, delete the culprit — and only the culprit. The legitimate old-2024.tar.gz backup must survive.

## Environment

- **Container name:** lab-11-01-whats-eating-the-disk
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-11-01-whats-eating-the-disk bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- Disk usage on the volume is at the alert threshold
- A huge core dump is rumoured to live somewhere under /var
- The team wants the size recorded in /home/intern/findings.txt before deletion
- The legitimate backup /var/backups/old-2024.tar.gz must NOT be deleted

## Your Mission

1. Find the big ones: `sudo du -ah /var 2>/dev/null | sort -rh | head -5`.
2. Record the finding: write `largest=40MB` into /home/intern/findings.txt.
3. Delete the culprit: `sudo rm /var/backups/core.dump`.
4. Verify the disk artefacts: core.dump is gone, old-2024.tar.gz still exists.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — The du pipeline</summary>
`du -ah /var` lists every file and directory with its size; `sort -rh` sorts human-readable sizes biggest-first; `head -5` shows the worst offenders.
</details>

<details>
<summary>Hint 2 — Alternative: find by size</summary>
`sudo find /var -type f -size +20M` lists files bigger than 20 MB — often faster when you already know the threshold.
</details>

<details>
<summary>Hint 3 — Record, then delete</summary>
Write findings.txt BEFORE rm — the ticket needs the evidence even after the file is gone.
</details>

<details>
<summary>Hint 4 — Surgical deletion</summary>
Delete the exact path `sudo rm /var/backups/core.dump`. Never wildcard /var/backups/* — that would take the legitimate backup with it.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `du -ah dir | sort -rh | head` | List and rank everything under dir by size |
| `du -sh dir` | Total size of one directory |
| `find dir -type f -size +20M` | Files larger than 20 MB |
| `df -h` | Free space per filesystem |
| `rm /exact/path` | Delete one specific file (no wildcards here!) |

## Background Reading

- [du manual](https://man7.org/linux/man-pages/man1/du.1.html)
- [find manual](https://man7.org/linux/man-pages/man1/find.1.html)
