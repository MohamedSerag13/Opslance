#!/bin/bash
# /usr/local/sbin/ufw — fake ufw for Opslance lab containers
#
# Simulates ufw firewall state for training purposes.
# Rules are persisted to /var/lib/fakeufw/rules in a format that resembles
# real `ufw status` output (To/Action/From columns).
#
# Supported subcommands:
#   ufw status           — show current rule table (mimics real ufw output)
#   ufw allow PORT[/tcp] — add an ALLOW rule for the given port
#   ufw deny PORT[/tcp]  — add a DENY rule for the given port
#   ufw delete allow PORT — remove an ALLOW rule
#   ufw delete deny PORT  — remove a DENY rule
#   ufw enable           — set overall status to active
#   ufw disable          — set overall status to inactive
#   ufw reset            — clear all rules
#
# NOTE: This is a realistic SIMULATION of ufw for training purposes.
# No kernel-level netfilter rules are modified. Enforcement of allow/deny
# is handled by the lab's gatekeeper proxy process, which reads the rules
# file to decide whether to forward incoming connections.
#
# See: labs/linux/module-05-network-troubleshooting/_shared/fakeufw/

FAKEUFW_DIR="/var/lib/fakeufw"
RULES_FILE="$FAKEUFW_DIR/rules"
STATUS_FILE="$FAKEUFW_DIR/status"

# ── Ensure runtime dirs exist ─────────────────────────────────────────────────
mkdir -p "$FAKEUFW_DIR"

# Initialize status file if missing
[ -f "$STATUS_FILE" ] || echo "active" > "$STATUS_FILE"

# Initialize rules file if missing
[ -f "$RULES_FILE" ] || touch "$RULES_FILE"

# ── Helpers ───────────────────────────────────────────────────────────────────

_get_status() { cat "$STATUS_FILE" 2>/dev/null || echo "inactive"; }

_normalize_port() {
  # Strip /tcp or /udp suffix and return just the port number
  echo "$1" | sed 's|/.*||'
}

_rule_exists() {
  local action port
  action=$(echo "$1" | tr '[:lower:]' '[:upper:]')
  port=$(_normalize_port "$2")
  grep -qiE "^${port}[[:space:]].*${action}" "$RULES_FILE" 2>/dev/null
}

_add_rule() {
  local action port
  action=$(echo "$1" | tr '[:lower:]' '[:upper:]')
  port=$(_normalize_port "$2")
  # Remove any conflicting rule for the same port first
  sed -i "/^${port}[[:space:]]/d" "$RULES_FILE" 2>/dev/null || true
  printf "%-30s %-10s %s\n" "${port}" "${action}" "Anywhere" >> "$RULES_FILE"
}

_delete_rule() {
  local port
  port=$(_normalize_port "$2")
  sed -i "/^${port}[[:space:]]/d" "$RULES_FILE" 2>/dev/null || true
}

# ── Verb implementations ──────────────────────────────────────────────────────

_do_status() {
  local ufw_status; ufw_status=$(_get_status)

  if [ "$ufw_status" = "inactive" ]; then
    echo "Status: inactive"
    return 0
  fi

  echo "Status: active"
  echo ""
  printf "%-30s %-10s %s\n" "To" "Action" "From"
  printf "%-30s %-10s %s\n" "--" "------" "----"

  if [ ! -s "$RULES_FILE" ]; then
    echo "(no rules configured)"
  else
    cat "$RULES_FILE"
  fi
}

_do_allow() {
  local port; port=$(_normalize_port "$1")
  if [ -z "$port" ]; then
    echo "ERROR: port not specified" >&2
    exit 1
  fi
  _add_rule "ALLOW" "$port"
  echo "Rule added"
}

_do_deny() {
  local port; port=$(_normalize_port "$1")
  if [ -z "$port" ]; then
    echo "ERROR: port not specified" >&2
    exit 1
  fi
  _add_rule "DENY" "$port"
  echo "Rule added"
}

_do_delete() {
  local sub_action="$1" port
  port=$(_normalize_port "$2")
  if [ -z "$sub_action" ] || [ -z "$port" ]; then
    echo "ERROR: usage: ufw delete allow|deny PORT" >&2
    exit 1
  fi
  _delete_rule "$sub_action" "$port"
  echo "Rule deleted"
}

_do_enable() {
  echo "active" > "$STATUS_FILE"
  echo "Firewall is active and enabled on system startup"
}

_do_disable() {
  echo "inactive" > "$STATUS_FILE"
  echo "Firewall stopped and disabled on system startup"
}

_do_reset() {
  truncate -s 0 "$RULES_FILE"
  echo "active" > "$STATUS_FILE"
  echo "Resetting all rules to installed defaults. Proceed with operation (y|n)? y"
  echo "Backing up 'before.rules' to '/etc/ufw/before.rules.20240101_000000'"
  echo "Firewall is active and enabled on system startup"
}

# ── Argument parsing & dispatch ───────────────────────────────────────────────
CMD="$1"
shift 2>/dev/null || true

case "$CMD" in
  status)
    _do_status
    ;;
  allow)
    _do_allow "$1"
    ;;
  deny)
    _do_deny "$1"
    ;;
  delete)
    _do_delete "$1" "$2"
    ;;
  enable)
    _do_enable
    ;;
  disable)
    _do_disable
    ;;
  reset)
    _do_reset
    ;;
  ""|--help|-h)
    cat << 'HELP'
Usage: ufw COMMAND

Commands:
  enable                          enables the firewall
  disable                         disables the firewall
  status                          shows firewall status and rules
  allow PORT[/proto]              allow connections to PORT
  deny PORT[/proto]               deny connections to PORT
  delete allow|deny PORT          remove a rule
  reset                           reset firewall to defaults

Examples:
  sudo ufw allow 8080
  sudo ufw deny 8080
  sudo ufw status
  sudo ufw delete allow 8080

NOTE: This is a simulation of ufw for Opslance training labs.
      No real kernel-level firewall rules are created.
HELP
    ;;
  *)
    echo "ERROR: unknown command '${CMD}'" >&2
    echo "Run 'ufw --help' for usage." >&2
    exit 1
    ;;
esac
