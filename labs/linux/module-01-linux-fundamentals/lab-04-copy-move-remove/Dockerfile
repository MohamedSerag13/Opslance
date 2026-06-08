FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo vim nano \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN useradd -m -s /bin/bash intern && \
    echo "intern ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers && \
    echo "intern:intern123" | chpasswd

# Create the staging config file
RUN mkdir -p /home/intern && \
    echo "# Staging Configuration" > /home/intern/staging.conf && \
    echo "db_host=staging-db.internal" >> /home/intern/staging.conf && \
    echo "db_port=5432" >> /home/intern/staging.conf && \
    echo "app_env=staging" >> /home/intern/staging.conf && \
    chown -R intern:intern /home/intern

# THE BREAK: /etc/app/ does not exist — student must create it with mkdir -p
# (We intentionally do NOT create /etc/app/)

# Create distracting backup files in home directory
RUN touch /home/intern/backup-2024-01.tar.gz && \
    touch /home/intern/backup-2024-02.tar.gz && \
    touch /home/intern/backup-2024-03.tar.gz && \
    touch /home/intern/notes.txt

RUN echo "FLAG-copy-move-remove-d4e8f1a2" > /root/flag.txt

COPY check.sh /check.sh
RUN chmod +x /check.sh

USER intern
WORKDIR /home/intern

ENTRYPOINT ["tail", "-f", "/dev/null"]
