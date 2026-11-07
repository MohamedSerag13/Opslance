# Lab install-missing-tool: Installing Software with apt

**Module:** 09 — Package Management
**Category:** Linux / packages
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** apt update, apt install, command -v, package verification

---

## Scenario

A monitoring agent's healthcheck script fails because curl was never installed on this server. Your job is the standard Debian/Ubuntu drill: refresh the local package index with apt update, install curl, and verify the tool actually runs. This lab's container has network access so apt can reach the package archives.

## Environment

- **Container name:** lab-09-01-install-missing-tool
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-09-01-install-missing-tool bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.
- **Network:** this lab's container has outbound network access (bridge) so apt can download packages.

## Symptoms

- /usr/local/bin/healthcheck.sh fails immediately with 'curl: command not found'
- No curl binary anywhere on the PATH
- The local apt package index has never been refreshed on this box

## Your Mission

1. Confirm the problem: `command -v curl || echo missing`.
2. Refresh the index: `sudo apt-get update`.
3. Install: `sudo apt-get install -y curl`.
4. Verify: `curl --version` prints a version and the healthcheck script exists.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Index first, install second</summary>
apt installs from its local index. If the index is stale or empty, `sudo apt-get update` refreshes it from the archives — always run it before installing.
</details>

<details>
<summary>Hint 2 — The -y flag</summary>
`apt-get install -y curl` answers yes to the &#x27;Do you want to continue?&#x27; prompt automatically — essential in scripts.
</details>

<details>
<summary>Hint 3 — Verify like an operator</summary>
`command -v curl` prints the path if the tool is on the PATH and nothing (with a failing exit status) if it is not.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `sudo apt-get update` | Refresh the local package index |
| `sudo apt-get install -y pkg` | Install a package without prompting |
| `apt-cache policy pkg` | Show installed and candidate versions |
| `command -v curl` | Check whether a command is on the PATH |
| `dpkg -l | grep curl` | Confirm the package is registered as installed |

## Background Reading

- [apt-get manual](https://manpages.ubuntu.com/manpages/jammy/en/man8/apt-get.8.html)
