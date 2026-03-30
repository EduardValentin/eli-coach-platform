#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
LOCAL_POSTGRES_PORT="${LOCAL_POSTGRES_PORT:-55433}"
LOCAL_API_PORT="${LOCAL_API_PORT:-18080}"
DESIGN_REFERENCE_PORT="${DESIGN_REFERENCE_PORT:-4173}"
INCLUDE_DESIGN_REFERENCE="${INCLUDE_DESIGN_REFERENCE:-1}"

PIDS=()

cleanup() {
  for pid in "${PIDS[@]}"; do
    kill "$pid" >/dev/null 2>&1 || true
  done

  wait || true
}

trap cleanup EXIT INT TERM

start_service() {
  local name="$1"
  shift

  (
    cd "$ROOT_DIR"
    exec "$@"
  ) > >(
    while IFS= read -r line; do
      printf '[%s] %s\n' "$name" "$line"
    done
  ) 2>&1 &

  PIDS+=("$!")
}

pnpm --dir "$ROOT_DIR" secrets:local:prepare >/dev/null
LOCAL_POSTGRES_PORT="$LOCAL_POSTGRES_PORT" pnpm --dir "$ROOT_DIR" docker:local:up >/dev/null

start_service api env LOCAL_API_PORT="$LOCAL_API_PORT" pnpm dev:api
start_service worker pnpm dev:worker
start_service www pnpm dev:www
start_service client pnpm dev:client
start_service coach pnpm dev:coach

if [[ "$INCLUDE_DESIGN_REFERENCE" == "1" ]]; then
  start_service design npm --prefix "$ROOT_DIR/designs/react-reference-app" run dev -- --host 0.0.0.0 --port "$DESIGN_REFERENCE_PORT"
fi

cat <<EOF
Local stack is starting.

- www: http://localhost:3000
- client: http://localhost:3001
- coach: http://localhost:3002
- api: http://localhost:${LOCAL_API_PORT}
- postgres: postgresql://127.0.0.1:${LOCAL_POSTGRES_PORT}
EOF

if [[ "$INCLUDE_DESIGN_REFERENCE" == "1" ]]; then
  echo "- design reference: http://localhost:${DESIGN_REFERENCE_PORT}"
fi

echo
echo "Press Ctrl+C to stop the foreground processes. Postgres keeps running until you call 'pnpm docker:local:down'."

while true; do
  for pid in "${PIDS[@]}"; do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      wait "$pid"
      exit $?
    fi
  done

  sleep 1
done
