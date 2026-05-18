import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)

l01_meta = """{
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
  "scenario": "A junior developer was exploring the filesystem and got lost. They were somewhere deep in the directory tree and ran cd / by accident. Now they can't find their way back to their home directory where their work file mission.txt is waiting. They need to navigate back and read the file.",
  "symptoms": [
    "You don't know where you are",
    "You need to find mission.txt somewhere in the intern's home directory"
  ],
  "mission": "Navigate the filesystem, read mission.txt, and complete the tasks inside it.",
  "hints": [
    {"number": 1, "title": "Where to look", "content": "The file is located in the user's home directory. You can go there using the ~ symbol or the absolute path /home/intern."},
    {"number": 2, "title": "What to check", "content": "Once in the home directory, list all files to find mission.txt and read it."},
    {"number": 3, "title": "The fix", "content": "Run `cd ~`, then `cat mission.txt`. Then create the required files."}
  ],
  "verification_command": "bash /check.sh",
  "acceptance_criteria": [
    {"id": "check_1", "description": "/home/intern/found.txt exists and contains target text", "weight": 35},
    {"id": "check_2", "description": "/home/intern/etc-count.txt exists and is not empty", "weight": 35},
    {"id": "check_3", "description": "/home/intern/projects/alpha/beta/gamma/visited.txt exists", "weight": 30}
  ]
}"""

l01_dock = """FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \\
    sudo vim nano less curl \\
    && rm -rf /var/lib/apt/lists/*
RUN useradd -m -s /bin/bash intern && \\
    echo "intern ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers && \\
    echo "intern:intern123" | chpasswd
    
# THE BREAK: Disorient the student
RUN mkdir -p /home/intern/projects/alpha/beta/gamma/
RUN touch /home/intern/projects/alpha/file1.txt /home/intern/projects/alpha/beta/file2.txt
RUN echo "These are some notes" > /home/intern/projects/notes.txt

RUN echo "🎯 Mission: You Found It!\\n\\nYou navigated to your home directory successfully.\\n\\nNow complete these tasks:\\n1. Create a file called 'found.txt' in this directory (/home/intern/)\\n   with the text: \\"I navigated the Linux filesystem\\"\\n\\n2. Use 'ls' to list the contents of /etc and count how many items are there.\\n   Write the count to /home/intern/etc-count.txt like this:\\n   echo \\"42 items\\" > /home/intern/etc-count.txt\\n   (replace 42 with the real count)\\n\\n3. Navigate to /home/intern/projects/alpha/beta/gamma/ using a RELATIVE path\\n   from /home/intern/ (not an absolute path) and create a file called\\n   'visited.txt' there.\\n\\nRun /check.sh when done." > /home/intern/mission.txt

COPY check.sh /check.sh
RUN chmod +x /check.sh
RUN echo "FLAG-lost-in-the-filesystem" > /root/flag.txt
USER intern
WORKDIR /usr/share/doc/bash/
ENTRYPOINT ["tail", "-f", "/dev/null"]"""

l01_comp = """version: '3.8'
services:
  linux-module-01-lost-in-the-filesystem:
    build: .
    container_name: lab-01-lost-in-the-filesystem
    restart: "no"
    labels:
      - "lab.module=MODULE 01"
      - "lab.category=linux"
      - "lab.difficulty=beginner"
      - "lab.title=Lost in the Filesystem"
      - "lab.id=module-01-lab-01-lost-in-the-filesystem"
    volumes:
      - ./solution:/solution:ro"""

l01_check = """#!/bin/bash
PASSED_WEIGHT=0
run_check() {
  local weight=$1 description=$2 result=$3
  if [ "$result" -eq 0 ]; then
    echo "✅ PASS [${weight}%]: $description"
    PASSED_WEIGHT=$((PASSED_WEIGHT + weight))
  else
    echo "❌ FAIL [${weight}%]: $description"
  fi
}
echo "=== Checking: Lost in the Filesystem ==="
echo ""

# CHECK 1
grep -q "I navigated the Linux filesystem" /home/intern/found.txt 2>/dev/null
run_check 35 "/home/intern/found.txt exists and contains 'I navigated the Linux filesystem'" $?

# CHECK 2
[ -s /home/intern/etc-count.txt ]
run_check 35 "/home/intern/etc-count.txt exists and is not empty" $?

# CHECK 3
[ -f /home/intern/projects/alpha/beta/gamma/visited.txt ]
run_check 30 "/home/intern/projects/alpha/beta/gamma/visited.txt exists" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi"""

