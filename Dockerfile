# ── Stage 1: Build React UI ───────────────────────────────────────────────────
FROM node:20-alpine AS ui-builder

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY ui/package.json ./ui/

RUN pnpm install --frozen-lockfile

COPY ui/ ./ui/

RUN pnpm -F trove-ui build
# outputs to internal/embed/dist/ via vite config

# ── Stage 2: Build Go binary ──────────────────────────────────────────────────
FROM golang:1.22-alpine AS go-builder

RUN apk add --no-cache git

WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY . .

COPY --from=ui-builder /app/internal/embed/dist ./internal/embed/dist

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o trove ./cmd/trove

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
# Use alpine (not scratch) because the Go binary shells out to git
FROM alpine:3.19

RUN apk add --no-cache git tzdata \
  && git config --global user.email "trove@localhost" \
  && git config --global user.name "trove"

RUN addgroup -S trove && adduser -S -G trove trove

WORKDIR /data
RUN chown trove:trove /data

COPY --from=go-builder /app/trove /usr/local/bin/trove

USER trove

EXPOSE 8080

ENTRYPOINT ["trove", "-repo", "/data/saves", "-addr", ":8080"]
