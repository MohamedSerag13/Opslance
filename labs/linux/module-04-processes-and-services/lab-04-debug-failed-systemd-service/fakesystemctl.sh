#!/bin/bash
# /usr/local/sbin/systemctl — fake systemctl for Opslance lab containers
#
# Backed by plain files under /var/lib/fakesystemd/. No real systemd, no
# SYS_ADMIN, no cgroup delegation needed. Supports: start, stop, restart,
# status, enable, disable, list-units --type=service, --failed.

FAKESYSTEMD_DIR="/var/lib/fakesystemd"
STATE_DIR="$FAKESYSTEMD_DIR/state"
PID_DIR="$FAKESYSTEMD_DIR/pids"
ENABLED_DIR="$FAKESYSTEMD_DIR/enabled"
TS_DIR="$FAKESYSTEMD_DIR/timestamps"
LOG_DIR="/var/log/fakesystemd"
SYSTEM_LOG="$LOG_DIR/system.log"
UNIT_DIR="/etc/systemd/system"

# Ensure runtime dirs exist (idempotent — Dockerfile already creates them)
mkdir -p "$STATE_DIR" "$PID_DIR" "$ENABLED_DIR" "$TS_DIR" "$LOG_DIR"

# ── Helpers ───────────────────────────────────────────────────────────────────

_ts() { date "+%Y-%m-%d %H:%M:%S"; }

# Append a timestamped line to both the unit log and the aggregate system log
_log() {
  local unit="$1"; shift
  local line="[$(_ts)] ${unit}: $*"
  echo "$line" >> "$LOG_DIR/${unit}.log"
  echo "$line" >> "$SYSTEM_LOG"
}

_get_state()   { cat "$STATE_DIR/$1"   2>/dev/null || echo "inactive"; }
_set_state()   { echo "$2" > "$STATE_DIR/$1"; }
_get_pid()     { cat "$PID_DIR/$1"     2>/dev/null || echo ""; }
_set_pid()     { echo "$2" > "$PID_DIR/$1"; }

# Read a single field from the .service unit file
_get_field() {
  local unit="$1" field="$2"
  grep -m1 "^${field}=" "$UNIT_DIR/${unit}.service" 2>/dev/null \
    | cut -d= -f2- | tr -d '\r'
}

# ── Verb implementations ──────────────────────────────────────────────────────

_do_start() {
  local unit="$1"
  local svc="$UNIT_DIR/${unit}.service"

  if [ ! -f "$svc" ]; then
    echo "Failed to start ${unit}.service: Unit ${unit}.service not found." >&2
    return 1
  fi

  local exec_start; exec_start=$(_get_field "$unit" "ExecStart")
  if [ -z "$exec_start" ]; then
    echo "Failed to start ${unit}.service: ExecStart= missing or empty." >&2
    _set_state "$unit" "failed"
    _log "$unit" "Failed to start: ExecStart= missing"
    return 1
  fi

  # Only check that the binary itself exists (first token of ExecStart=)
  local binary; binary=$(echo "$exec_start" | awk '{print $1}')
  if [ ! -f "$binary" ]; then
    local msg="Failed to execute command '${exec_start}': No such file or directory"
    _log "$unit" "$msg"
    _set_state "$unit" "failed"
    echo "$msg" >&2
    return 1
  fi

  local desc; desc=$(_get_field "$unit" "Description")
  echo "         Starting ${desc:-${unit}.service}..."

  # Launch ExecStart in background; stdout+stderr captured to the unit log
  bash -c "$exec_start" >> "$LOG_DIR/${unit}.log" 2>&1 &
  local pid=$!

  # Brief window: detect immediate crash (binary exited with non-zero)
  sleep 0.4
  if ! kill -0 "$pid" 2>/dev/null; then
    wait "$pid" 2>/dev/null
    local rc=$?
    local msg="Main process exited, code=exited, status=${rc}/FAILURE"
    _log "$unit" "$msg"
    _set_state "$unit" "failed"
    echo "Failed to start ${unit}.service: $msg" >&2
    return 1
  fi

  _set_pid  "$unit" "$pid"
  _set_state "$unit" "active"
  date "+%Y-%m-%dT%H:%M:%S" > "$TS_DIR/${unit}.started"

  local ok_msg="Started ${desc:-${unit}.service}."
  _log "$unit" "$ok_msg"
  echo "[ OK   ] $ok_msg"
  return 0
}

_do_stop() {
  local unit="$1"
  local svc="$UNIT_DIR/${unit}.service"

  # Honour ExecStop= if the unit file defines one (e.g. nginx -s stop)
  local exec_stop; exec_stop=$(_get_field "$unit" "ExecStop")
  if [ -n "$exec_stop" ]; then
    bash -c "$exec_stop" >> "$LOG_DIR/${unit}.log" 2>&1
  else
    local pid; pid=$(_get_pid "$unit")
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
      local i=0
      while kill -0 "$pid" 2>/dev/null && [ $i -lt 15 ]; do
        sleep 0.2; i=$((i + 1))
      done
      # Force-kill if still alive after 3 s
      kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null
    fi
  fi

  _set_pid  "$unit" ""
  _set_state "$unit" "inactive"
  _log "$unit" "Stopped ${unit}.service."
  echo "[ OK   ] Stopped ${unit}.service."
  return 0
}

