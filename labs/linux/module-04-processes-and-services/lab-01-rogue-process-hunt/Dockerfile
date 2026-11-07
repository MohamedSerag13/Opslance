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

# Ensure /etc/sudoers.d is read (safe runtime whitelist injected there)
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers

# Hint file so the student knows where to write their findings
RUN printf '%s\n' \
  'TASK: Three rogue "sleep 1000" processes are running on this server.' \
  'Step 1: Find them with ps and grep. Write their PIDs to /home/intern/pids_found.txt' \
  '         (one PID per line).' \
  'Step 2: Kill one of them individually by PID (kill <PID>).' \
  'Step 3: Kill all remaining sleep processes with: pkill sleep' \
  'Run bash /check.sh to verify.' \
  > /home/intern/README_HINT.txt

RUN chown -R intern:intern /home/intern

COPY check.sh /check.sh
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /check.sh /entrypoint.sh
RUN echo "FLAG-rogue-process-hunt" > /root/flag.txt
USER intern
WORKDIR /home/intern
ENTRYPOINT ["/entrypoint.sh"]
