#!/usr/bin/env bash
set -euo pipefail

LOCAL_API_PORT="${LOCAL_API_PORT:-18080}"

exec "$(dirname "$0")/run_with_local_env.sh" env PORT="$LOCAL_API_PORT" pnpm exec tsx watch src/server.ts
