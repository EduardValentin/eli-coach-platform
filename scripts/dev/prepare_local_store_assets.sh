#!/usr/bin/env bash
set -euo pipefail

exec "$(dirname -- "$0")/prepare_local_env_directory.sh" STORE_ASSET_ROOT
