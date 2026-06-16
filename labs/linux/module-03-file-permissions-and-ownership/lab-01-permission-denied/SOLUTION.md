# Solution: Permission Denied

## Root Cause
The file `/home/intern/secret.txt` had its permissions set to `000` (no read, write, or execute for anyone). Even though the intern user owns the file, the kernel denies all access when every permission bit is cleared.

## Step-by-Step Fix

```bash
# 1. Try to read the file and observe the error
cat secret.txt
# Output: cat: secret.txt: Permission denied

# 2. Inspect the current permissions
ls -l secret.txt
# Output: ---------- 1 intern intern ... secret.txt
# The "----------" means zero permissions for owner, group, and others

# 3. Restore read (and optionally write) permission for the owner
chmod 644 secret.txt

# 4. Verify the new permissions
ls -l secret.txt
# Output: -rw-r--r-- 1 intern intern ... secret.txt

# 5. Read the file successfully
cat secret.txt
# Output: Secret Data
```

Click the **Check** button on the left panel to verify and pass.