_do_status() {
  local unit="$1"
  local svc="$UNIT_DIR/${unit}.service"
  local state; state=$(_get_state "$unit")
  local desc;  desc=$(_get_field  "$unit" "Description")
  local pid;   pid=$(_get_pid     "$unit")
  local enabled_label="disabled"
  [ -f "$ENABLED_DIR/$unit" ] && enabled_label="enabled"

  local loaded_info
  if [ -f "$svc" ]; then
    loaded_info="loaded ($svc; $enabled_label; vendor preset: enabled)"
  else
    loaded_info="not-found (Reason: No such file or directory)"
  fi

  echo "● ${unit}.service - ${desc:-$unit}"
  echo "     Loaded: $loaded_info"

  case "$state" in
    active)
      local since; since=$(cat "$TS_DIR/${unit}.started" 2>/dev/null || _ts)
      printf "     Active: \033[0;32mactive (running)\033[0m since %s UTC\n" "$since"
      if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        echo "    Main PID: $pid"
      fi
      ;;
    inactive)
      printf "     Active: \033[0minactive (dead)\033[0m\n"
      ;;
    failed)
      printf "     Active: \033[0;31mfailed\033[0m (Result: exit-code)\n"
      ;;
    *)
      echo "     Active: $state"
      ;;
  esac

  echo ""
  echo "$(date "+%b %d %H:%M:%S") ${unit}.service:"
  if [ -f "$LOG_DIR/${unit}.log" ]; then
    tail -n 7 "$LOG_DIR/${unit}.log" | sed 's/^/                  /'
  else
    echo "                  -- No journal entries --"
  fi
}

_list_units() {
  printf "  %-40s %-6s %-10s %-8s %s\n" "UNIT" "LOAD" "ACTIVE" "SUB" "DESCRIPTION"
  local found=0
  for svc_file in "$UNIT_DIR"/*.service; do
    [ -f "$svc_file" ] || continue
    local unit; unit=$(basename "$svc_file" .service)
    local state; state=$(_get_state "$unit")
    local desc;  desc=$(_get_field  "$unit" "Description")
    local sub
    case "$state" in
      active)   sub="running" ;;
      failed)   sub="failed"  ;;
      *)        sub="dead"    ;;
    esac
    printf "  %-40s %-6s %-10s %-8s %s\n" \
      "${unit}.service" "loaded" "$state" "$sub" "${desc:-}"
    found=1
  done
  [ "$found" -eq 0 ] && echo "  0 loaded units listed."
  echo ""
  echo "LEGEND: loaded = unit file found"
}

_list_failed() {
  printf "  %-40s %-6s %-10s %-8s %s\n" "UNIT" "LOAD" "ACTIVE" "SUB" "DESCRIPTION"
  local found=0
  for svc_file in "$UNIT_DIR"/*.service; do
    [ -f "$svc_file" ] || continue
    local unit; unit=$(basename "$svc_file" .service)
    local state; state=$(_get_state "$unit")
    if [ "$state" = "failed" ]; then
      local desc; desc=$(_get_field "$unit" "Description")
      printf "  %-40s %-6s %-10s %-8s %s\n" \
        "${unit}.service" "loaded" "failed" "failed" "${desc:-}"
      found=1
    fi
  done
  [ "$found" -eq 0 ] && echo "  0 loaded units listed. No units in failed state."
}

# ── Argument parsing ──────────────────────────────────────────────────────────
CMD=""
UNIT=""

for arg in "$@"; do
  case "$arg" in
    --failed)      CMD="--failed" ;;
    --type=*)      ;;   # ignore — we only handle services
    --since*)      ;;   # ignored (journalctl territory)
    --no-pager)    ;;
    --all)         ;;
    --*)           ;;   # silently ignore unknown flags
    *)
      if [ -z "$CMD" ]; then
        CMD="$arg"
      elif [ -z "$UNIT" ]; then
        UNIT="${arg%.service}"   # tolerate "broken-app.service" or "broken-app"
      fi
      ;;
  esac
done

# ── Dispatch ──────────────────────────────────────────────────────────────────
case "$CMD" in
  start)
    _do_start "$UNIT"
    ;;
  stop)
    _do_stop "$UNIT"
    ;;
  restart)
    _do_stop  "$UNIT" > /dev/null 2>&1
    sleep 0.3
    _do_start "$UNIT"
    ;;
  status)
    _do_status "$UNIT"
    ;;
  enable)
    touch "$ENABLED_DIR/$UNIT"
    echo "Created symlink /etc/systemd/system/multi-user.target.wants/${UNIT}.service → /etc/systemd/system/${UNIT}.service."
    ;;
  disable)
    rm -f "$ENABLED_DIR/$UNIT"
    echo "Removed /etc/systemd/system/multi-user.target.wants/${UNIT}.service."
    ;;
  list-units)
    _list_units
    ;;
  --failed)
    _list_failed
    ;;
  "")
    echo "No command given to systemctl." >&2
    exit 1
    ;;
  *)
    echo "systemctl: unrecognised command '${CMD}'" >&2
    exit 1
    ;;
esac
