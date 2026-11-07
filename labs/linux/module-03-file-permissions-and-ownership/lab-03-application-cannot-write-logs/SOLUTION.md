# Solution: Application Cannot Write Logs

## Root Cause

The file `~/logs/app.log` is owned by `root:root` with permissions `644` (`rw-r--r--`). Only the owner (`root`) has write permission. The `intern` user falls into the "other" category and can only read the file, so appending to it fails with "Permission denied".

## Step-by-Step Fix

```bash
# 1. Inspect the file to confirm the ownership problem
ls -l logs/app.log
# Output: -rw-r--r-- 1 root root 0 ... logs/app.log

# 2. Change ownership to intern
sudo chown intern:intern logs/app.log

# 3. Verify the ownership change
ls -l logs/app.log
# Output: -rw-r--r-- 1 intern intern 0 ... logs/app.log

# 4. Write the log entry
echo "Application started" >> logs/app.log
```

Click the **Check** button on the left panel to verify and pass.
