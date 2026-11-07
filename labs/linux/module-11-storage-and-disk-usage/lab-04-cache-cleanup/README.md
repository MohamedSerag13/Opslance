# Lab cache-cleanup: Clearing Regeneratable Build Artifacts Safely

**Module:** 11 — Storage & Disk Usage
**Category:** Linux / storage
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Skills Practiced:** find -name, find -delete, glob patterns, du -sh, safe cleanup

---

## Scenario

The CI runner's cache directory /var/tmp/buildcache has grown fat with object files (*.o) that the compiler regenerates anyway. Free the space: remove every *.o file in the tree, keep the src/ sources and the output/ binary untouched, and record how many object files you removed in /home/intern/cleanup-report.txt as object-files-removed=4.

## Environment

- **Container name:** lab-11-04-cache-cleanup
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-11-04-cache-cleanup bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- /var/tmp/buildcache is much larger than its git history suggests
- Four *.o object files sit in the cache tree
- src/ (sources) and output/ (the built binary) must survive untouched
- The cleanup count must be reported in /home/intern/cleanup-report.txt

## Your Mission

1. Measure before: `du -sh /var/tmp/buildcache`.
2. Preview the victims: `find /var/tmp/buildcache -name '*.o'`.
3. Delete them: `sudo find /var/tmp/buildcache -name '*.o' -delete`.
4. Record the count and verify src/ and output/ still exist.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Preview before delete</summary>
Run `find … -name &#x27;*.o&#x27;` without -delete first and eyeball the list — deleting is forever.
</details>

<details>
<summary>Hint 2 — The -delete action</summary>
`find dir -name &#x27;*.o&#x27; -delete` removes every match in the whole tree, in one command. No wildcards in a rm that could mis-expand.
</details>

<details>
<summary>Hint 3 — Quote the glob</summary>
If you use rm instead, quote it: `sudo find … -exec rm {} +` or `rm &#x27;*.o&#x27;` — an unquoted *.o only matches the CURRENT directory&#x27;s files.
</details>

<details>
<summary>Hint 4 — Report the count</summary>
The number of matches from the preview IS the number removed — here, 4.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `find dir -name '*.o'` | Preview what would be deleted |
| `find dir -name '*.o' -delete` | Delete all matches in the tree |
| `du -sh dir` | Directory size before/after |
| `ls -R dir` | Verify what survived |

## Background Reading

- [find manual](https://man7.org/linux/man-pages/man1/find.1.html)
- [du manual](https://man7.org/linux/man-pages/man1/du.1.html)
