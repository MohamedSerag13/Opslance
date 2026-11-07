# Lab loop-cleanup: Bulk File Moves with a for Loop

**Module:** 08 — Shell Scripting Basics
**Category:** Linux / scripting
**Difficulty:** ⭐⭐ Intermediate
**Estimated Time:** 20 minutes
**Skills Practiced:** for loops, globbing in scripts, mv, mkdir, file glob patterns

---

## Scenario

A monitoring agent dumps .tmp files into /home/intern/spool all day and nobody archives them. Your job: write /home/intern/cleanup.sh that moves every *.tmp file from the spool into /home/intern/spool /archive/ using a for loop (no manual one-by-one moves), make it executable and run it once. The non-tmp files must stay where they are.

## Environment

- **Container name:** lab-08-04-loop-cleanup
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-08-04-loop-cleanup bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- Six .tmp files clutter /home/intern/spool
- The archive/ subdirectory exists but is empty
- keepme.txt and the agent's README must not be touched
- The team wants a reusable script, not a one-off command

## Your Mission

1. Look at the spool: `ls -la /home/intern/spool`.
2. Write cleanup.sh with a `for f in /home/intern/spool/*.tmp` loop that moves each file into archive/.
3. Make the script executable with `chmod +x`.
4. Run it and confirm: 0 .tmp files in the spool root, 6 in archive/, everything else untouched.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Glob the pattern</summary>
`for f in /home/intern/spool/*.tmp` expands the wildcard into one loop iteration per match.
</details>

<details>
<summary>Hint 2 — Move inside the loop</summary>
The loop body is just `mv &quot;$f&quot; /home/intern/spool/archive/` — quote the variable so filenames with spaces stay intact.
</details>

<details>
<summary>Hint 3 — Guard the empty case</summary>
If no files match, the loop would try to move the literal &#x27;*.tmp&#x27;. Guard with `[ -e &quot;$f&quot; ] || continue` — good habit for idempotent scripts.
</details>

<details>
<summary>Hint 4 — Run it</summary>
`chmod +x cleanup.sh` then `./cleanup.sh` from your home directory.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `for f in *.tmp; do ... done` | Loop over every glob match |
| `mv "$f" dest/` | Move one file, safely quoted |
| `[ -e "$f" ] || continue` | Skip iterations where the glob matched nothing |
| `ls -la dir` | List a directory including hidden files |
| `find dir -name '*.tmp' | wc -l` | Count matching files |

## Background Reading

- [Bash loops](https://www.gnu.org/software/bash/manual/html_node/Looping-Constructs.html)
