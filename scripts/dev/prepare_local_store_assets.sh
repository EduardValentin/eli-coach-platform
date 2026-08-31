#!/usr/bin/env bash
set -euo pipefail

if [[ $# -gt 0 ]]; then
  echo "usage: prepare_local_store_assets.sh"
  exit 1
fi

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
APP_FILE="$ROOT_DIR/.env"
DEFAULT_STORE_ASSET_ROOT="../../local/store-assets"

# The app reads STORE_ASSET_ROOT relative to apps/platform, so honour whatever
# .env names rather than keeping a second copy of the path here. Falling back
# to the template's value lets this run before the env files exist.
configured_store_asset_root() {
  if [[ -f "$APP_FILE" ]]; then
    local configured
    configured=$(sed -n 's/^STORE_ASSET_ROOT=//p' "$APP_FILE" | tail -n 1)

    if [[ -n "$configured" ]]; then
      printf '%s' "$configured"
      return
    fi
  fi

  printf '%s' "$DEFAULT_STORE_ASSET_ROOT"
}

STORE_ASSET_ROOT=$(configured_store_asset_root)

if [[ "$STORE_ASSET_ROOT" != /* ]]; then
  STORE_ASSET_ROOT="$ROOT_DIR/apps/platform/$STORE_ASSET_ROOT"
fi

# The platform container refuses to start when this directory is missing, and
# that failure surfaces as an unrelated sign-in error rather than a store one.
mkdir -p "$STORE_ASSET_ROOT"

echo "local store asset root ready:"
echo "  $(CDPATH= cd -- "$STORE_ASSET_ROOT" && pwd)"
