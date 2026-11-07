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
    
# THE BREAK: deploy.sh exists but is not executable
RUN printf '#!/bin/bash\necho "Deploying application..."\n' > /home/intern/deploy.sh && \
    chmod 644 /home/intern/deploy.sh && \
    chown intern:intern /home/intern/deploy.sh

# Ensure /etc/sudoers.d is read (safe runtime whitelist injected there)
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers
COPY check.sh /check.sh
RUN chmod +x /check.sh
RUN echo "FLAG-cicd-pipeline-failed" > /root/flag.txt
USER intern
WORKDIR /home/intern
ENTRYPOINT ["tail", "-f", "/dev/null"]
