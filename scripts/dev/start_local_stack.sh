#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
LOCAL_POSTGRES_PORT="${LOCAL_POSTGRES_PORT:-55437}"
DESIGN_REFERENCE_PORT="${DESIGN_REFERENCE_PORT:-4173}"
INCLUDE_DESIGN_REFERENCE="${INCLUDE_DESIGN_REFERENCE:-1}"

env_value() {
  awk -v key="$1" '
    index($0, key "=") == 1 {
      value = substr($0, length(key) + 2)
      gsub(/^["\047]|["\047]$/, "", value)
    }
    END { print value }
  ' "$ROOT_DIR/.env"
}

require_matching_stripe_relay() {
  if ! command -v stripe >/dev/null 2>&1; then
    echo "PAYMENTS_PROVIDER=stripe relays webhooks through the Stripe CLI, which is not installed. Install it with 'brew install stripe/stripe-cli/stripe' and run 'stripe login'." >&2
    exit 1
  fi

  local relay_secret
  relay_secret=$(stripe listen --api-key "$STRIPE_SECRET_KEY" --print-secret 2>/dev/null || true)

  if [[ -z "$relay_secret" || "$relay_secret" != "$STRIPE_WEBHOOK_SIGNING_SECRET" ]]; then
    echo "The signing secret in .env does not match this key; set STRIPE_WEBHOOK_SIGNING_SECRET to the output of 'stripe listen --api-key <key> --print-secret'." >&2
    exit 1
  fi
}

pnpm --dir "$ROOT_DIR" secrets:local:prepare >/dev/null

PAYMENTS_PROVIDER=$(env_value PAYMENTS_PROVIDER)
STRIPE_SECRET_KEY=$(env_value STRIPE_SECRET_KEY)
STRIPE_WEBHOOK_SIGNING_SECRET=$(env_value STRIPE_WEBHOOK_SIGNING_SECRET)

if [[ "$PAYMENTS_PROVIDER" == "stripe" ]]; then
  require_matching_stripe_relay
fi

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

pnpm --dir "$ROOT_DIR" store:assets:local:prepare >/dev/null
pnpm --dir "$ROOT_DIR" client:media:local:prepare >/dev/null
pnpm --dir "$ROOT_DIR" client:resources:local:prepare >/dev/null
LOCAL_POSTGRES_PORT="$LOCAL_POSTGRES_PORT" pnpm --dir "$ROOT_DIR" docker:local:up >/dev/null
LOCAL_POSTGRES_PORT="$LOCAL_POSTGRES_PORT" pnpm --dir "$ROOT_DIR" db:setup:local >/dev/null

start_service platform env DATABASE_PORT="$LOCAL_POSTGRES_PORT" pnpm dev:platform

if [[ "$PAYMENTS_PROVIDER" == "stripe" ]]; then
  start_service stripe stripe listen --api-key "$STRIPE_SECRET_KEY" --forward-to "localhost:3000/api/stripe/webhooks"
fi

if [[ "$INCLUDE_DESIGN_REFERENCE" == "1" ]]; then
  start_service design npm --prefix "$ROOT_DIR/designs/react-reference-app" run dev -- --host 0.0.0.0 --port "$DESIGN_REFERENCE_PORT"
fi

cat <<EOF
Local stack is starting.

- platform: http://localhost:3000
- client portal: http://localhost:3000/client
- coach portal: http://localhost:3000/coach
- postgres: postgresql://127.0.0.1:${LOCAL_POSTGRES_PORT}
EOF

if [[ "$PAYMENTS_PROVIDER" == "stripe" ]]; then
  echo "- stripe webhooks: relayed to /api/stripe/webhooks"
else
  echo "- stripe webhooks: relay skipped (PAYMENTS_PROVIDER=${PAYMENTS_PROVIDER:-memory})"
fi

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
