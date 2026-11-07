# Lab first-script: Writing and Running Your First Shell Script

**Module:** 08 — Shell Scripting Basics
**Category:** Linux / scripting
**Difficulty:** ⭐ Beginner
**Estimated Time:** 10 minutes
**Skills Practiced:** shebang, chmod +x, echo, executing scripts

---

## Scenario

The team keeps pasting the same boot-check command into terminals by hand. Your lead asks you to turn it into your first script: /home/intern/hello.sh must print exactly 'Opslance boot OK' when run. It needs a proper shebang so it runs under bash no matter who invokes it, and the executable bit so it can be run directly.

## Environment

- **Container name:** lab-08-01-first-script
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-08-01-first-script bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- There is no boot-check script yet — everyone types the command manually
- Scripts without a shebang behave differently depending on how they are invoked
- A script without the executable bit cannot be run as ./hello.sh

## Your Mission

1. Create the file with a `#!/bin/bash` first line and an `echo "Opslance boot OK"` line.
2. Make it executable: `chmod +x /home/intern/hello.sh`.
3. Run it both ways: `bash /home/intern/hello.sh` and `/home/intern/hello.sh`.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — The shebang line</summary>
The first line `#!/bin/bash` tells the kernel which interpreter to use. Without it, ./hello.sh may run under sh with different behaviour.
</details>

<details>
<summary>Hint 2 — Create and edit</summary>
Use `nano /home/intern/hello.sh` to write the two lines, or `printf`/`cat` from the shell.
</details>

<details>
<summary>Hint 3 — The executable bit</summary>
`chmod +x /home/intern/hello.sh` adds execute permission so `./hello.sh` works, not just `bash hello.sh`.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `nano script.sh` | Create/edit a script in nano |
| `chmod +x script.sh` | Make a script executable |
| `./script.sh` | Run a script from the current directory |
| `bash script.sh` | Run a script explicitly under bash |
| `head -1 script.sh` | Show the shebang line |

## Background Reading

- [Shebang explained](https://en.wikipedia.org/wiki/Shebang_(Unix))
- [chmod manual](https://man7.org/linux/man-pages/man1/chmod.1.html)
