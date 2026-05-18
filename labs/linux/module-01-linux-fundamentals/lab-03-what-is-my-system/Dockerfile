FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    sudo vim nano curl wget \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash intern && \
    echo "intern ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers && \
    echo "intern:intern123" | chpasswd

# THE BREAK: Remove .bashrc and .profile so the prompt is bare, and set HOME to / so intern starts lost
RUN rm -f /home/intern/.bashrc /home/intern/.profile
ENV HOME=/

RUN echo "FLAG-what-is-my-system-a7f3b2c9" > /root/flag.txt

COPY check.sh /usr/local/bin/check.sh
RUN chmod +x /usr/local/bin/check.sh

USER intern
WORKDIR /

ENTRYPOINT ["tail", "-f", "/dev/null"]
