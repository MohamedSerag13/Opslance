# Lab motd-typo-rescue: Fixing the Login Banner with nano, vim or sed

**Module:** 07 — Text Processing & Pipelines
**Category:** Linux / text-processing
**Difficulty:** ⭐ Beginner
**Estimated Time:** 10 minutes
**Skills Practiced:** nano, vim basics, tee -a, sed, tail

---

## Scenario

Someone fat-fingered the message of the day: every user who logs in sees 'Welcom to the Opslance staging server.' Corporate comms also require a 'Managed by Opslance.' line as the LAST line of the banner. Fix both — with the terminal editor of your choice (nano or vim), or with sed if you prefer to stay hands-off.

## Environment

- **Container name:** lab-07-04-motd-typo-rescue
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-07-04-motd-typo-rescue bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- Login banner greets users with 'Welcom' instead of 'Welcome'
- The required 'Managed by Opslance.' footer line is missing
- The banner lives in /etc/motd and is root-owned
- Users notice before managers do — fix it fast

## Your Mission

1. Open the file: `sudo nano /etc/motd` (or `sudo vi /etc/motd`).
2. Fix the typo 'Welcom' → 'Welcome'.
3. Add 'Managed by Opslance.' as the last line, then save.
4. Alternatively do it without an editor: sed for the typo and `tee -a` to append.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — nano in 10 seconds</summary>
Open with sudo nano /etc/motd, move with arrows, type your fix, then Ctrl+O Enter to save and Ctrl+X to exit.
</details>

<details>
<summary>Hint 2 — vim in 10 seconds</summary>
Open with sudo vi /etc/motd, press i to insert, fix the text, press Esc, then type :wq and Enter to save and quit.
</details>

<details>
<summary>Hint 3 — No-editor option</summary>
Fix the typo with `sudo sed -i &#x27;s/Welcom/Welcome/&#x27; /etc/motd` and append with `echo &#x27;Managed by Opslance.&#x27; | sudo tee -a /etc/motd`.
</details>

<details>
<summary>Hint 4 — Verify the tail</summary>
`tail -1 /etc/motd` must print exactly: Managed by Opslance.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `sudo nano file` | Open a file in the nano editor |
| `sudo vi file` | Open a file in vim (i=insert, Esc, :wq=save&quit) |
| `sed -i 's/old/new/' file` | Replace the first match on each line, in place |
| `echo text | sudo tee -a file` | Append a line to a root-owned file |
| `tail -n 1 file` | Print the last line of a file |

## Background Reading

- [nano editor guide](https://www.nano-editor.org/dist/latest/nano.html)
- [vim basics (interactive)](https://www.openvim.com/)
