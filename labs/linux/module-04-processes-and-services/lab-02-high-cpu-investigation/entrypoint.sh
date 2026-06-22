#!/bin/bash
# Start a CPU-hogging yes process in the background
# It pipes to /dev/null so it spins the CPU without filling disk
yes > /dev/null &
CULPRIT_PID=$!

# Record the PID to a hidden file so check.sh can verify the student found the right one
echo "$CULPRIT_PID" > /tmp/.culprit_pid

# Keep container alive AND act as a proper init that reaps children.
# This shell is PID 1; when the student kills the `yes` process it must be
# reaped here, otherwise it lingers as an unkillable <defunct> zombie and
# `pgrep yes` (used by check.sh) would keep matching it forever.
while true; do
  # wait -n returns as soon as any child exits, reaping the zombie.
  # When no children remain it returns immediately, so sleep to avoid a busy loop.
  wait -n 2>/dev/null
  sleep 1
done
