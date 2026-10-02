#!/usr/bin/env bash
set -euo pipefail

exec "$(dirname -- "$0")/prepare_local_directory_from_env.sh" STORE_ASSET_ROOT "$@"
