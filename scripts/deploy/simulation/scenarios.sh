#!/usr/bin/env bash
# Runs the real scripts/deploy/deploy.sh against a real Traefik and real Docker
# (a nested daemon) with stub applications, and checks what each scenario
# leaves behind. Started by run.sh inside the simulation container.
set -euo pipefail

REPOSITORY=/repo
SIMULATION="${REPOSITORY}/scripts/deploy/simulation"
STATE=/sim/state
APP_DIR=/srv/apps/eli-coach-platform
EDGE_DIR=/srv/edge/dynamic
EDGE_HOST=sim.example.test
TAILSCALE_ADDRESS=100.64.0.7
REGISTRY=localhost:5000
SHA_LENGTH=40
FAILURES=0
PROBE_PID=""
DEPLOY_STATUS=0
LAST_PLATFORM_IMAGE=""
FIRST_IMAGE=""

# --- harness ---------------------------------------------------------------

section() {
  printf '\n== %s\n' "$*"
}

check() {
  local description="$1"
  shift

  if "$@"; then
    printf '  ok: %s\n' "${description}"
  else
    printf '  NOT OK: %s\n' "${description}"
    printf -- '--- last deploy output ---\n'
    tail -n 40 "${STATE}/deploy.log" || true
    printf -- '--------------------------\n'
    FAILURES=$((FAILURES + 1))
  fi
}

negated() {
  ! "$@"
}

release_sha() {
  printf "%0${SHA_LENGTH}d" "$1"
}

start_docker_daemon() {
  # The image points the client at a sibling "docker" host; the daemon here is local.
  export DOCKER_HOST=unix:///var/run/docker.sock
  dockerd-entrypoint.sh dockerd > /var/log/dockerd.log 2>&1 &

  for _ in $(seq 1 60); do
    if docker info > /dev/null 2>&1; then
      return
    fi
    sleep 1
  done

  cat /var/log/dockerd.log
  echo "the nested Docker daemon did not start" >&2
  exit 1
}

publish_image() {
  local context="$1"
  local repository="$2"
  shift 2
  local tag=""

  tag="${REGISTRY}/sim/${repository}:$(date +%s%N)"

  docker build --quiet "$@" --tag "${tag}" "${context}" > /dev/null
  docker push --quiet "${tag}" > /dev/null
  docker image inspect --format '{{index .RepoDigests 0}}' "${tag}"
}

platform_image() {
  local release="$1"
  local variant="$2"

  local variant_args=()

  case "${variant}" in
    good) ;;
    edge-broken) variant_args=(--build-arg STUB_EDGE_STATUS=500) ;;
    unhealthy) variant_args=(--build-arg STUB_READY=no) ;;
  esac

  publish_image "${SIMULATION}/stubs/platform" platform --build-arg "RELEASE=${release}" ${variant_args[@]+"${variant_args[@]}"}
}

