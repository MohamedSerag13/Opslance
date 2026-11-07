FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo vim nano \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
RUN useradd -m -s /bin/bash intern && \
    echo "intern:intern123" | chpasswd
# Note: sudo whitelist for intern is injected at runtime by lab-manager
#       via /etc/sudoers.d/lab-student — do NOT add NOPASSWD:ALL here.

# Create directories with different sizes
RUN mkdir -p /home/intern/data/backups \
             /home/intern/data/logs \
             /home/intern/data/temp \
             /home/intern/data/configs

# backups: ~50MB (largest file is 45MB)
RUN dd if=/dev/zero of=/home/intern/data/backups/archive.tar bs=1M count=45
RUN dd if=/dev/zero of=/home/intern/data/backups/old_backup.tar bs=1M count=5

# logs: ~20MB
RUN dd if=/dev/zero of=/home/intern/data/logs/syslog.1 bs=1M count=12
RUN dd if=/dev/zero of=/home/intern/data/logs/auth.log bs=1M count=8

# temp: ~5MB
RUN dd if=/dev/zero of=/home/intern/data/temp/cache.tmp bs=1M count=5

# configs: <1KB
RUN echo "port=8080" > /home/intern/data/configs/web.conf

RUN chown -R intern:intern /home/intern

# Ensure /etc/sudoers.d is read (safe runtime whitelist injected there)
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers
COPY check.sh /check.sh
RUN chmod +x /check.sh
USER intern
WORKDIR /home/intern
ENTRYPOINT ["tail", "-f", "/dev/null"]
