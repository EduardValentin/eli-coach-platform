#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: prepare_local_secret_set.sh <app_name>"
  exit 1
fi

APP_NAME="$1"
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
TERRAFORM_INFRA_DIR="${TERRAFORM_INFRA_DIR:-$ROOT_DIR/../terraform-infra}"
WORK_DIR="$TERRAFORM_INFRA_DIR/secrets/runtime/work/local-${APP_NAME}"
APP_FILE="$WORK_DIR/${APP_NAME}.app.env"
POSTGRES_FILE="$WORK_DIR/${APP_NAME}.postgres.env"
APP_TEMPLATE="$TERRAFORM_INFRA_DIR/secrets/runtime/templates/${APP_NAME}.app.env.example"
POSTGRES_TEMPLATE="$TERRAFORM_INFRA_DIR/secrets/runtime/templates/${APP_NAME}.postgres.env.example"

if [[ ! -f "$APP_TEMPLATE" || ! -f "$POSTGRES_TEMPLATE" ]]; then
  echo "missing terraform-infra runtime templates under: $TERRAFORM_INFRA_DIR/secrets/runtime/templates"
  exit 1
fi

mkdir -p "$WORK_DIR"

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
