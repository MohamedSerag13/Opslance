# Solution: Monitor a Live Log File

## Step-by-Step Fix

1. Preview the first 5 lines of the log file and save the output:
   ```bash
   head -5 /var/log/service/events.log > /home/intern/log_preview.txt
   ```

2. Monitor the log live and automatically capture the `DEPLOY_SUCCESS` event:
   ```bash
   grep -m 1 'DEPLOY_SUCCESS' <(tail -f /var/log/service/events.log) > /home/intern/deploy_event.txt
   ```

   > **Alternative:** Watch with `tail -f` manually, then when you see `DEPLOY_SUCCESS`, press `Ctrl+C` and re-run with grep to capture it:
   > ```bash
   > tail -f /var/log/service/events.log
   > # (wait until you see DEPLOY_SUCCESS, then Ctrl+C)
   > grep 'DEPLOY_SUCCESS' /var/log/service/events.log > /home/intern/deploy_event.txt
   > ```

3. After the event has appeared, capture the last 20 lines of the log:
   ```bash
   tail -20 /var/log/service/events.log > /home/intern/log_tail.txt
   ```

4. Click the **Check** button on the left panel to verify and pass.
