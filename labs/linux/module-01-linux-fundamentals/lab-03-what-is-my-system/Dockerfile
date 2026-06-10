FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo vim nano wget \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN useradd -m -s /bin/bash intern && \
    echo "intern:intern123" | chpasswd
# Note: sudo whitelist for intern is injected at runtime by lab-manager
#       via /etc/sudoers.d/lab-student — do NOT add NOPASSWD:ALL here.

# THE BREAK: Remove .bashrc and .profile so the prompt is bare, and set HOME to / so intern starts lost
RUN rm -f /home/intern/.bashrc /home/intern/.profile
ENV HOME=/

RUN echo "FLAG-what-is-my-system-a7f3b2c9" > /root/flag.txt


# Ensure /etc/sudoers.d is read (safe runtime whitelist injected there)
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers
COPY check.sh /check.sh
RUN chmod +x /check.sh

USER intern
WORKDIR /

ENTRYPOINT ["tail", "-f", "/dev/null"]
