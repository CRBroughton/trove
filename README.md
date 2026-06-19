Self-hosted save-file sync for Anbernic and TrimUI handhelds. Runs on NixOS,
stores saves in a git working tree, and serves a web UI for browsing and
restoring history. Devices talk to it over Tailscale.

> **trove v0.1.0** — early development; APIs may change.

---

## NixOS setup

Add trove as a flake input:

```nix
inputs.trove = {
  url = "github:crbroughton/trove";
  inputs.nixpkgs.follows = "nixpkgs";
};
```

Import the module and enable the service:

```nix
imports = [ inputs.trove.nixosModules.default ];

services.trove = {
  enable      = true;
  openFirewall = true;
};
```

```sh
sudo nixos-rebuild switch --flake .#hostname
systemctl status trove
```

---

## Client setup

Copy the client script to each device:

```sh
# Anbernic (AmberELEC)
scp nix/sync-client.sh root@DEVICE_IP:/storage/.config/trove/sync.sh
ssh root@DEVICE_IP chmod +x /storage/.config/trove/sync.sh
```

Edit the config block at the top of `sync.sh`:

```sh
SERVER="http://100.x.x.x:8080"   # Tailscale IP of your NixOS machine
DEVICE_NAME="device1"             # unique per device
```

### AmberELEC hooks

```sh
# /storage/.config/emulationstation/scripts/game-start/trove.sh
#!/bin/bash
/storage/.config/trove/sync.sh pull
```

```sh
# /storage/.config/emulationstation/scripts/game-end/trove.sh
#!/bin/bash
/storage/.config/trove/sync.sh push
```

### Batocera / Knulli hooks

```sh
# /userdata/system/scripts/trove/trove
#!/bin/bash
SYNC=/userdata/system/scripts/trove/sync.sh
case "$1" in
  gameStart|gameLaunch) exec "$SYNC" pull ;;
  gameStop|gameEnd)     exec "$SYNC" push ;;
esac
```

---

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/files` | List all tracked saves |
| POST | `/api/push/<path>?device=<name>` | Upload a save |
| GET | `/api/pull/<path>` | Download the latest save |
| GET | `/api/history/<path>` | Git commit log for a save |
| POST | `/api/restore/<path>?hash=<sha>` | Restore to a previous commit |

```sh
curl -X POST --data-binary @pokemon.srm \
  http://100.x.x.x:8080/api/push/gba/pokemon.srm?device=device1

curl http://100.x.x.x:8080/api/pull/gba/pokemon.srm -o pokemon.srm
```

---

## Docker

```sh
docker compose up -d --build
docker compose logs -f
```

Save data persists in the `trove-data` volume across rebuilds. Point `SERVER`
in your client script at the Docker host's IP or Tailscale address.

---

## Building locally

```sh
pnpm install
pnpm -F trove-ui build
go build -o trove ./cmd/trove
./trove -repo /tmp/test-saves -addr :8080
```
