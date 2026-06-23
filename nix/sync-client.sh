#!/bin/bash
# trove-client.sh
# Drop on your Anbernic at /storage/.config/trove/sync.sh
# Runs on game-start (pull) and game-stop (push).
#
# Config — edit these:
SERVER="http://YOUR_TAILSCALE_IP:8080"   # your NixOS server's Tailscale IP
SAVES_DIR="/storage/roms/saves"           # adjust if different on your device
ROMS_DIR="/storage/roms"                  # ROM root for trade-announce (set to "" to disable trading)
DEVICE_NAME="device1"                     # change to device2 on the second unit
EXTENSIONS="srm sav state"               # file types to sync
ROM_EXTENSIONS="gba gbc gb nes snes smd gen smc n64 z64 pce nds"   # ROM types to announce (md excluded — clashes with Markdown)
SENTINEL="/storage/.config/trove/last-pull"   # touched after each pull
PUSH_SENTINEL="/storage/.config/trove/last-push"  # touched after each successful push; push uses this as baseline
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

ensure_tools_entry() {
  local TOOLS_DIR="/storage/.config/distribution/modules"
  local ENTRY="$TOOLS_DIR/Trove Trade.sh"
  local GAMELIST="$TOOLS_DIR/gamelist.xml"
  [ -d "$TOOLS_DIR" ] || return  # not AmberELEC, skip

  if [ ! -f "$ENTRY" ]; then
    printf '#!/bin/bash\n%s trade\n' "$0" > "$ENTRY"
    chmod +x "$ENTRY"
    log "reinstalled Trove Trade tool entry"
  fi

  if [ -f "$GAMELIST" ] && ! grep -q "Trove Trade" "$GAMELIST"; then
    sed -i "s|</gameList>|\t<game>\n\t\t<path>./Trove Trade.sh</path>\n\t\t<name>Trove Trade</name>\n\t\t<desc>Announce ROM library and process pending trades.</desc>\n\t\t<developer>trove</developer>\n\t\t<publisher>trove</publisher>\n\t\t<rating>1.0</rating>\n\t\t<releasedate>2026</releasedate>\n\t\t<genre>Script</genre>\n\t</game>\n</gameList>|" "$GAMELIST"
    log "reinstalled Trove Trade gamelist entry"
  fi
}

trade_announce() {
  [ -z "$ROMS_DIR" ] && { log "ROMS_DIR not set — skipping trade announce"; return; }
  [ -d "$ROMS_DIR" ] || { log "ROMS_DIR not found: $ROMS_DIR"; return; }

  # Build JSON array of ROM entries
  JSON='{"device":"'"$DEVICE_NAME"'","roms":['
  FIRST=true
  for EXT in $ROM_EXTENSIONS; do
    while IFS= read -r f; do
      REL="${f#$ROMS_DIR/}"
      NAME=$(basename "$f")
      SIZE=$(wc -c < "$f" 2>/dev/null | awk '{print $1+0}' || echo 0)
      $FIRST || JSON="$JSON,"
      JSON="$JSON{\"name\":\"$NAME\",\"path\":\"$REL\",\"size\":$SIZE}"
      FIRST=false
    done < <(find "$ROMS_DIR" -maxdepth 3 -type f -name "*.${EXT}")
  done
  JSON="$JSON]}"

  curl -sf --max-time 5 \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$JSON" \
    "$SERVER/api/trade/announce" > /dev/null && log "trade: announced to $SERVER" || log "trade: announce failed"
}

