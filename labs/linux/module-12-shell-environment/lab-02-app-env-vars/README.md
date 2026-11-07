# Lab app-env-vars: Exporting Application Environment Variables

**Module:** 12 — Shell Environment & Configuration
**Category:** Linux / shell-config
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** export, environment variables, .bashrc, parameter expansion :?

---

## Scenario

runapp.sh — the local app launcher — aborts with 'APP_ENV not set'. It sources ~/.bashrc and then requires two variables: APP_ENV (must be production) and API_PORT (must be 8443). Add both exports to /home/intern/.bashrc so every shell — and therefore the launcher — has them.

## Environment

- **Container name:** lab-12-02-app-env-vars
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-12-02-app-env-vars bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- ./runapp.sh fails with 'APP_ENV not set'
- echo $APP_ENV prints an empty line
- The launcher sources ~/.bashrc before checking, so the fix belongs there
- Required values: APP_ENV=production, API_PORT=8443

## Your Mission

1. Reproduce: `./runapp.sh` fails with 'APP_ENV not set'.
2. Append the two exports to /home/intern/.bashrc.
3. Retry: `./runapp.sh` now prints 'app starting in production on port 8443'.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — export makes it visible</summary>
A variable without export exists only in the current shell. Child processes (like runapp.sh) only see EXPORTED variables.
</details>

<details>
<summary>Hint 2 — Where to put it</summary>
runapp.sh sources ~/.bashrc, so exports added there are picked up on its next run — no need to edit the launcher.
</details>

<details>
<summary>Hint 3 — Values or variables?</summary>
`export APP_ENV=production` sets the literal string. Writing $APP_ENV=... would be an error — the dollar sign is only for READING variables.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `export VAR=value` | Set a variable and pass it to child processes |
| `echo $VAR` | Read a variable in the current shell |
| `printenv VAR` | Confirm a variable is in the environment |
| `: "${VAR:?msg}"` | Bail out with msg when VAR is unset — the launcher's guard |
| `cat >> ~/.bashrc` | Append lines to the startup file |

## Background Reading

- [Bash variables and export](https://www.gnu.org/software/bash/manual/html_node/Bash-Variables.html)
