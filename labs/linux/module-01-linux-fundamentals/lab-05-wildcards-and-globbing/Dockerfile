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

# Create messy files inside /home/intern/inbox/
RUN mkdir -p /home/intern/inbox
RUN for i in $(seq 1 15); do \
      echo "log message $i" > "/home/intern/inbox/log-2026-05-$(printf "%02d" $i).log"; \
    done
RUN for i in $(seq 1 15); do \
      echo "report data $i" > "/home/intern/inbox/report-q1-0$i.csv"; \
    done
RUN for i in $(seq 1 10); do \
      echo "note info $i" > "/home/intern/inbox/note-meeting-0$i.txt"; \
    done
RUN for i in $(seq 1 10); do \
      echo "temp contents $i" > "/home/intern/inbox/temp-file-0$i.tmp"; \
    done
RUN chown -R intern:intern /home/intern


# Ensure /etc/sudoers.d is read (safe runtime whitelist injected there)
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers
COPY check.sh /check.sh
RUN chmod +x /check.sh
USER intern
WORKDIR /home/intern
ENTRYPOINT ["tail", "-f", "/dev/null"]
