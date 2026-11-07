# Solution: Wildcards and Globbing

## Step-by-Step Fix

1. Create the target folders:
   ```bash
   mkdir -p /home/intern/logs /home/intern/reports /home/intern/notes
   ```

2. Move the files into their appropriate locations:
   ```bash
   mv /home/intern/inbox/log-* /home/intern/logs/
   mv /home/intern/inbox/report-* /home/intern/reports/
   mv /home/intern/inbox/note-* /home/intern/notes/
   ```

3. Clean up the `.tmp` files:
   ```bash
   rm /home/intern/inbox/*.tmp
   ```

4. Click the **Check** button on the left panel to verify and pass.
