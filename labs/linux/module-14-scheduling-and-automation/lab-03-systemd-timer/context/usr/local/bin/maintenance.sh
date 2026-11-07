#!/bin/bash
find /var/tmp -maxdepth 1 -mtime +7 -delete
echo 'maintenance complete'
