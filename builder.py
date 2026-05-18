import os
import json

output = []

output.append("""# Module 01 Linux Fundamentals - Comprehensive Update

## SECTION 1: Validation Report

**LAB 01 — Lost in the Filesystem**
Status: ❌ EMPTY
Files:
  Dockerfile          ❌ missing
  docker-compose.yml  ❌ missing
  metadata.json       ❌ missing
  README.md           ❌ missing
  SOLUTION.md         ❌ missing
  check.sh            ❌ missing
Issues found:
  - Directory is completely empty.
Action: ENRICH (rewrite all files to meet spec)

**LAB 02 — Command Not Found**
Status: ❌ EMPTY
Files:
  Dockerfile          ❌ missing
  docker-compose.yml  ❌ missing
  metadata.json       ❌ missing
  README.md           ❌ missing
  SOLUTION.md         ❌ missing
  check.sh            ❌ missing
Issues found:
  - Directory is completely empty.
Action: ENRICH (rewrite all files to meet spec)

**LAB 03 — What Is My System?**
Status: ⚠️ INCOMPLETE
Files:
  Dockerfile          ⚠️ incomplete
  docker-compose.yml  ⚠️ incomplete
  metadata.json       ❌ missing
  README.md           ⚠️ incomplete
  SOLUTION.md         ⚠️ incomplete
  check.sh            ⚠️ incomplete
Issues found:
  - `metadata.json` is missing.
  - Acceptance criteria and scoring logic are missing from check.sh.
  - Content lacks the new exact structures required by the prompt.
Action: ENRICH (rewrite all files to meet spec)

**LAB 04 — Copy, Move, Remove**
Status: ⚠️ INCOMPLETE
Files:
  Dockerfile          ⚠️ incomplete
  docker-compose.yml  ⚠️ incomplete
  metadata.json       ❌ missing
  README.md           ⚠️ incomplete
  SOLUTION.md         ⚠️ incomplete
  check.sh            ⚠️ incomplete
Issues found:
  - `metadata.json` is missing.
  - Acceptance criteria and scoring logic are missing from check.sh.
  - Content lacks the new exact structures required by the prompt.
Action: ENRICH (rewrite all files to meet spec)

---

## SECTION 2: Complete Files for All 6 Labs

""")

# LAB 01
output.append("""
══════════════════════════════════════════════════════════
LAB 01 — Lost in the Filesystem
Path: labs/linux/module-01-linux-fundamentals/lab-01-lost-in-the-filesystem/
══════════════════════════════════════════════════════════

--- FILE: metadata.json ---
```json
{
  "id": "module-01-lab-01-lost-in-the-filesystem",
  "module_number": 1,
  "module_title": "Linux Fundamentals",
  "title": "Lost in the Filesystem",
  "difficulty": "beginner",
  "estimated_minutes": 15,
  "points": 100,
  "category": "linux",
  "subcategory": "fundamentals",
  "skills": ["pwd", "ls", "cd", "absolute paths", "relative paths"],
  "scenario": "You have been dropped into a deeply nested folder structure on a new server and need to find your mission briefing file.",
  "symptoms": [
    "You don't know where you are",
    "You need to find mission.txt somewhere in the intern's home directory"
  ],
  "mission": "Navigate the filesystem, read mission.txt, and create found.txt as instructed.",
  "hints": [
    {"number": 1, "title": "Where to look", "content": "The file is located in the user's home directory. You can go there using the ~ symbol or the absolute path /home/intern."},
    {"number": 2, "title": "What to check", "content": "Once in the home directory, list all files to find mission.txt and read it."},
    {"number": 3, "title": "The fix", "content": "Run `cd ~`, then `cat mission.txt`, then run `echo \"found\" > /home/intern/found.txt`."}
  ],
  "verification_command": "bash /check.sh",
  "acceptance_criteria": [
    {"id": "check_1", "description": "File /home/intern/mission.txt has been read", "weight": 40},
    {"id": "check_2", "description": "Student has created file /home/intern/found.txt containing 'found'", "weight": 40},
    {"id": "check_3", "description": "Student ran pwd at least once", "weight": 20}
  ]
}
```

--- FILE: Dockerfile ---
```dockerfile
FROM ubuntu:22.04

# Prevent interactive prompts during apt install
ENV DEBIAN_FRONTEND=noninteractive

# Install packages the student needs for this lab
RUN apt-get update && apt-get install -y \
    sudo vim nano less curl \
    && rm -rf /var/lib/apt/lists/*

# Create student user with passwordless sudo
RUN useradd -m -s /bin/bash intern \
    && echo "intern ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
    && echo "intern:intern123" | chpasswd

# THE BREAK: Drop the user in a deep maze and place the mission file in their home directory
RUN mkdir -p /tmp/maze/level3/deep/
RUN echo "🎉 You found it!\n\nYou successfully navigated the Linux filesystem.\n\nYour next task: create a file called 'found.txt' in this same directory\n(/home/intern/) containing the word 'found'.\n\nRun this command:\n  echo \"found\" > /home/intern/found.txt\n\nThen run /check.sh to verify." > /home/intern/mission.txt

# Copy check.sh and make it executable
COPY check.sh /check.sh
RUN chmod +x /check.sh

# Set a flag file for bonus verification
RUN echo "LAB-01-MODULE-01" > /root/lab-flag.txt

USER intern
WORKDIR /tmp/maze/level3/deep/

ENTRYPOINT ["tail", "-f", "/dev/null"]
```

--- FILE: docker-compose.yml ---
```yaml
version: '3.8'

services:
  lab:
    build: .
    container_name: "lab-module01-lab01-lost-in-the-filesystem"
    restart: "no"
    ports:
      - "2201:22"
    labels:
      - "lab.module=01"
      - "lab.category=linux"
      - "lab.subcategory=fundamentals"
      - "lab.difficulty=beginner"
      - "lab.title=Lost in the Filesystem"
      - "lab.id=module-01-lab-01-lost-in-the-filesystem"
    volumes:
      - ./solution:/solution:ro
```

--- FILE: check.sh ---
```bash
#!/bin/bash
# Acceptance criteria checker for: Lost in the Filesystem
# Each check is independent — all run regardless of others

TOTAL_WEIGHT=0
PASSED_WEIGHT=0

run_check() {
  local weight=$1
  local description=$2
  local result=$3   # 0=pass, 1=fail

  TOTAL_WEIGHT=$((TOTAL_WEIGHT + weight))
  if [ "$result" -eq 0 ]; then
    echo "✅ PASS [${weight}%]: $description"
    PASSED_WEIGHT=$((PASSED_WEIGHT + weight))
  else
    echo "❌ FAIL [${weight}%]: $description"
  fi
}

echo "=== Checking: Lost in the Filesystem ==="
echo ""

# --- CHECK 1 ---
grep -E "(cat|less).*mission.txt" /home/intern/.bash_history > /dev/null 2>&1
run_check 40 "File /home/intern/mission.txt has been read" $?

# --- CHECK 2 ---
grep -i "found" /home/intern/found.txt > /dev/null 2>&1
run_check 40 "Student has created file /home/intern/found.txt containing 'found'" $?

# --- CHECK 3 ---
grep "pwd" /home/intern/.bash_history > /dev/null 2>&1
run_check 20 "Student ran pwd at least once" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Lab not yet complete. You need 70% to pass (got ${PASSED_WEIGHT}%)."
  exit 1
fi
```

--- FILE: README.md ---
```markdown
# Lab 01: Lost in the Filesystem

**Module:** 01 — Linux Fundamentals  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  
**Skills Practiced:** `pwd`, `ls`, `cd`, absolute vs relative paths  

---

## 🎯 What You Will Learn

By the end of this lab you will be able to:
- Determine your current location in the Linux filesystem.
- List the contents of directories.
- Navigate the directory tree using absolute and relative paths.

---

## 📖 Background

Linux uses a hierarchical filesystem tree. Everything starts at the root, denoted by `/`. All other directories branch off from there:
- `/home` contains user personal directories (like `/home/intern`).
- `/etc` holds system-wide configuration files.
- `/var` contains variable data like logs.
- `/tmp` is for temporary files that don't need to persist.

When working in the terminal, you are always "in" a directory. The `pwd` (print working directory) command tells you exactly where you are. The `ls` command lists the files around you, and `cd` (change directory) lets you move. 

An **absolute path** starts from the root (`/home/intern`), while a **relative path** starts from where you currently are (`../` means go up one directory).

---

## 🔥 Scenario

You've just been granted access to a new server, but your SSH session dropped you into the middle of a deeply nested temporary directory maze. Your onboarding instructions were placed in your home directory, but you have no idea where you are right now.

---

## 💥 Symptoms

What you observe when you first connect:

- You are not in your home directory.
- The prompt looks confusing, and running `ls` shows empty folders.

---

## 🎯 Your Mission

Navigate out of the maze, locate `mission.txt` in your home directory, and follow the instructions inside it.

You'll know you've succeeded when you run `/check.sh` and see `🎉 Lab passed!`

---

## ✅ Acceptance Criteria

Your submission will be checked against these criteria:

| # | What is checked | Points |
|---|----------------|--------|
| 1 | File /home/intern/mission.txt has been read | 40% |
| 2 | Student has created file /home/intern/found.txt containing 'found' | 40% |
| 3 | Student ran pwd at least once | 20% |

**Pass threshold:** 70 points out of 100  
**Time bonus:** +15 points if completed within 15 minutes  
**Hint penalty:** -10 points per hint revealed  

---

## 💡 Hints

<details>
<summary>Hint 1 — Where to look (costs 10 points)</summary>

Your home directory is `/home/intern`. You can quickly jump there from anywhere by typing `cd ~`.

</details>

<details>
<summary>Hint 2 — What to check (costs 10 points)</summary>

Once in your home directory, use the `ls` command to look for the `mission.txt` file, then read it with `cat`.

</details>

<details>
<summary>Hint 3 — The fix (costs 10 points)</summary>

```bash
pwd
cd ~
ls
cat mission.txt
echo "found" > /home/intern/found.txt
```

</details>

---

## 📚 Command Reference

| Command | What it does | Example |
|---------|-------------|---------|
| `pwd` | Print working directory | `pwd` → `/home/intern` |
| `ls` | List files | `ls -la /etc` |
| `cd` | Change directory | `cd /var/log` |

---

## 🚀 How to Start

```bash
# Start the lab
docker compose up -d

# Connect to your environment
docker exec -it lab-module01-lab01-lost-in-the-filesystem bash

# Run when you think you're done
/check.sh
```
```

--- FILE: SOLUTION.md ---
```markdown
# Solution: Lost in the Filesystem

> ⚠️ Try to solve the lab yourself before reading this. Use hints first!

---

## Root Cause

The user's starting environment (`WORKDIR` in Docker) was overridden to drop them into a deeply nested `/tmp` path to simulate getting disoriented in a Linux terminal.

---

## Step-by-Step Fix

### Step 1: Diagnose the problem

```bash
pwd
```

Expected output:
`/tmp/maze/level3/deep`

What this tells you: You are currently trapped deep inside the `/tmp` folder instead of your standard `/home/intern` user space.

### Step 2: Understand why

In Linux, you must always be aware of your location. Relative paths depend entirely on your current working directory. To escape, you must provide an absolute path to your destination or use a shortcut. The tilde `~` symbol is a special shortcut that evaluates to your user's home directory.

### Step 3: Apply the fix

```bash
cd ~
cat mission.txt
echo "found" > /home/intern/found.txt
```

### Step 4: Verify your fix

```bash
/check.sh
```

Expected output:
=== Checking: Lost in the Filesystem ===

✅ PASS [40%]: File /home/intern/mission.txt has been read
✅ PASS [40%]: Student has created file /home/intern/found.txt containing 'found'
✅ PASS [20%]: Student ran pwd at least once

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.

---

## Why This Matters in Production

When responding to late-night production incidents, you will often jump directly into specific container or server paths using automated scripts. Knowing how to quickly orient yourself using `pwd` and navigating back to known absolute paths is the foundation of incident response.

---

## What You Learned

- **Working Directory:** Use `pwd` to always know where you are.
- **Home Shortcut:** `~` is the universal shortcut to your user's safe space.
- **Absolute Paths:** Paths starting with `/` never change, regardless of where you currently are.

---

## Common Mistakes

- **Trying `cat mission.txt` immediately:** This fails because `mission.txt` doesn't exist in `/tmp/maze/level3/deep/`.
```
""")

