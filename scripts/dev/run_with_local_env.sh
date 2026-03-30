#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
TERRAFORM_INFRA_DIR="${TERRAFORM_INFRA_DIR:-$ROOT_DIR/../terraform-infra}"
ENV_FILE="$TERRAFORM_INFRA_DIR/secrets/runtime/work/local-eli-coach-platform/eli-coach-platform.app.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "missing local runtime env file: $ENV_FILE"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

exec "$@"
