#!/bin/bash
# Shared scoring helpers for CKA labs. Sourced by /check.sh.
EARNED=0; TOTAL=0; TASKS=0; PASSED=0

# task <points> <title> '<bash snippet>'
task() {
  local pts="$1" title="$2" snippet="$3"
  TASKS=$((TASKS+1)); TOTAL=$((TOTAL+pts))
  if bash -c "$snippet" >/dev/null 2>&1; then
    PASSED=$((PASSED+1)); EARNED=$((EARNED+pts))
    echo "  PASS [+${pts} pts] ${title}"
  else
    echo "  FAIL [    0] ${title}"
  fi
}

# finish <threshold_percent> — mirrors the CKA pass mark
finish() {
  local thr="${1:-66}"
  local need=$(( TOTAL * thr / 100 ))
  echo ""
  echo "------------------------------------------"
  echo "Tasks passed: ${PASSED}/${TASKS}"
  echo "SCORE: ${EARNED}/${TOTAL}"
  if [ "$EARNED" -ge "$need" ]; then
    echo "Lab passed (>= ${thr}%). Submit it from the dashboard."
    exit 0
  fi
  echo "Keep going - you need ${need} pts (${thr}%) to pass."
  exit 1
}
