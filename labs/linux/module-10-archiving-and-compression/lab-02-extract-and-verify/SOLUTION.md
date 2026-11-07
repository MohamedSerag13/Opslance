# Solution: Extracting a Release Archive to the Right Place

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

The previous extraction was interrupted (or partial): the css directory came through but index.html and js/ did not. Re-running the extraction over the existing directory is idempotent — tar overwrites the missing/incomplete files and leaves the rest alone, which is why archive-based deploys are so easy to re-run.

## Step-by-Step Fix

### Step 1: Inspect the archive

Confirm the entry paths so you know whether a wrapping directory is involved (there isn't — files are at the top level):

```bash
tar -tzf /opt/releases/site-v2.tar.gz
```

### Step 2: Check the broken deploy

Only css/ made it into /var/www/site:

```bash
ls -R /var/www/site
```

### Step 3: Extract into the webroot

-C directs the extraction into the existing directory; sudo is needed because /var/www is root-owned:

```bash
sudo tar -xzf /opt/releases/site-v2.tar.gz -C /var/www/site
```

### Step 4: Verify the release checklist

All three paths must exist and the index must contain its heading:

```bash
ls -R /var/www/site
grep '<h1>' /var/www/site/index.html
```

### Step 5: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Deploy from a Tarball ===

✅ PASS [35%]: /var/www/site/index.html exists after extraction
✅ PASS [25%]: /var/www/site/css/style.css exists
✅ PASS [25%]: /var/www/site/js/app.js exists
✅ PASS [15%]: index.html content is intact (contains <h1>)

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

Deploys from tarballs are everywhere — release artifacts, Terraform plugins, kubectl manifests bundles. Reading the archive with -t first, choosing the destination with -C, and verifying afterwards is the safe pattern; extracting 'somewhere and moving files around by hand' is how the previous intern broke this site.

## Common Mistakes

- **Mistake 1:** Extracting from your home directory and then mv-ing files into /var/www by hand — partial moves recreate the original incident.
- **Mistake 2:** Forgetting -C and extracting into whatever directory you happen to be in.
- **Mistake 3:** Skipping sudo on the root-owned /var/www and concluding the archive is corrupt because extraction 'fails'.
