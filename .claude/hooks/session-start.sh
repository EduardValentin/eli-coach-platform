#!/bin/bash
# Provisions a Claude Code on the web container so the gates in AGENTS.md
# actually run: pnpm lint / typecheck / test / test:lighthouse, plus the
# prototype's own npm test and build.
set -euo pipefail

# Local machines already have the toolchain; this only fixes the web sandbox.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"

log() { echo "[session-start] $*"; }

# --- Node -------------------------------------------------------------------
# The sandbox ships Node 22, but package.json requires >=24.15.0 <25 and
# .node-version pins the exact release.
NODE_VERSION="$(tr -d '[:space:]' < .node-version)"
NODE_DIR="/opt/node${NODE_VERSION}"

if [ ! -x "${NODE_DIR}/bin/node" ]; then
  log "installing Node ${NODE_VERSION}"
  TARBALL="$(mktemp -d)/node.tar.xz"
  curl -fsSL --retry 3 -o "$TARBALL" \
    "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"
  mkdir -p "$NODE_DIR"
  tar -xJf "$TARBALL" -C "$NODE_DIR" --strip-components=1
  rm -rf "$(dirname "$TARBALL")"
else
  log "Node ${NODE_VERSION} already present"
fi

export PATH="${NODE_DIR}/bin:${PATH}"
log "node $(node --version)"

# --- pnpm -------------------------------------------------------------------
# packageManager in package.json is the source of truth; corepack honours it.
corepack enable >/dev/null 2>&1 || true
corepack prepare "$(node -p "require('./package.json').packageManager")" --activate >/dev/null 2>&1 || true
log "pnpm $(pnpm --version)"

# --- Workspace and prototype dependencies -----------------------------------
# The prototype sits outside the pnpm workspace and uses npm (see AGENTS.md).
log "installing workspace dependencies"
pnpm install

log "installing prototype dependencies"
(cd designs/react-reference-app && npm install --no-audit --no-fund)

# --- Local runtime files ----------------------------------------------------
# The platform build prerenders public routes, which reads the local env; a
# build fails on a missing STORE_ASSET_ROOT without this.
log "preparing local secrets"
pnpm secrets:local:prepare

# --- Docker -----------------------------------------------------------------
# Integration suites drive real Postgres and WireMock containers through
# testcontainers, which needs a running daemon.
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    log "docker already running"
  else
    log "starting docker daemon"
    (dockerd >/tmp/dockerd.log 2>&1 &)
    for _ in $(seq 1 30); do
      docker info >/dev/null 2>&1 && break
      sleep 1
    done
    docker info >/dev/null 2>&1 \
      && log "docker ready" \
      || log "WARNING: docker did not start; integration suites will not run"
  fi
else
  log "WARNING: docker not installed; integration suites will not run"
fi

# --- Persist environment for the session ------------------------------------
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PATH=\"${NODE_DIR}/bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
  # lhci looks for a system Chrome; the sandbox only has Playwright's.
  CHROME="$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1 || true)"
  if [ -n "$CHROME" ]; then
    echo "export CHROME_PATH=\"${CHROME}\"" >> "$CLAUDE_ENV_FILE"
    log "CHROME_PATH=${CHROME}"
  fi
fi

log "done"
