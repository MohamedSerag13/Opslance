# Solution: Repairing a PATH That Overwrites Instead of Extends

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

PATH is a colon-separated search list. Assigning it without including the old value silently unmounted every other bin directory from the shell's view — /usr/local/apps/bin worked and nothing else did. The fix is the append idiom: always build the new value FROM $PATH, never instead of it.

## Step-by-Step Fix

### Step 1: Reproduce in a clean shell

Sourcing the broken .bashrc in a fresh bash removes /usr/bin from view — ls vanishes:

```bash
bash -c 'source ~/.bashrc; ls'
```

### Step 2: Rewrite the PATH line

Replace the assignment with the append idiom — reference $PATH, then add the new directory after a colon:

```bash
cat > /home/intern/.bashrc <<'EOF'
# intern shell config
export PATH="$PATH:/usr/local/apps/bin"
EOF
```

### Step 3: Verify both worlds

A clean environment sourcing the fixed file must find the system ls AND the custom deploy:

```bash
env -i HOME=/home/intern bash -c 'source ~/.bashrc; command -v ls; command -v deploy'
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: The Broken PATH ===

✅ PASS [35%]: the PATH-wiping line is gone from .bashrc
✅ PASS [25%]: .bashrc now appends usr/local/apps/bin to the existing $PATH
✅ PASS [20%]: a clean shell sourcing .bashrc still finds system tools (ls)
✅ PASS [20%]: a clean shell sourcing .bashrc finds the deploy command

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

A PATH wipe breaks every tool at once, which makes it look like the machine is on fire when it is one line in .bashrc. The append idiom (PATH="$PATH:/new") is muscle memory for anyone configuring SDKs, Go, kubectl or company tools — and testing with env -i is how you catch it before your users do.

## Common Mistakes

- **Mistake 1:** Writing export PATH=$PATH:/usr/local/apps/bin without quotes — safe until a PATH element contains spaces.
- **Mistake 2:** Adding a SECOND export line instead of fixing the wipe — order decides the winner and the bug returns randomly.
- **Mistake 3:** Testing only in the current session, where the old (working) PATH is still in memory, and shipping the broken file.
