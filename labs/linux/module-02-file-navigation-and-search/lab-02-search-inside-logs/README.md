# Lab 02: Hunting Errors in Application Logs

**Module:** 02 — File Navigation & Search
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Points:** 100

---

## Scenario

The on-call engineer received alerts about a web application returning errors. You have been pulled in to help triage the situation before the next escalation window. The application writes logs to three separate files inside `/var/log/webapp/`: `access.log`, `error.log`, and `app.log`.

Your job is to search those logs for specific patterns and save your findings so the rest of the team can review them asynchronously. Speed matters — the team needs these answers before the next standup.

The team needs to know: how many warnings were logged, which requests returned HTTP 500 errors, and whether the word "error" appears anywhere across the full log directory — not just in `error.log`.

---

## Learning Objectives

By completing this lab, you will learn how to:

- Use `grep` to find lines matching an exact pattern in a file
- Use `grep -i` for case-insensitive matching
- Use `grep -c` to count matching lines without printing them
- Use `grep -r` to search recursively across all files in a directory
- Redirect `grep` output to a file for later review

---

## Mission

| What to find | Save result to |
|---|---|
| All lines containing `ERROR` (case-sensitive) in `error.log` | `~/errors.txt` |
| Count of lines containing `WARNING` in `error.log` | `~/warning_count.txt` |
| All lines matching `error` (case-insensitive) across all files in `/var/log/webapp/` | `~/all_errors.txt` |
| All lines containing `500` in `access.log` | `~/server_errors.txt` |

---

## Requirements

### Task 1 — Extract all ERROR lines from the error log

The team wants a list of every log line that explicitly says `ERROR` (uppercase only) in the main error log. The search must be case-sensitive so that lines containing words like `info` or `warning` are not included.

File to search:
```
/var/log/webapp/error.log
```

Pattern: `ERROR` (exact case, uppercase only)

Save all matching lines to:
```
~/errors.txt
```

---

### Task 2 — Count WARNING lines in the error log

The team wants a single number — how many `WARNING` lines exist in the error log. Do not save the lines themselves, just the count. This will be used to populate a monitoring dashboard.

File to search:
```
/var/log/webapp/error.log
```

Pattern: `WARNING`

Save to (the file must contain only a number):
```
~/warning_count.txt
```

---

### Task 3 — Search for errors across all log files

The team suspects that the word "error" appears in multiple log files, not just `error.log`. You need to search the entire log directory in a single pass. The search must be case-insensitive to catch `Error`, `ERROR`, and any other capitalisation.

Directory to search:
```
/var/log/webapp/
```

Pattern: `error` (case-insensitive)

Save all matching lines to:
```
~/all_errors.txt
```

---

### Task 4 — Identify failed HTTP requests

HTTP 500 errors mean the server crashed while handling a request. Find all lines in the access log that contain `500` to identify which requests triggered a server-side failure. This list will be handed to the backend team for investigation.

File to search:
```
/var/log/webapp/access.log
```

Pattern: `500`

Save all matching lines to:
```
~/server_errors.txt
```

---

## Hints

1. **Basic grep** — `grep 'PATTERN' /path/to/file` prints every line in the file that contains the pattern. By default the match is case-sensitive.

2. **Counting instead of printing** — Adding `-c` to `grep` makes it output only the count of matching lines, not the lines themselves. That count can then be redirected to a file.

3. **Case-insensitive search** — The `-i` flag makes `grep` ignore case differences. `grep -i 'error'` matches `ERROR`, `Error`, `error`, and any other capitalisation.

4. **Recursive search** — The `-r` flag tells `grep` to search all files inside a directory and its subdirectories. Combine it with `-i` for a case-insensitive recursive search.

5. **Bonus** — Try adding `-n` to any `grep` command (for example `grep -n 'ERROR' /var/log/webapp/error.log`). It adds line numbers to every match, which is useful when you need to tell a colleague exactly where in the file a problem appears.
