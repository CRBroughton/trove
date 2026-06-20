# Changelog

All notable changes to this project will be documented in this file.

## [0.4.4] - 2026-06-20

### Fixed

- AmberELEC Trove Trade tool entry now survives reboots via `custom_start.sh` hook
- `amberelec-install-tool.sh` recreates the Tools entry and gamelist.xml registration on each boot, since AmberELEC rsync-wipes the modules directory at startup

## [0.4.3] - 2026-06-20

### Fixed

- SSE event stream sends a keepalive ping every 30s to prevent NAT/router dropping idle connections

## [0.4.2] - 2026-06-20

### Added

- `sync.sh trade` direction: announces device and processes pending transfers in one step

### Fixed

- Trove Trade setup steps documented for both Anbernic and Brick in README
- `trade-announce` removed from game-start pull hook — announcing only makes sense when the user explicitly wants to trade
- Trade panel empty state now says "Launch Trove Trade" instead of showing a shell command

## [0.4.1] - 2026-06-20

### Fixed

- `Pending()` now returns empty arrays instead of null so JSON response is always `[]`

### Added

- Go unit tests for trade store: announce/TTL eviction, transfer state machine, SaveROM/FetchROM, wrong-device/wrong-state errors, SSE subscriber notifications
- React component tests for Modal: render, confirm, cancel, overlay dismiss
- httpyac e2e tests for full trade flow: announce, list devices, queue transfer, upload, fetch, error cases

## [0.4.0] - 2026-06-20

### Added

- ROM trading panel: dynamic device grid showing each device's ROM library
- Server brokers transfers between devices via temporary storage, no permanent ROM files kept
- SSE live updates: device presence and transfer state push instantly to the browser
- In Flight bar shows transfer state (UPLOADING / DOWNLOADING / COMPLETE) with device instructions
- Confirmation modal when sending a ROM the target device already has
- `trade-announce` sync script mode: scans ROM directory and registers device with server
- `trade-check` sync script mode: polls for pending uploads/downloads and executes them
- Trove Trade entry in EmulationStation Tools (Anbernic) and Ports (Batocera) for one-tap trading

## [0.3.1] - 2026-06-20

### Fixed

- BusyBox-compatible date parsing for mtime comparison (was silently broken on AmberELEC/Anbernic)

## [0.3.0] - 2026-06-20

### Fixed

- Sync client no longer overwrites newer local saves with older server versions
- Persistent dirty flag (survives reboot) tracks unsynced saves across power cycles
- Pull is aborted entirely if push fails, protecting local saves
- Fixed subshell bug where push failures were silently ignored
- First-run push now sends all saves instead of only files from last 5 minutes

## [0.2.0] - 2026-06-19

### Changed

- UI redesigned with neo-brutalist aesthetic: sharp corners, thick black borders, offset box-shadow, black/yellow palette
- Dark mode now uses warm charcoal tones with muted borders instead of full yellow-on-black
- Pressed button hover state: translate + shadow collapse on all interactive elements
- Download and restore buttons use yellow fill with black offset shadow

## [0.1.0] - 2026-06-19

### Added

- Git-backed save repository storing each push as a versioned commit
- HTTP API: `POST /push`, `GET /pull`, `GET /files`, `GET /history`, `POST /restore`
- Web UI: save browser with system grouping, search, dark mode, commit history panel, skeleton loading states
- NixOS module with systemd service
- AmberELEC and Batocera sync client scripts
- Multi-stage Dockerfile and Docker Compose setup
