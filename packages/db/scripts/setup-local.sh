#!/usr/bin/env bash
set -euo pipefail

source "$(dirname -- "$0")/common.sh"

load_local_postgres_environment
wait_for_local_postgres
apply_local_bootstrap

DATABASE_MIGRATION_URL="$(resolve_local_migration_database_url)" pnpm --dir "${ROOT_DIR}" db:migrate
apply_local_seed_files