# LAB 02
output.append("""
══════════════════════════════════════════════════════════
LAB 02 — Command Not Found
Path: labs/linux/module-01-linux-fundamentals/lab-02-command-not-found/
══════════════════════════════════════════════════════════

--- FILE: metadata.json ---
```json
{
  "id": "module-01-lab-02-command-not-found",
  "module_number": 1,
  "module_title": "Linux Fundamentals",
  "title": "Command Not Found",
  "difficulty": "beginner",
  "estimated_minutes": 15,
  "points": 100,
  "category": "linux",
  "subcategory": "fundamentals",
  "skills": ["$PATH", "alias", "bashrc", "echo"],
  "scenario": "You try to run a simple list command 'll' and some other utilities, but the server keeps responding with 'command not found'.",
  "symptoms": [
    "Typing 'll' results in 'bash: ll: command not found'",
    "The $PATH variable is missing standard directories"
  ],
  "mission": "Fix your shell environment by defining the ll alias and adding /usr/local/bin to your $PATH.",
  "hints": [
    {"number": 1, "title": "Where to look", "content": "Shell configurations are loaded from hidden files in your home directory, primarily ~/.bashrc."},
    {"number": 2, "title": "What to check", "content": "You need to append a line creating the 'll' alias to ~/.bashrc, and another line exporting PATH=$PATH:/usr/local/bin."},
    {"number": 3, "title": "The fix", "content": "Run `echo \"alias ll='ls -alF'\" >> ~/.bashrc` and `echo \"export PATH=$PATH:/usr/local/bin\" >> ~/.bashrc`, then `echo $PATH > /home/intern/path-report.txt`."}
  ],
  "verification_command": "bash /check.sh",
  "acceptance_criteria": [
    {"id": "check_1", "description": "$PATH in student's shell contains /usr/local/bin", "weight": 40},
    {"id": "check_2", "description": "A working ll alias exists in /home/intern/.bashrc", "weight": 30},
    {"id": "check_3", "description": "Student has created /home/intern/path-report.txt containing the output of echo $PATH", "weight": 30}
  ]
}
```

--- FILE: Dockerfile ---
```dockerfile
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    sudo vim nano less curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash intern \
    && echo "intern ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
    && echo "intern:intern123" | chpasswd

# THE BREAK: Remove /usr/local/bin from PATH and remove the ll alias
RUN echo "export PATH=/usr/bin:/bin:/usr/sbin:/sbin" > /home/intern/.bashrc
RUN chown intern:intern /home/intern/.bashrc

COPY check.sh /check.sh
RUN chmod +x /check.sh

RUN echo "LAB-02-MODULE-01" > /root/lab-flag.txt

USER intern
WORKDIR /home/intern

ENTRYPOINT ["tail", "-f", "/dev/null"]
```

--- FILE: docker-compose.yml ---
```yaml
version: '3.8'

services:
  lab:
    build: .
    container_name: "lab-module01-lab02-command-not-found"
    restart: "no"
    ports:
      - "2202:22"
    labels:
      - "lab.module=01"
      - "lab.category=linux"
      - "lab.subcategory=fundamentals"
      - "lab.difficulty=beginner"
      - "lab.title=Command Not Found"
      - "lab.id=module-01-lab-02-command-not-found"
    volumes:
      - ./solution:/solution:ro
```

--- FILE: check.sh ---
```bash
#!/bin/bash
# Acceptance criteria checker for: Command Not Found

TOTAL_WEIGHT=0
PASSED_WEIGHT=0

run_check() {
  local weight=$1
  local description=$2
  local result=$3

  TOTAL_WEIGHT=$((TOTAL_WEIGHT + weight))
  if [ "$result" -eq 0 ]; then
    echo "✅ PASS [${weight}%]: $description"
    PASSED_WEIGHT=$((PASSED_WEIGHT + weight))
  else
    echo "❌ FAIL [${weight}%]: $description"
  fi
}

echo "=== Checking: Command Not Found ==="
echo ""

# --- CHECK 1 ---
grep "/usr/local/bin" /home/intern/.bashrc > /dev/null 2>&1
run_check 40 "\$PATH in student's shell contains /usr/local/bin" $?

# --- CHECK 2 ---
grep "alias ll=" /home/intern/.bashrc > /dev/null 2>&1
run_check 30 "A working ll alias exists in /home/intern/.bashrc" $?

# --- CHECK 3 ---
[ -f /home/intern/path-report.txt ] && grep -q "/" /home/intern/path-report.txt
run_check 30 "Student has created /home/intern/path-report.txt containing the output of echo \$PATH" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Lab not yet complete. You need 70% to pass (got ${PASSED_WEIGHT}%)."
  exit 1
fi
```

--- FILE: README.md ---
```markdown
# Lab 02: Command Not Found

**Module:** 01 — Linux Fundamentals  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  
**Skills Practiced:** `$PATH`, `.bashrc`, `alias`

---

## 🎯 What You Will Learn

By the end of this lab you will be able to:
- Understand how Linux locates executable programs.
- Modify the `$PATH` environment variable.
- Create permanent command aliases in `.bashrc`.

---

## 📖 Background

When you type a command like `ls` and press enter, Linux doesn't scan your entire hard drive to find it. Instead, it looks sequentially through a colon-separated list of directories stored in an environment variable called `$PATH`. If the program isn't in one of those folders, bash responds with `command not found`.

Additionally, engineers often create shortcuts for long commands using `alias`. For example, `ll` is almost universally aliased to `ls -alF` to show detailed file lists. Both the `$PATH` overrides and aliases are typically saved in `~/.bashrc`, a script that runs every time you open a terminal.

---

## 🔥 Scenario

You just booted up a fresh, hardened server. You try to run your usual diagnostic commands and immediately get hit with `command not found` errors. Without a functioning shell environment, you can't get any work done.

---

## 💥 Symptoms

What you observe when you first connect:

- `bash: ll: command not found`
- Some software installed in `/usr/local/bin` isn't accessible without typing the full path.

---

## 🎯 Your Mission

Restore your shell productivity by creating the `ll` alias, ensuring `/usr/local/bin` is in your `$PATH`, and writing your current `$PATH` to a report file.

You'll know you've succeeded when you run `/check.sh` and see `🎉 Lab passed!`

---

## ✅ Acceptance Criteria

| # | What is checked | Points |
|---|----------------|--------|
| 1 | $PATH in student's shell contains /usr/local/bin | 40% |
| 2 | A working ll alias exists in /home/intern/.bashrc | 30% |
| 3 | Student has created /home/intern/path-report.txt containing the output of echo $PATH | 30% |

**Pass threshold:** 70 points out of 100  

---

## 💡 Hints

<details>
<summary>Hint 1 — Where to look (costs 10 points)</summary>

You need to edit your user's shell configuration file, located at `~/.bashrc`.

</details>

<details>
<summary>Hint 2 — What to check (costs 10 points)</summary>

Append two lines to `.bashrc`: one defining the alias, and one redefining the `PATH` variable to include `/usr/local/bin`.

</details>

<details>
<summary>Hint 3 — The fix (costs 10 points)</summary>

```bash
echo "alias ll='ls -alF'" >> ~/.bashrc
echo "export PATH=\$PATH:/usr/local/bin" >> ~/.bashrc
echo \$PATH > ~/path-report.txt
```

</details>

---

## 📚 Command Reference

| Command | What it does | Example |
|---------|-------------|---------|
| `echo` | Print text to the terminal | `echo "Hello"` |
| `which` | Show the absolute path of a command | `which ls` |

---

## 🚀 How to Start

```bash
docker compose up -d
docker exec -it lab-module01-lab02-command-not-found bash
/check.sh
```
```

--- FILE: SOLUTION.md ---
```markdown
# Solution: Command Not Found

> ⚠️ Try to solve the lab yourself before reading this. Use hints first!

---

## Root Cause

The user's default `.bashrc` profile was deliberately stripped of common convenience aliases, and the `$PATH` variable was hardcoded to omit standard installation directories like `/usr/local/bin`.

---

## Step-by-Step Fix

### Step 1: Diagnose the problem

```bash
echo $PATH
```

Expected output:
`/usr/bin:/bin:/usr/sbin:/sbin`

What this tells you: The path is extremely restrictive and missing `/usr/local/bin`.

### Step 2: Understand why

The shell needs to know where to find binaries. Modifying `~/.bashrc` ensures that every time you open a terminal session, the `PATH` is appended correctly and your aliases are loaded into memory.

### Step 3: Apply the fix

```bash
echo "alias ll='ls -alF'" >> ~/.bashrc
echo "export PATH=\$PATH:/usr/local/bin" >> ~/.bashrc
echo $PATH > ~/path-report.txt
```

### Step 4: Verify your fix

```bash
/check.sh
```

---

## Why This Matters in Production

Custom tools, scripts, and downloaded binaries are often placed in `/usr/local/bin` or custom paths like `/opt/app/bin`. If a deployment script suddenly complains that a tool is "not found", a broken `$PATH` is the culprit 90% of the time.

---

## What You Learned

- **`$PATH`:** The colon-separated list of folders your shell searches.
- **Aliases:** Custom text shortcuts defined in bash.
- **`.bashrc`:** The startup script that configures your interactive shell environment.

---

## Common Mistakes

- **Using `>` instead of `>>`:** If you run `echo "alias ll='ls'" > ~/.bashrc`, you will overwrite the entire file instead of appending to the end!
```
""")

