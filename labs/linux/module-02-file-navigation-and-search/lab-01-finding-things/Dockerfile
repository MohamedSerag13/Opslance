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

# Create scattered files
RUN mkdir -p /etc && echo "db_host=prod-db.internal" > /etc/custom_app.conf
RUN mkdir -p /var/log && dd if=/dev/zero of=/var/log/orphaned_app.log bs=1k count=65 && touch -d "10 days ago" /var/log/orphaned_app.log
RUN mkdir -p /opt/tools && echo "#!/bin/bash" > /opt/tools/helper.sh && echo "echo 'helper'" >> /opt/tools/helper.sh && chmod +x /opt/tools/helper.sh

RUN chown -R intern:intern /home/intern

# Ensure /etc/sudoers.d is read (safe runtime whitelist injected there)
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers
COPY check.sh /check.sh
RUN chmod +x /check.sh
USER intern
WORKDIR /home/intern
ENTRYPOINT ["tail", "-f", "/dev/null"]
