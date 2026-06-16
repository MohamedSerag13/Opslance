# Solution: Production Troubleshooting Challenge

## Root Cause

The production project at `/home/intern/project/` has three files with incorrect permissions and ownership:

- `config/settings.conf` — owned by `root:root` with mode `600`, so only root can read it
- `scripts/backup.sh` — owned by `intern:intern` with mode `644`, missing the execute bit
- `data/output.csv` — owned by `root:root`, so intern cannot write to it

## Step-by-Step Fix

1. Investigate the current state of all project files:
   ```bash
   ls -la /home/intern/project/config/
   ls -la /home/intern/project/scripts/
   ls -la /home/intern/project/data/
   ```

2. Fix the configuration file — change ownership so intern can read it:
   ```bash
   sudo chown intern:intern /home/intern/project/config/settings.conf
   ```
   Alternatively, you could add read permissions for others:
   ```bash
   sudo chmod 644 /home/intern/project/config/settings.conf
   ```

3. Fix the backup script — add the execute permission:
   ```bash
   chmod +x /home/intern/project/scripts/backup.sh
   ```

4. Fix the data output file — change ownership to intern:
   ```bash
   sudo chown intern:intern /home/intern/project/data/output.csv
   ```

5. Verify all fixes are working:
   ```bash
   cat /home/intern/project/config/settings.conf
   /home/intern/project/scripts/backup.sh
   echo "test" >> /home/intern/project/data/output.csv
   ```

6. Click the **Check** button on the left panel to verify and pass.
