# Solution: Finding Things

## Step-by-Step Fix

1. Find `custom_app.conf` and redirect the path to `found_config.txt`:
   ```bash
   find /etc -name "custom_app.conf" > /home/intern/found_config.txt
   ```

2. Find the orphaned log file larger than 50KB and redirect the path to `found_largelog.txt`:
   ```bash
   find /var/log -name "*orphaned*" -size +50k > /home/intern/found_largelog.txt
   ```

3. Find the script helper file and redirect the path to `found_script.txt`:
   ```bash
   find /opt -name "helper.sh" > /home/intern/found_script.txt
   ```

4. Find the absolute path to `bash` using `which` and redirect to `bash_location.txt`:
   ```bash
   which bash > /home/intern/bash_location.txt
   ```

5. Click the **Check** button on the left panel to verify and pass.
