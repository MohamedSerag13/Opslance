# Lab fingerprint-audit: Auditing Key Fingerprints and Cleaning known_hosts

**Module:** 13 — SSH & Remote Access
**Category:** Linux / ssh
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** ssh-keygen -lf, known_hosts, ssh-keygen -R, host key rotation

---

## Scenario

The staging network was renumbered and host 10.0.0.9 was retired, but your ~/.ssh/known_hosts still carries its old key — a stale entry that will one day collide with a recycled IP. Produce a fingerprint report of YOUR keypair in /home/intern/fingerprints.txt (ssh-keygen -lf), and remove the retired host from known_hosts with ssh-keygen -R.

## Environment

- **Container name:** lab-13-04-fingerprint-audit
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-13-04-fingerprint-audit bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- known_hosts contains an entry for the retired host 10.0.0.9
- Nobody has a written record of the team key's fingerprint
- The compliance checklist wants /home/intern/fingerprints.txt
- A recycled 10.0.0.9 would trigger scary MITM warnings

## Your Mission

1. Show the stale entry: `grep 10.0.0.9 ~/.ssh/known_hosts`.
2. Generate the report: `ssh-keygen -lf ~/.ssh/id_ed25519.pub > /home/intern/fingerprints.txt`.
3. Remove the stale host: `ssh-keygen -R 10.0.0.9`.
4. Verify: the report contains an ED25519 fingerprint and 10.0.0.9 no longer matches in known_hosts.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Fingerprints</summary>
`ssh-keygen -lf keyfile` prints the bit length, SHA256 fingerprint and key type — the compact identity of a key that humans can compare.
</details>

<details>
<summary>Hint 2 — Retire a known host</summary>
`ssh-keygen -R 10.0.0.9` removes every entry for that host and keeps the old file as known_hosts.old — the supported way, no manual editing.
</details>

<details>
<summary>Hint 3 — Report first, cleanup second</summary>
Generate the compliance report before touching known_hosts — the report is the deliverable, the cleanup is the hygiene.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `ssh-keygen -lf key.pub` | Print a key's fingerprint |
| `ssh-keygen -R hostname` | Remove a host from known_hosts |
| `grep host ~/.ssh/known_hosts` | Check a stored host key |
| `cat ~/.ssh/known_hosts.old` | ssh-keygen -R keeps a backup |

## Background Reading

- [ssh-keygen manual](https://man7.org/linux/man-pages/man1/ssh-keygen.1.html)
