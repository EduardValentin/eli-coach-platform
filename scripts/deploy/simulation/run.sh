#!/usr/bin/env bash
# Runs scenarios.sh in a throwaway privileged container that carries its own
# Docker daemon, so nothing it builds, starts or prunes touches this machine's.
# DEPLOY_SIMULATION_CACHE_VOLUME names a volume that keeps the daemon's pulled
# images between runs.
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
image="eli-deploy-simulation"
cache_options=()

if [[ -n "${DEPLOY_SIMULATION_CACHE_VOLUME:-}" ]]; then
  cache_options=(--volume "${DEPLOY_SIMULATION_CACHE_VOLUME}:/var/lib/docker")
fi

docker build --quiet --tag "${image}" "${repository_root}/scripts/deploy/simulation" > /dev/null

docker run --rm --privileged \
  --env DOCKER_TLS_CERTDIR= \
  --volume "${repository_root}:/repo:ro" \
  ${cache_options[@]+"${cache_options[@]}"} \
  "${image}" \
  bash /repo/scripts/deploy/simulation/scenarios.sh
