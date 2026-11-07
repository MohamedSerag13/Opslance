# Solution: Creating an Excluding zip Archive

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

An archive policy problem: the obvious `zip -r out.zip html` would ship the debug log to reviewers. zip's -x flag filters entries at creation time — the pattern is matched against the paths inside the archive, so excluding from /var/www with html/… paths needs the *.log glob only. Verifying the listing before upload closes the loop the last attempt skipped.

## Step-by-Step Fix

### Step 1: Survey the webroot

Note the stray debug.log that must not travel:

```bash
ls -R /var/www/html
```

### Step 2: Zip with an exclusion

From /var/www so entries are html/…; -x '*.log' filters the log out at creation time:

```bash
cd /var/www && zip -r /home/intern/webroot.zip html -x "*.log"
```

### Step 3: Verify the manifest

unzip -l prints the archive's file list — index.html must appear, debug.log must not:

```bash
unzip -l /home/intern/webroot.zip
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Zip the Webroot ===

✅ PASS [25%]: /home/intern/webroot.zip exists
✅ PASS [25%]: the file is a valid zip archive
✅ PASS [25%]: the archive contains index.html
✅ PASS [25%]: the archive does NOT contain debug.log

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

zip remains the lingua franca of exchanges with non-Linux teams, review portals and ticket systems. The -x exclusion is the pattern you will reuse constantly — 'ship the directory but never the logs, caches or .git' is a daily need, and verifying the listing before sending is one grep away.

## Common Mistakes

- **Mistake 1:** Running `zip -r out.zip /var/www/html` with an absolute path — the archive then stores var/www/html/… and extracts into a deep tree on the reviewer's machine.
- **Mistake 2:** Quoting the exclude pattern wrong (unquoted *.log is expanded by YOUR shell before zip ever sees it).
- **Mistake 3:** Trusting zip's 'adding: …' output instead of listing the archive — only unzip -l proves what actually shipped.