prepare_host() {
  mkdir -p "${STATE}" "${APP_DIR}/scripts/deploy" "${APP_DIR}/deploy" "${EDGE_DIR}" /srv/postgres /certs

  cp "${REPOSITORY}/scripts/deploy/deploy.sh" "${APP_DIR}/scripts/deploy/deploy.sh"
  cp "${SIMULATION}/stubs/run_migrations.sh" "${APP_DIR}/scripts/deploy/run_migrations.sh"
  cp -r "${REPOSITORY}/deploy/env" "${REPOSITORY}/deploy/traefik" "${APP_DIR}/deploy/"
  cp "${REPOSITORY}"/deploy/docker-compose.application.yml "${REPOSITORY}"/deploy/docker-compose.infrastructure.yml "${APP_DIR}/deploy/"
  cp "${SIMULATION}/stubs/app-backup.sh" /usr/local/bin/app-backup
  chmod +x "${APP_DIR}/scripts/deploy/deploy.sh" "${APP_DIR}/scripts/deploy/run_migrations.sh" /usr/local/bin/app-backup

  echo "PLACEHOLDER=1" > "${APP_DIR}/.env"
  printf 'POSTGRES_USER=sim\nPOSTGRES_DB=sim\nPOSTGRES_PASSWORD=sim\nAPP_DB_MONITORING_USER=monitor\nAPP_DB_MONITORING_PASSWORD=monitorpass\n' > /srv/postgres/eli-coach-platform.env

  # The edge and the exporter publish on a non-loopback address, as on TEST
  # hosts, so a probe that assumes loopback fails here too.
  ip addr add "${TAILSCALE_ADDRESS}/32" dev lo
  mkdir -p /srv/apps/observability
  echo "METRICS_BIND_IP=${TAILSCALE_ADDRESS}" > /srv/apps/observability/.env
  printf 'TRAEFIK_BIND_IP=%s\nMETRICS_BIND_IP=%s\n' "${TAILSCALE_ADDRESS}" "${TAILSCALE_ADDRESS}" > /srv/edge/.env

  openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj "/CN=${EDGE_HOST}" \
    -addext "subjectAltName=DNS:${EDGE_HOST},DNS:www.${EDGE_HOST}" \
    -keyout /certs/sim.key -out /certs/sim.crt 2> /dev/null
  cp /certs/sim.crt /usr/local/share/ca-certificates/sim.crt
  update-ca-certificates > /dev/null 2>&1

  cp "${SIMULATION}/traefik/00-base.yml" "${EDGE_DIR}/00-base.yml"
}

# A cached daemon (DEPLOY_SIMULATION_CACHE_VOLUME) keeps its images but must
# not keep the previous run's containers or networks.
wipe_previous_run() {
  docker ps --all --quiet | xargs -r docker rm --force > /dev/null
  docker network prune --force > /dev/null
}

start_edge() {
  docker network create edge_default > /dev/null
  docker run --detach --name sim-registry --publish 127.0.0.1:5000:5000 \
    registry:2@sha256:a3d8aaa63ed8681a604f1dea0aa03f100d5895b6a58ace528858a7b332415373 > /dev/null
  docker run --detach --name sim-traefik --network edge_default \
    --publish "${TAILSCALE_ADDRESS}:80:80" --publish "${TAILSCALE_ADDRESS}:443:443" \
    --volume "${EDGE_DIR}:/dynamic:ro" \
    --volume "${SIMULATION}/traefik/traefik.yml:/etc/traefik/traefik.yml:ro" \
    --volume /certs:/certs:ro \
    traefik@sha256:e561a37f8710d9cf41c78bdf421d822b2c0b48267ec0552e644565fb55466ea9 > /dev/null
}

reset_host() {
  stop_probe
  docker ps --all --quiet --filter name=eli-coach-platform- | xargs -r docker rm --force > /dev/null
  rm -f "${APP_DIR}/releases.jsonl" "${APP_DIR}/active-color" "${APP_DIR}/deploy.lock" "${APP_DIR}"/deploy-*.env "${EDGE_DIR}"/eli-coach-platform-*.yml
  : > "${STATE}/backup.log"
  : > "${STATE}/migrations.log"
  echo ok > "${STATE}/backup-mode"
  # Traefik drops the removed routes within a second or so.
  sleep 2
}

# Runs a command with the environment every deploy starts from; later
# assignments override these defaults.
with_deploy_defaults() {
  env \
    DEPLOY_ENV=prod \
    EDGE_HOSTNAME="${EDGE_HOST}" \
    MIGRATION_IMAGE="${REGISTRY}/sim/migrations@sha256:$(printf '0%.0s' $(seq 1 64))" \
    POSTGRES_RUNTIME_IMAGE="${POSTGRES_IMAGE}" \
    READINESS_TIMEOUT_SECONDS=20 \
    PUBLIC_CHECK_TIMEOUT_SECONDS=15 \
    BACKUP_TIMEOUT_SECONDS=30 \
    "$@"
}

