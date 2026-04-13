#!/usr/bin/env bash
set -euo pipefail

BOOTSTRAP_SQL_PATH="${BOOTSTRAP_SQL_PATH:-/bootstrap/bootstrap.sql}"

quote_sql_literal() {
  local value="${1//\\/\\\\}"
  value="${value//&/\\&}"
  value="${value//|/\\|}"
  value="${value//\'/\'\'}"

  printf "'%s'" "${value}"
}

render_bootstrap_sql() {
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

  sed \
    -e "s|:'app_db_schema'|${application_schema}|g" \
    -e "s|:'app_db_app_user'|${application_user}|g" \
    -e "s|:'app_db_app_password'|${application_password}|g" \
    -e "s|:'app_db_migration_user'|${migration_user}|g" \
    -e "s|:'app_db_migration_password'|${migration_password}|g" \
    "${BOOTSTRAP_SQL_PATH}"
}

psql \
  --username "${POSTGRES_USER}" \
  --dbname "${POSTGRES_DB}" \
  --set ON_ERROR_STOP=1 \
  -f <(render_bootstrap_sql)
