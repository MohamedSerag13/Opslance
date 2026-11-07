# Solution: CI/CD Pipeline Failed

## Root Cause
The `deploy.sh` script is missing the execute permission bit. Its permissions are `644` (`-rw-r--r--`), which means it can be read and written but not executed.

## Step-by-Step Fix

```bash
# 1. Try running the script and observe the error
./deploy.sh
# bash: ./deploy.sh: Permission denied

# 2. Inspect permissions
ls -l deploy.sh
# -rw-r--r-- 1 intern intern 42 ... deploy.sh
# Notice: no 'x' in the permission bits

# 3. Add execute permission
chmod +x deploy.sh

# 4. Verify permissions changed
ls -l deploy.sh
# -rwxr-xr-x 1 intern intern 42 ... deploy.sh

# 5. Run the script
./deploy.sh
# Deploying application...
```

Click the **Check** button on the left panel to verify and pass.
