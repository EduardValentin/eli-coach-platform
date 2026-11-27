#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

# Exit codes are documented in docs/RELEASE_AND_ROLLBACK.md.
readonly EXIT_REFUSED=10
readonly EXIT_BACKUP_FAILED=11
readonly EXIT_FAILED_BEFORE_SWITCH=12
readonly EXIT_SWITCHED_BACK=20
readonly EXIT_SWITCH_BACK_FAILED=30

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit "${EXIT_FAILED_BEFORE_SWITCH}"
}

refuse() {
  printf 'REFUSED: %s\n' "$*" >&2
  exit "${EXIT_REFUSED}"
}

backup_failed() {
  printf 'ERROR: %s\n' "$*" >&2
  exit "${EXIT_BACKUP_FAILED}"
}

switch_back_failed() {
  printf 'ERROR: %s\n' "$*" >&2
  exit "${EXIT_SWITCH_BACK_FAILED}"
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
POSTGRES_EXPORTER_ENV_FILE="${POSTGRES_EXPORTER_ENV_FILE:-/srv/postgres/${APP_NAME}.exporter.env}"
OBSERVABILITY_ENV_FILE="${OBSERVABILITY_ENV_FILE:-/srv/apps/observability/.env}"
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
LEDGER_FILE="${APP_DIR}/releases.jsonl"
LOCK_FILE="${APP_DIR}/deploy.lock"
BACKUP_COMMAND="/usr/local/bin/app-backup"
BACKUP_TIMEOUT_SECONDS="${BACKUP_TIMEOUT_SECONDS:-1200}"
LAST_RUN_LOG="${APP_DIR}/last-deploy.log"
PUBLIC_CHECK_TIMEOUT_SECONDS="${PUBLIC_CHECK_TIMEOUT_SECONDS:-90}"
PUBLIC_CHECK_CONSECUTIVE_PASSES=3
RELEASE_SHA="${RELEASE_SHA:-}"
BACKUP_SNAPSHOT=""
# preparing until traffic is switched, switching while the public check can
# still undo it, switched once the release is recorded.
DEPLOY_PHASE="preparing"
TARGET_STARTED="no"
HAD_PREVIOUS_ROUTING="no"
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

is_documented_exit_code() {
  case "$1" in
    0 | "${EXIT_REFUSED}" | "${EXIT_BACKUP_FAILED}" | "${EXIT_FAILED_BEFORE_SWITCH}" | "${EXIT_SWITCHED_BACK}" | "${EXIT_SWITCH_BACK_FAILED}")
      return 0
      ;;
  esac

  return 1
}

# Undoes what an exit left half-done: a colour started but never switched to,
# or traffic moved to a colour whose public check never finished.
recover_interrupted_deploy() {
  local status="$1"

  if [[ "${status}" == "0" ]]; then
    return
  fi

  case "${DEPLOY_PHASE}" in
    preparing) remove_unswitched_target_color ;;
    switching) is_documented_exit_code "${status}" || switch_back_to_previous_color ;;
  esac
}

# A command that set -e stopped, or a signal ended the script: report the
# phase it was in. Before the switch nothing changed; after the release is
# recorded a person has to look.
exit_with_documented_code() {
  local status="$1"

  if is_documented_exit_code "${status}"; then
    return
  fi

  if [[ "${DEPLOY_PHASE}" == "preparing" ]]; then
    exit "${EXIT_FAILED_BEFORE_SWITCH}"
  fi

  exit "${EXIT_SWITCH_BACK_FAILED}"
}

finish() {
  local status=$?

  cleanup
  recover_interrupted_deploy "${status}"
  exit_with_documented_code "${status}"
}

trap finish EXIT

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

