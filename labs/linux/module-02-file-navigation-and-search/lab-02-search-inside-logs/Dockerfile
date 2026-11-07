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

# Create webapp log directory and seed log files
RUN mkdir -p /var/log/webapp

# access.log — mixed HTTP entries (200s, 404s, 500s)
RUN printf '%s\n' \
  '192.168.1.10 - - [01/Jun/2026:10:00:01 +0000] "GET /index.html HTTP/1.1" 200 512' \
  '192.168.1.11 - - [01/Jun/2026:10:00:02 +0000] "GET /api/health HTTP/1.1" 200 24' \
  '192.168.1.12 - - [01/Jun/2026:10:00:03 +0000] "GET /api/users HTTP/1.1" 200 1024' \
  '192.168.1.13 - - [01/Jun/2026:10:00:04 +0000] "POST /api/login HTTP/1.1" 200 256' \
  '192.168.1.14 - - [01/Jun/2026:10:00:05 +0000] "GET /missing-page HTTP/1.1" 404 128' \
  '192.168.1.15 - - [01/Jun/2026:10:00:06 +0000] "GET /old-endpoint HTTP/1.1" 404 96' \
  '192.168.1.16 - - [01/Jun/2026:10:00:07 +0000] "DELETE /api/data HTTP/1.1" 500 64' \
  '192.168.1.17 - - [01/Jun/2026:10:00:08 +0000] "GET /api/orders HTTP/1.1" 200 2048' \
  '192.168.1.18 - - [01/Jun/2026:10:00:09 +0000] "GET /favicon.ico HTTP/1.1" 404 0' \
  '192.168.1.19 - - [01/Jun/2026:10:00:10 +0000] "POST /api/checkout HTTP/1.1" 500 128' \
  '192.168.1.20 - - [01/Jun/2026:10:00:11 +0000] "GET /api/products HTTP/1.1" 200 4096' \
  '192.168.1.21 - - [01/Jun/2026:10:00:12 +0000] "PUT /api/profile HTTP/1.1" 200 512' \
  '192.168.1.22 - - [01/Jun/2026:10:00:13 +0000] "GET /robots.txt HTTP/1.1" 404 0' \
  '192.168.1.23 - - [01/Jun/2026:10:00:14 +0000] "POST /api/payment HTTP/1.1" 500 256' \
  '192.168.1.24 - - [01/Jun/2026:10:00:15 +0000] "GET /api/stats HTTP/1.1" 200 768' \
  '192.168.1.25 - - [01/Jun/2026:10:00:16 +0000] "GET /api/config HTTP/1.1" 200 128' \
  '192.168.1.26 - - [01/Jun/2026:10:00:17 +0000] "GET /undefined-route HTTP/1.1" 404 64' \
  '192.168.1.27 - - [01/Jun/2026:10:00:18 +0000] "POST /api/upload HTTP/1.1" 500 512' \
  '192.168.1.28 - - [01/Jun/2026:10:00:19 +0000] "GET /api/reports HTTP/1.1" 200 8192' \
  '192.168.1.29 - - [01/Jun/2026:10:00:20 +0000] "GET /sitemap.xml HTTP/1.1" 404 0' \
  '192.168.1.10 - - [01/Jun/2026:10:00:21 +0000] "GET /api/dashboard HTTP/1.1" 200 2048' \
  '192.168.1.11 - - [01/Jun/2026:10:00:22 +0000] "GET /api/alerts HTTP/1.1" 200 256' \
  '192.168.1.12 - - [01/Jun/2026:10:00:23 +0000] "POST /api/reset HTTP/1.1" 500 128' \
  '192.168.1.13 - - [01/Jun/2026:10:00:24 +0000] "GET /api/logs HTTP/1.1" 200 16384' \
  '192.168.1.14 - - [01/Jun/2026:10:00:25 +0000] "GET /bad-path HTTP/1.1" 404 64' \
  '192.168.1.15 - - [01/Jun/2026:10:00:26 +0000] "GET /api/metrics HTTP/1.1" 200 512' \
  '192.168.1.16 - - [01/Jun/2026:10:00:27 +0000] "DELETE /api/cache HTTP/1.1" 500 64' \
  '192.168.1.17 - - [01/Jun/2026:10:00:28 +0000] "GET /api/version HTTP/1.1" 200 64' \
  '192.168.1.18 - - [01/Jun/2026:10:00:29 +0000] "GET /unknown HTTP/1.1" 404 0' \
  '192.168.1.19 - - [01/Jun/2026:10:00:30 +0000] "POST /api/deploy HTTP/1.1" 200 128' \
  > /var/log/webapp/access.log

