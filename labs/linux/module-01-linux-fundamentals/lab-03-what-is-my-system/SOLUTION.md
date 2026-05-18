# Solution: What is My System?

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

You were dropped into an unfamiliar Linux environment with no shell configuration (.bashrc was removed) and no context about where you are or what system you're on. This is a realistic scenario when joining a new team or accessing a server for the first time.

## Step-by-Step Fix

### Step 1: Diagnose

Run basic discovery commands to understand your environment:

```bash
whoami
```

Expected output:
```
intern
```

```bash
pwd
```

Expected output:
```
/
```

```bash
hostname
```

Expected output:
```
lab-03-what-is-my-system
```

### Step 2: Understand the issue

The `whoami` command tells you your username is `intern`. The `pwd` command shows you are in the root directory `/`, not in your home directory. Your shell prompt is bare because `.bashrc` was removed. You need to navigate to your home directory and gather system information.

### Step 3: Gather system information

```bash
cat /etc/os-release
```

Look for the `PRETTY_NAME` line which shows "Ubuntu 22.04.x LTS".

```bash
uname -a
```

This shows the kernel version and architecture.

### Step 4: Create the report

Navigate to your home directory and create the report file:

```bash
cd /home/intern
echo "Username: $(whoami)" > system-report.txt
echo "Hostname: $(hostname)" >> system-report.txt
echo "OS: $(grep PRETTY_NAME /etc/os-release | cut -d= -f2 | tr -d '"')" >> system-report.txt
echo "Home: /home/intern" >> system-report.txt
echo "PWD: $(pwd)" >> system-report.txt
echo "Contents of /etc:" >> system-report.txt
ls /etc >> system-report.txt
```

### Step 5: Verify

```bash
check.sh
```

Expected output:
```
=== Checking: What is My System? ===
✅ PASS: Report file exists at /home/intern/system-report.txt
✅ PASS: Report contains username 'intern'
✅ PASS: Report contains 'Ubuntu' (OS identified)
✅ PASS: Report is not empty

🎉 All checks passed! Lab complete.
```

---

## Why This Matters

In real production environments, you will frequently access servers you've never seen before. Knowing how to quickly profile a system — who you are, what OS it runs, where you are in the filesystem — is the first step in any troubleshooting or administration task. This skill is essential before you can safely make any changes.

## Common Mistakes

- **Mistake 1:** Assuming you're in your home directory. Always verify with `pwd` before running commands that depend on your location.
- **Mistake 2:** Using `cat /etc/*release` instead of `cat /etc/os-release`. While both work on Ubuntu, `/etc/os-release` is the standard across modern Linux distributions.
