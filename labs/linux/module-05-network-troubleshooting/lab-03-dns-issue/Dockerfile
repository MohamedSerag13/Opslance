FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo vim nano less procps iproute2 curl dnsutils iputils-ping \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN useradd -m -s /bin/bash intern && \
    echo "intern:intern123" | chpasswd
# Note: sudo whitelist for intern is injected at runtime by lab-manager.

# Ensure /etc/sudoers.d is read
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers

# Hint file for the student
RUN printf '%s\n' \
  'TASK: DNS resolution is broken. Fix /etc/resolv.conf to restore name resolution.' \
  '' \
  'Step 1: Back up the current (broken) config:' \
  '        cp /etc/resolv.conf /tmp/resolv.conf.bak' \
  'Step 2: Confirm DNS is broken:' \
  '        dig google.com   (should FAIL)' \
  'Step 3: Confirm network layer is fine:' \
  '        ping -c 3 8.8.8.8   (should WORK)' \
  'Step 4: Fix the resolver — write a valid nameserver to /etc/resolv.conf:' \
  '        echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf' \
  'Step 5: Verify DNS now works:' \
  '        dig google.com' \
  '' \
  'Run bash /check.sh to verify.' \
  > /home/intern/README_HINT.txt

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY check.sh /check.sh
RUN chmod +x /check.sh

RUN echo "FLAG-dns-issue" > /root/flag.txt
RUN chown -R intern:intern /home/intern

# Run as root so entrypoint.sh can write /etc/resolv.conf
USER root
WORKDIR /home/intern

ENTRYPOINT ["/entrypoint.sh"]
