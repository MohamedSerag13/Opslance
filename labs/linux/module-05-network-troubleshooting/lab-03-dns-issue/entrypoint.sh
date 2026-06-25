#!/bin/bash
# Lab 03 entrypoint — break DNS at boot by writing a bad resolv.conf.
#
# IMPORTANT: Docker may manage /etc/resolv.conf specially. This script
# backs up the original (which may contain a valid resolver injected by
# Docker's networking) to /etc/resolv.conf.orig, then overwrites it with
# a broken nameserver so the student has a real broken-DNS state to fix.
#
# The student must use "sudo tee" to write /etc/resolv.conf (or run as root)
# because the file is owned by root. This is authentic Linux behaviour.

# Save a copy of the original (Docker-provided) resolv.conf for reference
cp /etc/resolv.conf /etc/resolv.conf.orig 2>/dev/null || true

# Inject the broken nameserver — this is the lab's "outage" state
cat > /etc/resolv.conf << 'EOF'
# Broken DNS configuration — for Opslance Lab 03
# This nameserver does not exist and will cause all DNS lookups to time out.
nameserver 1.2.3.4
EOF

# Drop to intern user for the interactive session
# (su -s is used because we started as root)
exec su -s /bin/bash intern -c "exec tail -f /dev/null"
