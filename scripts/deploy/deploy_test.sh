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

read_env_file_value() {
  local file="$1"
  local key="$2"

  awk -F= -v target="$key" '$1 == target {print substr($0, index($0, $2)); exit}' "$file"
}

APP_NAME="${APP_NAME:-eli-coach-platform}"
APP_DIR="${APP_DIR:-/srv/apps/${APP_NAME}}"
EDGE_DYNAMIC_DIR="${EDGE_DYNAMIC_DIR:-/srv/edge/dynamic}"
EDGE_HOSTNAME="${EDGE_HOSTNAME:-}"
HOST_LABEL="${HOST_LABEL:-$EDGE_HOSTNAME}"
APP_ENV_FILE="${APP_ENV_FILE:-${APP_DIR}/.env}"
POSTGRES_ENV_FILE="${POSTGRES_ENV_FILE:-/srv/postgres/${APP_NAME}.env}"
READINESS_TIMEOUT_SECONDS="${READINESS_TIMEOUT_SECONDS:-180}"
EDGE_NETWORK="${EDGE_NETWORK:-edge_default}"
POSTGRES_DATA_ROOT="${POSTGRES_DATA_ROOT:-/srv/postgres/data/${APP_NAME}}"
POSTGRES_PGDATA_DIR="${POSTGRES_PGDATA_DIR:-${POSTGRES_DATA_ROOT}/pgdata}"

PLATFORM_IMAGE="${PLATFORM_IMAGE:-}"
DESIGN_REFERENCE_IMAGE="${DESIGN_REFERENCE_IMAGE:-}"

ACTIVE_COLOR_FILE="${APP_DIR}/active-color"
TRAEFIK_TEMPLATE_FILE="${APP_DIR}/deploy/test/traefik-dynamic.yml.template"
TRAEFIK_OUTPUT_FILE="${EDGE_DYNAMIC_DIR}/${APP_NAME}-test.yml"
INFRA_COMPOSE_FILE="${APP_DIR}/deploy/test/docker-compose.infrastructure.yml"
APPLICATION_COMPOSE_FILE="${APP_DIR}/deploy/test/docker-compose.application.yml"
MIGRATION_SCRIPT="${APP_DIR}/scripts/deploy/run_test_migrations.sh"
TEMP_DOCKER_CONFIG=""

cleanup() {
  if [[ -n "${TEMP_DOCKER_CONFIG}" && -d "${TEMP_DOCKER_CONFIG}" ]]; then
    rm -rf "${TEMP_DOCKER_CONFIG}"
  fi
}

trap cleanup EXIT

require_env EDGE_HOSTNAME
require_env PLATFORM_IMAGE
require_env DESIGN_REFERENCE_IMAGE

ensure_file_exists() {
  local file_path="$1"
  [[ -f "${file_path}" ]] || fail "missing required file: ${file_path}"
}

login_to_ghcr() {
  if [[ -z "${GHCR_TOKEN:-}" ]]; then
    return
  fi

  require_env GHCR_USERNAME

  TEMP_DOCKER_CONFIG="$(mktemp -d)"
  export DOCKER_CONFIG="${TEMP_DOCKER_CONFIG}"

  printf '%s' "${GHCR_TOKEN}" | docker login ghcr.io --username "${GHCR_USERNAME}" --password-stdin >/dev/null
  log "logged in to ghcr.io for image pulls"
}

ensure_network_exists() {
  local network_name="$1"
  if docker network inspect "${network_name}" >/dev/null 2>&1; then
    return
  fi

  docker network create "${network_name}" >/dev/null
  log "created docker network ${network_name}"
}

reclaim_docker_disk_space() {
  log "pruning unused docker artifacts before deploy"
  docker container prune -f >/dev/null || true
  docker image prune -af >/dev/null || true
  docker builder prune -af >/dev/null || true
  docker network prune -f >/dev/null || true
}

wait_for_postgres() {
  local postgres_user=""
  local postgres_db=""
  local deadline=0

  postgres_user="$(read_env_file_value "${POSTGRES_ENV_FILE}" POSTGRES_USER)"
  postgres_db="$(read_env_file_value "${POSTGRES_ENV_FILE}" POSTGRES_DB)"

  [[ -n "${postgres_user}" ]] || fail "POSTGRES_USER missing from ${POSTGRES_ENV_FILE}"
  [[ -n "${postgres_db}" ]] || fail "POSTGRES_DB missing from ${POSTGRES_ENV_FILE}"

  deadline=$((SECONDS + READINESS_TIMEOUT_SECONDS))
  until docker exec "${APP_NAME}-test-postgres" pg_isready -h 127.0.0.1 -p 5432 -U "${postgres_user}" -d "${postgres_db}" >/dev/null 2>&1; do
    if (( SECONDS >= deadline )); then
      docker logs --tail=200 "${APP_NAME}-test-postgres" >&2 || true
      fail "postgres readiness timeout"
    fi

    sleep 2
  done

  log "postgres is ready"
}

has_postgres_cluster_files() {
  local directory_path="$1"

  [[ -f "${directory_path}/PG_VERSION" ]] || [[ -d "${directory_path}/base" ]] || [[ -d "${directory_path}/global" ]]
}

prepare_postgres_data_root() {
  mkdir -p "${POSTGRES_DATA_ROOT}"

  if has_postgres_cluster_files "${POSTGRES_PGDATA_DIR}"; then
    return
  fi

  if ! has_postgres_cluster_files "${POSTGRES_DATA_ROOT}"; then
    return
  fi

  log "removing legacy root-level postgres data before initializing ${POSTGRES_PGDATA_DIR}"
  find "${POSTGRES_DATA_ROOT}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
}

