# Lab extract-and-verify: Extracting a Release Archive to the Right Place

**Module:** 10 — Archiving & Compression
**Category:** Linux / archiving
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** tar xzf, tar -C, mkdir -p, content verification

---

## Scenario

Last night's release half-failed: the previous intern extracted /opt/releases/site-v2.tar.gz into /var/www/site but only the css/ directory made it — index.html and js/ are missing and the site is broken. The tarball's entries sit at the top level (index.html, css/, js/), so a clean extraction into the existing directory fixes everything. /var/www is root-owned, so use sudo.

## Environment

- **Container name:** lab-10-02-extract-and-verify
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-10-02-extract-and-verify bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- The site returns 404 for / — index.html is missing
- /var/www/site contains only the css/ directory
- /opt/releases/site-v2.tar.gz is intact and verified
- The release checklist requires index.html, css/ and js/ to exist after deploy

## Your Mission

1. Inspect the archive first: `tar -tzf /opt/releases/site-v2.tar.gz`.
2. Check the broken state: `ls -R /var/www/site`.
3. Extract into the target: `sudo tar -xzf /opt/releases/site-v2.tar.gz -C /var/www/site`.
4. Verify all three paths exist and index.html still contains its <h1> heading.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — List before extracting</summary>
`tar -tzf file.tar.gz` shows exactly which paths will appear — no surprises about a wrapping top-level directory.
</details>

<details>
<summary>Hint 2 — -C chooses the destination</summary>
`tar -xzf archive -C /var/www/site` extracts INTO that directory instead of the current one.
</details>

<details>
<summary>Hint 3 — sudo for root-owned targets</summary>
/var/www belongs to root, so writing into it needs `sudo tar …`.
</details>

<details>
<summary>Hint 4 — Verify the bytes</summary>
Extraction is only successful if the content is intact: `grep -q &#x27;&lt;h1&gt;&#x27; /var/www/site/index.html`.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `tar -tzf archive.tar.gz` | List archive contents before extracting |
| `tar -xzf archive.tar.gz -C dir` | Extract an archive into dir |
| `mkdir -p dir` | Create the destination directory |
| `ls -R dir` | Verify the extracted tree |
| `grep pattern file` | Spot-check extracted content |

## Background Reading

- [tar manual](https://man7.org/linux/man-pages/man1/tar.1.html)
