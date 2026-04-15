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
APP_ENV_FILE="${APP_ENV_FILE:-/srv/apps/${APP_NAME}/.env}"
POSTGRES_ENV_FILE="${POSTGRES_ENV_FILE:-/srv/postgres/${APP_NAME}.env}"
POSTGRES_CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-${APP_NAME}-test-postgres}"
INTERNAL_NETWORK="${INTERNAL_NETWORK:-${APP_NAME}-test-internal}"
MIGRATION_WORKDIR="${MIGRATION_WORKDIR:-/workspace}"
POSTGRES_RUNTIME_HOST="${POSTGRES_RUNTIME_HOST:-${POSTGRES_CONTAINER_NAME}}"
POSTGRES_RUNTIME_PORT="${POSTGRES_RUNTIME_PORT:-5432}"

if [[ ! -f "${POSTGRES_ENV_FILE}" ]]; then
  fail "missing postgres env file: ${POSTGRES_ENV_FILE}"
fi

set -a
# shellcheck disable=SC1090
source "${POSTGRES_ENV_FILE}"
set +a

if [[ -f "${APP_ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${APP_ENV_FILE}"
  set +a
fi

APP_DB_SCHEMA="${APP_DB_SCHEMA:-app}"
APP_DB_APP_USER="${APP_DB_APP_USER:-${DATABASE_USER:-}}"
APP_DB_APP_PASSWORD="${APP_DB_APP_PASSWORD:-${DATABASE_PASSWORD:-}}"
APP_DB_MIGRATION_USER="${APP_DB_MIGRATION_USER:-${POSTGRES_USER:-}}"
APP_DB_MIGRATION_PASSWORD="${APP_DB_MIGRATION_PASSWORD:-${POSTGRES_PASSWORD:-}}"

require_env MIGRATION_IMAGE
require_env POSTGRES_DB
require_env POSTGRES_USER
require_env POSTGRES_PASSWORD
require_env APP_DB_SCHEMA
require_env APP_DB_APP_USER
require_env APP_DB_APP_PASSWORD
require_env APP_DB_MIGRATION_USER
require_env APP_DB_MIGRATION_PASSWORD

DATABASE_MIGRATION_URL="${DATABASE_MIGRATION_URL:-postgresql://${APP_DB_MIGRATION_USER}:${APP_DB_MIGRATION_PASSWORD}@${POSTGRES_RUNTIME_HOST}:${POSTGRES_RUNTIME_PORT}/${POSTGRES_DB}}"

log "pulling migration image"
docker pull "${MIGRATION_IMAGE}" >/dev/null

stream_file_from_migration_image() {
  local file_path="$1"

  docker run --rm "${MIGRATION_IMAGE}" sh -lc "cat '${file_path}'"
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

  stream_file_from_migration_image "${MIGRATION_WORKDIR}/sql/bootstrap.sql" | sed \
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
    "${MIGRATION_IMAGE}"
}

bootstrap_database
run_drizzle_migrations
