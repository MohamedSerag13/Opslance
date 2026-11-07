# Solution: Creating a systemd Timer and Service Pair

> ⚠️ Try solving the lab yourself before reading this.

---

## Root Cause

A cron-era gap during a systemd migration: the maintenance script exists but no unit pair invokes it. systemd timers replace cron with two small declarative files whose names pair automatically, and Persistent=true fixes cron's oldest weakness — silently skipping runs on machines that were off.

## Step-by-Step Fix

### Step 1: Write the service unit

Type=oneshot runs the script once per trigger and exits:

```bash
sudo tee /etc/systemd/system/app-maintenance.service > /dev/null <<'EOF'
[Unit]
Description=App maintenance job

[Service]
Type=oneshot
ExecStart=/usr/local/bin/maintenance.sh
EOF
```

### Step 2: Write the timer unit

Same base name as the service; calendar event at 03:00 daily; catch-up enabled; install target set:

```bash
sudo tee /etc/systemd/system/app-maintenance.timer > /dev/null <<'EOF'
[Unit]
Description=Run app maintenance daily at 03:00

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF
```

### Step 3: Verify the pair

Both files present with the required directives:

```bash
cat /etc/systemd/system/app-maintenance.timer
```

### Step 4: Verify the fix

Run the acceptance checker:

```bash
bash /check.sh
```

Expected output:
```
=== Checking: Modern Scheduling with systemd Timers ===

✅ PASS [25%]: both app-maintenance.service and app-maintenance.timer exist
✅ PASS [25%]: the service unit runs /usr/local/bin/maintenance.sh
✅ PASS [25%]: the timer fires daily at 03:00 (OnCalendar)
✅ PASS [25%]: the timer is Persistent and wired to timers.target

SCORE: 100/100
🎉 Lab passed! You completed 100% of the requirements.
```

---

## Why This Matters

systemd timers are the successor to cron on every modern distro: they log to the journal, support calendar expressions, catch up missed runs, and are enabled with one systemctl command. Reading and writing these two unit files is the core of the migration work juniors are handed.

## Common Mistakes

- **Mistake 1:** Naming the timer differently from the service — foo.timer triggers foo.service only; no cross-naming.
- **Mistake 2:** Writing OnCalendar=03:00:00 without the date part — invalid; the full form is *-*-* 03:00:00.
- **Mistake 3:** Omitting [Install]/WantedBy=timers.target — the timer can be started by hand but can never be enabled at boot.
