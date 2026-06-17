# Solution: Rogue Process Hunt

## Root Cause

The container's entrypoint started three `sleep 1000` processes in the background at boot. They are owned by the `intern` user and have no useful purpose — they simply sit in the process table consuming PIDs.

## Step-by-Step Fix

```bash
# 1. List all running processes and look for the rogues
ps aux | grep sleep
# Output: intern  42  0.0  0.0  ...  sleep 1000
#         intern  43  0.0  0.0  ...  sleep 1000
#         intern  44  0.0  0.0  ...  sleep 1000

# 2. Alternatively, use pgrep to get just the PIDs
pgrep sleep
# Output:
# 42
# 43
# 44

# 3. Save the PIDs to the incident report file (one per line)
pgrep sleep > /home/intern/pids_found.txt

# 4. Verify the file looks correct
cat /home/intern/pids_found.txt
# Output: (three numeric PIDs, one per line)

# 5. Kill one process individually by PID (replace 42 with an actual PID)
kill 42

# 6. Kill the remaining sleep processes in one shot
pkill sleep

# 7. Confirm all sleep processes are gone
pgrep sleep
# Output: (nothing — exit code 1 means no match, which is what we want)
```

Click the **Check** button on the left panel to verify and pass.
