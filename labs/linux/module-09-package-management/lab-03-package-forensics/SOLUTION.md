# Solution: Tracing Files Back to Packages with dpkg

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

No fault — an inventory exercise. Reverse lookups (file→package) and forward lookups (package→files, package→version) are the two halves of package forensics, and dpkg answers both instantly from its local database with no network required.

## Step-by-Step Fix

### Step 1: Trace /bin/ls back to its package

dpkg -S does the reverse lookup; cut away everything after the colon for the report:

```bash
dpkg -S /bin/ls
echo "ls-owner=$(dpkg -S /bin/ls | cut -d: -f1)" > /home/intern/forensics.txt
```

### Step 2: Count the installed packages

'ii' marks installed packages in dpkg -l output:

```bash
echo "package-count=$(dpkg -l | grep -c '^ii')" >> /home/intern/forensics.txt
```

### Step 3: Record the bash version

The Version: field of the package record is the authoritative answer:

```bash
echo "bash-version=$(dpkg -s bash | grep '^Version:' | awk '{print $2}')" >> /home/intern/forensics.txt
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Package Forensics ===

✅ PASS [20%]: /home/intern/forensics.txt exists
✅ PASS [40%]: report correctly identifies coreutils as the owner of /bin/ls
✅ PASS [25%]: report contains a plausible package-count (at least two digits)
✅ PASS [15%]: report records the bash version

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

When a CVE bulletin lands, the first questions are always 'do we have it and at what version?' — answered with dpkg -l, dpkg -s and dpkg -S. The reverse lookup also settles endless 'where did this binary come from?' arguments in seconds.

## Common Mistakes

- **Mistake 1:** Counting packages with `dpkg -l | wc -l` — the output includes header lines, inflating the count by 5-6.
- **Mistake 2:** Using `grep '^ii'` with a package name filter but no anchor, matching substrings of unrelated packages.
- **Mistake 3:** Reporting the upstream version from `bash --version` instead of the package version from dpkg — they differ on patched distro builds.