trade_check() {
  [ -z "$ROMS_DIR" ] && return

  PENDING=$(curl -sf --max-time 5 "$SERVER/api/trade/pending?device=$DEVICE_NAME")
  [ -z "$PENDING" ] && return

  # Extract the uploads section (between "uploads":[ and the matching ])
  UPLOADS_SECTION=$(echo "$PENDING" | grep -o '"uploads":\[[^]]*\]' | grep -o '\[.*\]')
  DOWNLOADS_SECTION=$(echo "$PENDING" | grep -o '"downloads":\[[^]]*\]' | grep -o '\[.*\]')

  # Handle uploads — source device pushes ROM to server
  if [ -n "$UPLOADS_SECTION" ] && [ "$UPLOADS_SECTION" != "[]" ]; then
    echo "$UPLOADS_SECTION" | grep -o '"id":"[^"]*","rom_path":"[^"]*"' | \
    while IFS= read -r entry; do
      ID=$(echo "$entry" | cut -d'"' -f4)
      ROM_PATH=$(echo "$entry" | grep -o '"rom_path":"[^"]*"' | cut -d'"' -f4)
      SRC="$ROMS_DIR/$ROM_PATH"
      if [ -f "$SRC" ]; then
        ENC=$(urlencode "$ROM_PATH")
        curl -sf --max-time 120 \
          -X POST \
          -H "Content-Type: application/octet-stream" \
          --data-binary "@$SRC" \
          "$SERVER/api/trade/upload/$ENC?transfer=$ID" > /dev/null \
          && log "trade: uploaded $ROM_PATH (transfer $ID)" \
          || log "trade: upload failed for $ROM_PATH"
      else
        log "trade: ROM not found locally: $SRC"
      fi
    done
  fi

  # Handle downloads — target device fetches ROM from server
  if [ -n "$DOWNLOADS_SECTION" ] && [ "$DOWNLOADS_SECTION" != "[]" ]; then
    echo "$DOWNLOADS_SECTION" | grep -o '"id":"[^"]*","rom_path":"[^"]*"' | \
    while IFS= read -r entry; do
      ID=$(echo "$entry" | cut -d'"' -f4)
      ROM_PATH=$(echo "$entry" | grep -o '"rom_path":"[^"]*"' | cut -d'"' -f4)
      DEST="$ROMS_DIR/$ROM_PATH"
      ENC=$(urlencode "$ROM_PATH")
      mkdir -p "$(dirname "$DEST")"
      curl -sf --max-time 120 \
        -o "$DEST" \
        "$SERVER/api/trade/fetch/$ENC?transfer=$ID&device=$DEVICE_NAME" \
        && log "trade: received $ROM_PATH (transfer $ID)" \
        || log "trade: download failed for $ROM_PATH"
    done
  fi
}

# ── Main ─────────────────────────────────────────────────────────────────────

DIRECTION=${1:-push}   # "push", "pull", "trade", "trade-announce", or "trade-check"

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

if [ "$DIRECTION" = "trade" ]; then
  trade_announce
  trade_check
  exit 0

elif [ "$DIRECTION" = "trade-announce" ]; then
  trade_announce
  exit 0

elif [ "$DIRECTION" = "trade-check" ]; then
  trade_check
  exit 0

elif [ "$DIRECTION" = "push" ]; then
  log "pushing saves to $SERVER…"
  FIND_FILTER=()
  [ -f "$PUSH_SENTINEL" ] && FIND_FILTER=(-newer "$PUSH_SENTINEL")
  if push_changed_files "${FIND_FILTER[@]}"; then
    touch "$PUSH_SENTINEL"
    rm -f "$DIRTY"
  else
    touch "$DIRTY"
    log "some pushes failed — will retry on next sync"
  fi
  log "push done"

elif [ "$DIRECTION" = "pull" ]; then
  ensure_tools_entry
  # If there are unpushed local changes, push them first before pulling
  if [ -f "$DIRTY" ]; then
    log "unpushed changes detected — pushing before pull…"
    FIND_FILTER=()
    [ -f "$PUSH_SENTINEL" ] && FIND_FILTER=(-newer "$PUSH_SENTINEL")
    if push_changed_files "${FIND_FILTER[@]}"; then
      touch "$PUSH_SENTINEL"
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
    SERVER_MTIME=$(date -D "%Y-%m-%dT%H:%M:%S" -d "${MOD%%.*}" +%s 2>/dev/null \
      || date -d "$MOD" +%s 2>/dev/null \
      || date -j -f "%Y-%m-%dT%H:%M:%S" "${MOD%%.*}" +%s 2>/dev/null)
    [ -n "$REL" ] && pull_save "$REL" "$SERVER_MTIME"
  done

  touch "$SENTINEL"
  log "pull done"
fi
