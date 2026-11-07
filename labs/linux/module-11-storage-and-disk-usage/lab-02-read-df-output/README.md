# Lab read-df-output: Capturing and Interpreting df Output

**Module:** 11 — Storage & Disk Usage
**Category:** Linux / storage
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** df -h, df -i, awk column extraction, report writing

---

## Scenario

The capacity-review meeting starts in ten minutes and nobody has a current snapshot of the staging box's filesystems. Produce /home/intern/df-report.txt containing a full `df -h` output plus one machine-readable line: root-use=<used%> for the root filesystem, extracted from the df output itself.

## Environment

- **Container name:** lab-11-02-read-df-output
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-11-02-read-df-output bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- The capacity review has no current filesystem snapshot
- The root filesystem's used-percentage must be machine-readable for the slide deck
- The report file must contain the full df -h table as evidence

## Your Mission

1. Look at the raw data: `df -h`.
2. Save the full table: `df -h > /home/intern/df-report.txt`.
3. Extract the root usage: `df -h / | tail -1 | awk '{print $5}'`.
4. Append it as `root-use=<value>` to the report.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Human-readable units</summary>
`df -h` prints sizes in K/M/G instead of 1K-blocks — the version humans (and slides) want.
</details>

<details>
<summary>Hint 2 — One filesystem, one line</summary>
`df -h /` limits output to the root filesystem; `tail -1` drops the header; awk&#x27;s $5 is the Use% column.
</details>

<details>
<summary>Hint 3 — Append, don&#x27;t overwrite</summary>
Save the table with `&gt;` first, then append the root-use line with `&gt;&gt;` — the order matters.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `df -h` | Disk usage per filesystem, human-readable |
| `df -h /` | Only the root filesystem |
| `df -i` | Inode usage per filesystem |
| `tail -1` | Keep the last line |
| `awk '{print $5}'` | Extract the 5th column (Use%) |

## Background Reading

- [df manual](https://man7.org/linux/man-pages/man1/df.1.html)
