# Lab 04: The Config Hunt (Capstone)

**Module:** 02 — File Navigation & Search
**Difficulty:** ⭐⭐ Beginner+
**Estimated Time:** 20 minutes
**Points:** 100

---

## Scenario

A server was handed to you with no documentation and no handover notes. The previous engineer left without writing anything down. You know the server runs an application called `myapp`, but you have no idea where its files live, what database it connects to, or how stable it has been.

Before the team can decide whether to keep the server running or decommission it, they need four concrete pieces of information extracted from the filesystem. There are no dashboards, no wikis, and no colleagues to ask — just you and the filesystem.

This lab is a capstone exercise that combines everything from labs 01, 02, and 03. You will need `find` to locate configuration files, `grep` to extract specific values and count errors, and `tail` to read the most recent log entries. There are no single-command answers here; approach it like a real investigation and work through each task methodically.

---

## Learning Objectives

By completing this lab, you will learn how to:

- Use `find` with a wildcard pattern to locate configuration files when you do not know their names
- Use `grep` to extract a specific key-value line from a configuration file
- Use `grep -c` to count occurrences of a pattern in a log file
- Use `tail -N` to extract the most recent entries from a log file
- Combine multiple commands to investigate an unknown system from scratch

---

## Mission

| What to find | Save result to |
|---|---|
| Paths of all `.conf` files under `/etc/myapp/` | `~/conf_files.txt` |
| The line containing `DB_HOST` from the myapp config | `~/db_host.txt` |
| Count of `ERROR` lines in `/opt/myapp/app.log` | `~/error_count.txt` |
| Last 10 lines of `/opt/myapp/deploy.log` | `~/deploy_tail.txt` |

---

## Requirements

### Task 1 — Discover all configuration files

The application's configuration directory is `/etc/myapp/`. You do not know how many config files exist or what they are named — only that they all end in `.conf`. Your first job is to list all of them so the team knows what configuration surface exists on this server.

Search under:
```
/etc/myapp/
```

Find all files ending in `.conf` and save their full paths to:
```
~/conf_files.txt
```

---

### Task 2 — Extract the database host setting

One of the config files contains database connection settings. The team needs to know what `DB_HOST` is set to so they can trace which database this server is talking to. Search the config directory for the line that defines it.

Search under:
```
/etc/myapp/
```

Pattern: `DB_HOST`

Save the full matching line (including the key and value) to:
```
~/db_host.txt
```

---

### Task 3 — Count application errors

The application log at `/opt/myapp/app.log` has been running for a while and may have accumulated a significant number of errors. The team wants to know how severe the situation is — specifically, how many lines contain the word `ERROR`. Save only the count, not the lines themselves.

File:
```
/opt/myapp/app.log
```

Pattern: `ERROR`

Save the count (a single number) to:
```
~/error_count.txt
```

---

### Task 4 — Review the most recent deployment activity

The deploy log at `/opt/myapp/deploy.log` records every deployment event in chronological order. The team wants to see what happened most recently. The last 10 lines will show the most recent activity and reveal whether the last deployment succeeded, failed, or is still in progress.

File:
```
/opt/myapp/deploy.log
```

Save the last 10 lines to:
```
~/deploy_tail.txt
```

---

## Hints

1. **Wildcards in find** — Use `*.conf` as the `-name` pattern to match any file ending in `.conf`. Make sure to quote the pattern (e.g. `'*.conf'`) so the shell does not expand it before passing it to `find`.

2. **Extracting a config value** — `grep 'KEY' /path/to/file` prints the full line containing that key. If you are not sure which file contains it, search the whole directory with `-r` to scan all files at once.

3. **Counting errors** — `grep -c 'PATTERN' file` returns a single number: the count of lines that match. Redirect that number directly to your output file with `>`.

4. **Recent log entries** — `tail -10 file` prints the last 10 lines. No flags other than the line count are needed — this is a simple, one-shot read.

5. **Bonus** — Try chaining `find` and `grep` together: `find /etc/myapp -name '*.conf' | xargs grep 'DB_HOST'`. This searches for `DB_HOST` across all config files at once without needing to know their names in advance. `xargs` passes each result from `find` as an argument to `grep`.