output.append("""
══════════════════════════════════════════════════════════
LAB 03 — What Is My System?
Path: labs/linux/module-01-linux-fundamentals/lab-03-what-is-my-system/
══════════════════════════════════════════════════════════

--- FILE: metadata.json ---
```json
{
  "id": "module-01-lab-03-what-is-my-system",
  "module_number": 1,
  "module_title": "Linux Fundamentals",
  "title": "What Is My System?",
  "difficulty": "beginner",
  "estimated_minutes": 15,
  "points": 100,
  "category": "linux",
  "subcategory": "fundamentals",
  "skills": ["whoami", "hostname", "uname", "/etc/os-release"],
  "scenario": "You have inherited a server from a previous engineer and need to identify its core characteristics before starting work.",
  "symptoms": [
    "You don't know what OS this is",
    "The hostname is a random string"
  ],
  "mission": "Write a report file containing the OS type, current user, and hostname of the server.",
  "hints": [
    {"number": 1, "title": "Where to look", "content": "You can find OS details by looking at the files in the /etc/ directory, specifically /etc/os-release."},
    {"number": 2, "title": "What to check", "content": "Use `cat /etc/os-release` to find the OS. Use `whoami` for the user, and `hostname` for the hostname."},
    {"number": 3, "title": "The fix", "content": "Run `cat /etc/os-release > ~/system-report.txt`, then `whoami >> ~/system-report.txt`, then `hostname >> ~/system-report.txt`."}
  ],
  "verification_command": "bash /check.sh",
  "acceptance_criteria": [
    {"id": "check_1", "description": "/home/intern/system-report.txt exists and is not empty", "weight": 40},
    {"id": "check_2", "description": "The file contains the string 'Ubuntu' (from /etc/os-release)", "weight": 30},
    {"id": "check_3", "description": "The file contains the intern username and the hostname", "weight": 30}
  ]
}
```

--- FILE: Dockerfile ---
```dockerfile
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    sudo vim nano less curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash intern \
    && echo "intern ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
    && echo "intern:intern123" | chpasswd

# THE BREAK: Cryptic hostname and empty environment profile
RUN echo "export HOME=" > /home/intern/.bash_profile
RUN chown intern:intern /home/intern/.bash_profile

COPY check.sh /check.sh
RUN chmod +x /check.sh

RUN echo "LAB-03-MODULE-01" > /root/lab-flag.txt

USER intern
WORKDIR /home/intern

ENTRYPOINT ["tail", "-f", "/dev/null"]
```

--- FILE: docker-compose.yml ---
```yaml
version: '3.8'

services:
  lab:
    build: .
    container_name: "lab-module01-lab03-what-is-my-system"
    hostname: "srv-prod-x812z"
    restart: "no"
    ports:
      - "2203:22"
    labels:
      - "lab.module=01"
      - "lab.category=linux"
      - "lab.subcategory=fundamentals"
      - "lab.difficulty=beginner"
      - "lab.title=What Is My System?"
      - "lab.id=module-01-lab-03-what-is-my-system"
    volumes:
      - ./solution:/solution:ro
```

--- FILE: check.sh ---
```bash
#!/bin/bash
# Acceptance criteria checker for: What Is My System?

TOTAL_WEIGHT=0
PASSED_WEIGHT=0

run_check() {
  local weight=$1
  local description=$2
  local result=$3

  TOTAL_WEIGHT=$((TOTAL_WEIGHT + weight))
  if [ "$result" -eq 0 ]; then
    echo "✅ PASS [${weight}%]: $description"
    PASSED_WEIGHT=$((PASSED_WEIGHT + weight))
  else
    echo "❌ FAIL [${weight}%]: $description"
  fi
}

echo "=== Checking: What Is My System? ==="
echo ""

# --- CHECK 1 ---
[ -s /home/intern/system-report.txt ]
run_check 40 "/home/intern/system-report.txt exists and is not empty" $?

# --- CHECK 2 ---
grep -i "Ubuntu" /home/intern/system-report.txt > /dev/null 2>&1
run_check 30 "The file contains the string 'Ubuntu' (from /etc/os-release)" $?

# --- CHECK 3 ---
grep -i "intern" /home/intern/system-report.txt > /dev/null 2>&1
HAS_INTERN=$?
grep -i "$(hostname)" /home/intern/system-report.txt > /dev/null 2>&1
HAS_HOSTNAME=$?
[ $HAS_INTERN -eq 0 ] && [ $HAS_HOSTNAME -eq 0 ]
run_check 30 "The file contains the intern username and the hostname" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Lab not yet complete. You need 70% to pass (got ${PASSED_WEIGHT}%)."
  exit 1
fi
```

--- FILE: README.md ---
```markdown
# Lab 03: What Is My System?

**Module:** 01 — Linux Fundamentals  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  
**Skills Practiced:** `whoami`, `hostname`, `uname`, `/etc/os-release`

---

## 🎯 What You Will Learn

By the end of this lab you will be able to:
- Identify the Linux distribution running on a server.
- Determine your current user privileges.
- Check the server's network hostname and kernel version.

---

## 📖 Background

Linux isn't a single operating system; it's a kernel wrapped in thousands of different "distributions" (distros) like Ubuntu, Debian, RHEL, or Alpine. The package managers and file locations differ significantly between distros.

When a DevOps engineer logs into a server for the first time, their first task is profiling it:
- `/etc/os-release` holds the distro information.
- `whoami` confirms if they logged in as root or a regular user.
- `hostname` identifies the machine on the network.
- `uname -r` reveals the kernel version.

---

## 🔥 Scenario

You have inherited a server from a previous engineer. The documentation is entirely missing, and you need to investigate the server and write a report of its core characteristics before deploying the new application.

---

## 💥 Symptoms

What you observe when you first connect:

- You don't know what OS this is.
- The shell environment is barebones, and the hostname is a random cryptic string.

---

## 🎯 Your Mission

Investigate this server and produce a report file at `/home/intern/system-report.txt` containing the OS name, your username, and the hostname.

You'll know you've succeeded when you run `/check.sh` and see `🎉 Lab passed!`

---

## ✅ Acceptance Criteria

| # | What is checked | Points |
|---|----------------|--------|
| 1 | /home/intern/system-report.txt exists and is not empty | 40% |
| 2 | The file contains the string 'Ubuntu' (from /etc/os-release) | 30% |
| 3 | The file contains the intern username and the hostname | 30% |

**Pass threshold:** 70 points out of 100  

---

## 💡 Hints

<details>
<summary>Hint 1 — Where to look (costs 10 points)</summary>

OS details are stored in `/etc/os-release`. Your username is shown by `whoami`. The hostname is shown by `hostname`.

</details>

<details>
<summary>Hint 2 — What to check (costs 10 points)</summary>

Use the `cat` command to read the OS release file, and append all the outputs into your report file using `>>`.

</details>

<details>
<summary>Hint 3 — The fix (costs 10 points)</summary>

```bash
cat /etc/os-release > ~/system-report.txt
whoami >> ~/system-report.txt
hostname >> ~/system-report.txt
```

</details>

---

## 📚 Command Reference

| Command | What it does | Example |
|---------|-------------|---------|
| `whoami` | Print effective user | `whoami` |
| `hostname` | Print system network name | `hostname` |
| `uname -r` | Print kernel release | `uname -r` |

---

## 🚀 How to Start

```bash
docker compose up -d
docker exec -it lab-module01-lab03-what-is-my-system bash
/check.sh
```
```

--- FILE: SOLUTION.md ---
```markdown
# Solution: What Is My System?

> ⚠️ Try to solve the lab yourself before reading this. Use hints first!

---

## Root Cause

You were dropped into a blank environment and tasked with extracting critical identity metrics from a running Linux container.

---

## Step-by-Step Fix

### Step 1: Diagnose the OS

```bash
cat /etc/os-release
```

Expected output: `PRETTY_NAME="Ubuntu 22.04 LTS"` and other variables.
What this tells you: The package manager is `apt`, and the environment is Debian-based.

### Step 2: Extract identity

```bash
whoami
hostname
```

### Step 3: Compile the report

```bash
cat /etc/os-release > ~/system-report.txt
whoami >> ~/system-report.txt
hostname >> ~/system-report.txt
```

### Step 4: Verify your fix

```bash
/check.sh
```

---

## Why This Matters in Production

Blindly running scripts without verifying the OS can break production servers. Running a `yum` command on an `apt` based system fails instantly, but running incompatible kernel modules can permanently brick the host. Always profile unknown boxes.

---

## What You Learned

- **`/etc/os-release`:** The standard file containing OS identification data.
- **`whoami`:** The command to confirm your current user context.
- **Redirection (`>`) vs Append (`>>`):** `>` overwrites the file, `>>` adds to the bottom.

---

## Common Mistakes

- **Forgetting to use `>>`:** If you run `whoami > system-report.txt`, you will erase the OS data you just wrote to it.
```
""")

