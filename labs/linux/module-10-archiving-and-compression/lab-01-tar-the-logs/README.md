# Lab tar-the-logs: Creating a Compressed Archive with tar

**Module:** 10 — Archiving & Compression
**Category:** Linux / archiving
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** tar czf, tar -t, gzip, archive verification

---

## Scenario

Support needs last week's staging logs attached to a ticket, but five separate files violate the attachment policy: everything must travel as ONE gzipped archive. Bundle /var/log/app into /home/intern/app-logs.tar.gz with tar, then prove the archive is intact by listing its contents.

## Environment

- **Container name:** lab-10-01-tar-the-logs
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-10-01-tar-the-logs bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- /var/log/app holds five separate .log files
- The ticketing system rejects multiple attachments
- The archive must be gzip-compressed, not a plain tar
- Nobody verified the last archive anyone sent — this one must be checked

## Your Mission

1. Look at what you are packing: `ls -l /var/log/app/`.
2. Create the archive: `tar -czf /home/intern/app-logs.tar.gz -C /var/log app`.
3. Verify it is a valid gzip tarball: `tar -tzf /home/intern/app-logs.tar.gz`.
4. Confirm all five log names appear in the listing.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — The three flags</summary>
tar czf = **c**reate an archive, compress with g**z**ip, write to **f**ile. In that order: `tar -czf out.tar.gz paths...`.
</details>

<details>
<summary>Hint 2 — Control the paths inside</summary>
`-C /var/log app` first cds to /var/log, then archives the app directory — so entries come out as app/app.log instead of absolute paths.
</details>

<details>
<summary>Hint 3 — Verify before sending</summary>
`tar -tzf` (t = list) prints the contents without extracting. A truncated or corrupt archive fails here, not at the recipient&#x27;s end.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `tar -czf out.tar.gz dir` | Create a gzipped archive of a directory |
| `tar -tzf out.tar.gz` | List an archive's contents without extracting |
| `tar -xzf out.tar.gz -C dest` | Extract an archive into a directory |
| `ls -lh out.tar.gz` | Check the archive's size |
| `file out.tar.gz` | Identify the real file type |

## Background Reading

- [tar manual](https://man7.org/linux/man-pages/man1/tar.1.html)
