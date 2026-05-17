const rawLabs = [
  // LINUX - Filesystem
  genLab('lab-linux-fs-01', 'Linux', 'Filesystem', 'Lost in the Filesystem', 'Beginner', 7, 10, 'pwd, cd, paths', 'bash /opt/app/run.sh', 'Used absolute paths instead of relative ones.'),
  genLab('lab-linux-fs-02', 'Linux', 'Filesystem', 'Find the Config', 'Beginner', 12, 10, 'find, locate', 'find / -name database.conf', 'Located misplaced file with find and moved it.'),
  genLab('lab-linux-fs-03', 'Linux', 'Filesystem', 'Symlink Confusion', 'Intermediate', 12, 20, 'ln -s, readlink', 'cat /var/www/html/index.html', 'Recreated broken symlink to point to correct release.'),
  // LINUX - Navigation
  genLab('lab-linux-nav-01', 'Linux', 'Navigation', 'Command Not Found', 'Beginner', 12, 10, '$PATH, .bashrc', 'app-cli --version', 'Appended binary path to $PATH in .bashrc.'),
  genLab('lab-linux-nav-02', 'Linux', 'Navigation', 'Grep and Search', 'Beginner', 12, 10, 'grep, text processing', 'cat findings.txt', 'Used grep -C to extract log context into a file.'),
  genLab('lab-linux-nav-03', 'Linux', 'Navigation', 'Text Editing with vi', 'Intermediate', 17, 20, 'vi basics', 'start-app.sh', 'Used vi to fix a typo in the config file.'),
  // LINUX - Read-Write-Permissions
  genLab('lab-linux-rwp-01', 'Linux', 'Read-Write-Permissions', 'Numeric chmod', 'Beginner', 17, 10, 'octal chmod', 'server.py', 'Applied 755 and 640 permissions.'),
  genLab('lab-linux-rwp-02', 'Linux', 'Read-Write-Permissions', 'Symbolic chmod', 'Beginner', 12, 10, 'symbolic chmod', 'check-permissions.sh', 'Used a+x and go-w to secure files.'),
  genLab('lab-linux-rwp-03', 'Linux', 'Read-Write-Permissions', 'Umask and Sticky Bit', 'Intermediate', 17, 20, 'umask, sticky bit', 'check-sticky.sh', 'Set umask 022 and chmod +t on shared dir.'),
  // LINUX - Permissions
  genLab('lab-linux-perm-01', 'Linux', 'Permissions', 'Log Folder Permission Denied', 'Beginner', 22, 10, 'chown, chmod', 'ls -ld /var/log/app', 'Fixed ownership of the log directory.'),
  genLab('lab-linux-perm-02', 'Linux', 'Permissions', 'Script Won\'t Execute', 'Beginner', 15, 10, 'chmod +x', './script.sh', 'Added execute bit to the script.'),
  genLab('lab-linux-perm-03', 'Linux', 'Permissions', 'Wrong File Owner', 'Beginner', 15, 10, 'chown', 'systemctl start app', 'Fixed owner of systemd service files.'),
  // LINUX - Users and Groups
  genLab('lab-linux-ug-01', 'Linux', 'Users and Groups', 'Sudo Not Configured', 'Beginner', 15, 10, 'visudo', 'sudo -l', 'Added user to sudoers using visudo.'),
  genLab('lab-linux-ug-02', 'Linux', 'Users and Groups', 'Group Membership Missing', 'Beginner', 12, 10, 'usermod', 'groups', 'Added user to docker group.'),
  genLab('lab-linux-ug-03', 'Linux', 'Users and Groups', 'Missing Home Directory', 'Beginner', 12, 10, 'useradd -m', 'ls -la /home', 'Recreated user with -m flag for home dir.'),
  // LINUX - Processes
  genLab('lab-linux-proc-01', 'Linux', 'Processes', 'CPU Hog Process', 'Beginner', 7, 10, 'ps, kill', 'top', 'Identified and killed infinite loop process.'),
  genLab('lab-linux-proc-02', 'Linux', 'Processes', 'Crashed Service', 'Beginner', 12, 10, 'process troubleshooting', 'systemctl status', 'Restarted the crashed daemon.'),
  genLab('lab-linux-proc-03', 'Linux', 'Processes', 'Zombie Process Investigation', 'Intermediate', 17, 20, 'zombie processes', 'ps aux | grep Z', 'Killed the parent process to reap zombies.'),
  // LINUX - Logs
  genLab('lab-linux-log-01', 'Linux', 'Logs', 'Find the Error in Logs', 'Beginner', 12, 10, 'grep, tail', 'grep ERROR', 'Extracted specific error from auth.log.'),
  genLab('lab-linux-log-02', 'Linux', 'Logs', 'Journalctl Investigation', 'Intermediate', 12, 20, 'journalctl', 'journalctl -u app', 'Queried systemd journal for service crash.'),
  genLab('lab-linux-log-03', 'Linux', 'Logs', 'Hidden Log Location', 'Advanced', 17, 30, 'strace, /proc', 'strace -p', 'Used strace to find where process was writing logs.'),
  // LINUX - Storage
  genLab('lab-linux-stor-01', 'Linux', 'Storage', 'Disk Full', 'Beginner', 12, 10, 'df, du', 'df -h', 'Found and deleted massive temp file.'),
  genLab('lab-linux-stor-02', 'Linux', 'Storage', 'Log Files Too Large', 'Beginner', 7, 10, 'find, truncate', '> app.log', 'Truncated log file without deleting it.'),
  genLab('lab-linux-stor-03', 'Linux', 'Storage', 'Inode Exhaustion', 'Intermediate', 12, 20, 'df -i', 'df -i', 'Deleted millions of tiny session files.'),
  // LINUX - Services
  genLab('lab-linux-svc-01', 'Linux', 'Services', 'Broken Systemd Service', 'Beginner', 12, 10, 'systemctl', 'systemctl status', 'Fixed typo in ExecStart path.'),
  genLab('lab-linux-svc-02', 'Linux', 'Services', 'Port Already in Use', 'Beginner', 12, 10, 'ss, netstat', 'ss -tuln', 'Killed rogue process bound to port 80.'),
  genLab('lab-linux-svc-03', 'Linux', 'Services', 'Missing Env File', 'Intermediate', 12, 20, 'EnvironmentFile', 'systemctl start', 'Created missing env file for systemd unit.'),

  // DOCKER - Images
  genLab('lab-docker-img-01', 'Docker', 'Images', 'Broken Dockerfile', 'Beginner', 15, 10, 'Dockerfile syntax', 'docker build .', 'Fixed syntax error in Dockerfile.'),
  genLab('lab-docker-img-02', 'Docker', 'Images', 'Unnecessarily Large Image', 'Intermediate', 17, 20, 'multi-stage builds', 'docker images', 'Implemented multi-stage build to shrink image.'),
  genLab('lab-docker-img-03', 'Docker', 'Images', 'Missing Runtime Dependency', 'Intermediate', 17, 20, 'runtime deps', 'docker run', 'Added missing libssl dependency.'),
  // DOCKER - Containers
  genLab('lab-docker-con-01', 'Docker', 'Containers', 'Container Crash Loop', 'Beginner', 12, 10, 'logs', 'docker ps', 'Fixed missing python execution path.'),
  genLab('lab-docker-con-02', 'Docker', 'Containers', 'Unhealthy Container', 'Beginner', 12, 10, 'healthchecks', 'docker inspect', 'Fixed healthcheck curl endpoint.'),
  genLab('lab-docker-con-03', 'Docker', 'Containers', 'Wrong Entrypoint', 'Beginner', 7, 10, 'ENTRYPOINT', 'docker run', 'Changed CMD to ENTRYPOINT.'),
  // DOCKER - Compose
  genLab('lab-docker-cmp-01', 'Docker', 'Compose', 'Broken depends_on', 'Intermediate', 12, 20, 'depends_on', 'docker compose up', 'Added condition: service_healthy.'),
  genLab('lab-docker-cmp-02', 'Docker', 'Compose', 'Healthcheck Failure', 'Beginner', 7, 10, 'compose healthcheck', 'docker compose ps', 'Fixed timeout value in healthcheck.'),
  genLab('lab-docker-cmp-03', 'Docker', 'Compose', 'Missing Environment Variable', 'Beginner', 7, 10, '.env files', 'docker compose up', 'Provided .env file for interpolation.'),
  // DOCKER - Networking
  genLab('lab-docker-net-01', 'Docker', 'Networking', 'Containers Can\'t Communicate', 'Beginner', 7, 10, 'Docker networks', 'ping db', 'Put containers on same bridge network.'),
  genLab('lab-docker-net-02', 'Docker', 'Networking', 'Wrong Hostname', 'Beginner', 7, 10, 'Docker DNS', 'curl api', 'Fixed service name alias.'),
  genLab('lab-docker-net-03', 'Docker', 'Networking', 'Port Binding Conflict', 'Beginner', 7, 10, 'port mapping', 'docker ps', 'Changed host port from 80 to 8080.'),
  // DOCKER - Volumes
  genLab('lab-docker-vol-01', 'Docker', 'Volumes', 'Volume Permission Denied', 'Beginner', 12, 10, 'volume permissions', 'docker run', 'Changed owner of mounted host dir.'),
  genLab('lab-docker-vol-02', 'Docker', 'Volumes', 'Data Not Persisted', 'Beginner', 7, 10, 'persistence', 'docker compose down', 'Added named volume to database.'),
  genLab('lab-docker-vol-03', 'Docker', 'Volumes', 'Read-Only Volume', 'Beginner', 7, 10, 'volume flags', 'docker exec', 'Removed :ro flag from upload dir.'),

  // NGINX - Config
  genLab('lab-nginx-cfg-01', 'Nginx', 'Config', 'Syntax Error', 'Beginner', 7, 10, 'nginx -t', 'nginx -t', 'Added missing semicolon.'),
  genLab('lab-nginx-cfg-02', 'Nginx', 'Config', 'Wrong Root Path', 'Beginner', 7, 10, 'root directive', 'curl localhost', 'Fixed root path to /usr/share/nginx/html.'),
  genLab('lab-nginx-cfg-03', 'Nginx', 'Config', 'Location Block Bug', 'Intermediate', 12, 20, 'location matching', 'curl /api/users', 'Removed exact match = from location.'),
  // NGINX - Reverse Proxy
  genLab('lab-nginx-rp-01', 'Nginx', 'Reverse Proxy', '502 Bad Gateway', 'Beginner', 7, 10, 'proxy_pass', 'curl localhost', 'Fixed proxy_pass to point to correct container.'),
  genLab('lab-nginx-rp-02', 'Nginx', 'Reverse Proxy', 'Upstream Timeout', 'Beginner', 7, 10, 'proxy_read_timeout', 'curl localhost', 'Increased proxy_read_timeout for slow API.'),
  genLab('lab-nginx-rp-03', 'Nginx', 'Reverse Proxy', 'Invalid Upstream Host', 'Intermediate', 12, 20, 'proxy_pass syntax', 'curl localhost', 'Fixed missing http:// in proxy_pass.'),
  // NGINX - SSL
  genLab('lab-nginx-ssl-01', 'Nginx', 'SSL', 'Expired Certificate', 'Beginner', 12, 10, 'openssl', 'curl -k', 'Generated new self-signed certificate.'),
  genLab('lab-nginx-ssl-02', 'Nginx', 'SSL', 'Missing SSL Chain', 'Beginner', 7, 10, 'ssl_certificate', 'nginx -t', 'Fixed path to fullchain.pem.'),
  genLab('lab-nginx-ssl-03', 'Nginx', 'SSL', 'Broken HTTPS Redirect', 'Intermediate', 12, 20, 'server blocks', 'curl -I', 'Separated port 80 and 443 into distinct server blocks.'),
  // NGINX - Performance
  genLab('lab-nginx-perf-01', 'Nginx', 'Performance', 'Rate Limit Issue', 'Intermediate', 12, 20, 'limit_req burst', 'curl', 'Added burst=5 to limit_req.'),
  genLab('lab-nginx-perf-02', 'Nginx', 'Performance', 'Large Upload Failure', 'Beginner', 7, 10, 'client_max_body_size', 'curl', 'Increased client_max_body_size to 10M.'),
  genLab('lab-nginx-perf-03', 'Nginx', 'Performance', 'Buffer Overflow Warning', 'Intermediate', 12, 20, 'large_client_header_buffers', 'curl', 'Increased header buffer size for large cookies.'),

  // NETWORKING - Connectivity
  genLab('lab-net-conn-01', 'Networking', 'Connectivity', 'Service Unreachable', 'Beginner', 7, 10, 'ping, subnets', 'ping', 'Fixed subnet mask mismatch.'),
  genLab('lab-net-conn-02', 'Networking', 'Connectivity', 'Firewall Blocking Port', 'Intermediate', 17, 20, 'iptables', 'iptables -L', 'Added iptables rule to allow port 443.'),
  genLab('lab-net-conn-03', 'Networking', 'Connectivity', 'Wrong Routing', 'Intermediate', 12, 20, 'ip route', 'ip route', 'Deleted bad default gateway route.'),
  // NETWORKING - DNS
  genLab('lab-net-dns-01', 'Networking', 'DNS', 'Broken DNS Resolution', 'Beginner', 7, 10, 'resolv.conf', 'ping google.com', 'Added 8.8.8.8 to resolv.conf.'),
  genLab('lab-net-dns-02', 'Networking', 'DNS', 'Wrong Hosts File', 'Beginner', 7, 10, '/etc/hosts', 'ping internal-api', 'Fixed typo in /etc/hosts mapping.'),
  genLab('lab-net-dns-03', 'Networking', 'DNS', 'Internal Domain Failure', 'Intermediate', 12, 20, 'network aliases', 'ping db', 'Added network alias to compose file.'),
  // NETWORKING - Ports
  genLab('lab-net-port-01', 'Networking', 'Ports', 'Port Already in Use', 'Beginner', 12, 10, 'ss, netstat', 'ss -tuln', 'Found and stopped rogue process.'),
  genLab('lab-net-port-02', 'Networking', 'Ports', 'Service on Wrong Port', 'Beginner', 7, 10, 'port mapping', 'curl', 'Changed app config to bind to 8080.'),
  genLab('lab-net-port-03', 'Networking', 'Ports', 'Closed Port Debugging', 'Intermediate', 12, 20, 'nc', 'nc -zv', 'Opened firewall port using ufw.'),
  // NETWORKING - Troubleshooting
  genLab('lab-net-ts-01', 'Networking', 'Troubleshooting', 'Debug with Curl', 'Beginner', 7, 10, 'curl -v', 'curl -v', 'Identified proxy intercept via curl headers.'),
  genLab('lab-net-ts-02', 'Networking', 'Troubleshooting', 'Debug with Netstat', 'Beginner', 7, 10, 'netstat', 'netstat -tulpn', 'Found process listening on wrong interface.'),
  genLab('lab-net-ts-03', 'Networking', 'Troubleshooting', 'Debug with tcpdump', 'Advanced', 17, 30, 'tcpdump', 'tcpdump', 'Captured packets to prove NAT failure.')
];
