# Solution: Writing an SSH Client Config with Host Aliases

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

The connection parameters live in tribal memory (chat threads) instead of in ~/.ssh/config. The client config exists exactly for this: per-host aliases that bundle hostname, port, user and identity. `ssh -G` resolves the alias the same way a real connection would, so it verifies the file without touching the network.

## Step-by-Step Fix

### Step 1: Write the alias

Create ~/.ssh/config with the staging block — indentation is convention, the keyword/value pairs are what count:

```bash
mkdir -p ~/.ssh
cat > ~/.ssh/config <<'EOF'
Host staging
    HostName 10.20.0.5
    User deploy
    Port 2222
    IdentityFile ~/.ssh/id_ed25519
EOF
chmod 600 ~/.ssh/config
```

### Step 2: Verify with ssh -G

The resolved output shows what a real connection would use:

```bash
ssh -G staging | grep -E '^(hostname|user|port) '
```

### Step 3: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Tame the Hostnames ===

✅ PASS [20%]: ~/.ssh/config exists
✅ PASS [25%]: a 'Host staging' block is defined
✅ PASS [20%]: HostName is set to 10.20.0.5
✅ PASS [35%]: the block sets User deploy, Port 2222 and an IdentityFile

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

~/.ssh/config is the highest-value four lines a junior can write: jump hosts, key selection, port overrides and per-host users all disappear into short aliases. It composes with git (Host entries work in remotes), ansible (same alias names) and rsync — one file, every tool.

## Common Mistakes

- **Mistake 1:** Writing `HostName staging` inside the staging block — the alias must map to the REAL address 10.20.0.5.
- **Mistake 2:** Leaving the config world-readable: it is private infrastructure data; 600 is the convention.
- **Mistake 3:** Repeating the settings under a differently-spelled alias (Staging vs staging) — Host matching is case-sensitive.