load_metrics_bind_ip() {
  ensure_file_exists "${OBSERVABILITY_ENV_FILE}"

  METRICS_BIND_IP="$(read_env_file_value "${OBSERVABILITY_ENV_FILE}" METRICS_BIND_IP)"

  local octet='(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])'
  [[ "${METRICS_BIND_IP}" =~ ^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.${octet}\.${octet}$ ]] \
    || fail "METRICS_BIND_IP in ${OBSERVABILITY_ENV_FILE} must be the host's Tailscale address (100.64.0.0/10)"

  export METRICS_BIND_IP
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

write_postgres_exporter_env_file() {
  local postgres_db=""
  local monitoring_user=""
  local monitoring_password=""

  postgres_db="$(read_env_file_value "${POSTGRES_ENV_FILE}" POSTGRES_DB)"
  monitoring_user="$(read_env_file_value "${POSTGRES_ENV_FILE}" APP_DB_MONITORING_USER)"
  monitoring_password="$(read_env_file_value "${POSTGRES_ENV_FILE}" APP_DB_MONITORING_PASSWORD)"

  [[ "${postgres_db}" =~ ^[A-Za-z0-9_]+$ ]] || fail "POSTGRES_DB missing or not a plain name in ${POSTGRES_ENV_FILE}"
  [[ "${monitoring_user}" =~ ^[a-z_][a-z0-9_]*$ ]] || fail "APP_DB_MONITORING_USER missing or not a plain role name in ${POSTGRES_ENV_FILE}"
  [[ "${monitoring_password}" =~ ^[A-Za-z0-9]+$ ]] || fail "APP_DB_MONITORING_PASSWORD missing or not alphanumeric in ${POSTGRES_ENV_FILE}"

  install -m 0600 /dev/null "${POSTGRES_EXPORTER_ENV_FILE}.next"
  cat > "${POSTGRES_EXPORTER_ENV_FILE}.next" <<EOF
DATA_SOURCE_URI=${APP_NAME}-${DEPLOY_ENV}-postgres:5432/${postgres_db}?sslmode=disable
DATA_SOURCE_USER=${monitoring_user}
DATA_SOURCE_PASS=${monitoring_password}
EOF
  mv "${POSTGRES_EXPORTER_ENV_FILE}.next" "${POSTGRES_EXPORTER_ENV_FILE}"
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
  TARGET_STARTED="yes"
  compose_application_stack "${TARGET_ENV_FILE}" "${APP_NAME}-${DEPLOY_ENV}-${TARGET_COLOR}" up -d

  wait_for_health "${APP_NAME}-${DEPLOY_ENV}-platform-${TARGET_COLOR}"
  if has_design_reference; then
    wait_for_health "${APP_NAME}-${DEPLOY_ENV}-design-reference-${TARGET_COLOR}"
  fi
}

render_traefik_file() {
  local stack_color="$1"

  sed \
    -e "s/__EDGE_HOSTNAME__/${EDGE_HOSTNAME}/g" \
    -e "s/__STACK_COLOR__/${stack_color}/g" \
    -e "s|__APP_BASE_PATH__|${APP_BASE_PATH}|g" \
    "${TRAEFIK_TEMPLATE_FILE}" > "${TRAEFIK_OUTPUT_FILE}.next" \
    && mv "${TRAEFIK_OUTPUT_FILE}.next" "${TRAEFIK_OUTPUT_FILE}"
}

route_traffic_to() {
  local stack_color="$1"

  render_traefik_file "${stack_color}" \
    && printf '%s' "${stack_color}" > "${ACTIVE_COLOR_FILE}" \
    && log "routing Traefik to ${stack_color}"
}

retire_previous_color() {
  local project_name="${APP_NAME}-${DEPLOY_ENV}-${ACTIVE_COLOR}"

  if STACK_COLOR="${ACTIVE_COLOR}" compose_application_stack "${ACTIVE_ENV_FILE}" "${project_name}" ps >/dev/null 2>&1; then
    compose_application_stack "${ACTIVE_ENV_FILE}" "${project_name}" down || true
  fi
}

remove_target_color() {
  compose_application_stack "${TARGET_ENV_FILE}" "${APP_NAME}-${DEPLOY_ENV}-${TARGET_COLOR}" down || true
}

remove_unswitched_target_color() {
  if [[ "${TARGET_STARTED}" == "yes" ]]; then
    remove_target_color
  fi
}

# --- release ledger, lock and compare-and-swap ---

live_release_sha() {
  [[ -s "${LEDGER_FILE}" ]] || return 0
  tail -n 1 "${LEDGER_FILE}" | sed -n 's/.*"sha":"\([0-9a-f]\{40\}\)".*/\1/p'
}

require_release_identity() {
  require_env RELEASE_SHA

  [[ "${RELEASE_SHA}" =~ ^[0-9a-f]{40}$ ]] || fail "RELEASE_SHA is not a full commit hash: ${RELEASE_SHA}"
  [[ -z "${EXPECTED_LIVE_SHA+set}" || "${EXPECTED_LIVE_SHA}" =~ ^([0-9a-f]{40}|none)$ ]] \
    || fail "EXPECTED_LIVE_SHA must be a full commit hash or none"

  # PROD never skips the compare-and-swap.
  [[ "${DEPLOY_ENV}" != "prod" || -n "${EXPECTED_LIVE_SHA+set}" ]] \
    || fail "EXPECTED_LIVE_SHA is required on prod: a full commit hash, or none for a host with no release"
}

# The references end up in the ledger's JSON.
require_plain_image_references() {
  local image=""

  for image in "${PLATFORM_IMAGE}" "${MIGRATION_IMAGE}" "${POSTGRES_RUNTIME_IMAGE}" "${DESIGN_REFERENCE_IMAGE}"; do
    [[ -z "${image}" || "${image}" =~ ^[A-Za-z0-9./:@_-]+$ ]] || fail "image reference has unexpected characters: ${image}"
  done
}

# The label lands unquoted in the compose env file.
require_plain_host_label() {
  [[ "${HOST_LABEL}" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]] || fail "HOST_LABEL is not a hostname: ${HOST_LABEL}"
}

acquire_deploy_lock() {
  exec 9>"${LOCK_FILE}"
  flock -n 9 || refuse "another deploy holds ${LOCK_FILE}"
}

# The session that started this deploy may drop mid-switch (SSH loss, a
# cancelled job). Ignore the hangup and keep writing to a log of our own, so
# the deploy finishes or switches back instead of dying half-way.
survive_dropped_session() {
  trap '' HUP PIPE
  # The log carries container logs, so only root reads it.
  install -m 0600 /dev/null "${LAST_RUN_LOG}"
  exec > >(tee "${LAST_RUN_LOG}") 2>&1
}

refuse_unexpected_live_release() {
  local expected="${EXPECTED_LIVE_SHA-}"
  local live=""

  [[ -n "${EXPECTED_LIVE_SHA+set}" ]] || return 0

  live="$(live_release_sha)"
  if [[ "${expected}" == "none" ]]; then
    expected=""
  fi

  [[ "${expected}" == "${live}" ]] \
    || refuse "the live release on this host is ${live:-none}, not the expected ${expected:-none}"
}

record_release() {
  local snapshot_json="null"

  if [[ -n "${BACKUP_SNAPSHOT}" ]]; then
    snapshot_json="\"${BACKUP_SNAPSHOT}\""
  fi

  printf '{"time":"%s","kind":"release","sha":"%s","images":{"platform":"%s","migration":"%s","postgresRuntime":"%s"},"color":"%s","snapshot":%s}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${RELEASE_SHA}" "${PLATFORM_IMAGE}" "${MIGRATION_IMAGE}" "${POSTGRES_RUNTIME_IMAGE}" "${TARGET_COLOR}" "${snapshot_json}" \
    >> "${LEDGER_FILE}" \
    && log "recorded release ${RELEASE_SHA} in ${LEDGER_FILE}"
}

# --- pre-deploy backup (PROD only) ---

host_holds_earlier_release_state() {
  [[ -f "${ACTIVE_COLOR_FILE}" ]] \
    || has_postgres_cluster_files "${POSTGRES_PGDATA_DIR}" \
    || has_postgres_cluster_files "${POSTGRES_DATA_ROOT}"
}

back_up_database_before_deploy() {
  local output_file=""
  local status=0
  local live_sha=""

  if [[ "${DEPLOY_ENV}" != "prod" ]]; then
    return
  fi

  output_file="$(mktemp)"
  log "taking the pre-deploy database backup"

  BACKUP_LABEL="predeploy-${RELEASE_SHA}" timeout --kill-after=30 "${BACKUP_TIMEOUT_SECONDS}" "${BACKUP_COMMAND}" db "${APP_NAME}" > "${output_file}" || status=$?
  cat "${output_file}"
  BACKUP_SNAPSHOT="$(tail -n 1 "${output_file}" | sed -n 's/^snapshot=\([A-Za-z0-9._-]\{1,64\}\)$/\1/p')"
  rm -f "${output_file}"
  live_sha="$(live_release_sha)"

  case "${status}" in
    0)
      [[ -n "${BACKUP_SNAPSHOT}" ]] || backup_failed "the backup finished without a final snapshot=<id> line"
      log "pre-deploy backup written as ${BACKUP_SNAPSHOT}"
      ;;
    3)
      BACKUP_SNAPSHOT=""
      [[ -z "${live_sha}" ]] || backup_failed "the Postgres container is missing although release ${live_sha} is live"
      ! host_holds_earlier_release_state \
        || backup_failed "the Postgres container is missing but this host holds an earlier release's state; a lost ledger must not skip the backup"
      log "no Postgres container and no earlier release: first deploy, nothing to back up"
      ;;
    *)
      backup_failed "the pre-deploy backup failed with exit ${status}"
      ;;
  esac
}