l01_read = """# Lab 01: Lost in the Filesystem

**Module:** 01 — Linux Fundamentals  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  

---

## 🎯 What You Will Learn
- What the shell prompt tells you.
- Determine your location with `pwd`.
- Navigate using absolute and relative paths.

---

## 📖 Background

**What is Linux?** It's an operating system kernel that powers servers, phones, and most of the internet. A **distribution** (like Ubuntu, Debian, RHEL, or Alpine) is just different packaging around the same core Linux kernel.

When you open a terminal, you see a prompt like `intern@hostname:~$`. This means you are logged in as the user `intern` on the machine `hostname`, and your current directory is `~`. The tilde (`~`) is a universal shortcut for your home directory (usually `/home/intern`).

The Linux filesystem is a tree. The very top is `/` (the root). Everything hangs off it:
- `/home` (user files)
- `/etc` (config files)
- `/var` (logs and runtime data)
- `/tmp` (temporary files)
- `/usr` (programs)

An **absolute path** starts from `/` and works from anywhere (e.g. `/home/intern/file.txt`). A **relative path** starts from where you are right now (e.g. `../file.txt`).

---

## 🔥 Scenario

A junior developer was exploring the filesystem and got lost. They were somewhere deep in the directory tree and ran `cd /` by accident. Now they can't find their way back to their home directory where their work file `mission.txt` is waiting.

---

## 💥 Symptoms
- You are not in your home directory.
- You do not know where `mission.txt` is.

---

## 🎯 Your Mission

Navigate back to your home directory, read `mission.txt`, and complete all the tasks requested inside it.

---

## ✅ Acceptance Criteria
| # | What is checked | Points |
|---|----------------|--------|
| 1 | /home/intern/found.txt exists and contains target text | 35% |
| 2 | /home/intern/etc-count.txt exists and is not empty | 35% |
| 3 | /home/intern/projects/alpha/beta/gamma/visited.txt exists | 30% |

---

## 📚 Command Reference
| Command | What it does |
|---------|-------------|
| `pwd` | Print working directory |
| `ls -la` | List files including hidden |
| `cd ~` | Go home |
| `cd ..` | Go up one directory |
"""

l01_sol = """# Solution: Lost in the Filesystem

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
"""

l02_meta = """{
  "id": "module-01-lab-02-command-not-found",
  "module_number": 1,
  "module_title": "Linux Fundamentals",
  "title": "Command Not Found",
  "difficulty": "beginner",
  "estimated_minutes": 15,
  "points": 100,
  "category": "linux",
  "subcategory": "fundamentals",
  "skills": ["PATH", "bashrc", "alias"],
  "scenario": "A new server was provisioned by a colleague who customized it but then left the company. Several commands that the team relies on are not working. The PATH is broken, a useful alias is missing, and a custom script the team uses daily is installed but unreachable.",
  "symptoms": [
    "Custom scripts in /usr/local/bin return 'command not found'",
    "The 'll' alias does not work",
    "APP_ENV environment variable is missing"
  ],
  "mission": "Fix the .bashrc profile to include /usr/local/bin in PATH, set up the ll alias, and export APP_ENV=staging.",
  "hints": [],
  "verification_command": "bash /check.sh",
  "acceptance_criteria": [
    {"id": "check_1", "description": "/usr/local/bin is in the student's PATH", "weight": 30},
    {"id": "check_2", "description": "ll alias exists in .bashrc", "weight": 25},
    {"id": "check_3", "description": "APP_ENV is exported in .bashrc with value staging", "weight": 25},
    {"id": "check_4", "description": "path-report.txt contains 'local'", "weight": 20}
  ]
}"""

l02_dock = """FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \\
    sudo vim nano less curl \\
    && rm -rf /var/lib/apt/lists/*
RUN useradd -m -s /bin/bash intern && \\
    echo "intern ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers && \\
    echo "intern:intern123" | chpasswd
    
# THE BREAK: Modify PATH and remove alias
RUN echo "export PATH=/usr/bin:/bin:/usr/sbin:/sbin" > /home/intern/.bashrc
RUN echo "#!/bin/bash\\necho 'Deploy Check OK'" > /usr/local/bin/deploy-check
RUN chmod +x /usr/local/bin/deploy-check

COPY check.sh /check.sh
RUN chmod +x /check.sh
RUN echo "FLAG-command-not-found" > /root/flag.txt
USER intern
WORKDIR /home/intern
ENTRYPOINT ["tail", "-f", "/dev/null"]"""

l02_comp = """version: '3.8'
services:
  linux-module-01-command-not-found:
    build: .
    container_name: lab-02-command-not-found
    restart: "no"
    labels:
      - "lab.module=MODULE 01"
      - "lab.category=linux"
      - "lab.difficulty=beginner"
      - "lab.title=Command Not Found"
      - "lab.id=module-01-lab-02-command-not-found"
    volumes:
      - ./solution:/solution:ro"""

