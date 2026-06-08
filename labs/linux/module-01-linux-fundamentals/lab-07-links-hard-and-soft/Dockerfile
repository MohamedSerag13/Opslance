FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo vim nano \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
RUN useradd -m -s /bin/bash intern && \
    echo "intern ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers && \
    echo "intern:intern123" | chpasswd

# Create folder structure for deployments
RUN mkdir -p /home/intern/releases/v1.0 /home/intern/releases/v2.0
RUN echo "version=1.0" > /home/intern/releases/v1.0/app.conf
RUN echo "version=2.0" > /home/intern/releases/v2.0/app.conf
RUN chown -R intern:intern /home/intern

COPY check.sh /check.sh
RUN chmod +x /check.sh
USER intern
WORKDIR /home/intern
ENTRYPOINT ["tail", "-f", "/dev/null"]
