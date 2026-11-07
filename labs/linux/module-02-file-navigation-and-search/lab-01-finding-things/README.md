# Lab 01: Finding Files Across the Linux Filesystem

**Module:** 02 — File Navigation & Search
**Difficulty:** ⭐ Beginner
**Estimated Time:** 15 minutes
**Points:** 100

---

## Scenario

You have just joined the operations team and received a ticket about several missing files scattered across a Linux server. Before any troubleshooting can continue, you must locate these files and document their exact locations.

The team knows that a custom application configuration file exists somewhere under `/etc`, an orphaned log file larger than 50 KB exists somewhere in `/var/log`, and a helper shell script exists somewhere under `/opt`. The location of the Bash executable must also be identified for a deployment script that is being written.

Your task is to search the filesystem, find these items, and save their absolute paths into specific files in your home directory.

---

## Learning Objectives

By completing this lab, you will learn how to:

- Use `find` to search for files by name within a specific directory tree
- Use `find` with the `-size` flag to filter files by file size
- Understand what an absolute path is and why it matters
- Locate executable commands using `which`
- Redirect command output to a file using `>`

---

## Mission

| What to find | Save result to |
|---|---|
| `custom_app.conf` (under `/etc`) | `~/found_config.txt` |
| Orphaned log file larger than 50 KB (under `/var/log`) | `~/found_largelog.txt` |
| `helper.sh` (under `/opt`) | `~/found_script.txt` |
| Bash executable location | `~/bash_location.txt` |

---

## Requirements

### Task 1 — Locate the configuration file

A custom application was deployed on this server and left a configuration file behind. The team believes it lives somewhere inside `/etc`, but no one knows the exact subdirectory.

Search inside:
```
/etc
```

Find the file named exactly:
```
custom_app.conf
```

Save its full absolute path to:
```
~/found_config.txt
```

---

### Task 2 — Locate the large orphaned log

A log file was left behind by a process that no longer runs. It is unusually large and contains the word `orphaned` in its filename. It lives somewhere inside `/var/log`.

Search inside:
```
/var/log
```

Find a file that:
- Has `orphaned` in its name
- Is larger than 50 KB

Save its full absolute path to:
```
~/found_largelog.txt
```

---

### Task 3 — Locate the helper script

A shell script was placed under `/opt` during a previous deployment. The team needs its exact path to reference it in a new automation task.

Search inside:
```
/opt
```

Find the file named exactly:
```
helper.sh
```

Save its full absolute path to:
```
~/found_script.txt
```

---

### Task 4 — Locate the Bash executable

A deployment script needs to know the exact path of the `bash` executable on this system. This path varies between Linux distributions and container images.

Use the appropriate command to find where `bash` is installed on this system.

Save the result to:
```
~/bash_location.txt
```

---

## Hints

1. **Searching by name** — `find` takes a starting directory and a `-name` option. For example, to find a file called `example.conf` anywhere under `/etc`, think about how you would structure that command.

2. **Filtering by size** — `find` supports a `-size` flag. Sizes can be expressed in kilobytes with the `k` suffix. A `+` before the number means "larger than".

3. **Saving output** — Use `>` to redirect the output of any command into a file. For example: `some_command > ~/output.txt`

4. **Finding executables** — There is a dedicated command for locating where an executable lives on the system. It takes the name of the command as its argument.

5. **Bonus** — Try using `locate custom_app.conf` to find the same config file using the system's file index. You may need to run `updatedb` first to refresh the index. Notice how much faster `locate` is compared to `find`.
