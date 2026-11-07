# Solution: Exporting Application Environment Variables

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

The launcher defensively refuses to start with unset configuration (the ${VAR:?msg} expansion) — exactly the behaviour you want in an app — but the environment was never provisioned. Apps read configuration from their environment; making the values available via exported variables in .bashrc fixes every shell that sources it, not just the next run.

## Step-by-Step Fix

### Step 1: Reproduce the refusal

The launcher's guard names the missing variable:

```bash
./runapp.sh
```

### Step 2: Export the configuration

Append both exports to .bashrc — the file the launcher sources:

```bash
cat >> /home/intern/.bashrc <<'EOF'
export APP_ENV=production
export API_PORT=8443
EOF
```

### Step 3: Start the app

Both guards pass and the launcher reports its configuration:

```bash
./runapp.sh
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Feed the App Its Environment ===

✅ PASS [30%]: .bashrc sets APP_ENV=production
✅ PASS [30%]: .bashrc sets API_PORT=8443
✅ PASS [40%]: runapp.sh now starts and prints 'app starting in production on port 8443'

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

Twelve-factor apps take ALL configuration from environment variables — APP_ENV, DATABASE_URL, API ports. Knowing the difference between a shell variable and an exported environment variable, and where to persist exports, is what turns 'works in my terminal' into 'works everywhere'.

## Common Mistakes

- **Mistake 1:** Setting the variables without export — the current shell is happy, runapp.sh still fails.
- **Mistake 2:** Writing $APP_ENV=production — bash reads it as a command named by the (empty) variable.
- **Mistake 3:** Editing runapp.sh to hardcode the values instead of fixing the environment — the configuration now lives in the wrong place.
