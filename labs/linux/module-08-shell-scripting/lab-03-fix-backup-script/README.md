# Lab fix-backup-script: Debugging a Broken Backup Script

**Module:** 08 — Shell Scripting Basics
**Category:** Linux / scripting
**Difficulty:** ⭐⭐ Intermediate
**Estimated Time:** 20 minutes
**Skills Practiced:** bash -n, debugging, tar in scripts, conditionals, quoting

---

## Scenario

Last night's backup did not produce a usable archive. The previous admin's script at /usr/local/bin/backup.sh is a mess: the shebang is mangled, it creates a plain .tar instead of the documented .tar.gz, and it does not exit with a meaningful status. The web app it should back up lives in /var/www/app. Fix the script so a run produces /tmp/backups/app-backup.tar.gz containing the app files.

## Environment

- **Container name:** lab-08-03-fix-backup-script
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-08-03-fix-backup-script bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- After running, /tmp/backups contains app-backup.tar instead of app-backup.tar.gz
- The script's first line is the nonsense '#bash/bin' so direct execution picks the wrong interpreter
- The final echo prints a path built from a different variable than the tar command used
- The script never sets an explicit exit status for the scheduler to check

## Your Mission

1. Read the broken script: `cat /usr/local/bin/backup.sh`.
2. Check its syntax without running it: `bash -n /usr/local/bin/backup.sh`.
3. Fix the shebang to `#!/bin/bash` (use sudo to edit the root-owned file).
4. Make the tar command write /tmp/backups/app-backup.tar.gz and echo that exact path.
5. End the script with `exit 0` and test a full run.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Syntax check first</summary>
`bash -n script` parses the script without executing it — the fastest way to catch mangled lines.
</details>

<details>
<summary>Hint 2 — The shebang</summary>
It must read exactly `#!/bin/bash`. Anything else (like #bash/bin) is just a comment to sh and the script runs under the wrong shell.
</details>

<details>
<summary>Hint 3 — Compress while archiving</summary>
`tar czf &lt;file&gt;.tar.gz &lt;dir&gt;` compresses with gzip in one step — the &#x27;z&#x27; flag is what the current script is missing.
</details>

<details>
<summary>Hint 4 — Exit status</summary>
Finish with `exit 0` so the cron/scheduler sees success; after a failed tar you would `exit 1`.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `bash -n script.sh` | Syntax-check a script without running it |
| `bash -x script.sh` | Run with a trace of every command |
| `tar czf out.tar.gz dir` | Create a gzipped tar archive |
| `tar -tzf out.tar.gz` | List the contents of a tar.gz |
| `echo $?` | Inspect the exit code of the last command |

## Background Reading

- [Bash reference: exit status](https://www.gnu.org/software/bash/manual/html_node/Exit-Status.html)
- [tar manual](https://man7.org/linux/man-pages/man1/tar.1.html)
