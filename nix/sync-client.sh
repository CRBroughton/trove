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
SENTINEL="/storage/.config/trove/last-pull"   # touched after each pull; push uses it as a baseline
DIRTY="/storage/.config/trove/dirty"         # exists when unpushed changes are present

mkdir -p "$(dirname "$SENTINEL")"

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
    return 0
  else
    log "push failed: $REL"
    return 1
  fi
}

pull_save() {
  local REL=$1
  local SERVER_MTIME=$2
  local DEST="$SAVES_DIR/$REL"
  local ENC
  ENC=$(urlencode "$REL")

  # If local file exists and is newer than the server version, keep local copy
  if [ -f "$DEST" ] && [ -n "$SERVER_MTIME" ]; then
    local LOCAL_MTIME
    LOCAL_MTIME=$(date -r "$DEST" +%s 2>/dev/null || stat -c %Y "$DEST" 2>/dev/null)
    if [ -n "$LOCAL_MTIME" ] && [ "$LOCAL_MTIME" -gt "$SERVER_MTIME" ]; then
      log "skipped pull (local newer): $REL"
      touch "$DIRTY"
      return
    fi
  fi

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
  # Mark dirty so next game-start will push before pulling
  [ "$DIRECTION" = "push" ] && touch "$DIRTY"
  exit 0
fi

push_changed_files() {
  local FIND_FILTER=("$@")
  local PUSH_OK=true
  while IFS= read -r f; do
    push_save "$f" || PUSH_OK=false
  done < <(for EXT in $EXTENSIONS; do
    find "$SAVES_DIR" -maxdepth 3 -type f -name "*.${EXT}" "${FIND_FILTER[@]}"
  done)
  $PUSH_OK
}

if [ "$DIRECTION" = "push" ]; then
  log "pushing saves to $SERVER…"
  FIND_FILTER=()
  [ -f "$SENTINEL" ] && FIND_FILTER=(-newer "$SENTINEL")
  if push_changed_files "${FIND_FILTER[@]}"; then
    rm -f "$DIRTY"
  else
    touch "$DIRTY"
    log "some pushes failed — will retry on next sync"
  fi
  log "push done"

elif [ "$DIRECTION" = "pull" ]; then
  # If there are unpushed local changes, push them first before pulling
  if [ -f "$DIRTY" ]; then
    log "unpushed changes detected — pushing before pull…"
    FIND_FILTER=()   # push all saves if no sentinel
    [ -f "$SENTINEL" ] && FIND_FILTER=(-newer "$SENTINEL")
    if push_changed_files "${FIND_FILTER[@]}"; then
      rm -f "$DIRTY"
    else
      log "push still failing — pull aborted to protect local saves"
      exit 1
    fi
  fi

  log "pulling saves from $SERVER…"

  # Fetch file list with mod times from server
  FILE_JSON=$(curl -sf --max-time 5 "$SERVER/api/files")

  # Pull each file, passing server mod_time for comparison
  echo "$FILE_JSON" | grep -o '"path":"[^"]*","[^}]*"mod_time":"[^"]*"' | \
  while IFS= read -r entry; do
    REL=$(echo "$entry" | grep -o '"path":"[^"]*"' | cut -d'"' -f4)
    MOD=$(echo "$entry" | grep -o '"mod_time":"[^"]*"' | cut -d'"' -f4)
    SERVER_MTIME=$(date -d "$MOD" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "${MOD%%.*}" +%s 2>/dev/null)
    [ -n "$REL" ] && pull_save "$REL" "$SERVER_MTIME"
  done

  touch "$SENTINEL"
  log "pull done"
fi
