# Lab systemd-timer: Creating a systemd Timer and Service Pair

**Module:** 14 — Job Scheduling & Automation
**Category:** Linux / scheduling
**Difficulty:** ⭐⭐ Intermediate
**Estimated Time:** 20 minutes
**Skills Practiced:** systemd, timer units, OnCalendar, unit files, WantedBy=timers.target

---

## Scenario

Your team is migrating from cron to systemd timers. For the maintenance script at /usr/local/bin/maintenance.sh, create the unit pair: /etc/systemd/system/app-maintenance.service (a oneshot service running the script) and /etc/systemd/system/app-maintenance.timer (fires daily at 03:00, with Persistent=true so a missed run happens at boot, enabled via timers.target).

## Environment

- **Container name:** lab-14-03-systemd-timer
- **Access:** use the platform web terminal (it drops you straight into the container), or locally: `docker exec -it lab-14-03-systemd-timer bash`
- **Starting point:** You are logged in as user `intern` (with passwordless sudo) in `/home/intern`.

## Symptoms

- /usr/local/bin/maintenance.sh exists but nothing invokes it
- No app-maintenance.service or app-maintenance.timer units exist
- The migration plan requires Persistent=true so missed runs recover
- The timer must hook into timers.target to be startable at boot

## Your Mission

1. Review the script: `cat /usr/local/bin/maintenance.sh`.
2. Create the .service unit with [Unit]/[Service] sections: Description, Type=oneshot, ExecStart=/usr/local/bin/maintenance.sh.
3. Create the .timer unit with [Unit]/[Timer]/[Install] sections: OnCalendar=*-*-* 03:00:00, Persistent=true, WantedBy=timers.target.
4. Verify both files exist and contain the required directives.

You'll know you've succeeded when you run `check.sh` and all checks pass.

## Hints

<details>
<summary>Hint 1 — Unit pair naming</summary>
The timer foo.timer automatically triggers foo.service — the names must match, which is why both start with app-maintenance.
</details>

<details>
<summary>Hint 2 — OnCalendar syntax</summary>
`OnCalendar=*-*-* 03:00:00` means every day at 03:00 (the keyword `daily` is equivalent). Calendar events beat the old five-field cron syntax for readability.
</details>

<details>
<summary>Hint 3 — Persistent=true</summary>
Without it, a server powered off at 03:00 skips the run forever. Persistent catches up on the next boot.
</details>

<details>
<summary>Hint 4 — The [Install] section</summary>
`WantedBy=timers.target` is what makes `systemctl enable app-maintenance.timer` work at boot.
</details>

## Useful Commands Reference

| Command | Purpose |
|---------|---------|
| `systemctl list-timers` | See active timers (on a systemd host) |
| `systemctl enable --now foo.timer` | Enable and start a timer |
| `OnCalendar=*-*-* 03:00:00` | Daily at 03:00 |
| `Persistent=true` | Catch up missed runs at boot |
| `man systemd.timer` | All timer options |

## Background Reading

- [systemd.timer manual](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html)
