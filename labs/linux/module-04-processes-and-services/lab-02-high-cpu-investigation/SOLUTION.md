# Solution: High CPU Investigation

## Root Cause

The container's entrypoint started a `yes > /dev/null` process in the background at boot. The `yes` command generates an infinite stream of "y" characters; piping it to `/dev/null` discards the output but keeps the CPU spinning at 100%.

## Step-by-Step Fix

```bash
# 1. Launch top — the CPU hog appears at the very top of the list
top
# Look at the first data row: %CPU will be near 100
# Note the PID in the first column (e.g. 15)
# Press 'q' to quit top

# Alternatively use htop — same result, easier to read
htop
# The coloured CPU bar will be nearly full. The top row in the process list
# shows the offender. Press 'q' or F10 to exit.

# 2. Or use a one-shot ps command to identify the culprit
ps aux --sort=-%cpu | head -5
# Output:
# USER   PID  %CPU  ...  COMMAND
# intern  15  99.9  ...  yes

# 3. Write the PID to the incident report file (replace 15 with the actual PID)
echo 15 > /home/intern/culprit_pid.txt

# 4. Kill the process
kill 15

# 5. Verify the CPU drops and the process is gone
pgrep yes
# Output: (nothing — the process is dead)
```

Click the **Check** button on the left panel to verify and pass.
