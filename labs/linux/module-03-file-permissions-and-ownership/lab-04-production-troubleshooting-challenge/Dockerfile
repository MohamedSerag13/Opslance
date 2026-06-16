FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo vim nano less \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
RUN useradd -m -s /bin/bash intern && \
    echo "intern:intern123" | chpasswd
# Note: sudo whitelist for intern is injected at runtime by lab-manager
#       via /etc/sudoers.d/lab-student — do NOT add NOPASSWD:ALL here.

# THE BREAK: Production project with multiple permission/ownership issues

# Create project directory structure owned by intern
RUN mkdir -p /home/intern/project/config \
             /home/intern/project/scripts \
             /home/intern/project/data

# Issue 1: Config file owned by root with 600 — intern cannot read it
RUN printf '%s\n' \
  'DB_HOST=localhost' \
  > /home/intern/project/config/settings.conf
RUN chown root:root /home/intern/project/config/settings.conf && \
    chmod 600 /home/intern/project/config/settings.conf

# Issue 2: Backup script not executable — intern cannot run it
RUN printf '%s\n' \
  '#!/bin/bash' \
  'echo "Backup completed successfully"' \
  > /home/intern/project/scripts/backup.sh
RUN chown intern:intern /home/intern/project/scripts/backup.sh && \
    chmod 644 /home/intern/project/scripts/backup.sh

# Issue 3: Output file owned by root — intern cannot write to it
RUN printf '%s\n' \
  'id,name,status' \
  > /home/intern/project/data/output.csv
RUN chown root:root /home/intern/project/data/output.csv && \
    chmod 644 /home/intern/project/data/output.csv

# Directories owned by intern so student can cd into them
RUN chown intern:intern /home/intern/project \
                        /home/intern/project/config \
                        /home/intern/project/scripts \
                        /home/intern/project/data

# Ensure /etc/sudoers.d is read (safe runtime whitelist injected there)
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers
COPY check.sh /check.sh
RUN chmod +x /check.sh
RUN echo "FLAG-production-troubleshooting-challenge" > /root/flag.txt
USER intern
WORKDIR /home/intern
ENTRYPOINT ["tail", "-f", "/dev/null"]
