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

require_env DEPLOY_ENV

case "${DEPLOY_ENV}" in
  test | prod) ;;
  *) fail "DEPLOY_ENV must be test or prod, got: ${DEPLOY_ENV}" ;;
esac

APP_NAME="${APP_NAME:-eli-coach-platform}"
APP_DIR="${APP_DIR:-/srv/apps/${APP_NAME}}"
DEPLOY_ENV_FILE="${APP_DIR}/deploy/env/${DEPLOY_ENV}.env"
EDGE_DYNAMIC_DIR="${EDGE_DYNAMIC_DIR:-/srv/edge/dynamic}"
EDGE_HOSTNAME="${EDGE_HOSTNAME:-}"
HOST_LABEL="${HOST_LABEL:-$EDGE_HOSTNAME}"
APP_ENV_FILE="${APP_ENV_FILE:-${APP_DIR}/.env}"
POSTGRES_ENV_FILE="${POSTGRES_ENV_FILE:-/srv/postgres/${APP_NAME}.env}"
READINESS_TIMEOUT_SECONDS="${READINESS_TIMEOUT_SECONDS:-180}"
EDGE_NETWORK="${EDGE_NETWORK:-edge_default}"
POSTGRES_DATA_ROOT="${POSTGRES_DATA_ROOT:-/srv/postgres/data/${APP_NAME}}"
POSTGRES_PGDATA_DIR="${POSTGRES_PGDATA_DIR:-${POSTGRES_DATA_ROOT}/pgdata}"
STORE_ASSET_ROOT_HOST="${STORE_ASSET_ROOT_HOST:-/srv/store-assets/${APP_NAME}}"
CLIENT_MEDIA_ROOT_HOST="${CLIENT_MEDIA_ROOT_HOST:-/srv/client-media/${APP_NAME}}"
CLIENT_RESOURCE_ROOT_HOST="${CLIENT_RESOURCE_ROOT_HOST:-/srv/client-resources/${APP_NAME}}"
EXERCISE_VIDEO_ROOT_HOST="${EXERCISE_VIDEO_ROOT_HOST:-/srv/exercise-videos/${APP_NAME}}"
RECIPE_PHOTO_ROOT_HOST="${RECIPE_PHOTO_ROOT_HOST:-/srv/recipe-photos/${APP_NAME}}"

PLATFORM_IMAGE="${PLATFORM_IMAGE:-}"
MIGRATION_IMAGE="${MIGRATION_IMAGE:-}"
DESIGN_REFERENCE_IMAGE="${DESIGN_REFERENCE_IMAGE:-}"
POSTGRES_RUNTIME_IMAGE="${POSTGRES_RUNTIME_IMAGE:-}"

ACTIVE_COLOR_FILE="${APP_DIR}/active-color"
TRAEFIK_TEMPLATE_FILE="${APP_DIR}/deploy/traefik/${DEPLOY_ENV}.yml.template"
TRAEFIK_OUTPUT_FILE="${EDGE_DYNAMIC_DIR}/${APP_NAME}-${DEPLOY_ENV}.yml"
INFRA_COMPOSE_FILE="${APP_DIR}/deploy/docker-compose.infrastructure.yml"
APPLICATION_COMPOSE_FILE="${APP_DIR}/deploy/docker-compose.application.yml"
MIGRATION_SCRIPT="${APP_DIR}/scripts/deploy/run_migrations.sh"
TEMP_DOCKER_CONFIG=""

cleanup() {
  if [[ -n "${TEMP_DOCKER_CONFIG}" && -d "${TEMP_DOCKER_CONFIG}" ]]; then
    rm -rf "${TEMP_DOCKER_CONFIG}"
  fi
}

trap cleanup EXIT

ensure_file_exists() {
  local file_path="$1"
  [[ -f "${file_path}" ]] || fail "missing required file: ${file_path}"
}

has_design_reference() {
  [[ "${DEPLOY_ENV}" == "test" ]]
}

read_deploy_env_setting() {
  sed -n "s/^$1=//p" "${DEPLOY_ENV_FILE}" | head -n 1
}