run_deploy() {
  set +e
  with_deploy_defaults "$@" bash "${APP_DIR}/scripts/deploy/deploy.sh" > "${STATE}/deploy.log" 2>&1
  DEPLOY_STATUS=$?
  set -e
}

deploy_release() {
  local release="$1"
  local variant="$2"
  shift 2

  LAST_PLATFORM_IMAGE="$(platform_image "${release}" "${variant}")"
  run_deploy RELEASE_SHA="$(release_sha "${release}")" PLATFORM_IMAGE="${LAST_PLATFORM_IMAGE}" "$@"
}

# --- observations ----------------------------------------------------------

edge_url() {
  local prefix="$1"
  printf 'https://%s%s/readyz' "${EDGE_HOST}" "${prefix}"
}

edge_response() {
  curl --silent --max-time 5 --output /dev/null --dump-header - --write-out 'status:%{http_code}\n' \
    --connect-to "${EDGE_HOST}:443:${TAILSCALE_ADDRESS}:443" "$(edge_url "${1:-}")" | tr -d '\r'
}

edge_serves_colour() {
  local colour="$1"
  local prefix="${2:-}"
  local response=""

  response="$(edge_response "${prefix}")"
  grep -q '^status:200$' <<< "${response}" && grep -qi "^x-stack-color: ${colour}$" <<< "${response}"
}

start_probe() {
  : > "${STATE}/probe.log"
  (
    while true; do
      curl --silent --max-time 2 --output /dev/null --write-out '%{http_code}\n' \
        --connect-to "${EDGE_HOST}:443:${TAILSCALE_ADDRESS}:443" "$(edge_url "")" >> "${STATE}/probe.log" || true
      sleep 0.2
    done
  ) &
  PROBE_PID=$!
}

stop_probe() {
  if [[ -n "${PROBE_PID}" ]]; then
    kill "${PROBE_PID}" 2> /dev/null || true
    wait "${PROBE_PID}" 2> /dev/null || true
    PROBE_PID=""
  fi
}

probe_never_failed() {
  [[ -s "${STATE}/probe.log" ]] && ! grep -qv '^200$' "${STATE}/probe.log"
}

deploy_exit_is() {
  [[ "${DEPLOY_STATUS}" == "$1" ]]
}

output_contains() {
  grep -q -- "$1" "${STATE}/deploy.log"
}

ledger_length() {
  if [[ -f "${APP_DIR}/releases.jsonl" ]]; then
    wc -l < "${APP_DIR}/releases.jsonl" | tr -d ' '
  else
    echo 0
  fi
}

ledger_has_length() {
  [[ "$(ledger_length)" == "$1" ]]
}

ledger_live_is() {
  [[ "$(tail -n 1 "${APP_DIR}/releases.jsonl" | jq -r '.sha + " " + .color')" == "$(release_sha "$1") $2" ]]
}

ledger_snapshot_is() {
  [[ "$(tail -n 1 "${APP_DIR}/releases.jsonl" | jq -r '.snapshot // "null"')" == "$1" ]]
}

ledger_records_images() {
  tail -n 1 "${APP_DIR}/releases.jsonl" | jq -e --arg platform "$1" '.images.platform == $platform and (.images.migration | length > 0) and (.images.postgresRuntime | length > 0) and .kind == "release"' > /dev/null
}

active_colour_is() {
  [[ "$(cat "${APP_DIR}/active-color")" == "$1" ]]
}

routing_file() {
  echo "${EDGE_DIR}/eli-coach-platform-${1}.yml"
}

routing_checksum() {
  sha256sum "$(routing_file prod)" | cut -d' ' -f1
}

container_running() {
  [[ "$(docker inspect --format '{{.State.Running}}' "eli-coach-platform-${1}" 2> /dev/null)" == "true" ]]
}

container_exists() {
  docker inspect "eli-coach-platform-${1}" > /dev/null 2>&1
}

image_is_present() {
  docker image inspect "$1" > /dev/null 2>&1
}

