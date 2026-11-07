# Lab broken-path: Repairing a PATH That Overwrites Instead of Extends

**Module:** 12 — Shell Environment & Configuration
**Category:** Linux / shell-config
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** PATH, export, .bashrc, which/command -v, env -i

---

## Scenario

Every new shell on this box is half-broken: `ls` works in the current session, but any fresh shell claims 'command not found' for everything in /usr/bin. A previous admin added `export PATH=/usr/local/apps/bin` to /home/intern/.bashrc — which REPLACES the PATH instead of extending it. Fix the line so the custom app directory is appended to the existing PATH, keeping both the system tools and the in-house deploy command working.

## Environment

- **Container name:** lab-12-01-broken-path
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-12-01-broken-path bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- A fresh shell cannot find ls, grep or any /usr/bin tool
- /home/intern/.bashrc contains `export PATH=/usr/local/apps/bin` with no $PATH reference
- The custom /usr/local/apps/bin/deploy command must stay reachable
- Login shells behave differently from the current session — the classic PATH-wipe signature

## Your Mission

1. Reproduce the bug: `bash -c 'source ~/.bashrc; ls'` fails while plain `ls` works.
2. Open ~/.bashrc and find the PATH-wiping line.
3. Change it to `export PATH="$PATH:/usr/local/apps/bin"`.
4. Verify in a clean environment: `env -i HOME=$HOME bash -c 'source ~/.bashrc; command -v ls; command -v deploy'` prints both paths.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — = vs :=</summary>
PATH is a colon-separated list. `export PATH=/usr/local/apps/bin` REPLACES the whole list; `export PATH=&quot;$PATH:/usr/local/apps/bin&quot;` KEEPS the old value and adds yours at the end.
</details>

<details>
<summary>Hint 2 — Always reference $PATH</summary>
Any correct PATH line contains $PATH somewhere on the right-hand side. If it doesn&#x27;t, it&#x27;s a wipe.
</details>

<details>
<summary>Hint 3 — Test like a fresh login</summary>
`env -i HOME=$HOME bash -c &#x27;source ~/.bashrc; command -v ls&#x27;` simulates a clean shell — if ls resolves there, real logins will work.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `echo $PATH` | Show the current command search path |
| `export PATH="$PATH:/new/dir"` | Append a directory to PATH (the safe form) |
| `command -v cmd` | Locate a command or prove it is missing |
| `env -i bash -c '...'` | Run in a clean environment — simulates a fresh login |
| `cat ~/.bashrc` | Inspect your shell startup file |

## Background Reading

- [Bash startup files](https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html)
- [PATH explained](https://en.wikipedia.org/wiki/PATH_(variable))
