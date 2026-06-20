![trove screenshot](screenshot.png)

Self-hosted save-file sync for Anbernic and TrimUI handhelds. Runs on NixOS,
stores saves in a git working tree, and serves a web UI for browsing and
restoring history. Devices talk to it over your local network. There is no
authentication - this is intended for personal use on a trusted LAN.

> **trove v0.3.0** — early development; APIs may change.

---

## NixOS setup

Add trove as a flake input:

```nix
inputs.trove = {
  url = "github:CRBroughton/trove";
  inputs.nixpkgs.follows = "nixpkgs";
};
```

Import the module and enable the service:

```nix
imports = [ inputs.trove.nixosModules.default ];

services.trove = {
  enable      = true;
  openFirewall = true;   # exposes port on LAN
  port        = 8080;    # default; change if taken
};
```

```sh
sudo nixos-rebuild switch --flake .#hostname
systemctl status trove
```

---

## Anbernic (AmberELEC)

AmberELEC uses EmulationStation event scripts. Two hook files call `sync.sh`
on game start (pull) and game end (push).

### 1. Copy the sync script

```sh
scp nix/sync-client.sh root@DEVICE_IP:/storage/.config/trove/sync.sh
ssh root@DEVICE_IP "chmod +x /storage/.config/trove/sync.sh"
```

### 2. Edit the config at the top of `sync.sh`

```sh
SERVER="http://192.168.x.x:8080"   # LAN IP of your trove server
DEVICE_NAME="anbernic"              # unique name for this device
```

### 3. Create the event hooks

```sh
# on the Anbernic:
mkdir -p /storage/.config/emulationstation/scripts/game-start
mkdir -p /storage/.config/emulationstation/scripts/game-end
```

`/storage/.config/emulationstation/scripts/game-start/trove.sh`:
```sh
#!/bin/bash
/storage/.config/trove/sync.sh pull
```

`/storage/.config/emulationstation/scripts/game-end/trove.sh`:
```sh
#!/bin/bash
/storage/.config/trove/sync.sh push
```

```sh
chmod +x /storage/.config/emulationstation/scripts/game-start/trove.sh \
         /storage/.config/emulationstation/scripts/game-end/trove.sh
```

### 4. Test manually

```sh
/storage/.config/trove/sync.sh pull
/storage/.config/trove/sync.sh push
```

---

## TrimUI Brick (Batocera / Knulli)

Batocera calls a single dispatcher script with the event name as `$1` rather
than separate hook directories. Two files are needed under
`/userdata/system/scripts/trove/`.

### 1. Copy the sync script

```sh
scp nix/sync-client.sh root@DEVICE_IP:/userdata/system/scripts/trove/sync.sh
ssh root@DEVICE_IP "chmod +x /userdata/system/scripts/trove/sync.sh"
```

### 2. Edit the config at the top of `sync.sh`

```sh
SERVER="http://192.168.x.x:8080"   # LAN IP of your trove server
DEVICE_NAME="trimui"                # unique name for this device
```

### 3. Create the event dispatcher

`/userdata/system/scripts/trove/trove`:
```sh
#!/bin/bash
SYNC=/userdata/system/scripts/trove/sync.sh
case "$1" in
  gameStart|gameLaunch) exec "$SYNC" pull ;;
  gameStop|gameEnd)     exec "$SYNC" push ;;
esac
```

```sh
chmod +x /userdata/system/scripts/trove/trove
```

Batocera discovers any executable in `/userdata/system/scripts/<name>/` and
calls it with events like `gameStart` and `gameStop`. The dispatcher maps
these to push and pull on `sync.sh`.

### 4. Test manually

```sh
/userdata/system/scripts/trove/sync.sh pull
/userdata/system/scripts/trove/sync.sh push
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
  http://192.168.x.x:8080/api/push/gba/pokemon.srm?device=anbernic

curl http://192.168.x.x:8080/api/pull/gba/pokemon.srm -o pokemon.srm
```

---

## Docker

```sh
docker compose up -d --build
docker compose logs -f
```

Save data persists in the `trove-data` volume across rebuilds. Point `SERVER`
in your client script at the Docker host's IP.

---

## Building locally

```sh
pnpm install
pnpm -F trove-ui build
go build -o trove ./cmd/trove
./trove -repo /tmp/test-saves -addr :8080
```
