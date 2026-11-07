# Solution: The Config Hunt (Capstone)

## Step-by-Step Fix

1. Find all `.conf` files under `/etc/myapp/` and save their paths:
   ```bash
   find /etc/myapp -name '*.conf' > /home/intern/conf_files.txt
   ```

2. Extract the line containing `DB_HOST` from the database config file:
   ```bash
   grep 'DB_HOST' /etc/myapp/database.conf > /home/intern/db_host.txt
   ```

3. Count how many lines contain `ERROR` in `/opt/myapp/app.log`:
   ```bash
   grep -c 'ERROR' /opt/myapp/app.log > /home/intern/error_count.txt
   ```

4. Show the last 10 lines of `/opt/myapp/deploy.log` and save them:
   ```bash
   tail -10 /opt/myapp/deploy.log > /home/intern/deploy_tail.txt
   ```

5. Click the **Check** button on the left panel to verify and pass.
