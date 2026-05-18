# Solution: Lost in the Filesystem

## Root Cause
You were intentionally placed inside `/usr/share/doc/bash/` to simulate getting lost.

## Step-by-Step Fix

```bash
# 1. Go home and read mission
cd ~
cat mission.txt

# 2. Task 1
echo "I navigated the Linux filesystem" > /home/intern/found.txt

# 3. Task 2
ls /etc | wc -l
# (Let's say it outputs 150)
echo "150 items" > /home/intern/etc-count.txt

# 4. Task 3
cd projects/alpha/beta/gamma/
touch visited.txt
```

Run `/check.sh` to pass.
