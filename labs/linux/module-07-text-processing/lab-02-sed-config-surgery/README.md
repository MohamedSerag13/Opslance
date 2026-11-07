# Lab sed-config-surgery: Editing Config Files In Place with sed

**Module:** 07 — Text Processing & Pipelines
**Category:** Linux / text-processing
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** sed, sed -i, backup copies, cp, grep

---

## Scenario

The orders-api is pointing at the wrong port and still has debug mode enabled after yesterday's release. Change control requires that you keep an unmodified backup of any config before editing it. The file is /etc/app/settings.conf and two values must change: port=3000 becomes port=8080, and debug=true becomes debug=false. Everything else must stay byte-identical.

## Environment

- **Container name:** lab-07-02-sed-config-surgery
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-07-02-sed-config-surgery bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- The API listens on 3000 but the load balancer forwards to 8080
- debug=true spams verbose logs in production-like runs
- Change control requires a .bak copy of the original config
- The remaining settings must not be touched

## Your Mission

1. Make the required backup: `cp /etc/app/settings.conf /home/intern/settings.conf.bak`.
2. Change the port: `sudo sed -i 's/^port=3000/port=8080/' /etc/app/settings.conf`.
3. Disable debug: `sudo sed -i 's/^debug=true/debug=false/' /etc/app/settings.conf`.
4. Verify with `grep` that the two lines changed and everything else is intact.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Backup first</summary>
`cp /etc/app/settings.conf ~/settings.conf.bak` — change control wants the original preserved in your home directory.
</details>

<details>
<summary>Hint 2 — Anchor the match</summary>
In the sed script `s/^port=3000/port=8080/`, the `^` anchors to the start of the line so you never match a comment or another value containing &#x27;port=&#x27;.
</details>

<details>
<summary>Hint 3 — In place editing</summary>
`sed -i` edits the file directly instead of printing to the terminal. Editing /etc/app/ needs sudo because the file is root-owned.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `cp file file.bak` | Keep a backup before editing |
| `sed 's/old/new/' file` | Preview a substitution (prints, doesn't save) |
| `sed -i 's/^old$/new/' file` | Substitute in place, anchored to the whole line |
| `grep -n 'key' file` | Show matching lines with line numbers |
| `diff file file.bak` | Show exactly what your edit changed |

## Background Reading

- [sed manual](https://www.gnu.org/software/sed/manual/sed.html)