load_deploy_settings() {
  ensure_file_exists "${DEPLOY_ENV_FILE}"

  [[ "$(read_deploy_env_setting DEPLOY_ENV)" == "${DEPLOY_ENV}" ]] \
    || fail "${DEPLOY_ENV_FILE} does not declare DEPLOY_ENV=${DEPLOY_ENV}"

  APP_BASE_PATH="$(read_deploy_env_setting APP_BASE_PATH)"
  ENVIRONMENT="$(read_deploy_env_setting ENVIRONMENT)"

  [[ "${APP_BASE_PATH}" =~ ^/([A-Za-z0-9._~-]+(/[A-Za-z0-9._~-]+)*)?$ ]] \
    || fail "APP_BASE_PATH in ${DEPLOY_ENV_FILE} is not a path prefix: ${APP_BASE_PATH}"
  require_env ENVIRONMENT

  export DEPLOY_ENV APP_BASE_PATH ENVIRONMENT
}

require_inputs() {
  require_env EDGE_HOSTNAME
  require_env PLATFORM_IMAGE
  require_env MIGRATION_IMAGE
  require_env POSTGRES_RUNTIME_IMAGE
  if has_design_reference; then
    require_env DESIGN_REFERENCE_IMAGE
  fi

  [[ "${EDGE_HOSTNAME}" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]] \
    || fail "EDGE_HOSTNAME is not a hostname: ${EDGE_HOSTNAME}"
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
  # PROD never prunes: its retained images are what a rollback starts from.
  if [[ "${DEPLOY_ENV}" != "test" ]]; then
    return
  fi

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
  until docker exec "${APP_NAME}-${DEPLOY_ENV}-postgres" pg_isready -h 127.0.0.1 -p 5432 -U "${postgres_user}" -d "${postgres_db}" >/dev/null 2>&1; do
    if (( SECONDS >= deadline )); then
      docker logs --tail=200 "${APP_NAME}-${DEPLOY_ENV}-postgres" >&2 || true
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
  DEPLOY_ENV="${DEPLOY_ENV}" \
  APP_NAME="${APP_NAME}" \
  APP_ENV_FILE="${APP_ENV_FILE}" \
  POSTGRES_ENV_FILE="${POSTGRES_ENV_FILE}" \
  MIGRATION_IMAGE="${MIGRATION_IMAGE}" \
  HOST_LABEL="${HOST_LABEL}" \
  READINESS_TIMEOUT_SECONDS="${READINESS_TIMEOUT_SECONDS}" \
  "${MIGRATION_SCRIPT}"
  log "migrations completed"
}

write_compose_env_file() {
  local stack_color="$1"
  local output_file="$2"

  cat "${DEPLOY_ENV_FILE}" > "${output_file}"
  cat >> "${output_file}" <<EOF
APP_ENV_FILE=${APP_ENV_FILE}
STACK_COLOR=${stack_color}
HOST_LABEL=${HOST_LABEL}
PLATFORM_IMAGE=${PLATFORM_IMAGE}
MIGRATION_IMAGE=${MIGRATION_IMAGE}
DESIGN_REFERENCE_IMAGE=${DESIGN_REFERENCE_IMAGE}
STORE_ASSET_ROOT_HOST=${STORE_ASSET_ROOT_HOST}
CLIENT_MEDIA_ROOT_HOST=${CLIENT_MEDIA_ROOT_HOST}
CLIENT_RESOURCE_ROOT_HOST=${CLIENT_RESOURCE_ROOT_HOST}
EXERCISE_VIDEO_ROOT_HOST=${EXERCISE_VIDEO_ROOT_HOST}
RECIPE_PHOTO_ROOT_HOST=${RECIPE_PHOTO_ROOT_HOST}
EOF
}

compose_application_stack() {
  local env_file="$1"
  local project_name="$2"
  shift 2

  docker compose \
    --env-file "${env_file}" \
    --profile "${DEPLOY_ENV}" \
    -p "${project_name}" \
    -f "${APPLICATION_COMPOSE_FILE}" \
    "$@"
}

