#!/bin/bash
# /usr/local/sbin/journalctl — fake journalctl for Opslance lab containers
#
# Reads log files from /var/log/fakesystemd/. Supports:
#   journalctl                  — print full aggregate log
#   journalctl -n N             — last N lines of aggregate log
#   journalctl -f               — tail -f aggregate log
#   journalctl -u <unit>        — filter to that unit's log
#   journalctl -u <unit> -n N   — last N lines of unit log
#   journalctl -u <unit> -f     — tail -f unit log
#   journalctl --since "..."    — accepted, filter silently ignored

LOG_DIR="/var/log/fakesystemd"
SYSTEM_LOG="$LOG_DIR/system.log"

UNIT=""
LINES=""
FOLLOW=0

# ── Parse arguments ───────────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
  case "$1" in
    -u|--unit)
      shift
      UNIT="${1%.service}"
      ;;
    -u=*|--unit=*)
      UNIT="${1#*=}"
      UNIT="${UNIT%.service}"
      ;;
    -n)
      shift
      LINES="$1"
      ;;
    -n[0-9]*)
      LINES="${1#-n}"
      ;;
    -f|--follow)
      FOLLOW=1
      ;;
    --since|--until|--output|--priority)
      shift   # consume the value argument — filter is accepted but ignored
      ;;
    --since=*|--until=*|--output=*|--priority=*)
      ;;      # inline-value form — just skip
    --no-pager|--no-hostname|--all)
      ;;      # cosmetic flags — ignore
    -*)
      ;;      # any other flag — silently ignore
  esac
  shift
done

# ── Select log file ───────────────────────────────────────────────────────────
if [ -n "$UNIT" ]; then
  LOG_FILE="$LOG_DIR/${UNIT}.log"
else
  LOG_FILE="$SYSTEM_LOG"
fi

if [ ! -f "$LOG_FILE" ]; then
  echo "-- No journal entries --"
  exit 0
fi

# ── Emit output ───────────────────────────────────────────────────────────────
if [ "$FOLLOW" -eq 1 ]; then
  exec tail -f "$LOG_FILE"
elif [ -n "$LINES" ]; then
  tail -n "$LINES" "$LOG_FILE"
else
  cat "$LOG_FILE"
fi
