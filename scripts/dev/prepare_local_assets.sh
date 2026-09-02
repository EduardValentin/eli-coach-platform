#!/usr/bin/env bash
set -euo pipefail

if [[ $# -gt 0 ]]; then
  echo "usage: prepare_local_assets.sh"
  exit 1
fi

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
APP_FILE="$ROOT_DIR/.env"
DEFAULT_ASSET_ROOT="../../local/assets"

# The app reads ASSET_ROOT relative to apps/platform, so honour whatever
# .env names rather than keeping a second copy of the path here. Falling back
# to the template's value lets this run before the env files exist.
configured_asset_root() {
  if [[ -f "$APP_FILE" ]]; then
    local configured
    configured=$(sed -n 's/^ASSET_ROOT=//p' "$APP_FILE" | tail -n 1)

    if [[ -n "$configured" ]]; then
      printf '%s' "$configured"
      return
    fi
  fi

  printf '%s' "$DEFAULT_ASSET_ROOT"
}

ASSET_ROOT=$(configured_asset_root)

if [[ "$ASSET_ROOT" != /* ]]; then
  ASSET_ROOT="$ROOT_DIR/apps/platform/$ASSET_ROOT"
fi

# The platform container refuses to start when this directory is missing, and
# that failure surfaces as an unrelated sign-in error rather than a store one.
mkdir -p "$ASSET_ROOT"

echo "local asset root ready:"
echo "  $(CDPATH= cd -- "$ASSET_ROOT" && pwd)"
