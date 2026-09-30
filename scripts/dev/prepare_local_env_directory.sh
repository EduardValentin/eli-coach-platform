#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! "$1" =~ ^[A-Z][A-Z0-9_]*$ ]]; then
  echo "usage: prepare_local_env_directory.sh <ENV_VARIABLE>"
  exit 1
fi

VARIABLE_NAME="$1"
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
PLATFORM_DIR="$ROOT_DIR/apps/platform"

value_in_env_file() {
  local env_file="$1"

  if [[ -f "$env_file" ]]; then
    sed -n "s/^${VARIABLE_NAME}=//p" "$env_file" | tail -n 1
  fi
}

directory=$(value_in_env_file "$ROOT_DIR/.env")

if [[ -z "$directory" ]]; then
  directory=$(value_in_env_file "$ROOT_DIR/.env.example")
fi

if [[ -z "$directory" ]]; then
  echo "$VARIABLE_NAME is set in neither .env nor .env.example"
  exit 1
fi

if [[ "$directory" != /* ]]; then
  directory="$PLATFORM_DIR/$directory"
fi

mkdir -p "$directory"

echo "local $VARIABLE_NAME directory ready:"
echo "  $(CDPATH= cd -- "$directory" && pwd)"
