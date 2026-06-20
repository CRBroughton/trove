# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2026-06-20

### Fixed

- Sync client no longer overwrites newer local saves with older server versions
- BusyBox-compatible date parsing for mtime comparison on AmberELEC/Anbernic devices
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
