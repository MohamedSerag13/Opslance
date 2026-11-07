# Lab package-forensics: Tracing Files Back to Packages with dpkg

**Module:** 09 — Package Management
**Category:** Linux / packages
**Difficulty:** ⭐⭐ Intermediate
**Estimated Time:** 20 minutes
**Skills Practiced:** dpkg -S, dpkg -l, dpkg -s, apt-cache policy, package queries

---

## Scenario

A vulnerability bulletin names a library and the security team wants to know what else on this box came from the same source package. Before they roll out anything, answer three inventory questions with dpkg and write them into /home/intern/forensics.txt: which package owns /bin/ls, how many packages are installed, and what version of bash is installed.

## Environment

- **Container name:** lab-09-03-package-forensics
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-09-03-package-forensics bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- Nobody knows which package provides /bin/ls on this image
- The installed-package count has never been recorded
- The bash version matters because of the bulletin, but nobody wrote it down
- The security team wants the answers in /home/intern/forensics.txt

## Your Mission

1. Find the owner of a file: `dpkg -S /bin/ls` prints 'package: /bin/ls'.
2. Count installed packages: `dpkg -l | grep -c '^ii'`.
3. Get the bash version: `dpkg -s bash | grep '^Version:'`.
4. Write the three lines `ls-owner=…`, `package-count=…`, `bash-version=…` into the report.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — File → package</summary>
`dpkg -S /bin/ls` searches the package database for the file. The part before the colon is the package name.
</details>

<details>
<summary>Hint 2 — Installed count</summary>
Every installed package has a line starting with &#x27;ii&#x27; in `dpkg -l` output, so `dpkg -l | grep -c &#x27;^ii&#x27;` is the count.
</details>

<details>
<summary>Hint 3 — Package → details</summary>
`dpkg -s bash` dumps the record; the Version: line is what the bulletin wants. Grab the second word with awk.
</details>

<details>
<summary>Hint 4 — Report format</summary>
Three lines, machine-readable: `ls-owner=coreutils`-style output goes into /home/intern/forensics.txt.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `dpkg -S /path/to/file` | Which package owns this file |
| `dpkg -l | grep '^ii' | wc -l` | Count installed packages |
| `dpkg -s pkg | grep Version` | Show a package's version |
| `apt-cache policy pkg` | Show installed vs candidate version |
| `dpkg -L pkg` | List every file a package installed |

## Background Reading

- [dpkg-query manual](https://man7.org/linux/man-pages/man1/dpkg-query.1.html)