pull_application_images() {
  local env_file="$1"

  compose_application_stack "${env_file}" "${APP_NAME}-${DEPLOY_ENV}" pull >/dev/null

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

read_active_color() {
  if [[ -f "${ACTIVE_COLOR_FILE}" ]]; then
    cat "${ACTIVE_COLOR_FILE}"
  else
    printf 'blue'
  fi
}

prepare_host_directories() {
  mkdir -p "${APP_DIR}" "${EDGE_DYNAMIC_DIR}" "${POSTGRES_DATA_ROOT}"
  install -d -m 0770 "${STORE_ASSET_ROOT_HOST}" "${CLIENT_MEDIA_ROOT_HOST}" "${CLIENT_RESOURCE_ROOT_HOST}" "${EXERCISE_VIDEO_ROOT_HOST}" "${RECIPE_PHOTO_ROOT_HOST}"
  ensure_file_exists "${APP_ENV_FILE}"
  ensure_file_exists "${POSTGRES_ENV_FILE}"
  ensure_file_exists "${TRAEFIK_TEMPLATE_FILE}"
  ensure_file_exists "${INFRA_COMPOSE_FILE}"
  ensure_file_exists "${APPLICATION_COMPOSE_FILE}"
}

start_infrastructure() {
  prepare_postgres_data_root

  docker compose \
    --env-file /dev/null \
    --profile "${DEPLOY_ENV}" \
    -p "${APP_NAME}-${DEPLOY_ENV}-infra" \
    -f "${INFRA_COMPOSE_FILE}" \
    up -d

  wait_for_postgres
}

write_stack_env_files() {
  write_compose_env_file "${TARGET_COLOR}" "${TARGET_ENV_FILE}"
  write_compose_env_file "${ACTIVE_COLOR}" "${ACTIVE_ENV_FILE}"
}

start_target_color() {
  pull_application_images "${TARGET_ENV_FILE}"

  compose_application_stack "${TARGET_ENV_FILE}" "${APP_NAME}-${DEPLOY_ENV}-${TARGET_COLOR}" up -d

  wait_for_health "${APP_NAME}-${DEPLOY_ENV}-platform-${TARGET_COLOR}"
  if has_design_reference; then
    wait_for_health "${APP_NAME}-${DEPLOY_ENV}-design-reference-${TARGET_COLOR}"
  fi
}

switch_traffic_to_target() {
  sed \
    -e "s/__EDGE_HOSTNAME__/${EDGE_HOSTNAME}/g" \
    -e "s/__STACK_COLOR__/${TARGET_COLOR}/g" \
    -e "s|__APP_BASE_PATH__|${APP_BASE_PATH}|g" \
    "${TRAEFIK_TEMPLATE_FILE}" > "${TRAEFIK_OUTPUT_FILE}.next"

  mv "${TRAEFIK_OUTPUT_FILE}.next" "${TRAEFIK_OUTPUT_FILE}"
  printf '%s' "${TARGET_COLOR}" > "${ACTIVE_COLOR_FILE}"
  log "switched Traefik routing to ${TARGET_COLOR}"
}

retire_previous_color() {
  local project_name="${APP_NAME}-${DEPLOY_ENV}-${ACTIVE_COLOR}"

  if STACK_COLOR="${ACTIVE_COLOR}" compose_application_stack "${ACTIVE_ENV_FILE}" "${project_name}" ps >/dev/null 2>&1; then
    compose_application_stack "${ACTIVE_ENV_FILE}" "${project_name}" down || true
  fi
}

load_deploy_settings
require_inputs
export HOST_LABEL POSTGRES_RUNTIME_IMAGE
prepare_host_directories
login_to_ghcr
reclaim_docker_disk_space
ensure_network_exists "${EDGE_NETWORK}"

ACTIVE_COLOR="$(read_active_color)"

if [[ "${ACTIVE_COLOR}" == "blue" ]]; then
  TARGET_COLOR="green"
else
  TARGET_COLOR="blue"
fi

TARGET_ENV_FILE="${APP_DIR}/deploy-${TARGET_COLOR}.env"
ACTIVE_ENV_FILE="${APP_DIR}/deploy-${ACTIVE_COLOR}.env"

log "starting ${DEPLOY_ENV} deploy"
log "active color=${ACTIVE_COLOR} target color=${TARGET_COLOR}"

start_infrastructure
run_migrations
write_stack_env_files
start_target_color
switch_traffic_to_target
retire_previous_color

log "${DEPLOY_ENV} deploy complete"
log "active color=${TARGET_COLOR}"
