# Lab what-is-my-system: What is My System?

**Module:** 01 — Linux Fundamentals
**Category:** Linux / Fundamentals
**Difficulty:** ⭐ Beginner
**Estimated Time:** 10–15 minutes
**Skills Practiced:** whoami, hostname, pwd, echo, file redirection

---

## Scenario

You are a new intern joining the DevOps team. On your first day, you are dropped onto an unfamiliar Linux server with no documentation. Before you can do any meaningful work, you need to profile the system: who are you logged in as, what is the hostname, and what is your current working directory.

## Environment

- **Container name:** lab-03-what-is-my-system
- **Access:** `docker exec -it lab-03-what-is-my-system bash`
- **Starting point:** You are logged in as user `intern` (with sudo privileges). Your shell prompt is bare and you may not be in your home directory.

## Symptoms

- Your terminal prompt shows only `$` with no username or directory information.
- You don't know what directory you are in.
- There is no documentation or README on the system.

## Your Mission

Navigate to your home directory `/home/intern`, and then create a report file called `system-report.txt` using the template:

```text
Username: 
Hostname:
Home:
PWD: 
```

You'll know you've succeeded when you click the **Check** button on the left panel and all checks pass.

## Hints

<details>
<summary>Hint 1 — Where to look</summary>
Start by navigating to your home directory using <code>cd /home/intern</code>. Then, use built-in commands to discover information about the system: <code>whoami</code> and <code>pwd</code>.
</details>

<details>
<summary>Hint 2 — What to check</summary>
The hostname can be found with the <code>hostname</code> command. Use file redirection to write to the report.
</details>

<details>
<summary>Hint 3 — The fix</summary>
Create the report using echo and redirection:
<pre>
cd /home/intern
echo "Username: $(whoami)" > system-report.txt
echo "Hostname: $(hostname)" >> system-report.txt
echo "Home: /home/intern" >> system-report.txt
echo "PWD: $(pwd)" >> system-report.txt
</pre>
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `whoami` | Show current username |
| `hostname` | Show the system hostname |
| `pwd` | Print current working directory |
| `echo "text" > file` | Write text to a file |
| `echo "text" >> file` | Append text to a file |