backup_calls() {
  wc -l < "${STATE}/backup.log" | tr -d ' '
}

backup_called_with() {
  grep -qxF -- "$1" "${STATE}/backup.log"
}

migration_count() {
  wc -l < "${STATE}/migrations.log" | tr -d ' '
}

migration_count_is() {
  [[ "$(migration_count)" == "$1" ]]
}

# --- scenarios -------------------------------------------------------------

first_release_with_no_postgres_container() {
  section "First PROD release: no old colour, backup reports no Postgres container"
  reset_host
  echo no-postgres > "${STATE}/backup-mode"

  deploy_release 1 good EXPECTED_LIVE_SHA=none
  FIRST_IMAGE="${LAST_PLATFORM_IMAGE}"

  check "exits 0" deploy_exit_is 0
  check "asked the backup command for a db backup of the app, labelled with the commit" \
    backup_called_with "db eli-coach-platform|predeploy-$(release_sha 1)"
  check "accepted the missing Postgres container on the first release" output_contains "first deploy, nothing to back up"
  check "ran the migrations" migration_count_is 1
  check "recorded one release on the green colour with no snapshot" ledger_live_is 1 green
  check "recorded no snapshot id" ledger_snapshot_is null
  check "recorded the platform digest" ledger_records_images "${FIRST_IMAGE}"
  check "wrote the active colour" active_colour_is green
  check "serves through the edge with the green header" edge_serves_colour green
  check "left Postgres running" container_running prod-postgres
}

second_release_without_interruption() {
  section "Second PROD release: the old colour serves until the public check passes"
  echo ok > "${STATE}/backup-mode"
  local postgres_before=""
  postgres_before="$(docker inspect --format '{{.Id}}' eli-coach-platform-prod-postgres)"

  start_probe
  deploy_release 2 good EXPECTED_LIVE_SHA="$(release_sha 1)"
  sleep 1
  stop_probe

  check "exits 0" deploy_exit_is 0
  check "took the backup before deploying" backup_called_with "db eli-coach-platform|predeploy-$(release_sha 2)"
  check "recorded the snapshot id in the ledger" ledger_snapshot_is snap2
  check "recorded the release on the blue colour" ledger_live_is 2 blue
  check "has two ledger lines" ledger_has_length 2
  check "serves through the edge with the blue header" edge_serves_colour blue
  check "retired the old colour" negated container_exists prod-platform-green
  check "kept the first release's image" image_is_present "${FIRST_IMAGE}"
  check "left the Postgres container alone" test "$(docker inspect --format '{{.Id}}' eli-coach-platform-prod-postgres)" = "${postgres_before}"
  check "answered every request during the deploy with 200" probe_never_failed
}

release_that_fails_only_at_the_edge() {
  section "A release healthy inside the container but failing at the edge switches back"
  local routing_before=""
  routing_before="$(routing_checksum)"

  deploy_release 3 edge-broken EXPECTED_LIVE_SHA="$(release_sha 2)"

  check "exits 20" deploy_exit_is 20
  check "restored the routing file" test "$(routing_checksum)" = "${routing_before}"
  check "restored the active colour" active_colour_is blue
  check "kept the live release in the ledger" ledger_live_is 2 blue
  check "has no new ledger line" ledger_has_length 2
  check "still runs the old colour" container_running prod-platform-blue
  check "removed the new colour" negated container_exists prod-platform-green
  check "serves through the edge with the old colour" edge_serves_colour blue
}

