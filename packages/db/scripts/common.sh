#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../../.." && pwd)
LOCAL_POSTGRES_CONTAINER_NAME="${LOCAL_POSTGRES_CONTAINER_NAME:-eli-coach-platform-local-postgres}"
LOCAL_POSTGRES_ENV_FILE="${LOCAL_POSTGRES_ENV_FILE:-${ROOT_DIR}/.env.postgres}"
LOCAL_POSTGRES_PORT="${LOCAL_POSTGRES_PORT:-55433}"

require_file() {
  local file_path="$1"

  if [[ ! -f "${file_path}" ]]; then
    echo "missing required file: ${file_path}" >&2
    exit 1
  fi
}

load_local_postgres_environment() {
  require_file "${LOCAL_POSTGRES_ENV_FILE}"

  set -a
  # shellcheck disable=SC1090
  source "${LOCAL_POSTGRES_ENV_FILE}"
  set +a
}

wait_for_local_postgres() {
  local deadline=0

  deadline=$((SECONDS + 60))
  until docker exec "${LOCAL_POSTGRES_CONTAINER_NAME}" pg_isready -h 127.0.0.1 -p 5432 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; do
    if (( SECONDS >= deadline )); then
      docker logs --tail=200 "${LOCAL_POSTGRES_CONTAINER_NAME}" >&2 || true
      echo "timed out waiting for local postgres" >&2
      exit 1
    fi

    sleep 2
  done
}

run_local_sql_as_admin() {
  local sql_file="$1"
  shift

  require_file "${sql_file}"

  docker exec -i -e PGPASSWORD="${POSTGRES_PASSWORD}" "${LOCAL_POSTGRES_CONTAINER_NAME}" \
    psql \
      --host 127.0.0.1 \
      --username "${POSTGRES_USER}" \
      --dbname "${POSTGRES_DB}" \
      --set ON_ERROR_STOP=1 \
      "$@" < "${sql_file}"
}

apply_local_bootstrap() {
  docker exec "${LOCAL_POSTGRES_CONTAINER_NAME}" /docker-entrypoint-initdb.d/01-bootstrap.sh
}

run_local_drizzle_migrations() {
  DATABASE_MIGRATION_URL="$(resolve_local_migration_database_url)" pnpm --dir "${ROOT_DIR}" db:migrate
}

resolve_local_migration_database_url() {
  if [[ -n "${DATABASE_MIGRATION_URL:-}" ]]; then
    printf '%s\n' "${DATABASE_MIGRATION_URL}"
    return
  fi

  printf 'postgresql://%s:%s@127.0.0.1:%s/%s\n' \
    "${APP_DB_MIGRATION_USER}" \
    "${APP_DB_MIGRATION_PASSWORD}" \
    "${LOCAL_POSTGRES_PORT}" \
    "${POSTGRES_DB}"
}
