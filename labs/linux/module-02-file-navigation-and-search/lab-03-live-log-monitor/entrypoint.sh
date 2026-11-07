#!/bin/bash
/usr/local/bin/log_writer.sh &
tail -f /dev/null