output.append("""
══════════════════════════════════════════════════════════
LAB 04 — Copy, Move, Remove
Path: labs/linux/module-01-linux-fundamentals/lab-04-copy-move-remove/
══════════════════════════════════════════════════════════

--- FILE: metadata.json ---
```json
{
  "id": "module-01-lab-04-copy-move-remove",
  "module_number": 1,
  "module_title": "Linux Fundamentals",
  "title": "Copy, Move, Remove",
  "difficulty": "beginner",
  "estimated_minutes": 15,
  "points": 100,
  "category": "linux",
  "subcategory": "fundamentals",
  "skills": ["cp", "mv", "rm", "mkdir", "touch"],
  "scenario": "Your home directory is cluttered with old backups, a config file is missing a production copy, and some directories are improperly placed.",
  "symptoms": [
    "A config directory /etc/app/ does not exist",
    "Old backup files ~/backup-*.tar.gz clutter the home directory",
    "A file that must be in /var/app/data/ is sitting in /tmp/"
  ],
  "mission": "Clean up the old backups, create the missing config directories, and move the data file to its correct location.",
  "hints": [
    {"number": 1, "title": "Where to look", "content": "You will need to use `sudo mkdir -p` to create directories in `/etc` and `/var`."},
    {"number": 2, "title": "What to check", "content": "Use `rm` to delete the backups in your home directory. Use `cp` to copy the staging config, and `mv` to move the file from /tmp."},
    {"number": 3, "title": "The fix", "content": "Run `sudo mkdir -p /etc/app`, `sudo touch /etc/app/staging.conf`, `sudo cp /etc/app/staging.conf /etc/app/production.conf`, `rm ~/backup-*.tar.gz`, `sudo mkdir -p /var/app/data`, `sudo mv /tmp/data.csv /var/app/data/`."}
  ],
  "verification_command": "bash /check.sh",
  "acceptance_criteria": [
    {"id": "check_1", "description": "/etc/app/staging.conf exists", "weight": 30},
    {"id": "check_2", "description": "/etc/app/production.conf exists", "weight": 30},
    {"id": "check_3", "description": "No backup-*.tar.gz files remain in /home/intern/", "weight": 20},
    {"id": "check_4", "description": "/var/app/data/ directory exists", "weight": 20}
  ]
}
```

--- FILE: Dockerfile ---
```dockerfile
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    sudo vim nano less curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash intern \
    && echo "intern ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
    && echo "intern:intern123" | chpasswd

# THE BREAK: Create clutter and misplace files
RUN touch /home/intern/backup-2023-01.tar.gz \
    && touch /home/intern/backup-2023-02.tar.gz \
    && touch /home/intern/backup-2023-03.tar.gz \
    && chown intern:intern /home/intern/backup-*.tar.gz

RUN touch /tmp/data.csv

COPY check.sh /check.sh
RUN chmod +x /check.sh

RUN echo "LAB-04-MODULE-01" > /root/lab-flag.txt

USER intern
WORKDIR /home/intern

ENTRYPOINT ["tail", "-f", "/dev/null"]
```

--- FILE: docker-compose.yml ---
```yaml
version: '3.8'

services:
  lab:
    build: .
    container_name: "lab-module01-lab04-copy-move-remove"
    restart: "no"
    ports:
      - "2204:22"
    labels:
      - "lab.module=01"
      - "lab.category=linux"
      - "lab.subcategory=fundamentals"
      - "lab.difficulty=beginner"
      - "lab.title=Copy, Move, Remove"
      - "lab.id=module-01-lab-04-copy-move-remove"
    volumes:
      - ./solution:/solution:ro
```

--- FILE: check.sh ---
```bash
#!/bin/bash
# Acceptance criteria checker for: Copy, Move, Remove

TOTAL_WEIGHT=0
PASSED_WEIGHT=0

run_check() {
  local weight=$1
  local description=$2
  local result=$3

  TOTAL_WEIGHT=$((TOTAL_WEIGHT + weight))
  if [ "$result" -eq 0 ]; then
    echo "✅ PASS [${weight}%]: $description"
    PASSED_WEIGHT=$((PASSED_WEIGHT + weight))
  else
    echo "❌ FAIL [${weight}%]: $description"
  fi
}

echo "=== Checking: Copy, Move, Remove ==="
echo ""

# --- CHECK 1 ---
[ -f /etc/app/staging.conf ]
run_check 30 "/etc/app/staging.conf exists" $?

# --- CHECK 2 ---
[ -f /etc/app/production.conf ]
run_check 30 "/etc/app/production.conf exists" $?

# --- CHECK 3 ---
ls /home/intern/backup-*.tar.gz > /dev/null 2>&1
[ $? -ne 0 ]
run_check 20 "No backup-*.tar.gz files remain in /home/intern/" $?

# --- CHECK 4 ---
[ -d /var/app/data/ ] && [ -f /var/app/data/data.csv ]
run_check 20 "/var/app/data/ directory exists and contains data.csv" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Lab not yet complete. You need 70% to pass (got ${PASSED_WEIGHT}%)."
  exit 1
fi
```

--- FILE: README.md ---
```markdown
# Lab 04: Copy, Move, Remove

**Module:** 01 — Linux Fundamentals  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  
**Skills Practiced:** `cp`, `mv`, `rm`, `mkdir`, `touch`

---

## 🎯 What You Will Learn

By the end of this lab you will be able to:
- Create new directories and empty files.
- Copy and rename files using core utilities.
- Delete files using wildcards to match multiple files at once.

---

## 📖 Background

File manipulation is the bread and butter of Linux operations.
- `mkdir` creates directories. Use `mkdir -p` to create nested paths (e.g. `mkdir -p /a/b/c`).
- `touch` creates an empty file.
- `cp` copies files.
- `mv` moves files. It is also used to **rename** files.
- `rm` deletes files permanently. There is no recycling bin in Linux. Use wildcards (`*`) to match patterns, like `rm *.txt`.

---

## 🔥 Scenario

You are provisioning a new application environment. However, the automated deployment script failed halfway through, leaving clutter everywhere and missing crucial configuration files.

---

## 💥 Symptoms

What you observe when you first connect:

- `~/backup-*.tar.gz` files are littering your home directory.
- Application expects config at `/etc/app/staging.conf` and `/etc/app/production.conf`, but they don't exist.
- A critical data file is sitting in `/tmp/data.csv` but belongs in `/var/app/data/`.

---

## 🎯 Your Mission

Clean up the old backups, create the missing config directories and files, and move the data file to its correct location.

You'll know you've succeeded when you run `/check.sh` and see `🎉 Lab passed!`

---

## ✅ Acceptance Criteria

| # | What is checked | Points |
|---|----------------|--------|
| 1 | /etc/app/staging.conf exists | 30% |
| 2 | /etc/app/production.conf exists | 30% |
| 3 | No backup-*.tar.gz files remain in /home/intern/ | 20% |
| 4 | /var/app/data/ directory exists and contains data.csv | 20% |

**Pass threshold:** 70 points out of 100  

---

## 💡 Hints

<details>
<summary>Hint 1 — Where to look (costs 10 points)</summary>

Because `/etc` and `/var` are system directories, you must prepend `sudo` to any commands modifying those paths.

</details>

<details>
<summary>Hint 2 — What to check (costs 10 points)</summary>

Create the directories first using `sudo mkdir -p`. Then `touch` the staging file, and `cp` it to the production file. Finally, `rm` the backups and `mv` the data file.

</details>

<details>
<summary>Hint 3 — The fix (costs 10 points)</summary>

```bash
sudo mkdir -p /etc/app
sudo touch /etc/app/staging.conf
sudo cp /etc/app/staging.conf /etc/app/production.conf
rm ~/backup-*.tar.gz
sudo mkdir -p /var/app/data
sudo mv /tmp/data.csv /var/app/data/
```

</details>

---

## 📚 Command Reference

| Command | What it does | Example |
|---------|-------------|---------|
| `cp` | Copy a file | `cp file1 file2` |
| `mv` | Move / Rename a file | `mv oldname newname` |
| `rm` | Remove a file | `rm *.txt` |

---

## 🚀 How to Start

```bash
docker compose up -d
docker exec -it lab-module01-lab04-copy-move-remove bash
/check.sh
```
```

--- FILE: SOLUTION.md ---
```markdown
# Solution: Copy, Move, Remove

> ⚠️ Try to solve the lab yourself before reading this. Use hints first!

---

## Root Cause

Files were scattered incorrectly due to a failed automated provisioning process, requiring manual intervention to structure the filesystem properly.

---

## Step-by-Step Fix

### Step 1: Clean up backups

```bash
rm ~/backup-*.tar.gz
```

### Step 2: Create configs

```bash
sudo mkdir -p /etc/app
sudo touch /etc/app/staging.conf
sudo cp /etc/app/staging.conf /etc/app/production.conf
```

### Step 3: Move data

```bash
sudo mkdir -p /var/app/data
sudo mv /tmp/data.csv /var/app/data/
```

### Step 4: Verify your fix

```bash
/check.sh
```

---

## Why This Matters in Production

Configuring Linux environments manually is the first step before writing automated Ansible playbooks or Dockerfiles. If you cannot structure the filesystem, copy templates, and clean up temporary artifacts on the command line, you cannot automate it.

---

## What You Learned

- **`mkdir -p`:** Creates entire directory trees at once without failing if they exist.
- **`sudo`:** Superuser Do, required to modify system paths like `/etc` and `/var`.
- **Wildcards:** The `*` character matches any characters, enabling bulk operations.

---

## Common Mistakes

- **Forgetting `sudo`:** Normal users cannot write to `/etc`.
```
""")

