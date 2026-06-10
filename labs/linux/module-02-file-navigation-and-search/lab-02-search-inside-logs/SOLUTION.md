# Solution: Search Inside Logs for Errors

## Step-by-Step Fix

1. Find all lines containing `ERROR` (case-sensitive) in `error.log` and save them:
   ```bash
   grep 'ERROR' /var/log/webapp/error.log > /home/intern/errors.txt
   ```

2. Count the number of lines containing `WARNING` and save the number:
   ```bash
   grep -c 'WARNING' /var/log/webapp/error.log > /home/intern/warning_count.txt
   ```

3. Search recursively for `error` (case-insensitive) across all files in `/var/log/webapp/`:
   ```bash
   grep -ri 'error' /var/log/webapp/ > /home/intern/all_errors.txt
   ```

4. Find all lines containing `500` in `access.log` and save them:
   ```bash
   grep '500' /var/log/webapp/access.log > /home/intern/server_errors.txt
   ```

5. Click the **Check** button on the left panel to verify and pass.
