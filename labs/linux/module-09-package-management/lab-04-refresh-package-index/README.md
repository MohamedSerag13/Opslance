# Lab refresh-package-index: Rebuilding the apt Package Index

**Module:** 09 — Package Management
**Category:** Linux / packages
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** apt update, /var/lib/apt/lists, apt-cache policy, report writing

---

## Scenario

This image was built with `rm -rf /var/lib/apt/lists/*` to keep it small — which means apt can no longer look anything up: even `apt list nginx` finds nothing. Refresh the index with apt update, then use apt-cache policy to find out which nginx version the archives would install, and record it in /home/intern/pkg-report.txt as nginx-candidate=<version>. This lab's container has network access.

## Environment

- **Container name:** lab-09-04-refresh-package-index
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-09-04-refresh-package-index bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.
- **Network:** this lab's container has outbound network access (bridge) so apt can download the package index.

## Symptoms

- `apt list nginx` reports no matches although the package obviously exists
- /var/lib/apt/lists is empty — no package index files at all
- apt-cache policy shows no Candidate for nginx

## Your Mission

1. Reproduce: `apt-cache policy nginx` shows no candidate while the index is empty.
2. Rebuild: `sudo apt-get update`.
3. Check again: `apt-cache policy nginx` now shows a Candidate version.
4. Write `nginx-candidate=<version>` into /home/intern/pkg-report.txt.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — What update really does</summary>
apt-get update downloads fresh index files into /var/lib/apt/lists/. Install anything you like afterwards — but without this step apt is blind.
</details>

<details>
<summary>Hint 2 — Who would install what</summary>
`apt-cache policy nginx` prints Installed: (none) and Candidate: &lt;version&gt; — the version a fresh install would get right now.
</details>

<details>
<summary>Hint 3 — Capture the version</summary>
`apt-cache policy nginx | grep &#x27;Candidate:&#x27; | awk &#x27;{print $2}&#x27;` isolates the version string for your report line.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `sudo apt-get update` | Rebuild the package index in /var/lib/apt/lists |
| `apt-cache policy pkg` | Show installed and candidate versions |
| `ls /var/lib/apt/lists | head` | Inspect the downloaded index files |
| `apt list -a pkg` | List all known versions of a package |

## Background Reading

- [apt-get manual](https://manpages.ubuntu.com/manpages/jammy/en/man8/apt-get.8.html)
- [apt-cache manual](https://manpages.ubuntu.com/manpages/jammy/en/man8/apt-cache.8.html)
