#!/bin/bash
# Start three rogue sleep processes in the background — identical to each other
# so the student must use ps/pgrep to discover their PIDs, not guess by name
sleep 1000 &
sleep 1000 &
sleep 1000 &
# Keep container alive
exec tail -f /dev/null
