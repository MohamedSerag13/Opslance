# Lab generate-ssh-keypair: Creating an SSH Keypair with ssh-keygen

**Module:** 13 — SSH & Remote Access
**Category:** Linux / ssh
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** ssh-keygen, ed25519, key permissions, ~/.ssh layout

---

## Scenario

You are about to be added to the jump-host rotation, and the policy requires key-based authentication with a modern algorithm: ed25519, no passphrase (the team's key agent handles unlocking), stored at the default location. Today ~/.ssh does not even exist. Generate the keypair and set the permissions SSH expects.

## Environment

- **Container name:** lab-13-01-generate-ssh-keypair
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-13-01-generate-ssh-keypair bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- `ls ~/.ssh` reports the directory does not exist
- The jump-host onboarding checklist requires an ed25519 keypair
- SSH refuses private keys whose permissions are too open

## Your Mission

1. Create the keypair: `ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519 -C intern@staging`.
2. Set directory permissions: `chmod 700 ~/.ssh`.
3. Set private-key permissions: `chmod 600 ~/.ssh/id_ed25519`.
4. Verify: both files exist and `ssh-keygen -lf ~/.ssh/id_ed25519.pub` prints the fingerprint.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — The algorithm</summary>
`-t ed25519` picks the modern Ed25519 algorithm — short keys, fast, and the current best practice over RSA.
</details>

<details>
<summary>Hint 2 — No passphrase this time</summary>
`-N &quot;&quot;` supplies an empty passphrase; the two quotes are required so ssh-keygen does not prompt.
</details>

<details>
<summary>Hint 3 — Permissions are policy</summary>
SSH enforces them: ~/.ssh at 700, private key at 600. Group/world-readable private keys get refused with &#x27;UNPROTECTED PRIVATE KEY FILE&#x27;.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `ssh-keygen -t ed25519` | Generate an Ed25519 keypair |
| `-N ""` | Empty passphrase (no prompt) |
| `-f ~/.ssh/id_ed25519` | Key output path |
| `chmod 700 ~/.ssh` | Directory: owner-only |
| `ssh-keygen -lf key.pub` | Show a key's fingerprint |

## Background Reading

- [ssh-keygen manual](https://man7.org/linux/man-pages/man1/ssh-keygen.1.html)
