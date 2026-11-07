# Solution: Writing and Running Your First Shell Script

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

Nothing is broken — the lab establishes the three ingredients every script needs: a shebang naming the interpreter, the echo body, and the executable bit. Miss any one of them and the script behaves differently depending on how it is invoked, which is a classic source of 'works on my machine'.

## Step-by-Step Fix

### Step 1: Write the script

Two lines are enough — the shebang and the echo. The quoted heredoc below is the non-interactive way; nano works just as well:

```bash
cat > /home/intern/hello.sh <<'EOF'
#!/bin/bash
echo "Opslance boot OK"
EOF
```

### Step 2: Make it executable

Without +x the file is plain text to the shell — `./hello.sh` answers 'Permission denied':

```bash
chmod +x /home/intern/hello.sh
```

### Step 3: Run and verify

Run it directly and confirm the exact output:

```bash
./hello.sh
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Your First Script ===

✅ PASS [25%]: /home/intern/hello.sh exists
✅ PASS [25%]: first line of the script is the shebang #!/bin/bash
✅ PASS [20%]: script has the executable bit set
✅ PASS [30%]: running the script prints exactly 'Opslance boot OK'

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

Every automation you will ever write starts here. The shebang decides whether your script runs under bash, sh or python; the exec bit decides whether cron, CI and your colleagues can run it at all. Getting both right the first time avoids the classic 'it works when I run bash x.sh but fails in cron'.

## Common Mistakes

- **Mistake 1:** Putting a comment or a blank line before the shebang — it must be the very first two bytes of the file (#!).
- **Mistake 2:** Writing the script with Windows line endings (CRLF), which makes bash fail with `bad interpreter: /bin/bash^M`.
- **Mistake 3:** Forgetting chmod +x and concluding that './hello.sh: Permission denied' means bash is broken.
