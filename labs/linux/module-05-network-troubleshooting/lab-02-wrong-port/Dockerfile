FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo vim nano less procps iproute2 curl python3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN useradd -m -s /bin/bash intern && \
    echo "intern:intern123" | chpasswd
# Note: sudo whitelist for intern is injected at runtime by lab-manager.

# Ensure /etc/sudoers.d is read
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers

# Hint file for the student
RUN printf '%s\n' \
  'TASK: The web service is supposed to be on port 8080, but curl fails.' \
  '' \
  'Step 1: Try port 8080    — curl localhost:8080' \
  'Step 2: Check listeners  — ss -tulnp' \
  'Step 3: Find actual port  (look carefully at what port IS listed)' \
  'Step 4: Record it        — echo "PORT" > /home/intern/actual_port.txt' \
  'Step 5: Confirm it       — curl localhost:ACTUAL_PORT' \
  '' \
  'Run bash /check.sh to verify.' \
  > /home/intern/README_HINT.txt

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY check.sh /check.sh
RUN chmod +x /check.sh

RUN echo "FLAG-wrong-port" > /root/flag.txt
RUN chown -R intern:intern /home/intern

USER intern
WORKDIR /home/intern

ENTRYPOINT ["/entrypoint.sh"]
