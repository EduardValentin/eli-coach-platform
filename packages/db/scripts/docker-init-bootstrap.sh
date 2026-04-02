#!/usr/bin/env bash
set -euo pipefail

psql \
  --username "${POSTGRES_USER}" \
  --dbname "${POSTGRES_DB}" \
  --set ON_ERROR_STOP=1 \
  --set "app_db_schema=${APP_DB_SCHEMA}" \
  --set "app_db_app_user=${APP_DB_APP_USER}" \
  --set "app_db_app_password=${APP_DB_APP_PASSWORD}" \
  --set "app_db_migration_user=${APP_DB_MIGRATION_USER}" \
  --set "app_db_migration_password=${APP_DB_MIGRATION_PASSWORD}" \
  -f /docker-entrypoint-initdb.d/bootstrap.sql
