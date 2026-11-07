# Lab alias-rescue: Defining Shell Aliases in .bashrc

**Module:** 12 — Shell Environment & Configuration
**Category:** Linux / shell-config
**Difficulty:** ⭐ Beginner
**Estimated Time:** 10 minutes
**Skills Practiced:** alias, unalias, .bashrc, shell productivity

---

## Scenario

A 'cleanup' script gutted everyone's .bashrc yesterday and the team lost its muscle-memory aliases. Restore the two documented standards to /home/intern/.bashrc: `alias ll='ls -alF'` and `alias grep='grep --color=auto'`. Aliases only exist in interactive shells, so they live in .bashrc — and they must survive sourcing in a non-interactive test too.

## Environment

- **Container name:** lab-12-03-alias-rescue
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-12-03-alias-rescue bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- `ll` answers 'command not found' in new terminals
- grep output has no colour highlighting
- The team's .bashrc standard defines exactly two aliases: ll and grep
- A cleanup script rewrote .bashrc without the alias block

## Your Mission

1. Check the current state: `alias ll` reports 'not found'.
2. Append both alias definitions to /home/intern/.bashrc.
3. Verify in a fresh sourced shell: `bash -c 'source ~/.bashrc; alias ll; alias grep'` prints both.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Alias syntax</summary>
`alias name=&#x27;expansion&#x27;` — with the equals sign attached to the name and the expansion quoted. Spaces around = are an error.
</details>

<details>
<summary>Hint 2 — Where aliases live</summary>
Aliases are for interactive convenience, so .bashrc is their home. They are NOT inherited by scripts (that&#x27;s deliberate — scripts need predictable commands).
</details>

<details>
<summary>Hint 3 — Verify by sourcing</summary>
Aliases defined in .bashrc apply after the file is sourced. Test with: `bash -c &#x27;source ~/.bashrc; alias ll&#x27;`.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `alias name='cmd'` | Define an alias |
| `alias` | List all current aliases |
| `unalias name` | Remove an alias |
| `type ll` | Show what an alias (or command) resolves to |
| `cat >> ~/.bashrc` | Persist an alias across shells |

## Background Reading

- [Bash aliases](https://www.gnu.org/software/bash/manual/html_node/Aliases.html)