output.append("""
══════════════════════════════════════════════════════════
LAB 05 — Reading Files
Path: labs/linux/module-01-linux-fundamentals/lab-05-reading-files/
══════════════════════════════════════════════════════════

--- FILE: metadata.json ---
```json
{
  "id": "module-01-lab-05-reading-files",
  "module_number": 1,
  "module_title": "Linux Fundamentals",
  "title": "Reading Files",
  "difficulty": "beginner",
  "estimated_minutes": 15,
  "points": 100,
  "category": "linux",
  "subcategory": "fundamentals",
  "skills": ["cat", "less", "head", "tail", "grep"],
  "scenario": "An application is crashing. You need to read its logs and configuration files to extract the exact error messages.",
  "symptoms": [
    "A massive log file at /var/log/app/application.log is impossible to read completely",
    "Config files are scattered across /etc/app, /opt/app, and home directories"
  ],
  "mission": "Use log reading utilities like tail and grep to extract critical errors and summarize the configuration files.",
  "hints": [
    {"number": 1, "title": "Where to look", "content": "You will need to use grep to search for the word 'ERROR' in the log file."},
    {"number": 2, "title": "What to check", "content": "You need to pipe commands or redirect output. Use `tail -n 10` to get the last 10 lines of the log."},
    {"number": 3, "title": "The fix", "content": "Run `sudo grep ERROR /var/log/app/application.log > ~/errors.txt`. Run `sudo tail -n 10 /var/log/app/application.log > ~/last10.txt`. Run `cat /etc/app/db.conf /opt/app/settings.conf ~/.app-config > ~/config-summary.txt`."}
  ],
  "verification_command": "bash /check.sh",
  "acceptance_criteria": [
    {"id": "check_1", "description": "/home/intern/errors.txt exists and contains an ERROR line", "weight": 35},
    {"id": "check_2", "description": "/home/intern/last10.txt exists and contains exactly 10 lines", "weight": 35},
    {"id": "check_3", "description": "/home/intern/config-summary.txt exists and is not empty", "weight": 30}
  ]
}
```

--- FILE: Dockerfile ---
```dockerfile
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    sudo vim nano less curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash intern \
    && echo "intern ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
    && echo "intern:intern123" | chpasswd

# THE BREAK: Create appuser, logs and configs
RUN useradd -r -s /bin/false appuser && \
    mkdir -p /var/log/app && \
    chown appuser:appuser /var/log/app && \
    chmod 750 /var/log/app

RUN echo "[2024-01-15 09:00:01] INFO: Application started" > /var/log/app/application.log && \
    for i in {1..30}; do echo "[2024-01-15 09:00:$(printf "%02d" $i)] INFO: Request processed"; done >> /var/log/app/application.log && \
    echo "[2024-01-15 09:01:23] WARNING: High memory usage detected: 78%" >> /var/log/app/application.log && \
    echo "[2024-01-15 09:02:45] ERROR: Failed to connect to cache server: connection refused" >> /var/log/app/application.log && \
    for i in {1..8}; do echo "[2024-01-15 09:03:00] WARNING: Retrying connection"; done >> /var/log/app/application.log && \
    for i in {1..4}; do echo "[2024-01-15 09:04:00] ERROR: Cache timeout"; done >> /var/log/app/application.log && \
    for i in {1..5}; do echo "[2024-01-15 09:05:00] INFO: Fallback mode active"; done >> /var/log/app/application.log

RUN mkdir -p /etc/app /opt/app && \
    echo "DB_HOST=localhost" > /etc/app/db.conf && \
    echo "ENV=production" > /opt/app/settings.conf && \
    echo "USER_THEME=dark" > /home/intern/.app-config

COPY check.sh /check.sh
RUN chmod +x /check.sh

RUN echo "LAB-05-MODULE-01" > /root/lab-flag.txt

USER intern
WORKDIR /home/intern

ENTRYPOINT ["tail", "-f", "/dev/null"]
```

--- FILE: docker-compose.yml ---
```yaml
version: '3.8'

services:
  lab:
    build: .
    container_name: "lab-module01-lab05-reading-files"
    restart: "no"
    ports:
      - "2205:22"
    labels:
      - "lab.module=01"
      - "lab.category=linux"
      - "lab.subcategory=fundamentals"
      - "lab.difficulty=beginner"
      - "lab.title=Reading Files"
      - "lab.id=module-01-lab-05-reading-files"
    volumes:
      - ./solution:/solution:ro
```

--- FILE: check.sh ---
```bash
#!/bin/bash
# Acceptance criteria checker for: Reading Files

TOTAL_WEIGHT=0
PASSED_WEIGHT=0

run_check() {
  local weight=$1
  local description=$2
  local result=$3

  TOTAL_WEIGHT=$((TOTAL_WEIGHT + weight))
  if [ "$result" -eq 0 ]; then
    echo "✅ PASS [${weight}%]: $description"
    PASSED_WEIGHT=$((PASSED_WEIGHT + weight))
  else
    echo "❌ FAIL [${weight}%]: $description"
  fi
}

echo "=== Checking: Reading Files ==="
echo ""

# --- CHECK 1 ---
[ -f /home/intern/errors.txt ] && grep -q "ERROR" /home/intern/errors.txt
run_check 35 "/home/intern/errors.txt exists and contains an ERROR line" $?

# --- CHECK 2 ---
[ -f /home/intern/last10.txt ] && [ $(wc -l < /home/intern/last10.txt) -eq 10 ]
run_check 35 "/home/intern/last10.txt exists and contains exactly 10 lines" $?

# --- CHECK 3 ---
[ -s /home/intern/config-summary.txt ]
run_check 30 "/home/intern/config-summary.txt exists and is not empty" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Lab not yet complete. You need 70% to pass (got ${PASSED_WEIGHT}%)."
  exit 1
fi
```

--- FILE: README.md ---
```markdown
# Lab 05: Reading Files

**Module:** 01 — Linux Fundamentals  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  
**Skills Practiced:** `cat`, `less`, `head`, `tail`, `grep`, redirection

---

## 🎯 What You Will Learn

By the end of this lab you will be able to:
- Use `grep` to filter out specific lines from large files.
- Use `tail` to read the end of files.
- Redirect output from commands into files using `>`.

---

## 📖 Background

DevOps engineers read logs constantly. A single production application log file might contain millions of lines. Trying to read it with `cat` will flood your terminal.
- `less` allows you to paginate through files.
- `head` reads the first 10 lines.
- `tail` reads the last 10 lines. Use `tail -f` to "follow" live logs.
- `grep` searches for text patterns. If you only care about crashes, `grep ERROR file.log` filters out everything else.
- `>` redirects the output of a command into a file.

---

## 🔥 Scenario

An application is crashing randomly in production. You need to investigate the primary log file and extract the error messages, as well as grab a summary of the configuration settings.

---

## 💥 Symptoms

What you observe when you first connect:

- `/var/log/app/application.log` is massive.
- Configuration parameters are scattered across `/etc/app/db.conf`, `/opt/app/settings.conf`, and `~/.app-config`.

---

## 🎯 Your Mission

Use log reading utilities to extract the errors into `errors.txt`, the last 10 lines into `last10.txt`, and combine all 3 configs into `config-summary.txt`.

You'll know you've succeeded when you run `/check.sh` and see `🎉 Lab passed!`

---

## ✅ Acceptance Criteria

| # | What is checked | Points |
|---|----------------|--------|
| 1 | /home/intern/errors.txt exists and contains an ERROR line | 35% |
| 2 | /home/intern/last10.txt exists and contains exactly 10 lines | 35% |
| 3 | /home/intern/config-summary.txt exists and is not empty | 30% |

**Pass threshold:** 70 points out of 100  

---

## 💡 Hints

<details>
<summary>Hint 1 — Where to look (costs 10 points)</summary>

You will need `sudo` to read `/var/log/app/application.log` because the directory is owned by `appuser`.

</details>

<details>
<summary>Hint 2 — What to check (costs 10 points)</summary>

To get exactly 10 lines, use `tail -n 10`. To combine multiple files, pass them all to `cat` separated by spaces.

</details>

<details>
<summary>Hint 3 — The fix (costs 10 points)</summary>

```bash
sudo grep ERROR /var/log/app/application.log > ~/errors.txt
sudo tail -n 10 /var/log/app/application.log > ~/last10.txt
cat /etc/app/db.conf /opt/app/settings.conf ~/.app-config > ~/config-summary.txt
```

</details>

---

## 📚 Command Reference

| Command | What it does | Example |
|---------|-------------|---------|
| `grep` | Global Regular Expression Print | `grep "ERROR" file.log` |
| `tail` | Output the last part of files | `tail -n 10 file.log` |

---

## 🚀 How to Start

```bash
docker compose up -d
docker exec -it lab-module01-lab05-reading-files bash
/check.sh
```
```

--- FILE: SOLUTION.md ---
```markdown
# Solution: Reading Files

> ⚠️ Try to solve the lab yourself before reading this. Use hints first!

---

## Root Cause

You were tasked with extracting specific operational data from large and scattered system files using Linux text processing utilities.

---

## Step-by-Step Fix

### Step 1: Extract Errors

```bash
sudo grep ERROR /var/log/app/application.log > ~/errors.txt
```

### Step 2: Extract last lines

```bash
sudo tail -n 10 /var/log/app/application.log > ~/last10.txt
```

### Step 3: Combine configurations

```bash
cat /etc/app/db.conf /opt/app/settings.conf ~/.app-config > ~/config-summary.txt
```

### Step 4: Verify your fix

```bash
/check.sh
```

---

## Why This Matters in Production

Searching through log files is a daily requirement. If a web server fails under load, you cannot open a 10 GB log file in a text editor. `grep` and `tail` process these files sequentially, taking up minimal memory and allowing you to find the root cause in seconds.

---

## What You Learned

- **`grep`:** The ultimate text search tool.
- **`tail`:** Essential for reading the most recent entries in logs.
- **`cat` concatenation:** `cat` literally stands for "concatenate". It can stitch multiple files together.
```
""")

