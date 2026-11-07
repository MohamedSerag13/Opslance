# Solution: Compressing and Archiving Rotated Logs

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

No logrotate policy on this host, so rotated logs accumulate uncompressed. The manual remediation pattern — compress the rotated set, park it in an archive directory, keep the active log live — is exactly what logrotate automates with its compress and olddir directives, and doing it by hand once teaches what the config must preserve.

## Step-by-Step Fix

### Step 1: Survey the directory

Eight files: the active log and seven rotated chunks:

```bash
ls -la /var/log/app/
```

### Step 2: Compress exactly the rotated set

The [0-9] glob excludes app.log; gzip replaces each file in place with a .gz:

```bash
sudo mkdir -p /var/log/app/archive
cd /var/log/app && for f in app.log.[0-9]; do sudo gzip "$f"; done
```

### Step 3: Park the archives

Move all seven .gz files into the archive directory:

```bash
sudo mv /var/log/app/app.log.*.gz /var/log/app/archive/
```

### Step 4: Verify the end state

Seven archives, zero loose rotated logs, active log intact:

```bash
find /var/log/app/archive -name '*.gz' | wc -l
ls -la /var/log/app/
```

### Step 5: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Rotate Out the Rotated Logs ===

✅ PASS [20%]: /var/log/app/archive directory exists
✅ PASS [30%]: all 7 rotated logs are archived as .gz in archive/
✅ PASS [30%]: no uncompressed rotated logs remain in /var/log/app
✅ PASS [20%]: the active app.log is untouched in place

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

Log hygiene is storage hygiene: uncompressed rotated logs are the quietest disk fillers in the datacenter. The precise-glob discipline practised here (active log vs rotated set) is the same discipline that keeps a hand-rolled cleanup from compressing a file an app is actively writing.

## Common Mistakes

- **Mistake 1:** Using the glob `app.log.*` — it includes the active app.log, which then gets compressed mid-write.
- **Mistake 2:** gzip-ing straight into archive/ without creating the directory first — the mv fails and the .gz files pile up in /var/log/app.
- **Mistake 3:** Moving app.log itself 'for tidiness' — processes holding the open file handle then write to a ghost path.
