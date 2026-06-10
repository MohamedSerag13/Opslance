FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo vim nano bash \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
RUN useradd -m -s /bin/bash intern && \
    echo "intern:intern123" | chpasswd
# Note: sudo whitelist for intern is injected at runtime by lab-manager
#       via /etc/sudoers.d/lab-student — do NOT add NOPASSWD:ALL here.

# Create log directory — writable by all so background process can write
RUN mkdir -p /var/log/service && chmod 1777 /var/log/service
RUN touch /var/log/service/events.log && chmod 666 /var/log/service/events.log

# Background log writer script — cycles through INFO lines, then emits DEPLOY_SUCCESS after ~18s
RUN printf '%s\n' \
  '#!/bin/bash' \
  'LINES=(' \
  '  "INFO service started"' \
  '  "INFO health check OK"' \
  '  "INFO processing request"' \
  '  "WARNING high memory"' \
  '  "INFO request complete"' \
  ')' \
  'LOG=/var/log/service/events.log' \
  'i=0' \
  'count=0' \
  'deploy_sent=0' \
  'while true; do' \
  '  TS=$(date "+%Y-%m-%d %H:%M:%S")' \
  '  if [ "$deploy_sent" -eq 0 ] && [ "$count" -ge 6 ]; then' \
  '    echo "[$TS] DEPLOY_SUCCESS version=2.4.1" >> "$LOG"' \
  '    deploy_sent=1' \
  '  else' \
  '    echo "[$TS] ${LINES[$i]}" >> "$LOG"' \
  '    i=$(( (i + 1) % 5 ))' \
  '  fi' \
  '  count=$((count + 1))' \
  '  sleep 3' \
  'done' \
  > /usr/local/bin/log_writer.sh
RUN chmod +x /usr/local/bin/log_writer.sh

# Hint file for intern
RUN printf 'Run: tail -f /var/log/service/events.log — wait for DEPLOY_SUCCESS and capture it.\n' \
    > /home/intern/README_HINT.txt

RUN chown -R intern:intern /home/intern

# Ensure /etc/sudoers.d is read (safe runtime whitelist injected there)
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers

COPY check.sh /check.sh
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /check.sh /entrypoint.sh
USER intern
WORKDIR /home/intern
ENTRYPOINT ["/entrypoint.sh"]
