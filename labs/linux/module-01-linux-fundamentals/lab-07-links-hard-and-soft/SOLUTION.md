# Solution: Links Hard and Soft

## Step-by-Step Fix

1. Create the symbolic link:
   ```bash
   ln -s /home/intern/releases/v2.0 /home/intern/current
   ```

2. Create the hard-link backup of the v1.0 config:
   ```bash
   ln /home/intern/releases/v1.0/app.conf /home/intern/releases/v1.0/app.conf.bak
   ```

3. Click the **Check** button on the left panel to verify and pass.