l02_check = """#!/bin/bash
PASSED_WEIGHT=0
run_check() {
  local weight=$1 description=$2 result=$3
  if [ "$result" -eq 0 ]; then
    echo "✅ PASS [${weight}%]: $description"
    PASSED_WEIGHT=$((PASSED_WEIGHT + weight))
  else
    echo "❌ FAIL [${weight}%]: $description"
  fi
}
echo "=== Checking: Command Not Found ==="
echo ""

# CHECK 1
grep -q "/usr/local/bin" /home/intern/.bashrc
run_check 30 "/usr/local/bin is in the student's PATH" $?

# CHECK 2
grep -q "alias ll=" /home/intern/.bashrc
run_check 25 "ll alias exists in .bashrc" $?

# CHECK 3
grep -q 'export APP_ENV=staging' /home/intern/.bashrc
run_check 25 "APP_ENV is exported in .bashrc with value staging" $?

# CHECK 4
grep -q "local" /home/intern/path-report.txt 2>/dev/null
run_check 20 "/home/intern/path-report.txt exists and contains 'local'" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi"""

l02_read = """# Lab 02: Command Not Found

**Module:** 01 — Linux Fundamentals  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  

---

## 🎯 What You Will Learn
- What `$PATH` is and how Linux locates commands.
- What `.bashrc` does.
- How to create an alias and export variables.

---

## 📖 Background

When you type a command, the shell searches every directory listed in the `$PATH` environment variable in order. `$PATH` is a colon-separated list like `/usr/bin:/usr/local/bin:/bin`. The `which` command tells you exactly which binary will run.

`command not found` simply means the binary isn't in any of those directories.

`.bashrc` is a script that runs every time you open a terminal. We use it to set up aliases (like `alias ll='ls -la'`) and export environment variables (like `export APP_ENV=staging`) so they are available to all child processes.

---

## 🔥 Scenario

A new server was customized by a colleague who then left. Now, several standard commands don't work, a custom script `deploy-check` is unreachable, the `ll` shortcut is gone, and the app is crashing because `APP_ENV` isn't set.

---

## 🎯 Your Mission

Edit `~/.bashrc` to append `/usr/local/bin` to the PATH, add the `ll` alias, export `APP_ENV=staging`, and save the corrected PATH to a report file.

---

## ✅ Acceptance Criteria
| # | What is checked | Points |
|---|----------------|--------|
| 1 | /usr/local/bin is in the student's PATH | 30% |
| 2 | ll alias exists in .bashrc | 25% |
| 3 | APP_ENV is exported in .bashrc with value staging | 25% |
| 4 | path-report.txt contains 'local' | 20% |
"""

l02_sol = """# Solution: Command Not Found

## Root Cause
The user's default `.bashrc` profile stripped out `/usr/local/bin` from the PATH.

## Step-by-Step Fix

```bash
echo "export PATH=\\$PATH:/usr/local/bin" >> ~/.bashrc
echo "alias ll='ls -la'" >> ~/.bashrc
echo "export APP_ENV=staging" >> ~/.bashrc

# Apply changes right now
source ~/.bashrc

# Save report
echo $PATH > ~/path-report.txt
```
Run `/check.sh` to pass.
"""

l1_dir = "/Users/mohamedserag/Desktop/Opslance/labs/linux/module-01-linux-fundamentals/lab-01-lost-in-the-filesystem/"
write_file(l1_dir + "metadata.json", l01_meta)
write_file(l1_dir + "Dockerfile", l01_dock)
write_file(l1_dir + "docker-compose.yml", l01_comp)
write_file(l1_dir + "check.sh", l01_check)
write_file(l1_dir + "README.md", l01_read)
write_file(l1_dir + "SOLUTION.md", l01_sol)

l2_dir = "/Users/mohamedserag/Desktop/Opslance/labs/linux/module-01-linux-fundamentals/lab-02-command-not-found/"
write_file(l2_dir + "metadata.json", l02_meta)
write_file(l2_dir + "Dockerfile", l02_dock)
write_file(l2_dir + "docker-compose.yml", l02_comp)
write_file(l2_dir + "check.sh", l02_check)
write_file(l2_dir + "README.md", l02_read)
write_file(l2_dir + "SOLUTION.md", l02_sol)

# Cleanup the mistakenly created files in root
for f in ["metadata.json", "Dockerfile", "docker-compose.yml", "check.sh", "README.md", "SOLUTION.md"]:
    try:
        os.remove("/Users/mohamedserag/Desktop/Opslance/devops-lab-platform/" + f)
    except:
        pass