# error.log — ERROR, WARNING, CRITICAL, INFO lines
RUN printf '%s\n' \
  '[2026-06-01 10:00:01] INFO Application started successfully' \
  '[2026-06-01 10:00:05] INFO Connected to database at prod-db.internal' \
  '[2026-06-01 10:00:10] WARNING High memory usage detected: 82%' \
  '[2026-06-01 10:00:15] ERROR Failed to connect to cache server: connection refused' \
  '[2026-06-01 10:00:20] INFO Cache retry attempt 1 of 3' \
  '[2026-06-01 10:00:25] ERROR Cache connection timeout after 5000ms' \
  '[2026-06-01 10:00:30] WARNING Falling back to in-memory store' \
  '[2026-06-01 10:00:35] INFO Request queue depth: 42' \
  '[2026-06-01 10:00:40] CRITICAL Disk usage at 95% on /var/data' \
  '[2026-06-01 10:00:45] ERROR Database query timeout: SELECT * FROM orders' \
  '[2026-06-01 10:00:50] WARNING Slow response time: 3200ms on /api/checkout' \
  '[2026-06-01 10:00:55] INFO Health check passed' \
  '[2026-06-01 10:01:00] ERROR Unhandled exception in payment processor' \
  '[2026-06-01 10:01:05] WARNING Retry queue growing: 156 items pending' \
  '[2026-06-01 10:01:10] INFO Processing batch job 4821' \
  '[2026-06-01 10:01:15] ERROR Failed to write to /var/log/webapp/audit.log: permission denied' \
  '[2026-06-01 10:01:20] CRITICAL Out of memory: kill process or sacrifice child' \
  '[2026-06-01 10:01:25] WARNING Memory pressure easing after GC run' \
  '[2026-06-01 10:01:30] ERROR SSL certificate expiring in 3 days' \
  '[2026-06-01 10:01:35] INFO Scheduled maintenance window starting' \
  > /var/log/webapp/error.log

# app.log — mixed lines, some with lowercase 'error'
RUN printf '%s\n' \
  'app[2026-06-01 10:00:01] startup: loading configuration' \
  'app[2026-06-01 10:00:02] startup: config loaded from /etc/webapp/app.conf' \
  'app[2026-06-01 10:00:03] startup: initialising database pool' \
  'app[2026-06-01 10:00:04] runtime: request handler registered' \
  'app[2026-06-01 10:00:05] runtime: error in middleware pipeline — invalid token' \
  'app[2026-06-01 10:00:06] runtime: retrying failed request' \
  'app[2026-06-01 10:00:07] runtime: error writing session data to redis' \
  'app[2026-06-01 10:00:08] runtime: worker thread 3 idle' \
  'app[2026-06-01 10:00:09] runtime: processing job queue' \
  'app[2026-06-01 10:00:10] runtime: error parsing JSON payload from client' \
  'app[2026-06-01 10:00:11] runtime: request completed in 245ms' \
  'app[2026-06-01 10:00:12] runtime: background sync started' \
  'app[2026-06-01 10:00:13] runtime: error contacting notification service' \
  'app[2026-06-01 10:00:14] runtime: fallback notification sent via email' \
  'app[2026-06-01 10:00:15] shutdown: graceful stop initiated' \
  > /var/log/webapp/app.log

RUN chown -R intern:intern /home/intern && \
    chmod 644 /var/log/webapp/access.log /var/log/webapp/error.log /var/log/webapp/app.log

# Ensure /etc/sudoers.d is read (safe runtime whitelist injected there)
RUN grep -qxF "#includedir /etc/sudoers.d" /etc/sudoers || echo "#includedir /etc/sudoers.d" >> /etc/sudoers
COPY check.sh /check.sh
RUN chmod +x /check.sh
USER intern
WORKDIR /home/intern
ENTRYPOINT ["tail", "-f", "/dev/null"]