failed_backups_stop_the_deploy() {
  section "A failed pre-deploy backup stops the deploy before anything changes"
  local migrations_before=""
  migrations_before="$(migration_count)"

  echo fail > "${STATE}/backup-mode"
  deploy_release 4 good EXPECTED_LIVE_SHA="$(release_sha 2)"
  check "exits 11 when the backup exits 1" deploy_exit_is 11
  check "did not run the migrations" migration_count_is "${migrations_before}"
  check "did not start the new colour" negated container_exists prod-platform-green

  echo no-postgres > "${STATE}/backup-mode"
  deploy_release 4 good EXPECTED_LIVE_SHA="$(release_sha 2)"
  check "exits 11 when the Postgres container is missing but a release is live" deploy_exit_is 11
  check "did not run the migrations" migration_count_is "${migrations_before}"

  echo no-snapshot-line > "${STATE}/backup-mode"
  deploy_release 4 good EXPECTED_LIVE_SHA="$(release_sha 2)"
  check "exits 11 when the backup prints no snapshot id" deploy_exit_is 11

  check "left the ledger alone" ledger_has_length 2
  check "still serves the live release" edge_serves_colour blue
}

deploy_without_the_compare_and_swap() {
  section "PROD refuses to deploy without EXPECTED_LIVE_SHA"
  local backups_before=""
  backups_before="$(backup_calls)"

  deploy_release 5 good

  check "exits 12" deploy_exit_is 12
  check "asks for EXPECTED_LIVE_SHA" output_contains "EXPECTED_LIVE_SHA is required on prod"
  check "never reached the backup" test "$(backup_calls)" = "${backups_before}"
}

deploy_without_the_metrics_inputs() {
  section "PROD stays closed without the metrics bind address or the monitoring role"
  local backups_before=""
  backups_before="$(backup_calls)"
  local observability_env=/srv/apps/observability/.env
  local postgres_env=/srv/postgres/eli-coach-platform.env

  mv "${observability_env}" "${observability_env}.hidden"
  deploy_release 5 good EXPECTED_LIVE_SHA="$(release_sha 2)"
  mv "${observability_env}.hidden" "${observability_env}"
  check "exits 12 without METRICS_BIND_IP" deploy_exit_is 12
  check "names the observability env file" output_contains "observability/.env"

  cp "${postgres_env}" "${postgres_env}.saved"
  sed -i '/^APP_DB_MONITORING_/d' "${postgres_env}"
  deploy_release 5 good EXPECTED_LIVE_SHA="$(release_sha 2)"
  mv "${postgres_env}.saved" "${postgres_env}"
  check "exits 12 without the monitoring role keys" deploy_exit_is 12
  check "names the monitoring user" output_contains "APP_DB_MONITORING_USER"

  check "never reached the backup" test "$(backup_calls)" = "${backups_before}"
  check "kept the ledger" ledger_has_length 2
}

deploy_without_the_edge_address() {
  section "PROD stays closed without the address the edge listens on"
  local backups_before=""
  backups_before="$(backup_calls)"
  local edge_env=/srv/edge/.env

  cp "${edge_env}" "${edge_env}.saved"
  sed -i '/^TRAEFIK_BIND_IP=/d' "${edge_env}"
  deploy_release 5 good EXPECTED_LIVE_SHA="$(release_sha 2)"
  mv "${edge_env}.saved" "${edge_env}"

  check "exits 12 without TRAEFIK_BIND_IP" deploy_exit_is 12
  check "names the edge env file" output_contains "edge/.env"
  check "never reached the backup" test "$(backup_calls)" = "${backups_before}"
  check "kept the ledger" ledger_has_length 2
  check "still serves the live release" edge_serves_colour blue
}

lost_ledger_does_not_skip_the_backup() {
  section "A missing Postgres container with an earlier release's state is not a first deploy"
  local ledger_copy="${STATE}/releases.jsonl.copy"

  mv "${APP_DIR}/releases.jsonl" "${ledger_copy}"
  echo no-postgres > "${STATE}/backup-mode"

  deploy_release 5 good EXPECTED_LIVE_SHA=none

  check "exits 11" deploy_exit_is 11
  check "explains the lost ledger" output_contains "lost ledger must not skip the backup"

  mv "${ledger_copy}" "${APP_DIR}/releases.jsonl"
  echo ok > "${STATE}/backup-mode"
}

