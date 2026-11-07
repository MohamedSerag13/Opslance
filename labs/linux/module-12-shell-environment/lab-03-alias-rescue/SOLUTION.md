# Solution: Defining Shell Aliases in .bashrc

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

Aliases exist only in the shell that defined them; once the .bashrc lines were deleted, every new shell lost them. Restoring them is a two-line append — the lesson is where aliases live, their exact syntax (no spaces around =, quoted expansion) and the fact that scripts never see them.

## Step-by-Step Fix

### Step 1: Confirm the loss

The alias does not exist in the current shell either — .bashrc was gutted:

```bash
alias ll
```

### Step 2: Restore the standards

Append both definitions exactly as the team standard spells them:

```bash
cat >> /home/intern/.bashrc <<'EOF'
alias ll='ls -alF'
alias grep='grep --color=auto'
EOF
```

### Step 3: Verify in a fresh shell

Source the file in a new bash and list both aliases:

```bash
bash -c 'source ~/.bashrc; alias ll; alias grep'
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Bring Back the Aliases ===

✅ PASS [35%]: .bashrc defines alias ll='ls -alF'
✅ PASS [35%]: .bashrc defines alias grep='grep --color=auto'
✅ PASS [30%]: sourcing .bashrc in a fresh shell defines the ll alias

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

Aliases are the smallest possible shell customisation and the first thing every team standardises. Knowing their limits matters as much as the syntax: they do not exist in scripts, they are not inherited by other programs, and they hide the real binary behind them — `type ll` tells you which one you are actually running.

## Common Mistakes

- **Mistake 1:** Writing `alias ll = 'ls -alF'` with spaces around the equals sign — bash reads it as a command named 'alias' with arguments.
- **Mistake 2:** Defining aliases in ~/.profile only — non-login interactive shells (most terminal tabs) never read .profile.
- **Mistake 3:** Expecting aliases to work inside scripts — scripts run non-interactive and deliberately ignore them.
