# Solution: Clearing Regeneratable Build Artifacts Safely

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

Nothing is 'broken' — the cache simply never had a cleanup policy. The skill is selective deletion: remove exactly the regeneratable class (*.o) across the whole tree with find, while provably sparing the inputs (src/) and outputs (output/). The preview-first habit and the written count make the operation auditable.

## Step-by-Step Fix

### Step 1: Measure and preview

Capture the size and the exact list of victims before anything is removed:

```bash
du -sh /var/tmp/buildcache
find /var/tmp/buildcache -name '*.o'
```

### Step 2: Delete the object files

-delete acts on every match in the tree; sources and outputs are different names and survive:

```bash
sudo find /var/tmp/buildcache -name '*.o' -delete
```

### Step 3: Report and verify

Write the count from your preview, then prove the survivors:

```bash
echo 'object-files-removed=4' > /home/intern/cleanup-report.txt
du -sh /var/tmp/buildcache
ls -R /var/tmp/buildcache
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Build Cache Cleanup ===

✅ PASS [35%]: no *.o files remain anywhere under the build cache
✅ PASS [25%]: the sources (src/main.c) survived
✅ PASS [25%]: the output binary survived
✅ PASS [15%]: cleanup report records object-files-removed=4

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

Caches, node_modules, target/, __pycache__ — every stack accumulates regeneratable junk. find's name+delete combo with a preview pass is the safe, repeatable cleanup that keeps runners fast, and the same discipline applies to log retention and tmp reaping.

## Common Mistakes

- **Mistake 1:** Running `rm -rf /var/tmp/buildcache/*.o` — the glob only reaches the top level and silently spares obj/module-*.o.
- **Mistake 2:** Deleting without previewing the find output first — one bad -name pattern and sources vanish.
- **Mistake 3:** Using -name '*.O' or forgetting the quotes so the shell expands the glob against an empty directory.
