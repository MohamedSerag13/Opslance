# Solution: Handling Arguments and Exit Codes in a Script

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

The script does not exist yet; the lesson is the contract every CLI tool follows: correct input produces correct output and exit 0, incorrect input produces a usage message and non-zero exit. Automation everywhere relies on that contract — silently succeeding on bad input is the real bug.

## Step-by-Step Fix

### Step 1: Guard the missing argument

Check $1 for emptiness first, tell the user how to call the tool, and exit with status 1:

```bash
cat > /home/intern/greet.sh <<'EOF'
#!/bin/bash
if [ -z "$1" ]; then
  echo "Usage: greet.sh <name>"
  exit 1
fi
echo "Hello, $1!"
EOF
```

### Step 2: Make it executable and test the happy path

Run with a name and confirm both the output and the exit status:

```bash
chmod +x /home/intern/greet.sh
./greet.sh Sam; echo "exit=$?"
```

### Step 3: Test the failure path

No argument: usage line on stdout, exit code must be non-zero:

```bash
./greet.sh; echo "exit=$?"
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Scripts That Take Arguments ===

✅ PASS [25%]: /home/intern/greet.sh exists and is executable
✅ PASS [35%]: greet.sh Sam prints exactly 'Hello, Sam!'
✅ PASS [25%]: calling greet.sh without an argument exits non-zero
✅ PASS [15%]: the no-argument run prints a Usage message

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

Arguments and exit codes are how scripts talk to other scripts. The moment you write a second script that calls the first — in CI, cron or a wrapper — the exit code is the only reliable signal that anything worked. echo-and-hope scripts without status handling are the number one source of silently broken pipelines.

## Common Mistakes

- **Mistake 1:** Forgetting the quotes around "$1" — an empty unquoted argument disappears from the test and `[ -z ]` errors out.
- **Mistake 2:** Printing the usage message but exiting 0 — the caller thinks everything went fine.
- **Mistake 3:** Using $0 in the usage message without knowing it prints the script path — nice, but keep the literal 'greet.sh' here so the message matches.
