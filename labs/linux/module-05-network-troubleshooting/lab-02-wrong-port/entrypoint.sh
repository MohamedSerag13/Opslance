#!/bin/bash
# Lab 02 entrypoint — start http server on WRONG port (8081, not 8080).
# The app is fine; it's just listening on the wrong port.
python3 -m http.server 8081 &
exec tail -f /dev/null
