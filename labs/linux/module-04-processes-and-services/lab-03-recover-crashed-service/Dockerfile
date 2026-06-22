FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo vim nano less curl nginx \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN useradd -m -s /bin/bash intern && \
    echo "intern:intern123" | chpasswd
# Note: sudo whitelist for intern is injected at runtime by lab-manager
#       via /etc/sudoers.d/lab-student — do NOT add NOPASSWD:ALL here.

# ── Fake-systemd runtime directories ─────────────────────────────────────────
# World-writable so intern (non-root) can read/write state, pid, and log files
RUN mkdir -p /var/lib/fakesystemd/state \
             /var/lib/fakesystemd/pids \
             /var/lib/fakesystemd/enabled \
             /var/lib/fakesystemd/timestamps \
             /var/log/fakesystemd \
    && chmod -R 777 /var/lib/fakesystemd /var/log/fakesystemd

# ── Install fake systemctl and journalctl ─────────────────────────────────────
# Placed at /usr/local/sbin which is ahead of /usr/sbin in PATH for root/sudo.
# For the intern user's PATH these are the only systemctl/journalctl present.
COPY fakesystemctl.sh  /usr/local/sbin/systemctl
COPY fakejournalctl.sh /usr/local/sbin/journalctl
RUN chmod +x /usr/local/sbin/systemctl /usr/local/sbin/journalctl

# ── nginx: configure to run on port 8080 as a foreground daemon ──────────────
# CAP_NET_BIND_SERVICE is not granted — port 8080 (>1024) needs no special cap.
# daemon off in nginx.conf keeps the master in the foreground so our fake
# systemctl can background it via "& " and track its PID normally.
COPY nginx.conf /etc/nginx/nginx.conf

# Give intern ownership of nginx's runtime directories so it can start nginx
# without sudo (the lab's intern user runs as non-root).
RUN chown -R intern:intern /var/log/nginx /var/lib/nginx \
    && chmod 777 /run

# Drop the default nginx site — our config is the only one
RUN rm -f /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf

# ── systemd unit file for nginx ───────────────────────────────────────────────
RUN mkdir -p /etc/systemd/system
RUN printf '%s\n' \
  '[Unit]' \
  'Description=The NGINX HTTP Server' \
  '' \
  '[Service]' \
  'ExecStart=/usr/sbin/nginx' \
  'ExecStop=/usr/sbin/nginx -s stop' \
  'ExecReload=/usr/sbin/nginx -s reload' \
  '' \
  '[Install]' \
  'WantedBy=multi-user.target' \
  > /etc/systemd/system/nginx.service

# ── Initial state: nginx is inactive (stopped) and not enabled ────────────────
RUN echo "inactive" > /var/lib/fakesystemd/state/nginx

# IMPORTANT: the state file above is created by root with a default umask
# (-rw-r--r--), so re-apply world-writable perms + intern ownership AFTER
# seeding it. Otherwise `systemctl start` (run as intern) cannot overwrite the
# state file and the service can never flip to "active". The earlier
# `chmod -R 777` on the empty dir does not cover files created later.
RUN chown -R intern:intern /var/lib/fakesystemd /var/log/fakesystemd \
    && chmod -R 777 /var/lib/fakesystemd /var/log/fakesystemd

# ── Simple web page served by nginx ──────────────────────────────────────────
RUN echo '<html><body><h1>nginx is running!</h1><p>Service recovered successfully.</p></body></html>' \
    > /var/www/html/index.html

# Ensure /etc/sudoers.d is read (safe runtime whitelist injected there)
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers

COPY check.sh /check.sh
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /check.sh /entrypoint.sh
RUN echo "FLAG-recover-crashed-service" > /root/flag.txt

RUN chown -R intern:intern /home/intern
USER intern
WORKDIR /home/intern
ENTRYPOINT ["/entrypoint.sh"]
