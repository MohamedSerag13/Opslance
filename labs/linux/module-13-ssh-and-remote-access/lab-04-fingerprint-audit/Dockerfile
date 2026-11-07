FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo vim nano less openssh-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN useradd -m -s /bin/bash intern && \
    echo "intern:intern123" | chpasswd
# Note: sudo whitelist for intern is injected at runtime by lab-manager
#       via /etc/sudoers.d/lab-student — do NOT add NOPASSWD:ALL here.

# Lab scenario files (the broken state)
COPY context/ /

# THE BREAK: apply the broken-state permissions, users and data
RUN mkdir -p /home/intern/.ssh
RUN ssh-keygen -t ed25519 -N "" -f /home/intern/.ssh/id_ed25519 -C intern@staging -q

# Student workspace ownership
RUN chown -R intern:intern /home/intern

# Ensure /etc/sudoers.d is read (safe runtime whitelist injected there)
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers
COPY check.sh /check.sh
RUN chmod +x /check.sh

RUN echo "FLAG-fingerprint-audit-00e85d28" > /root/flag.txt

USER intern
WORKDIR /home/intern

ENTRYPOINT ["tail", "-f", "/dev/null"]
