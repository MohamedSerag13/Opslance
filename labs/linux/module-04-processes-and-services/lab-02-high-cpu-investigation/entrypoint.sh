#!/bin/bash
# Start a CPU-hogging yes process in the background
# It pipes to /dev/null so it spins the CPU without filling disk
yes > /dev/null &
CULPRIT_PID=$!

# Record the PID to a hidden file so check.sh can verify the student found the right one
echo "$CULPRIT_PID" > /tmp/.culprit_pid

# Keep container alive
exec tail -f /dev/null
