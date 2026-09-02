#!/bin/bash
# SessionStart hook for Claude Code on the web.
#
# Remote sessions start from a bare container, so this provisions everything
# the repository's own commands assume: the Node version pinned in
# .node-version, the pnpm pinned in package.json, workspace dependencies, a
# running Docker daemon (testcontainers integration suites and
# docker-compose.local.yml both need one), the container images those suites
# pull, the local env files the app boots from, and a Chrome binary for
# Lighthouse. The container snapshot is cached after the hook completes, so
# the expensive steps run once and later sessions re-run this as a fast no-op.
set -euo pipefail

# Local sessions use the developer's own machine setup.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$REPO_ROOT"

log() { printf 'session-start: %s\n' "$*"; }
warn() { printf 'session-start: WARNING: %s\n' "$*" >&2; }

# Appends an export to the file the session sources for every command, so
# tools Claude runs later see the same environment this script sets up.
persist_env_line() {
  local line="$1"
  if [ -n "${CLAUDE_ENV_FILE:-}" ] && ! grep -qxF -- "$line" "$CLAUDE_ENV_FILE" 2>/dev/null; then
    printf '%s\n' "$line" >>"$CLAUDE_ENV_FILE"
  fi
}

# --- Node + pnpm ------------------------------------------------------------

NODE_VERSION="$(tr -d '[:space:]' <.node-version)"
export NVM_DIR="${NVM_DIR:-/opt/nvm}"

if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  warn "nvm not found at $NVM_DIR; cannot install Node $NODE_VERSION"
  exit 1
fi

# nvm.sh is not `set -u` clean.
set +u
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh" --no-use
nvm install "$NODE_VERSION" >/dev/null
NODE_BIN="$(dirname "$(nvm which "$NODE_VERSION")")"
set -u

export PATH="$NODE_BIN:$PATH"
persist_env_line "export PATH=\"$NODE_BIN:\$PATH\""
log "node $(node --version) at $NODE_BIN"

PNPM_VERSION="$(node -p "require('./package.json').packageManager.split('@')[1]")"
if ! command -v pnpm >/dev/null 2>&1 || [ "$(pnpm --version)" != "$PNPM_VERSION" ]; then
  npm install --global "pnpm@${PNPM_VERSION}" >/dev/null
fi
log "pnpm $(pnpm --version)"

# --- Workspace dependencies -------------------------------------------------

pnpm install --frozen-lockfile
log "workspace dependencies installed"

# The design reference app sits outside the pnpm workspace and uses npm.
npm install --prefix designs/react-reference-app --no-audit --no-fund
log "design reference dependencies installed"

# --- Docker daemon ----------------------------------------------------------
# Integration tests drive real Postgres/WireMock containers via testcontainers,
# and `pnpm dev:all` starts Postgres through docker-compose.local.yml.

# Image pulls happen in the daemon, so it needs the sandbox egress proxy; the
# proxy's CA is already in the system trust store. The proxy port is
# per-session while /etc/docker/daemon.json survives in the cached snapshot,
# so rewrite it on drift and bounce an already-running daemon.
if [ -n "${HTTPS_PROXY:-}" ]; then
  mkdir -p /etc/docker
  desired_docker_config="$(cat <<JSON
{
  "proxies": {
    "http-proxy": "${HTTPS_PROXY}",
    "https-proxy": "${HTTPS_PROXY}",
    "no-proxy": "${NO_PROXY:-localhost,127.0.0.1}"
  }
}
JSON
)"
  if [ "$(cat /etc/docker/daemon.json 2>/dev/null)" != "$desired_docker_config" ]; then
    printf '%s\n' "$desired_docker_config" >/etc/docker/daemon.json
    if docker info >/dev/null 2>&1; then
      pkill -x dockerd || true
      for _ in $(seq 1 15); do
        if ! docker info >/dev/null 2>&1; then break; fi
        sleep 1
      done
    fi
  fi
fi

if ! docker info >/dev/null 2>&1; then
  # The cached snapshot can carry pid files from a previous boot; dockerd then
  # believes its managed containerd is already running, waits for a socket
  # nothing serves, and gives up. Clear them when no daemon is actually alive.
  if ! pgrep -x dockerd >/dev/null && ! pgrep -x containerd >/dev/null; then
    rm -f /var/run/docker.pid /var/run/docker/containerd/containerd.pid
  fi

  # `service docker start` fails in the sandbox on a forbidden ulimit call, so
  # launch the daemon directly.
  nohup dockerd >/var/log/dockerd.log 2>&1 &
  for _ in $(seq 1 30); do
    if docker info >/dev/null 2>&1; then break; fi
    sleep 1
  done
fi

if docker info >/dev/null 2>&1; then
  log "docker daemon ready"

  pull_image() {
    if [ -z "$1" ]; then return 0; fi
    docker image inspect "$1" >/dev/null 2>&1 && return 0
    docker pull "$1" >/dev/null 2>&1 || warn "could not pre-pull $1"
  }

  # The images the integration suites and the local compose stack start, plus
  # the reaper testcontainers itself launches. Pre-pulling bakes them into the
  # cached snapshot so test runs never wait on a download.
  pull_image "$(tr -d '[:space:]' <docker/postgres-runtime-base-image.txt)"
  pull_image "$(awk '/image:/ {print $2; exit}' docker-compose.local.yml)"
  pull_image "$(sed -n 's/^const WIRE_MOCK_IMAGE = "\(.*\)";$/\1/p' apps/platform/integration-test-config/wire-mock/wire-mock-container.ts)"
  pull_image "$(grep -rhoE 'testcontainers/ryuk:[0-9.]+' node_modules/testcontainers/build 2>/dev/null | head -1)"
  log "test container images present"
else
  warn "docker daemon failed to start (see /var/log/dockerd.log); integration tests and 'pnpm dev:all' will not work"
fi

# --- Local runtime files ----------------------------------------------------
# Creates .env / .env.postgres from the templates and the asset root the
# platform container checks at startup, so db scripts and the dev server boot
# without manual steps.

pnpm secrets:local:prepare >/dev/null
pnpm assets:local:prepare >/dev/null
log "local env files and asset root ready"

# --- Session environment ----------------------------------------------------

# Lighthouse (chrome-launcher) and the terms PDF renderer need a browser; the
# sandbox ships Chromium for Playwright at this path.
persist_env_line 'export CHROME_PATH="/opt/pw-browsers/chromium"'
persist_env_line 'export PUPPETEER_EXECUTABLE_PATH="/opt/pw-browsers/chromium"'

# Node's fetch ignores HTTPS_PROXY unless asked; without this the dev-mode app
# cannot reach real third parties (e.g. Turnstile siteverify) from the sandbox.
# Local and container addresses are in NO_PROXY, so tests are unaffected.
persist_env_line 'export NODE_USE_ENV_PROXY=1'

log "done"
