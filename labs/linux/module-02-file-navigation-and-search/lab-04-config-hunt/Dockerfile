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

# Seed /etc/myapp config files
RUN mkdir -p /etc/myapp
RUN printf '%s\n' \
  '# Database configuration' \
  'DB_HOST=prod-db-01.internal' \
  'DB_PORT=5432' \
  'DB_NAME=webapp_production' \
  'DB_USER=app_user' \
  'DB_PASSWORD=supersecret123' \
  'DB_POOL_SIZE=10' \
  'DB_TIMEOUT=30' \
  > /etc/myapp/database.conf
RUN printf '%s\n' \
  '# Cache configuration' \
  'CACHE_HOST=redis-01.internal' \
  'CACHE_PORT=6379' \
  'CACHE_TTL=300' \
  'CACHE_MAX_MEMORY=512mb' \
  > /etc/myapp/cache.conf
RUN chmod 644 /etc/myapp/database.conf /etc/myapp/cache.conf

# Seed /opt/myapp log files
RUN mkdir -p /opt/myapp
RUN printf '%s\n' \
  '[2026-06-01 09:00:01] INFO  App starting up' \
  '[2026-06-01 09:00:02] INFO  Loading configuration' \
  '[2026-06-01 09:00:03] INFO  Database pool initialised' \
  '[2026-06-01 09:00:04] INFO  Cache connection established' \
  '[2026-06-01 09:00:05] INFO  HTTP server listening on :8080' \
  '[2026-06-01 09:00:10] INFO  First request received' \
  '[2026-06-01 09:00:15] INFO  Health check endpoint responding' \
  '[2026-06-01 09:00:20] INFO  Background worker started' \
  '[2026-06-01 09:00:25] INFO  Job queue processing' \
  '[2026-06-01 09:00:30] INFO  Metrics collector running' \
  '[2026-06-01 09:00:35] INFO  Session store connected' \
  '[2026-06-01 09:00:40] INFO  Request rate: 120 req/min' \
  '[2026-06-01 09:00:45] INFO  Memory usage stable at 34%' \
  '[2026-06-01 09:00:50] INFO  Disk I/O within normal range' \
  '[2026-06-01 09:00:55] INFO  Cache hit rate: 87%' \
  '[2026-06-01 09:01:00] INFO  Scheduled job triggered' \
  '[2026-06-01 09:01:05] INFO  Backup process started' \
  '[2026-06-01 09:01:10] INFO  Backup completed successfully' \
  '[2026-06-01 09:01:15] INFO  Monitoring agent heartbeat' \
  '[2026-06-01 09:01:20] INFO  Connections: DB=8 Cache=3 HTTP=45' \
  '[2026-06-01 09:01:25] INFO  Garbage collection ran in 12ms' \
  '[2026-06-01 09:01:30] INFO  Attempting cache reconnect' \
  '[2026-06-01 09:01:35] INFO  Cache reconnected' \
  '[2026-06-01 09:01:40] INFO  Slow query detected: 2100ms' \
  '[2026-06-01 09:01:45] INFO  Query optimiser hint applied' \
  '[2026-06-01 09:01:50] INFO  Worker pool resized to 8' \
  '[2026-06-01 09:01:55] INFO  Deployment check triggered' \
  '[2026-06-01 09:02:00] INFO  Rolling update initiated' \
  '[2026-06-01 09:02:05] INFO  Draining connections from node-1' \
  '[2026-06-01 09:02:10] INFO  Graceful stop signalled' \
  '[2026-06-01 09:02:15] INFO  Pending requests: 3 remaining' \
  '[2026-06-01 09:02:20] INFO  Waiting for workers to finish' \
  '[2026-06-01 09:02:25] INFO  Workers finished cleanly' \
  '[2026-06-01 09:02:30] INFO  Stopping HTTP listener' \
  '[2026-06-01 09:02:35] INFO  Closing database pool' \
  '[2026-06-01 09:02:40] INFO  Closing cache connection' \
  '[2026-06-01 09:02:45] INFO  Flushing metrics buffer' \
  '[2026-06-01 09:02:50] INFO  Metrics flushed successfully' \
  '[2026-06-01 09:02:55] INFO  Cleanup routines complete' \
  '[2026-06-01 09:03:00] ERROR connection refused to prod-db-01.internal:5432' \
  '[2026-06-01 09:03:05] ERROR connection refused to prod-db-01.internal:5432' \
  '[2026-06-01 09:03:10] ERROR connection refused to prod-db-01.internal:5432' \
  '[2026-06-01 09:03:15] ERROR connection refused to prod-db-01.internal:5432' \
  '[2026-06-01 09:03:20] ERROR connection refused to prod-db-01.internal:5432' \
  '[2026-06-01 09:03:25] ERROR connection refused to prod-db-01.internal:5432' \
  '[2026-06-01 09:03:30] ERROR connection refused to prod-db-01.internal:5432' \
  '[2026-06-01 09:03:35] ERROR connection refused to prod-db-01.internal:5432' \
  '[2026-06-01 09:03:40] ERROR connection refused to prod-db-01.internal:5432' \
  '[2026-06-01 09:03:45] ERROR connection refused to prod-db-01.internal:5432' \
  > /opt/myapp/app.log

RUN printf '%s\n' \
  '[2026-06-01 08:00:00] INFO  Starting deployment pipeline' \
  '[2026-06-01 08:00:10] INFO  Running pre-deploy checks' \
  '[2026-06-01 08:00:20] INFO  Pre-deploy checks passed' \
  '[2026-06-01 08:00:30] INFO  Pulling image: webapp:2.4.0' \
  '[2026-06-01 08:00:45] INFO  Image pulled successfully' \
  '[2026-06-01 08:01:00] INFO  Stopping old container' \
  '[2026-06-01 08:01:05] INFO  Old container stopped' \
  '[2026-06-01 08:01:10] DEPLOY_SUCCESS version=2.3.9 host=node-1' \
  '[2026-06-01 08:01:15] INFO  Starting new container' \
  '[2026-06-01 08:01:25] INFO  Container health check: OK' \
  '[2026-06-01 08:01:30] DEPLOY_SUCCESS version=2.4.0 host=node-2' \
  '[2026-06-01 08:01:35] INFO  Updating load balancer routes' \
  '[2026-06-01 08:01:40] INFO  Routes updated' \
  '[2026-06-01 08:01:45] INFO  Smoke tests passed' \
  '[2026-06-01 08:01:50] INFO  Notifying monitoring systems' \
  '[2026-06-01 08:01:55] INFO  Slack notification sent' \
  '[2026-06-01 08:02:00] INFO  PagerDuty alert cleared' \
  '[2026-06-01 08:02:05] INFO  Deployment finalising' \
  '[2026-06-01 08:02:10] DEPLOY_SUCCESS version=2.4.1 host=node-3' \
  '[2026-06-01 08:02:15] INFO  All nodes updated — deployment complete' \
  > /opt/myapp/deploy.log

RUN chmod 644 /opt/myapp/app.log /opt/myapp/deploy.log && \
    chown -R intern:intern /home/intern

# Ensure /etc/sudoers.d is read (safe runtime whitelist injected there)
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers
COPY check.sh /check.sh
RUN chmod +x /check.sh
USER intern
WORKDIR /home/intern
ENTRYPOINT ["tail", "-f", "/dev/null"]
