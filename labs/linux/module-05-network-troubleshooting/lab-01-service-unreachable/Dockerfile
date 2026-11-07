FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo vim nano less procps iproute2 curl python3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN useradd -m -s /bin/bash intern && \
    echo "intern:intern123" | chpasswd
# Note: sudo whitelist for intern is injected at runtime by lab-manager
#       via /etc/sudoers.d/lab-student.

# Ensure /etc/sudoers.d is read
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers

# Hint file for the student
RUN printf '%s\n' \
  'TASK: Something is supposed to be listening on port 8080, but requests are failing.' \
  '' \
  'Step 1: Try the service  — curl localhost:8080' \
  'Step 2: Check listeners  — ss -tulnp' \
  'Step 3: Record finding   — echo "your diagnosis" > /home/intern/diagnosis.txt' \
  'Step 4: Fix it           — python3 -m http.server 8080 &' \
  'Step 5: Verify           — curl localhost:8080' \
  '' \
  'Run bash /check.sh to verify.' \
  > /home/intern/README_HINT.txt

COPY check.sh /check.sh
RUN chmod +x /check.sh

RUN echo "FLAG-service-unreachable" > /root/flag.txt
RUN chown -R intern:intern /home/intern

USER intern
WORKDIR /home/intern

# Nothing listens at boot — that IS the scenario.
ENTRYPOINT ["tail", "-f", "/dev/null"]
