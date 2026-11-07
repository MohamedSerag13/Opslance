#!/bin/bash
URL="http://localhost:8080/health"
curl -s -o /dev/null -w "%{http_code}" "$URL"
echo