# --- traffic switch, public check and switch-back ---

edge_probe_passes() {
  local expected_color="$1"
  local headers_file=""
  local status=""
  local color=""
  local tls_options=()

  # TEST's certificate is not guaranteed to chain to a public root.
  if [[ "${DEPLOY_ENV}" == "test" ]]; then
    tls_options=(--insecure)
  fi

  headers_file="$(mktemp)"
  status="$(curl --silent --max-time 10 --output /dev/null --dump-header "${headers_file}" --write-out '%{http_code}' \
    ${tls_options[@]+"${tls_options[@]}"} \
    --connect-to "${EDGE_HOSTNAME}:443:127.0.0.1:443" \
    "https://${EDGE_HOSTNAME}${APP_BASE_PATH%/}/readyz" 2>/dev/null)" || status="000"
  color="$(tr -d '\r' < "${headers_file}" | awk -F': *' 'tolower($1) == "x-stack-color" {print $2; exit}')"
  rm -f "${headers_file}"

  [[ "${status}" == "200" && "${color}" == "${expected_color}" ]]
}

public_check_passes() {
  local expected_color="$1"
  local passes=0
  local deadline=$((SECONDS + PUBLIC_CHECK_TIMEOUT_SECONDS))

  log "public check: ${PUBLIC_CHECK_CONSECUTIVE_PASSES} consecutive 200s from ${expected_color} through https://${EDGE_HOSTNAME}${APP_BASE_PATH%/}/readyz"

  while (( SECONDS < deadline )); do
    if edge_probe_passes "${expected_color}"; then
      passes=$((passes + 1))
    else
      passes=0
    fi

    if (( passes >= PUBLIC_CHECK_CONSECUTIVE_PASSES )); then
      log "public check passed for ${expected_color}"
      return 0
    fi

    sleep 2
  done

  log "public check failed for ${expected_color}"
  return 1
}

