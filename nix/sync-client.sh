#!/bin/bash
# trove-client.sh
# Drop on your Anbernic at /storage/.config/trove/sync.sh
# Runs on game-start (pull) and game-stop (push).
#
# Config — edit these:
SERVER="http://YOUR_TAILSCALE_IP:8080"   # your NixOS server's Tailscale IP
SAVES_DIR="/storage/roms/saves"           # adjust if different on your device
DEVICE_NAME="device1"                     # change to device2 on the second unit
EXTENSIONS="srm sav state"               # file types to sync
SENTINEL="/tmp/trove-last-pull"          # touched after each pull; push uses it as a baseline

log() { echo "[trove] $1"; }

check_server() {
  curl -sf --max-time 3 "$SERVER/api/files" > /dev/null 2>&1
}

urlencode() {
  printf '%s' "$1" | while IFS= read -r -n1 c; do
    case "$c" in
      [a-zA-Z0-9._~/-]) printf '%s' "$c" ;;
      ' ') printf '%%20' ;;
      *) printf '%%%02X' "'$c" ;;
    esac
  done
}

push_save() {
  local FILE=$1
  local REL="${FILE#$SAVES_DIR/}"
  local ENC
  ENC=$(urlencode "$REL")

  curl -sf --max-time 10 \
    -X POST \
    -H "Content-Type: application/octet-stream" \
    --data-binary "@$FILE" \
    "$SERVER/api/push/$ENC?device=$DEVICE_NAME" > /dev/null

  if [ $? -eq 0 ]; then
    log "pushed: $REL"
  else
    log "push failed: $REL"
  fi
}

pull_save() {
  local REL=$1
  local DEST="$SAVES_DIR/$REL"
  local ENC
  ENC=$(urlencode "$REL")

  mkdir -p "$(dirname "$DEST")"

  curl -sf --max-time 10 \
    -o "$DEST" \
    "$SERVER/api/pull/$ENC"

  if [ $? -eq 0 ]; then
    log "pulled: $REL"
  else
    log "pull failed (may not exist yet): $REL"
  fi
}

# ── Main ─────────────────────────────────────────────────────────────────────

DIRECTION=${1:-push}   # "push" or "pull"

if ! check_server; then
  log "server unreachable at $SERVER — skipping sync"
  exit 0
fi

if [ "$DIRECTION" = "push" ]; then
  log "pushing saves to $SERVER…"
  # Only push files changed since the last pull (or in last 5 min as fallback)
  FIND_FILTER=(-mmin -5)
  [ -f "$SENTINEL" ] && FIND_FILTER=(-newer "$SENTINEL")
  for EXT in $EXTENSIONS; do
    find "$SAVES_DIR" -maxdepth 3 -type f -name "*.${EXT}" "${FIND_FILTER[@]}" | while read -r f; do
      push_save "$f"
    done
  done
  log "push done"

elif [ "$DIRECTION" = "pull" ]; then
  log "pulling saves from $SERVER…"

  # Get list of tracked files from server (newline-separated, preserving spaces)
  while IFS= read -r REL; do
    [ -n "$REL" ] && pull_save "$REL"
  done < <(curl -sf --max-time 5 "$SERVER/api/files" | \
    grep -o '"path":"[^"]*"' | cut -d'"' -f4)

  touch "$SENTINEL"   # baseline: push will only send files newer than this
  log "pull done"
fi
