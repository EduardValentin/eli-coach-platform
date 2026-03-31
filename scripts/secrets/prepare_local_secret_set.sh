#!/usr/bin/env bash
set -euo pipefail

if [[ $# -gt 1 ]]; then
  echo "usage: prepare_local_secret_set.sh [app_name]"
  exit 1
fi

APP_NAME="${1:-eli-coach-platform}"
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
APP_FILE="$ROOT_DIR/.env"
POSTGRES_FILE="$ROOT_DIR/.env.postgres"
APP_TEMPLATE="$ROOT_DIR/.env.example"
POSTGRES_TEMPLATE="$ROOT_DIR/.env.postgres.example"

if [[ ! -f "$APP_TEMPLATE" || ! -f "$POSTGRES_TEMPLATE" ]]; then
  echo "missing local env templates in repo root"
  exit 1
fi

if [[ "$APP_NAME" != "eli-coach-platform" ]]; then
  echo "unsupported app name: $APP_NAME"
  exit 1
fi

if [[ ! -f "$APP_FILE" ]]; then
  cp "$APP_TEMPLATE" "$APP_FILE"
fi

if [[ ! -f "$POSTGRES_FILE" ]]; then
  cp "$POSTGRES_TEMPLATE" "$POSTGRES_FILE"
fi

chmod 600 "$APP_FILE" "$POSTGRES_FILE"

echo "local runtime files ready:"
echo "  $APP_FILE"
echo "  $POSTGRES_FILE"
