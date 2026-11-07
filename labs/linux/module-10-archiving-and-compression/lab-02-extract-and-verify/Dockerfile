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

# Lab scenario files (the broken state)
COPY context/ /

# THE BREAK: apply the broken-state permissions, users and data
RUN mkdir -p /opt/releases
RUN cd /opt/site-v2 && tar -czf /opt/releases/site-v2.tar.gz index.html css js
RUN rm -rf /opt/site-v2
RUN mkdir -p /var/www/site/css
RUN printf 'body { partial }\n' > /var/www/site/css/style.css
RUN chown -R root:root /var/www /opt/releases

# Student workspace ownership
RUN chown -R intern:intern /home/intern

# Ensure /etc/sudoers.d is read (safe runtime whitelist injected there)
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers
COPY check.sh /check.sh
RUN chmod +x /check.sh

RUN echo "FLAG-extract-and-verify-07eed5ac" > /root/flag.txt

USER intern
WORKDIR /home/intern

ENTRYPOINT ["tail", "-f", "/dev/null"]