run_migrations() {
  if [[ ! -x "${MIGRATION_SCRIPT}" ]]; then
    log "no migration runner found, skipping migrations"
    return
  fi

  log "running migrations"
  APP_NAME="${APP_NAME}" \
  APP_ENV_FILE="${APP_ENV_FILE}" \
  POSTGRES_ENV_FILE="${POSTGRES_ENV_FILE}" \
  PLATFORM_IMAGE="${PLATFORM_IMAGE}" \
  HOST_LABEL="${HOST_LABEL}" \
  READINESS_TIMEOUT_SECONDS="${READINESS_TIMEOUT_SECONDS}" \
  "${MIGRATION_SCRIPT}"
  log "migrations completed"
}

write_compose_env_file() {
  local stack_color="$1"
  local output_file="$2"

  cat > "${output_file}" <<EOF
APP_ENV_FILE=${APP_ENV_FILE}
STACK_COLOR=${stack_color}
HOST_LABEL=${HOST_LABEL}
PLATFORM_IMAGE=${PLATFORM_IMAGE}
DESIGN_REFERENCE_IMAGE=${DESIGN_REFERENCE_IMAGE}
EOF
}

pull_application_images() {
  local env_file="$1"

  docker compose \
    --env-file "${env_file}" \
    -p "${APP_NAME}-test" \
    -f "${APPLICATION_COMPOSE_FILE}" \
    pull \
    platform \
    design-reference >/dev/null

  log "pulled application images"
}

wait_for_health() {
  local container_name="$1"
  local deadline=0
  local status=""

  deadline=$((SECONDS + READINESS_TIMEOUT_SECONDS))
  while (( SECONDS < deadline )); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}' "${container_name}")"
    if [[ "${status}" == "healthy" ]]; then
      log "${container_name} is healthy"
      return
    fi

    sleep 2
  done

  docker logs --tail=200 "${container_name}" || true
  fail "timed out waiting for ${container_name} to become healthy"
}

mkdir -p "${APP_DIR}" "${EDGE_DYNAMIC_DIR}" "${POSTGRES_DATA_ROOT}"
ensure_file_exists "${APP_ENV_FILE}"
ensure_file_exists "${POSTGRES_ENV_FILE}"
ensure_file_exists "${TRAEFIK_TEMPLATE_FILE}"
ensure_file_exists "${INFRA_COMPOSE_FILE}"
ensure_file_exists "${APPLICATION_COMPOSE_FILE}"

login_to_ghcr
reclaim_docker_disk_space
ensure_network_exists "${EDGE_NETWORK}"

if [[ -f "${ACTIVE_COLOR_FILE}" ]]; then
  ACTIVE_COLOR="$(cat "${ACTIVE_COLOR_FILE}")"
else
  ACTIVE_COLOR="blue"
fi

if [[ "${ACTIVE_COLOR}" == "blue" ]]; then
  TARGET_COLOR="green"
else
  TARGET_COLOR="blue"
fi

TARGET_ENV_FILE="${APP_DIR}/deploy-${TARGET_COLOR}.env"
ACTIVE_ENV_FILE="${APP_DIR}/deploy-${ACTIVE_COLOR}.env"

log "starting TEST deploy"
log "active color=${ACTIVE_COLOR} target color=${TARGET_COLOR}"

prepare_postgres_data_root

docker compose \
  --env-file /dev/null \
  -p "${APP_NAME}-test-infra" \
  -f "${INFRA_COMPOSE_FILE}" \
  up -d postgres

wait_for_postgres
run_migrations

write_compose_env_file "${TARGET_COLOR}" "${TARGET_ENV_FILE}"
write_compose_env_file "${ACTIVE_COLOR}" "${ACTIVE_ENV_FILE}"
pull_application_images "${TARGET_ENV_FILE}"

docker compose \
  --env-file "${TARGET_ENV_FILE}" \
  -p "${APP_NAME}-test-${TARGET_COLOR}" \
  -f "${APPLICATION_COMPOSE_FILE}" \
  up -d

wait_for_health "${APP_NAME}-test-platform-${TARGET_COLOR}"
wait_for_health "${APP_NAME}-test-design-reference-${TARGET_COLOR}"

sed \
  -e "s/__EDGE_HOSTNAME__/${EDGE_HOSTNAME}/g" \
  -e "s/__STACK_COLOR__/${TARGET_COLOR}/g" \
  "${TRAEFIK_TEMPLATE_FILE}" > "${TRAEFIK_OUTPUT_FILE}.next"

mv "${TRAEFIK_OUTPUT_FILE}.next" "${TRAEFIK_OUTPUT_FILE}"
printf '%s' "${TARGET_COLOR}" > "${ACTIVE_COLOR_FILE}"
log "switched Traefik routing to ${TARGET_COLOR}"

if STACK_COLOR="${ACTIVE_COLOR}" docker compose --env-file "${ACTIVE_ENV_FILE}" -p "${APP_NAME}-test-${ACTIVE_COLOR}" -f "${APPLICATION_COMPOSE_FILE}" ps >/dev/null 2>&1; then
  docker compose \
    --env-file "${ACTIVE_ENV_FILE}" \
    -p "${APP_NAME}-test-${ACTIVE_COLOR}" \
    -f "${APPLICATION_COMPOSE_FILE}" \
    down || true
fi

log "TEST deploy complete"
log "active color=${TARGET_COLOR}"