legacy_postgres_data_does_not_skip_the_backup() {
  section "Legacy root-level Postgres data is not a first deploy either"
  reset_host
  echo no-postgres > "${STATE}/backup-mode"
  mkdir -p /srv/postgres/data/eli-coach-platform
  touch /srv/postgres/data/eli-coach-platform/PG_VERSION

  deploy_release 1 good EXPECTED_LIVE_SHA=none

  rm -f /srv/postgres/data/eli-coach-platform/PG_VERSION

  check "exits 11" deploy_exit_is 11
  check "explains the earlier state" output_contains "earlier release's state"
}

# Gives up after a minute; the caller's check reports the miss.
wait_for_last_deploy_log() {
  local deadline=$((SECONDS + 60))

  until grep -q "$1" "${APP_DIR}/last-deploy.log" 2> /dev/null || (( SECONDS >= deadline )); do
    sleep 1
  done
}

session_that_drops_mid_deploy() {
  section "A dropped session does not stop the deploy"
  reset_host
  echo no-postgres > "${STATE}/backup-mode"

  # head closing the pipe after two lines is what a lost SSH session looks like.
  LAST_PLATFORM_IMAGE="$(platform_image 1 good)"
  with_deploy_defaults RELEASE_SHA="$(release_sha 1)" EXPECTED_LIVE_SHA=none PLATFORM_IMAGE="${LAST_PLATFORM_IMAGE}" \
    bash "${APP_DIR}/scripts/deploy/deploy.sh" 2>&1 | head -n 2 > /dev/null || true
  wait_for_last_deploy_log 'prod deploy complete'

  check "finished the deploy" grep -q 'prod deploy complete' "${APP_DIR}/last-deploy.log"
  check "keeps its log readable by root only" test "$(stat -c %a "${APP_DIR}/last-deploy.log")" = 600
  check "recorded the release" ledger_live_is 1 green
  check "serves the new colour" edge_serves_colour green
}

refused_deploys() {
  section "Deploys that disagree with the host are refused"
  echo ok > "${STATE}/backup-mode"
  local backups_before=""
  backups_before="$(backup_calls)"

  deploy_release 5 good EXPECTED_LIVE_SHA="$(release_sha 7)"
  check "exits 10 when another commit is live" deploy_exit_is 10

  deploy_release 5 good EXPECTED_LIVE_SHA=none
  check "exits 10 when none is expected but a release is live" deploy_exit_is 10

  # exec makes sleep the holder itself, so killing it frees the lock.
  (
    exec 8> "${APP_DIR}/deploy.lock"
    flock 8
    exec sleep 30
  ) &
  local holder=$!
  sleep 1
  deploy_release 5 good EXPECTED_LIVE_SHA="$(release_sha 2)"
  kill "${holder}" 2> /dev/null || true
  wait "${holder}" 2> /dev/null || true
  check "exits 10 while another deploy holds the lock" deploy_exit_is 10
  check "names the lock" output_contains "another deploy holds"

  check "never reached the backup" test "$(backup_calls)" = "${backups_before}"
  check "left the ledger alone" ledger_has_length 2
}

release_that_never_becomes_healthy() {
  section "A new colour that never becomes healthy is removed and traffic is untouched"
  local routing_before=""
  routing_before="$(routing_checksum)"

  deploy_release 6 unhealthy EXPECTED_LIVE_SHA="$(release_sha 2)"

  check "exits 12" deploy_exit_is 12
  check "did not touch the routing file" test "$(routing_checksum)" = "${routing_before}"
  check "removed the unhealthy colour" negated container_exists prod-platform-green
  check "kept the ledger" ledger_has_length 2
  check "still serves the live release" edge_serves_colour blue
}

release_whose_image_cannot_be_pulled() {
  section "A missing image fails before the backup"
  local backups_before=""
  backups_before="$(backup_calls)"

  run_deploy RELEASE_SHA="$(release_sha 8)" EXPECTED_LIVE_SHA="$(release_sha 2)" \
    PLATFORM_IMAGE="${REGISTRY}/sim/platform@sha256:$(printf '0%.0s' $(seq 1 64))"

  check "exits 12" deploy_exit_is 12
  check "never reached the backup" test "$(backup_calls)" = "${backups_before}"
  check "kept the ledger" ledger_has_length 2
}

