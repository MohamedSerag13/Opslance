FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    sudo vim nano less curl \
    && rm -rf /var/lib/apt/lists/*
RUN useradd -m -s /bin/bash intern && \
    echo "intern ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers && \
    echo "intern:intern123" | chpasswd
    
# THE BREAK: Modify PATH and remove alias
RUN echo "export PATH=/usr/bin:/bin:/usr/sbin:/sbin" > /home/intern/.bashrc
RUN echo "#!/bin/bash\necho 'Deploy Check OK'" > /usr/local/bin/deploy-check
RUN chmod +x /usr/local/bin/deploy-check

COPY check.sh /check.sh
RUN chmod +x /check.sh
RUN echo "FLAG-command-not-found" > /root/flag.txt
USER intern
WORKDIR /home/intern
ENTRYPOINT ["tail", "-f", "/dev/null"]