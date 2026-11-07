# Solution: What is My System?

## Step-by-Step Fix

### Step 1: Navigate to the Home Directory

You need to execute:
```bash
cd /home/intern
```
This moves you to the user's home directory.

### Step 2: Create the report

Run these commands to build your report:
```bash
echo "Username: $(whoami)" > system-report.txt
echo "Hostname: $(hostname)" >> system-report.txt
echo "Home: /home/intern" >> system-report.txt
echo "PWD: $(pwd)" >> system-report.txt
```

### Step 3: Verify

Click the **Check** button on the left panel to verify and pass.
