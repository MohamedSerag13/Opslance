#!/bin/bash
# Lab 03 entrypoint — nginx is installed but NOT started.
# Fakesystemd dirs are pre-created by the Dockerfile; just keep the container alive.
exec tail -f /dev/null
