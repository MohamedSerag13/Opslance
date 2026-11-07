FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo vim nano less procps htop \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
RUN useradd -m -s /bin/bash intern && \
    echo "intern:intern123" | chpasswd
# Note: sudo whitelist for intern is injected at runtime by lab-manager
#       via /etc/sudoers.d/lab-student — do NOT add NOPASSWD:ALL here.

# Ensure /etc/sudoers.d is read (safe runtime whitelist injected there)
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers

# Hint file so the student knows what to do
RUN printf '%s\n' \
  'TASK: A rogue process is pegging the CPU on this server.' \
  'Step 1: Use top (press P to sort by CPU) or htop to identify the offending process.' \
  'Step 2: Write its PID to /home/intern/culprit_pid.txt' \
  'Step 3: Kill it with: kill <PID>' \
  'Run bash /check.sh to verify.' \
  > /home/intern/README_HINT.txt

RUN chown -R intern:intern /home/intern

COPY check.sh /check.sh
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /check.sh /entrypoint.sh
RUN echo "FLAG-high-cpu-investigation" > /root/flag.txt
USER intern
WORKDIR /home/intern
ENTRYPOINT ["/entrypoint.sh"]