output.append("""
══════════════════════════════════════════════════════════
LAB 06 — Your First Permissions Fix
Path: labs/linux/module-01-linux-fundamentals/lab-06-your-first-permissions-fix/
══════════════════════════════════════════════════════════

--- FILE: metadata.json ---
```json
{
  "id": "module-01-lab-06-your-first-permissions-fix",
  "module_number": 1,
  "module_title": "Linux Fundamentals",
  "title": "Your First Permissions Fix",
  "difficulty": "beginner",
  "estimated_minutes": 15,
  "points": 100,
  "category": "linux",
  "subcategory": "fundamentals",
  "skills": ["chmod", "sudo", "permissions"],
  "scenario": "A deployment failed because of three distinct 'Permission denied' errors blocking your application from running.",
  "symptoms": [
    "A deploy script /opt/deploy.sh is not executable",
    "A config file /etc/app/config.ini is only readable by root",
    "A log directory /var/log/myapp/ is not writable by intern"
  ],
  "mission": "Fix the permissions on the script, the config file, and the log directory so the 'intern' user can execute, read, and write respectively.",
  "hints": [
    {"number": 1, "title": "Where to look", "content": "You will need to use `chmod` for all three fixes. You must run it with `sudo`."},
    {"number": 2, "title": "What to check", "content": "Use `chmod +x` for execution. Use octal `644` to make a file globally readable, and `777` to make a directory globally writable (for this lab)."},
    {"number": 3, "title": "The fix", "content": "Run `sudo chmod +x /opt/deploy.sh`, `sudo chmod 644 /etc/app/config.ini`, and `sudo chmod 777 /var/log/myapp/`."}
  ],
  "verification_command": "bash /check.sh",
  "acceptance_criteria": [
    {"id": "check_1", "description": "/opt/deploy.sh is executable", "weight": 35},
    {"id": "check_2", "description": "/etc/app/config.ini is readable by intern", "weight": 35},
    {"id": "check_3", "description": "/var/log/myapp/ is writable by intern", "weight": 30}
  ]
}
```

--- FILE: Dockerfile ---
```dockerfile
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    sudo vim nano less curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash intern \
    && echo "intern ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
    && echo "intern:intern123" | chpasswd

# THE BREAK: Create broken permissions
RUN echo "#!/bin/bash\necho Deploying!" > /opt/deploy.sh \
    && chmod 644 /opt/deploy.sh

RUN mkdir -p /etc/app \
    && echo "SECRET=123" > /etc/app/config.ini \
    && chmod 600 /etc/app/config.ini

RUN mkdir -p /var/log/myapp/ \
    && chmod 755 /var/log/myapp/

COPY check.sh /check.sh
RUN chmod +x /check.sh

RUN echo "LAB-06-MODULE-01" > /root/lab-flag.txt

USER intern
WORKDIR /home/intern

ENTRYPOINT ["tail", "-f", "/dev/null"]
```

--- FILE: docker-compose.yml ---
```yaml
version: '3.8'

services:
  lab:
    build: .
    container_name: "lab-module01-lab06-your-first-permissions-fix"
    restart: "no"
    ports:
      - "2206:22"
    labels:
      - "lab.module=01"
      - "lab.category=linux"
      - "lab.subcategory=fundamentals"
      - "lab.difficulty=beginner"
      - "lab.title=Your First Permissions Fix"
      - "lab.id=module-01-lab-06-your-first-permissions-fix"
    volumes:
      - ./solution:/solution:ro
```

--- FILE: check.sh ---
```bash
#!/bin/bash
# Acceptance criteria checker for: Your First Permissions Fix

TOTAL_WEIGHT=0
PASSED_WEIGHT=0

run_check() {
  local weight=$1
  local description=$2
  local result=$3

  TOTAL_WEIGHT=$((TOTAL_WEIGHT + weight))
  if [ "$result" -eq 0 ]; then
    echo "✅ PASS [${weight}%]: $description"
    PASSED_WEIGHT=$((PASSED_WEIGHT + weight))
  else
    echo "❌ FAIL [${weight}%]: $description"
  fi
}

echo "=== Checking: Your First Permissions Fix ==="
echo ""

# --- CHECK 1 ---
[ -x /opt/deploy.sh ]
run_check 35 "/opt/deploy.sh is executable" $?

# --- CHECK 2 ---
sudo -u intern cat /etc/app/config.ini > /dev/null 2>&1
run_check 35 "/etc/app/config.ini is readable by intern" $?

# --- CHECK 3 ---
sudo -u intern touch /var/log/myapp/test.log > /dev/null 2>&1
run_check 30 "/var/log/myapp/ is writable by intern" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Lab not yet complete. You need 70% to pass (got ${PASSED_WEIGHT}%)."
  exit 1
fi
```

--- FILE: README.md ---
```markdown
# Lab 06: Your First Permissions Fix

**Module:** 01 — Linux Fundamentals  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  
**Skills Practiced:** `chmod`, `sudo`, reading `rwxrwxrwx` format

---

## 🎯 What You Will Learn

By the end of this lab you will be able to:
- Make a script executable.
- Modify file permissions using basic `chmod` rules.
- Understand what `Permission denied` means and how to bypass it.

---

## 📖 Background

Linux permissions are represented as a string of 9 characters, like `rwxrwxrwx`. Read it left to right in groups of 3:
- **Owner**: The user who owns the file.
- **Group**: A specific group of users.
- **Others**: Everyone else on the system.

`r` means Read, `w` means Write, `x` means Execute.
For a file, `x` means you can run it as a program.
For a directory, `w` means you can create files inside it.

You can modify these using `chmod` (change mode). You can use `chmod +x` to add execute permissions, or use octal numbers like `644` (read/write for owner, read-only for others) or `777` (read/write/execute for everyone).

---

## 🔥 Scenario

A deployment failed. A script won't run, a config file can't be read by the application, and the application cannot write to its log folder.

---

## 💥 Symptoms

What you observe when you first connect:

- Running `/opt/deploy.sh` yields `Permission denied`.
- `cat /etc/app/config.ini` yields `Permission denied`.
- Touching a file in `/var/log/myapp/` yields `Permission denied`.

---

## 🎯 Your Mission

Fix the permissions on the script, the config file, and the log directory so the 'intern' user can execute, read, and write respectively.

You'll know you've succeeded when you run `/check.sh` and see `🎉 Lab passed!`

---

## ✅ Acceptance Criteria

| # | What is checked | Points |
|---|----------------|--------|
| 1 | /opt/deploy.sh is executable | 35% |
| 2 | /etc/app/config.ini is readable by intern | 35% |
| 3 | /var/log/myapp/ is writable by intern | 30% |

**Pass threshold:** 70 points out of 100  

---

## 💡 Hints

<details>
<summary>Hint 1 — Where to look (costs 10 points)</summary>

You must use `sudo` to run `chmod` on files owned by root.

</details>

<details>
<summary>Hint 2 — What to check (costs 10 points)</summary>

Use `chmod +x` for the script. Use `chmod 644` for the config. Use `chmod 777` for the log directory.

</details>

<details>
<summary>Hint 3 — The fix (costs 10 points)</summary>

```bash
sudo chmod +x /opt/deploy.sh
sudo chmod 644 /etc/app/config.ini
sudo chmod 777 /var/log/myapp/
```

</details>

---

## 📚 Command Reference

| Command | What it does | Example |
|---------|-------------|---------|
| `chmod` | Change file modes | `chmod +x script.sh` |
| `ls -la` | List files with permissions | `ls -la` |

---

## 🚀 How to Start

```bash
docker compose up -d
docker exec -it lab-module01-lab06-your-first-permissions-fix bash
/check.sh
```
```

--- FILE: SOLUTION.md ---
```markdown
# Solution: Your First Permissions Fix

> ⚠️ Try to solve the lab yourself before reading this. Use hints first!

---

## Root Cause

Files created by the root user natively have restrictive permissions that prevent standard users from reading or executing them.

---

## Step-by-Step Fix

### Step 1: Make script executable

```bash
sudo chmod +x /opt/deploy.sh
```

### Step 2: Make config readable

```bash
sudo chmod 644 /etc/app/config.ini
```

### Step 3: Make log dir writable

```bash
sudo chmod 777 /var/log/myapp/
```

### Step 4: Verify your fix

```bash
/check.sh
```

---

## Why This Matters in Production

The `#1` cause of application startup failures in Linux environments is incorrect permissions. A web server won't start if it can't read its SSL certificate, and a database will crash if it cannot write to its storage directory.

---

## What You Learned

- **`chmod +x`:** Instantly grants execution rights to a file.
- **Octal `644`:** The default safe permission for configuration files (readable by all).
- **Octal `777`:** Grants all permissions to everyone (useful for debugging, dangerous in production).
```
""")

