# Lab ssh-client-config: Writing an SSH Client Config with Host Aliases

**Module:** 13 — SSH & Remote Access
**Category:** Linux / ssh
**Difficulty:** ⭐⭐ Intermediate
**Estimated Time:** 20 minutes
**Skills Practiced:** ~/.ssh/config, Host aliases, HostName, IdentityFile, Port

---

## Scenario

Everyone on the team types the same 120-character ssh command for the staging box: ssh -p 2222 -i ~/.ssh/id_ed25519 deploy@10.20.0.5. Create a ~/.ssh/config entry so `ssh staging` does the same thing: host alias staging, HostName 10.20.0.5, user deploy, port 2222, identity file ~/.ssh/id_ed25519.

## Environment

- **Container name:** lab-13-03-ssh-client-config
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-13-03-ssh-client-config bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- The team shares the long ssh command in chat instead of using config files
- ~/.ssh/config does not exist on this box
- The staging box runs sshd on port 2222, not 22
- Connections must use the id_ed25519 identity, not password prompts

## Your Mission

1. Create the file: `nano ~/.ssh/config` (or cat heredoc).
2. Write the Host staging block with the four settings.
3. Set safe permissions: `chmod 600 ~/.ssh/config`.
4. Verify the file parses: `ssh -G staging | grep -E 'hostname|user|port'` shows the resolved values.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — The block</summary>
`Host staging` on its own line, then indented settings — HostName, User, Port, IdentityFile. Everything indented applies until the next Host line.
</details>

<details>
<summary>Hint 2 — ssh -G is the oracle</summary>
`ssh -G staging` prints the FULL effective configuration for that alias — the definitive way to check your file without connecting anywhere.
</details>

<details>
<summary>Hint 3 — One alias, many settings</summary>
The point of the alias is that `ssh staging` now carries the port, user and identity for you — no flags to misremember.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `nano ~/.ssh/config` | Create the client configuration |
| `ssh -G alias` | Print the resolved config for an alias |
| `ssh staging` | Connect using the alias |
| `chmod 600 ~/.ssh/config` | Keep the config private |
| `man ssh_config` | All supported client options |

## Background Reading

- [ssh_config manual](https://man7.org/linux/man-pages/man5/ssh_config.5.html)