previous_color_is_running() {
  [[ "$(docker inspect --format '{{.State.Running}}' "${APP_NAME}-${DEPLOY_ENV}-platform-${ACTIVE_COLOR}" 2>/dev/null)" == "true" ]]
}

withdraw_first_release() {
  rm -f "${TRAEFIK_OUTPUT_FILE}" "${ACTIVE_COLOR_FILE}"
  remove_target_color
  log "first deploy: the host is back to serving no release"
  exit "${EXIT_SWITCHED_BACK}"
}

switch_back_to_previous_color() {
  log "switching back to ${ACTIVE_COLOR}"

  if [[ "${HAD_PREVIOUS_ROUTING}" == "no" ]]; then
    withdraw_first_release
  fi

  previous_color_is_running \
    || switch_back_failed "${ACTIVE_COLOR} is not running; nothing to switch back to. ${TARGET_COLOR} stays up for inspection."

  if route_traffic_to "${ACTIVE_COLOR}" && public_check_passes "${ACTIVE_COLOR}"; then
    remove_target_color
    exit "${EXIT_SWITCHED_BACK}"
  fi

  switch_back_failed "could not confirm ${ACTIVE_COLOR} serving after the switch-back. ${TARGET_COLOR} stays up for inspection."
}

remember_previous_routing() {
  if [[ -f "${ACTIVE_COLOR_FILE}" ]]; then
    HAD_PREVIOUS_ROUTING="yes"
  fi
}

promote_target_color() {
  DEPLOY_PHASE="switching"

  if route_traffic_to "${TARGET_COLOR}" && public_check_passes "${TARGET_COLOR}" && record_release; then
    DEPLOY_PHASE="switched"
    retire_previous_color
    return
  fi

  switch_back_to_previous_color
}

load_deploy_settings
load_metrics_bind_ip
require_inputs
require_release_identity
require_plain_image_references
require_plain_host_label
export HOST_LABEL POSTGRES_RUNTIME_IMAGE POSTGRES_EXPORTER_ENV_FILE
prepare_host_directories
acquire_deploy_lock
survive_dropped_session
refuse_unexpected_live_release
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

log "starting ${DEPLOY_ENV} deploy of ${RELEASE_SHA}"
log "active color=${ACTIVE_COLOR} target color=${TARGET_COLOR}"

remember_previous_routing
write_postgres_exporter_env_file
write_stack_env_files
pull_application_images "${TARGET_ENV_FILE}"
back_up_database_before_deploy
start_infrastructure
run_migrations
start_target_color
promote_target_color

log "${DEPLOY_ENV} deploy complete"
log "active color=${TARGET_COLOR}"
