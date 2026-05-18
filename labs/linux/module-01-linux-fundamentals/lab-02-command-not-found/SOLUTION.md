# Solution: Command Not Found

## Root Cause
The user's default `.bashrc` profile stripped out `/usr/local/bin` from the PATH.

## Step-by-Step Fix

```bash
echo "export PATH=\$PATH:/usr/local/bin" >> ~/.bashrc
echo "alias ll='ls -la'" >> ~/.bashrc
echo "export APP_ENV=staging" >> ~/.bashrc

# Apply changes right now
source ~/.bashrc

# Save report
echo $PATH > ~/path-report.txt
```
Run `/check.sh` to pass.
