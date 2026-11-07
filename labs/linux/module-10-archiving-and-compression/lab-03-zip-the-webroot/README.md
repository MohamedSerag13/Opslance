# Lab zip-the-webroot: Creating an Excluding zip Archive

**Module:** 10 — Archiving & Compression
**Category:** Linux / archiving
**Difficulty:** ⭐⭐ Intermediate
**Estimated Time:** 20 minutes
**Skills Practiced:** zip -r, unzip -l, exclude patterns, archive verification

---

## Scenario

The security review team wants a copy of the webroot at /var/www/html — but policy forbids shipping log files, and a stray debug.log is sitting in the directory. Create /home/intern/webroot.zip with zip, excluding any *.log file, then verify with unzip -l that the site pages are in and the log is not.

## Environment

- **Container name:** lab-10-03-zip-the-webroot
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-10-03-zip-the-webroot bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- /var/www/html contains index.html, about.html, assets/ — and a debug.log that must NOT ship
- The review portal only accepts .zip archives
- The previous attempt included the log and was rejected by the reviewers

## Your Mission

1. Survey the webroot: `ls -R /var/www/html`.
2. Create the archive: `cd /var/www && zip -r /home/intern/webroot.zip html -x "*.log"`.
3. List the archive: `unzip -l /home/intern/webroot.zip`.
4. Confirm index.html is present and debug.log is absent.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Recursive zip</summary>
`zip -r out.zip dir` descends into subdirectories. Run it from /var/www so the entries are named html/… instead of carrying the full absolute path.
</details>

<details>
<summary>Hint 2 — Exclude patterns</summary>
`-x &quot;*.log&quot;` drops every entry whose path ends in .log — the pattern matches against the names INSIDE the archive.
</details>

<details>
<summary>Hint 3 — Verify with unzip -l</summary>
`unzip -l` lists the archive; grep the listing for index.html (must match) and debug.log (must not).
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `zip -r out.zip dir` | Zip a directory recursively |
| `zip -r out.zip dir -x "*.log"` | Zip while excluding a pattern |
| `unzip -l out.zip` | List a zip's contents |
| `unzip out.zip -d dest` | Extract a zip into dest |
| `file out.zip` | Confirm the real file type |

## Background Reading

- [zip manual](https://linux.die.net/man/1/zip)
