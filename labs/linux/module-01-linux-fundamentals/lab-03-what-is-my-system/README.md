# Lab what-is-my-system: What is My System?

**Module:** 01 — Linux Fundamentals
**Category:** Linux / Fundamentals
**Difficulty:** ⭐ Beginner
**Estimated Time:** 10–15 minutes
**Skills Practiced:** whoami, hostname, uname -a, cat /etc/os-release, pwd, ls, echo, file redirection

---

## Scenario

You are a new intern joining the DevOps team. On your first day, you are dropped onto an unfamiliar Linux server with no documentation. Before you can do any meaningful work, you need to profile the system: what OS is running, what is the hostname, who are you logged in as, and what does the filesystem look like.

## Environment

- **Container name:** lab-03-what-is-my-system
- **Access:** `docker exec -it lab-03-what-is-my-system bash`
- **Starting point:** You are logged in as user `intern` (with sudo privileges). Your shell prompt is bare and you may not be in your home directory.

## Symptoms

- Your terminal prompt shows only `$` with no username or directory information.
- You don't know what directory you are in.
- You have no idea what operating system this server is running.
- There is no documentation or README on the system.

## Your Mission

Gather system information and create a report file at `/home/intern/system-report.txt` containing:
1. Your current username
2. The hostname of the system
3. The OS version (e.g., "Ubuntu 22.04")
4. Your home directory path
5. Your current working directory
6. A listing of what is in `/etc`

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Where to look</summary>
Use built-in commands to discover information about the system. Start by figuring out who you are and where you are: <code>whoami</code> and <code>pwd</code>.
</details>

<details>
<summary>Hint 2 — What to check</summary>
The OS version is stored in a file under <code>/etc</code>. Try <code>cat /etc/os-release</code>. The hostname can be found with the <code>hostname</code> command.
</details>

<details>
<summary>Hint 3 — The fix</summary>
Create the report using echo and redirection:
<pre>
echo "Username: $(whoami)" > /home/intern/system-report.txt
echo "Hostname: $(hostname)" >> /home/intern/system-report.txt
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2)" >> /home/intern/system-report.txt
echo "Home: /home/intern" >> /home/intern/system-report.txt
echo "PWD: $(pwd)" >> /home/intern/system-report.txt
echo "Contents of /etc:" >> /home/intern/system-report.txt
ls /etc >> /home/intern/system-report.txt
</pre>
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `whoami` | Show current username |
| `hostname` | Show the system hostname |
| `uname -a` | Show full system information |
| `cat /etc/os-release` | Show OS version details |
| `pwd` | Print current working directory |
| `ls /etc` | List files in /etc directory |
| `echo "text" > file` | Write text to a file |
| `echo "text" >> file` | Append text to a file |

## Background Reading

- [Linux Filesystem Hierarchy](https://www.tldp.org/LDP/Linux-Filesystem-Hierarchy/html/)
- [Understanding /etc/os-release](https://www.freedesktop.org/software/systemd/man/os-release.html)
