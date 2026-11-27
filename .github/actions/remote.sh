#!/usr/bin/env bash
# Sourced by the remote-connect, remote-live-release and remote-deploy actions.
# remote-connect writes the three state files; the others reach the host
# through remote().

export REMOTE_STATE_DIRECTORY="${RUNNER_TEMP}/remote-deploy"
export REMOTE_APP_DIRECTORY="/srv/apps/eli-coach-platform"

# The pre-deploy backup can stay silent for many minutes; keep the session alive.
remote() {
  ssh \
    -o StrictHostKeyChecking=yes \
    -o UserKnownHostsFile="${REMOTE_STATE_DIRECTORY}/known_hosts" \
    -o HostKeyAlias="$(cat "${REMOTE_STATE_DIRECTORY}/host-key-alias")" \
    -o ProxyCommand='tailscale nc %h %p' \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=6 \
    "$(cat "${REMOTE_STATE_DIRECTORY}/ssh-target")" \
    "$@"
}
