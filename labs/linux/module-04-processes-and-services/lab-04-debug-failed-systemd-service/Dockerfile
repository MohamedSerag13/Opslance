FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo vim nano less procps \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN useradd -m -s /bin/bash intern && \
    echo "intern:intern123" | chpasswd
# Note: sudo whitelist for intern is injected at runtime by lab-manager
#       via /etc/sudoers.d/lab-student — do NOT add NOPASSWD:ALL here.

# ── Fake-systemd runtime directories ─────────────────────────────────────────
RUN mkdir -p /var/lib/fakesystemd/state \
             /var/lib/fakesystemd/pids \
             /var/lib/fakesystemd/enabled \
             /var/lib/fakesystemd/timestamps \
             /var/log/fakesystemd \
    && chmod -R 777 /var/lib/fakesystemd /var/log/fakesystemd

# ── Install fake systemctl and journalctl ─────────────────────────────────────
COPY fakesystemctl.sh  /usr/local/sbin/systemctl
COPY fakejournalctl.sh /usr/local/sbin/journalctl
RUN chmod +x /usr/local/sbin/systemctl /usr/local/sbin/journalctl

# ── THE BREAK: a unit file that points at a script that does not exist ────────
RUN mkdir -p /etc/systemd/system
RUN printf '%s\n' \
  '[Unit]' \
  'Description=Production Application Server' \
  '' \
  '[Service]' \
  'ExecStart=/opt/app/start.sh' \
  '' \
  '[Install]' \
  'WantedBy=multi-user.target' \
  > /etc/systemd/system/broken-app.service

# Create /opt/app/ directory — owned by intern so student can create start.sh
# without needing sudo. The script itself does NOT exist yet; that is the bug.
RUN mkdir -p /opt/app && chown intern:intern /opt/app

# Set initial state: broken-app is inactive (never been started).
# This RUN executes as root, so the file is created root-owned; the earlier
# `chmod -R 777` ran before this file existed. Make it world-writable so the
# fake systemctl (run by the non-root `intern` user) can update the state to
# "active" — otherwise the in-place `>` redirect fails with "Permission denied".
RUN echo "inactive" > /var/lib/fakesystemd/state/broken-app \
    && chmod 666 /var/lib/fakesystemd/state/broken-app

# Hint file
RUN printf '%s\n' \
  'TASK: The broken-app service is failing to start.' \
  'Step 1: Try to start it — systemctl start broken-app' \
  'Step 2: Check the status   — systemctl status broken-app' \
  'Step 3: Read the journal   — journalctl -u broken-app' \
  'Step 4: Find the root cause and fix it.' \
  'Step 5: Start the service again and confirm it is active.' \
  'Run bash /check.sh to verify.' \
  > /home/intern/README_HINT.txt

# Ensure /etc/sudoers.d is read (safe runtime whitelist injected there)
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers

COPY check.sh /check.sh
RUN chmod +x /check.sh
RUN echo "FLAG-debug-failed-systemd-service" > /root/flag.txt

RUN chown -R intern:intern /home/intern
USER intern
WORKDIR /home/intern
ENTRYPOINT ["tail", "-f", "/dev/null"]