switch_back_with_no_previous_colour_running() {
  section "No colour to switch back to: exit 30 and the new colour stays for inspection"
  docker stop eli-coach-platform-prod-platform-blue > /dev/null

  deploy_release 9 edge-broken EXPECTED_LIVE_SHA="$(release_sha 2)"

  check "exits 30" deploy_exit_is 30
  check "explains there is nothing to switch back to" output_contains "nothing to switch back to"
  check "keeps the new colour" container_running prod-platform-green
  check "has no new ledger line" ledger_has_length 2
}

next_deploy_after_a_colour_left_for_inspection() {
  section "After an exit 30 the next deploy restarts the stopped colour and retires the one left for inspection"

  deploy_release 10 good EXPECTED_LIVE_SHA="$(release_sha 2)"

  check "exits 0" deploy_exit_is 0
  check "recorded the release on blue" ledger_live_is 10 blue
  check "runs the restarted colour" container_running prod-platform-blue
  check "serves through the edge with the blue header" edge_serves_colour blue
  check "retired the colour left for inspection" negated container_exists prod-platform-green
}

first_release_that_fails_at_the_edge() {
  section "First PROD release failing at the edge leaves the host with no routing"
  reset_host
  echo no-postgres > "${STATE}/backup-mode"

  deploy_release 1 edge-broken EXPECTED_LIVE_SHA=none

  check "exits 20" deploy_exit_is 20
  check "left no routing file" negated test -e "$(routing_file prod)"
  check "left no active colour" negated test -e "${APP_DIR}/active-color"
  check "removed the new colour" negated container_exists prod-platform-green
  check "recorded no release" ledger_has_length 0
}

test_environment_sequence() {
  section "TEST: prefix, design reference, no backup, old colour retired after the check"
  reset_host
  local design_image=""
  design_image="$(platform_image 1 good)"

  deploy_release 1 good DEPLOY_ENV=test DESIGN_REFERENCE_IMAGE="${design_image}"
  check "first deploy exits 0" deploy_exit_is 0
  deploy_release 2 good DEPLOY_ENV=test DESIGN_REFERENCE_IMAGE="${design_image}"

  check "second deploy exits 0" deploy_exit_is 0
  check "never called the backup" test "$(backup_calls)" = 0
  check "recorded both releases" ledger_has_length 2
  check "serves under the TEST prefix with the blue header" edge_serves_colour blue /eli-coach-platform
  check "retired the old colour" negated container_exists test-platform-green
  check "retired the old design reference" negated container_exists test-design-reference-green
  check "runs the new design reference" container_running test-design-reference-blue
}

# --- run -------------------------------------------------------------------

start_docker_daemon
wipe_previous_run
prepare_host
start_edge
POSTGRES_IMAGE="$(publish_image "${SIMULATION}/stubs/postgres" postgres)"

first_release_with_no_postgres_container
second_release_without_interruption
release_that_fails_only_at_the_edge
failed_backups_stop_the_deploy
deploy_without_the_compare_and_swap
deploy_without_the_metrics_inputs
deploy_without_the_edge_address
lost_ledger_does_not_skip_the_backup
refused_deploys
release_that_never_becomes_healthy
release_whose_image_cannot_be_pulled
switch_back_with_no_previous_colour_running
next_deploy_after_a_colour_left_for_inspection
first_release_that_fails_at_the_edge
legacy_postgres_data_does_not_skip_the_backup
session_that_drops_mid_deploy
test_environment_sequence

stop_probe

if (( FAILURES > 0 )); then
  printf '\n%s simulation check(s) failed\n' "${FAILURES}"
  exit 1
fi

printf '\nAll simulation checks passed\n'
