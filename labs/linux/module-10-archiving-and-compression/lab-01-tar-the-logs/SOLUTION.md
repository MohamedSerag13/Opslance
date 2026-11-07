# Solution: Creating a Compressed Archive with tar

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

A packaging-policy problem: many loose files where one compressed bundle is required. tar exists precisely for this — it concatenates a directory tree into one stream, and the z flag runs it through gzip so logs (highly repetitive text) shrink dramatically. The step juniors skip is verification with -t, which is what turns 'I made an archive' into 'I made a correct archive'.

## Step-by-Step Fix

### Step 1: Survey the logs

Know what goes into the bundle:

```bash
ls -l /var/log/app/
```

### Step 2: Create the gzipped archive

-C /var/log app keeps the paths inside the archive relative (app/…), which extracts cleanly anywhere:

```bash
tar -czf /home/intern/app-logs.tar.gz -C /var/log app
```

### Step 3: Verify the archive

List the contents — all five log files must appear and the command must exit cleanly:

```bash
tar -tzf /home/intern/app-logs.tar.gz
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Tar Up the Logs ===

✅ PASS [25%]: /home/intern/app-logs.tar.gz exists
✅ PASS [25%]: the file is a valid gzipped tar archive
✅ PASS [25%]: the archive contains app.log
✅ PASS [25%]: the archive contains audit.log

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

tar czf/tzf/xzf is the single most-used archive incantation in operations: backups, log shipping, release artifacts, container image layers (which are tar streams internally). Reading an archive back with -t before you ship it is the difference between a working handoff and a support call.

## Common Mistakes

- **Mistake 1:** Omitting the z flag but keeping the .gz extension — the file is a plain tar mislabelled as gzip and every consumer fails.
- **Mistake 2:** Archiving with absolute paths (tar czf out.tar.gz /var/log/app) — extraction then scatters files into /var/log regardless of -C, a classic footgun.
- **Mistake 3:** Forgetting f before the filename: `tar -cz out.tar.gz dir` silently treats 'out.tar.gz' as more input files.
