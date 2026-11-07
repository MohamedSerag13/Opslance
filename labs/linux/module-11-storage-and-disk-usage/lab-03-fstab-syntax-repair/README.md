# Lab fstab-syntax-repair: Fixing a Malformed /etc/fstab Entry

**Module:** 11 — Storage & Disk Usage
**Category:** Linux / storage
**Difficulty:** ⭐⭐ Intermediate
**Estimated Time:** 20 minutes
**Skills Practiced:** /etc/fstab, filesystem table fields, awk field checks, sed

---

## Scenario

A cloud-init script crashed halfway through editing /etc/fstab and left a lone '//10.0.0.30/share' line with no mount point, no type and no options. fstab requires exactly six whitespace-separated fields per entry, and admins double-check the file with an awk field count before any reboot. Replace the orphan with the intended entry: /dev/sdb1 mounted on /mnt/data as ext4 with defaults and pass number 2.

## Environment

- **Container name:** lab-11-03-fstab-syntax-repair
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-11-03-fstab-syntax-repair bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- `mount -a` (and every boot) aborts with an fstab parse error
- The last line of /etc/fstab contains only '//10.0.0.30/share'
- The intended data disk /dev/sdb1 on /mnt/data was never mounted
- Ops policy: no reboot while any fstab line has other than 6 fields

## Your Mission

1. Read the file: `cat /etc/fstab`.
2. Count fields per line like the ops runbook does: `awk '!/^#/ && NF>0 {print NF}' /etc/fstab`.
3. Replace the orphan line with `/dev/sdb1 /mnt/data ext4 defaults 0 2` (sudo sed or an editor).
4. Re-run the field check — every non-comment line must now print 6.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — The six fields</summary>
fstab lines are: device, mount point, filesystem type, options, dump freq, pass no. — e.g. `/dev/sdb1 /mnt/data ext4 defaults 0 2`.
</details>

<details>
<summary>Hint 2 — Field-count check</summary>
`awk &#x27;!/^#/ &amp;&amp; NF&gt;0 { if (NF!=6) bad=1 } END { exit bad }&#x27; /etc/fstab` exits non-zero while any line is malformed — the runbook&#x27;s pre-reboot gate.
</details>

<details>
<summary>Hint 3 — Replace the whole line</summary>
`sudo sed -i &#x27;s|^//10.0.0.30/share$|/dev/sdb1 /mnt/data ext4 defaults 0 2|&#x27; /etc/fstab` swaps the orphan for the correct entry in one shot.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `cat /etc/fstab` | Read the filesystem table |
| `awk '!/^#/ && NF>0 {print NF}' /etc/fstab` | Field count of every active line |
| `sudo sed -i 's|old|new|' /etc/fstab` | Replace a line in place |
| `man 5 fstab` | The fstab format documentation |

## Background Reading

- [fstab file format](https://man7.org/linux/man-pages/man5/fstab.5.html)
