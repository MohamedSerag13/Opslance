# Solution: Wiring .profile to Source .bashrc

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

Bash reads different files depending on how it starts: login shells read .profile (and /etc/profile), non-login interactive shells read .bashrc. Ubuntu's default .profile contains the wiring to source .bashrc — this box's rewritten .profile lost it, so SSH sessions (login shells) silently skipped every customisation. The fix restores the standard guard.

## Step-by-Step Fix

### Step 1: Reproduce the split

The same variable exists in .bashrc but a login shell cannot see it:

```bash
bash -lc 'echo $APP_MODE'
bash -c 'source ~/.bashrc; echo $APP_MODE'
```

### Step 2: Wire .profile to .bashrc

Append the guarded source — guarded because .profile is also read by non-bash shells:

```bash
cat >> /home/intern/.profile <<'EOF'
# source .bashrc for bash users
if [ -n "$BASH_VERSION" ]; then
  . "$HOME/.bashrc"
fi
EOF
```

### Step 3: Prove the login path

Syntax-check, then start a login shell and confirm APP_MODE:

```bash
bash -n ~/.profile
bash -lc 'echo $APP_MODE'
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: The Silent Login Shell ===

✅ PASS [35%]: .profile references .bashrc (the wiring exists)
✅ PASS [40%]: a login shell (bash -l) sees APP_MODE=training
✅ PASS [25%]: .profile passes a bash syntax check

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

The login vs non-login split is behind endless 'works locally, empty over SSH' reports — environment variables, aliases, rbenv/nvm init all depend on which file the shell actually read. Adding the .bashrc guard to .profile is the standard Ubuntu wiring, and knowing WHY it exists is what separates debugging from cargo-culting.

## Common Mistakes

- **Mistake 1:** Sourcing .bashrc UNguarded in .profile — dash/sh logins then hit bash-only syntax and fail.
- **Mistake 2:** Moving the config into .profile instead — terminal tabs (non-login shells) would lose it, trading one bug for another.
- **Mistake 3:** Testing with plain `bash` instead of `bash -l` — a non-login shell never reads .profile, so the check proves nothing.
