# Lab script-arguments: Handling Arguments and Exit Codes in a Script

**Module:** 08 — Shell Scripting Basics
**Category:** Linux / scripting
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** $1, positional parameters, exit codes, if statements, usage messages

---

## Scenario

The support team wants a tiny greeting tool for their onboarding emails: /home/intern/greet.sh must print 'Hello, <name>!' when given a name as the first argument, and when called without an argument it must print a 'Usage: greet.sh <name>' line and exit with a non-zero status so their automation can detect the mistake.

## Environment

- **Container name:** lab-08-02-script-arguments
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-08-02-script-arguments bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- Calling the script with a name should print 'Hello, Sam!' but nothing exists yet
- Calling it with no argument must NOT print a greeting
- Support automation checks exit codes — a missing argument must exit non-zero
- The usage message must mention 'Usage' so humans recognise it

## Your Mission

1. Write the script with an `if [ -z "$1" ]` guard for the missing-argument case.
2. In the guard, print `Usage: greet.sh <name>` and `exit 1`.
3. Otherwise print `Hello, $1!`.
4. Test all three: with an argument, without one, and check `$?` afterwards.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — First argument is $1</summary>
`$1` holds the first positional parameter; `&quot;$1&quot;` (quoted) is safe even when it is empty.
</details>

<details>
<summary>Hint 2 — Test for empty</summary>
`if [ -z &quot;$1&quot; ]` is true when the argument is missing or empty. `-z` means zero-length.
</details>

<details>
<summary>Hint 3 — Exit codes</summary>
`exit 1` ends the script with failure status. The caller sees it in `$?` — 0 means success, anything else means failure.
</details>

<details>
<summary>Hint 4 — Wire it together</summary>
echo the usage line BEFORE exiting so humans see why the script failed.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `$1, $2, $@, $#` | Positional parameters: first, second, all, count |
| `[ -z "$1" ]` | True when the first argument is empty/missing |
| `exit 1` | End the script with a failure exit code |
| `$?` | Exit status of the last command (0 = success) |
| `./greet.sh Sam` | Run the script with an argument |

## Background Reading

- [Bash reference: positional parameters](https://www.gnu.org/software/bash/manual/html_node/Positional-Parameters.html)
- [Exit statuses](https://www.gnu.org/software/bash/manual/html_node/Exit-Status.html)
