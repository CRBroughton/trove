default:
    just --list

# Build the UI then the Go binary
build: ui-build
    go build -o trove ./cmd/trove

# Build the React UI into internal/embed/dist/
ui-build:
    pnpm build

# Run the Go server (UI must be built first)
dev:
    go run ./cmd/trove -repo /tmp/trove-dev-saves

# Run the Vite dev server (proxies /api to :8080)
ui-dev:
    pnpm dev

# Run all tests
test: test-go test-ui

# Run Go tests
test-go:
    go test ./internal/...

# Run frontend unit tests
test-ui:
    pnpm test

# TypeScript strict check
typecheck:
    pnpm typecheck

# Run all linters
lint: lint-go lint-ui

# Run golangci-lint
lint-go:
    golangci-lint run ./...

# Run ESLint (antfu config)
lint-ui:
    pnpm lint

# Run end-to-end API tests — builds binary, spins up a fresh server, cleans up after
# Usage: just e2e [env]   e.g. just e2e tailscale
e2e env="local":
    #!/usr/bin/env bash
    set -euo pipefail
    go build -o trove ./cmd/trove
    REPO=$(mktemp -d)
    ./trove -repo "$REPO" -addr :8765 &
    SERVER_PID=$!
    cleanup() {
        kill "$SERVER_PID" 2>/dev/null || true
        rm -rf "$REPO"
    }
    trap cleanup EXIT
    sleep 0.5
    httpyac run e2e/*.http --env {{env}} --all --var baseUrl=http://localhost:8765

# Seed the server with fake saves for UI development
# Usage: just seed [addr]   e.g. just seed http://trove:8080
seed addr="http://localhost:8080":
    #!/usr/bin/env bash
    set -euo pipefail
    push() {
        local path=$1 device=$2 body=$3
        curl -sf -X POST \
            -H "Content-Type: application/octet-stream" \
            --data-binary "$body" \
            "{{addr}}/api/push/$path?device=$device" > /dev/null
        echo "  pushed $path ($device)"
    }
    echo "Seeding {{addr}}…"

    # GBA — pokemon has deep history, others single commit
    push gba/pokemon-emerald.srm    device1 "PKMN_EMERALD_SAVE_V1_BADGE2"
    push gba/pokemon-emerald.srm    device1 "PKMN_EMERALD_SAVE_V2_BADGE5"
    push gba/pokemon-emerald.srm    device2 "PKMN_EMERALD_SAVE_V3_BADGE8"
    push gba/pokemon-firered.srm    device1 "PKMN_FIRERED_SAVE_V1"
    push gba/pokemon-firered.srm    device1 "PKMN_FIRERED_SAVE_V2"
    push gba/golden-sun.srm         device1 "GOLDEN_SUN_SAVE_V1"
    push gba/mother3.srm            device1 "MOTHER3_SAVE_V1"

    # GBC
    push gbc/pokemon-crystal.srm    device1 "PKMN_CRYSTAL_SAVE_V1"
    push gbc/pokemon-crystal.srm    device2 "PKMN_CRYSTAL_SAVE_V2"
    push gbc/links-awakening.srm    device1 "LINKS_AWAKENING_SAVE_V1"

    # SNES
    push snes/chrono-trigger.srm    device1 "CT_SAVE_V1_CHAPTER3"
    push snes/chrono-trigger.srm    device1 "CT_SAVE_V2_CHAPTER6"
    push snes/super-metroid.srm     device1 "SMETROID_SAVE_V1"
    push snes/super-metroid.srm     device2 "SMETROID_SAVE_V2"
    push snes/earthbound.srm        device1 "EARTHBOUND_SAVE_V1"

    # N64
    push n64/zelda-ocarina.srm      device1 "OOT_SAVE_V1_FOREST"
    push n64/zelda-ocarina.srm      device1 "OOT_SAVE_V2_WATER"
    push n64/zelda-ocarina.srm      device1 "OOT_SAVE_V3_SHADOW"
    push n64/paper-mario.srm        device1 "PAPER_MARIO_SAVE_V1"

    # PSX
    push psx/final-fantasy-vii.sav  device1 "FF7_SAVE_V1_MIDGAR"
    push psx/final-fantasy-vii.sav  device1 "FF7_SAVE_V2_KALM"
    push psx/castlevania-sotn.sav   device1 "SOTN_SAVE_V1"

    # NDS
    push nds/pokemon-platinum.sav   device1 "PKMN_PLATINUM_SAVE_V1"
    push nds/pokemon-platinum.sav   device1 "PKMN_PLATINUM_SAVE_V2"
    push nds/ghost-trick.sav        device1 "GHOST_TRICK_SAVE_V1"

    echo "Done — $(curl -sf {{addr}}/api/files | grep -o '"path"' | wc -l) files tracked"

# Remove build output
clean:
    rm -f trove
    rm -rf internal/embed/dist/*
    git checkout -- internal/embed/dist/index.html