output.append("""
---

## SECTION 3: sync_labs.py Update

```python
import os
import json
import argparse
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

def sync_labs():
    db = SessionLocal()
    labs_dir = os.environ.get("LABS_HOST_PATH", "./labs-repo")
    
    added = 0
    updated = 0
    skipped = 0

    for root, dirs, files in os.walk(labs_dir):
        if "metadata.json" in files:
            try:
                with open(os.path.join(root, "metadata.json"), "r") as f:
                    meta = json.load(f)
                
                lab_id = meta["id"]
                existing_lab = db.query(models.Lab).filter_by(id=lab_id).first()
                
                lab_data = {
                    "module_number": meta.get("module_number", 0),
                    "module_title": meta.get("module_title", ""),
                    "title": meta.get("title", ""),
                    "difficulty": meta.get("difficulty", "beginner"),
                    "estimated_minutes": meta.get("estimated_minutes", 15),
                    "points": meta.get("points", 100),
                    "category": meta.get("category", ""),
                    "subcategory": meta.get("subcategory", ""),
                    "scenario": meta.get("scenario", ""),
                    "symptoms": json.dumps(meta.get("symptoms", [])),
                    "mission": meta.get("mission", ""),
                    "verification_command": meta.get("verification_command", ""),
                    "hints": json.dumps(meta.get("hints", [])),
                    "acceptance_criteria": json.dumps(meta.get("acceptance_criteria", []))
                }
                
                if existing_lab:
                    for key, value in lab_data.items():
                        setattr(existing_lab, key, value)
                    updated += 1
                else:
                    new_lab = models.Lab(id=lab_id, **lab_data)
                    db.add(new_lab)
                    added += 1
                    
            except Exception as e:
                print(f"Error parsing metadata in {root}: {e}")
                skipped += 1
                
    db.commit()
    db.close()
    
    print("=== Sync Summary ===")
    print(f"Labs Added:   {added}")
    print(f"Labs Updated: {updated}")
    print(f"Labs Skipped: {skipped}")

if __name__ == "__main__":
    sync_labs()
```

---

## SECTION 4: Updated models.py

```python
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Lab(Base):
    __tablename__ = "labs"
    
    id = Column(String, primary_key=True, index=True)
    module_number = Column(Integer)
    module_title = Column(String)
    title = Column(String)
    difficulty = Column(String)
    estimated_minutes = Column(Integer)
    points = Column(Integer)
    category = Column(String)
    subcategory = Column(String)
    
    # New Fields
    scenario = Column(Text, nullable=True)
    symptoms = Column(Text, nullable=True)
    mission = Column(Text, nullable=True)
    verification_command = Column(String, nullable=True)
    hints = Column(Text, nullable=True)   # JSON string
    acceptance_criteria = Column(Text, nullable=True)   # JSON string

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)

class LabSession(Base):
    __tablename__ = "lab_sessions"
    id = Column(String, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    lab_id = Column(String, ForeignKey("labs.id"))
    container_name = Column(String, nullable=True)
    status = Column(String, default="starting")
    expires_at = Column(DateTime, nullable=True)

class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("lab_sessions.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    lab_id = Column(String, ForeignKey("labs.id"))
    passed = Column(Boolean)
    score = Column(Integer)
    verification_output = Column(Text)
```

---

## SECTION 5: Alembic Migration

**`add_lab_content_fields.py`**
```python
\"\"\"add lab content fields

Revision ID: xyz123456
Revises: previous_revision_id
Create Date: 2026-05-17 12:00:00.000000

\"\"\"
from alembic import op
import sqlalchemy as sa

revision = 'xyz123456'
down_revision = 'previous_revision_id'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('labs', sa.Column('scenario', sa.Text(), nullable=True))
    op.add_column('labs', sa.Column('symptoms', sa.Text(), nullable=True))
    op.add_column('labs', sa.Column('mission', sa.Text(), nullable=True))
    op.add_column('labs', sa.Column('verification_command', sa.String(), nullable=True))
    op.add_column('labs', sa.Column('hints', sa.Text(), nullable=True))
    op.add_column('labs', sa.Column('acceptance_criteria', sa.Text(), nullable=True))

def downgrade():
    op.drop_column('labs', 'acceptance_criteria')
    op.drop_column('labs', 'hints')
    op.drop_column('labs', 'verification_command')
    op.drop_column('labs', 'mission')
    op.drop_column('labs', 'symptoms')
    op.drop_column('labs', 'scenario')
```

---

## SECTION 6: README Update

Add this to `devops-lab-platform/README.md`:

```markdown
## 📝 Lab Authoring Guide

To add a new lab, create a new directory inside `labs/` containing these required files:
- `Dockerfile` (builds the intentionally broken environment)
- `docker-compose.yml` (orchestrates the lab)
- `metadata.json` (the source of truth for the platform)
- `check.sh` (the verification script)
- `README.md` (the student-facing brief)
- `SOLUTION.md` (the step-by-step fix)

### metadata.json Schema
- `scenario` (string): Situation the student walks into.
- `symptoms` (array of strings): Bullet list of broken behaviors.
- `mission` (string): The success condition.
- `verification_command` (string): Usually `"bash /check.sh"`.
- `acceptance_criteria` (array of objects): `[{"id": "check_1", "description": "...", "weight": 40}]`
- `hints` (array of objects): `[{"number": 1, "title": "...", "content": "..."}]`

### check.sh Contract
Your `check.sh` script must perform independent checks without failing early (do not use `set -e`). Print `✅ PASS [weight%]: description` or `❌ FAIL [weight%]: description`. Maintain a `PASSED_WEIGHT` variable. Exit `0` if `PASSED_WEIGHT >= 70`, else exit `1`.

### Syncing
After writing your files, run `python devops-lab-platform/backend/scripts/sync_labs.py` to upsert your lab into the PostgreSQL database!
```
""")

with open("/Users/mohamedserag/Desktop/Opslance/prompt_output.md", "w") as f:
    f.write("\n".join(output))

