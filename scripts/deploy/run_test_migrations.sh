#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

require_env() {
  local name="$1"

  if [[ -z "${!name:-}" ]]; then
    fail "missing required env var: ${name}"
  fi
}

APP_NAME="${APP_NAME:-eli-coach-platform}"
POSTGRES_ENV_FILE="${POSTGRES_ENV_FILE:-/srv/postgres/${APP_NAME}.env}"
POSTGRES_CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-${APP_NAME}-test-postgres}"
INTERNAL_NETWORK="${INTERNAL_NETWORK:-${APP_NAME}-test-internal}"
DB_PACKAGE_DIRECTORY="${DB_PACKAGE_DIRECTORY:-/workspace/node_modules/@eli-coach-platform/db}"
POSTGRES_RUNTIME_HOST="${POSTGRES_RUNTIME_HOST:-${POSTGRES_CONTAINER_NAME}}"
POSTGRES_RUNTIME_PORT="${POSTGRES_RUNTIME_PORT:-5432}"

if [[ ! -f "${POSTGRES_ENV_FILE}" ]]; then
  fail "missing postgres env file: ${POSTGRES_ENV_FILE}"
fi

set -a
# shellcheck disable=SC1090
source "${POSTGRES_ENV_FILE}"
set +a

require_env PLATFORM_IMAGE
require_env POSTGRES_DB
require_env POSTGRES_USER
require_env POSTGRES_PASSWORD
require_env APP_DB_SCHEMA
require_env APP_DB_APP_USER
require_env APP_DB_APP_PASSWORD
require_env APP_DB_MIGRATION_USER
require_env APP_DB_MIGRATION_PASSWORD

DATABASE_MIGRATION_URL="${DATABASE_MIGRATION_URL:-postgresql://${APP_DB_MIGRATION_USER}:${APP_DB_MIGRATION_PASSWORD}@${POSTGRES_RUNTIME_HOST}:${POSTGRES_RUNTIME_PORT}/${POSTGRES_DB}}"

log "pulling platform image for migration assets"
docker pull "${PLATFORM_IMAGE}" >/dev/null

stream_file_from_platform_image() {
  local file_path="$1"

  docker run --rm "${PLATFORM_IMAGE}" sh -lc "cat '${file_path}'"
}

quote_sql_literal() {
  local value="${1//\\/\\\\}"
  value="${value//&/\\&}"
  value="${value//|/\\|}"
  value="${value//\'/\'\'}"

  printf "'%s'" "${value}"
}

stream_rendered_bootstrap_sql() {
  local application_schema=""
  local application_user=""
  local application_password=""
  local migration_user=""
  local migration_password=""

  application_schema="$(quote_sql_literal "${APP_DB_SCHEMA}")"
  application_user="$(quote_sql_literal "${APP_DB_APP_USER}")"
  application_password="$(quote_sql_literal "${APP_DB_APP_PASSWORD}")"
  migration_user="$(quote_sql_literal "${APP_DB_MIGRATION_USER}")"
  migration_password="$(quote_sql_literal "${APP_DB_MIGRATION_PASSWORD}")"

  stream_file_from_platform_image "${DB_PACKAGE_DIRECTORY}/sql/bootstrap.sql" | sed \
    -e "s|:'app_db_schema'|${application_schema}|g" \
    -e "s|:'app_db_app_user'|${application_user}|g" \
    -e "s|:'app_db_app_password'|${application_password}|g" \
    -e "s|:'app_db_migration_user'|${migration_user}|g" \
    -e "s|:'app_db_migration_password'|${migration_password}|g"
}

bootstrap_database() {
  log "bootstrapping database roles and grants"

  stream_rendered_bootstrap_sql | docker exec -i \
    -e PGPASSWORD="${POSTGRES_PASSWORD}" \
    "${POSTGRES_CONTAINER_NAME}" \
    psql \
      --host 127.0.0.1 \
      --username "${POSTGRES_USER}" \
      --dbname "${POSTGRES_DB}" \
      --set ON_ERROR_STOP=1
}

run_drizzle_migrations() {
  log "applying drizzle migrations"

  docker run --rm \
    --network "${INTERNAL_NETWORK}" \
    -e DATABASE_MIGRATION_URL="${DATABASE_MIGRATION_URL}" \
    "${PLATFORM_IMAGE}" \
    sh -lc "cd '${DB_PACKAGE_DIRECTORY}' && ./node_modules/.bin/drizzle-kit migrate --config drizzle.config.ts"
}

seed_database() {
  local seed_file=""
  local -a seed_files=()

  mapfile -t seed_files < <(
    docker run --rm "${PLATFORM_IMAGE}" sh -lc "find '${DB_PACKAGE_DIRECTORY}/seeds' -maxdepth 1 -type f -name '*.sql' | sort"
  )

  if [[ "${#seed_files[@]}" -eq 0 ]]; then
    log "no seed files found; skipping seed step"
    return
  fi

  for seed_file in "${seed_files[@]}"; do
    log "seeding $(basename "${seed_file}")"

    stream_file_from_platform_image "${seed_file}" | docker exec -i \
      -e PGPASSWORD="${APP_DB_MIGRATION_PASSWORD}" \
      "${POSTGRES_CONTAINER_NAME}" \
      psql \
        --host 127.0.0.1 \
        --username "${APP_DB_MIGRATION_USER}" \
        --dbname "${POSTGRES_DB}" \
        --set ON_ERROR_STOP=1
  done
}

bootstrap_database
run_drizzle_migrations
seed_database
