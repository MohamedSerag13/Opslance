# Solution: Disk Space Detective

## Step-by-Step Fix

1. Save partition disk space output:
   ```bash
   df -h > /home/intern/df_output.txt
   ```

2. Identify the largest subfolder inside `/home/intern/data/`:
   ```bash
   du -sh /home/intern/data/* | sort -h
   # Shows backups is the largest (~50MB)
   echo "backups" > /home/intern/disk_report.txt
   ```

3. Locate the single largest file:
   ```bash
   find /home/intern/data -type f -exec du -ah {} + | sort -rh | head -n 1
   # Shows /home/intern/data/backups/archive.tar
   echo "/home/intern/data/backups/archive.tar" > /home/intern/largest_file.txt
   ```

4. Click the **Check** button on the left panel to verify and pass.
