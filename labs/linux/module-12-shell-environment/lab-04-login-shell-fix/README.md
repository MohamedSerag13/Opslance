# Lab login-shell-fix: Wiring .profile to Source .bashrc

**Module:** 12 — Shell Environment & Configuration
**Category:** Linux / shell-config
**Difficulty:** ⭐⭐ Intermediate
**Estimated Time:** 20 minutes
**Skills Practiced:** login vs non-login shells, .profile, .bashrc, bash -l, startup file order

---

## Scenario

Your custom environment works in terminal tabs but evaporates over SSH. Reason: SSH starts a LOGIN shell, which reads ~/.profile — and this .profile is empty, so ~/.bashrc (where APP_MODE=training and the team aliases live) is never sourced. Fix /home/intern/.profile so it sources ~/.bashrc for bash users, then prove a login shell sees APP_MODE.

## Environment

- **Container name:** lab-12-04-login-shell-fix
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-12-04-login-shell-fix bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- Over SSH: `echo $APP_MODE` prints nothing, aliases are gone
- In local terminal tabs everything works (they start non-login shells)
- /home/intern/.profile exists but does not mention .bashrc
- bash -lc 'echo $APP_MODE' prints an empty line

## Your Mission

1. Reproduce: `bash -lc 'echo $APP_MODE'` is empty while `bash -c 'source ~/.bashrc; echo $APP_MODE'` prints training.
2. Append the standard guard to ~/.profile: `[ -n "$BASH_VERSION" ] && . "$HOME/.bashrc"`.
3. Verify the login shell: `bash -lc 'echo $APP_MODE'` prints training.
4. Syntax-check the edited file: `bash -n ~/.profile`.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Two kinds of shells</summary>
Login shells (SSH, console, bash -l) read ~/.profile; non-login interactive shells (terminal tabs) read ~/.bashrc. Ubuntu wires them together FROM .profile — and that wiring is missing here.
</details>

<details>
<summary>Hint 2 — The standard guard</summary>
`[ -n &quot;$BASH_VERSION&quot; ] &amp;&amp; . &quot;$HOME/.bashrc&quot;` sources .bashrc only under bash (sh/dash would choke on bashisms).
</details>

<details>
<summary>Hint 3 — Prove it</summary>
`bash -l` starts a login shell: it reads .profile → sources .bashrc → APP_MODE must appear.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `bash -l` | Start a login shell (reads .profile) |
| `bash -lc 'cmd'` | Run cmd in a login shell |
| `bash -n file` | Syntax-check a startup file |
| `. ~/.bashrc` | Source a file into the current shell |
| `echo $0` | Distinguish login (-bash) from non-login (bash) shells |

## Background Reading

- [Bash startup files](https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html)
