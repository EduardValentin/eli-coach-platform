#!/usr/bin/env bash
set -euo pipefail

source "$(dirname -- "$0")/common.sh"

load_local_postgres_environment
wait_for_local_postgres
apply_local_bootstrap

run_local_drizzle_migrations
