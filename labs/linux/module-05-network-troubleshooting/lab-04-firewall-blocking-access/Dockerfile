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

# ── Fake-ufw runtime directories ──────────────────────────────────────────────
RUN mkdir -p /var/lib/fakeufw \
    && chmod -R 777 /var/lib/fakeufw

# ── Install fake ufw ──────────────────────────────────────────────────────────
COPY fakeufw.sh /usr/local/sbin/ufw
RUN chmod +x /usr/local/sbin/ufw

# ── Install gatekeeper proxy ──────────────────────────────────────────────────
COPY gatekeeper.py /usr/local/bin/gatekeeper.py
RUN chmod +x /usr/local/bin/gatekeeper.py

# ── Hint file ─────────────────────────────────────────────────────────────────
RUN printf '%s\n' \
  'TASK: The web service runs on this server but remote access is blocked by a firewall rule.' \
  '' \
  'Step 1: Confirm the service IS running locally:' \
  '        ss -tulnp | grep 8080' \
  '        curl localhost:8080   (should return 200 — loopback always allowed)' \
  'Step 2: Check the firewall status:' \
  '        sudo ufw status' \
  'Step 3: Allow port 8080:' \
  '        sudo ufw allow 8080' \
  'Step 4: Test non-loopback (remote) access:' \
  '        ip addr show eth0 | grep inet' \
  '        curl http://<YOUR_ETH0_IP>:8080' \
  '' \
  'Run bash /check.sh to verify.' \
  > /home/intern/README_HINT.txt

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY check.sh /check.sh
RUN chmod +x /check.sh

RUN echo "FLAG-firewall-blocking-access" > /root/flag.txt
RUN chown -R intern:intern /home/intern

# Run as root so entrypoint can write fakeufw state and start services
USER root
WORKDIR /home/intern

ENTRYPOINT ["/entrypoint.sh"]
