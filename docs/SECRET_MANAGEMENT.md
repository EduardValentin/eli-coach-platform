# Secret Management

This repository does not own runtime secret files.

TEST and PROD runtime secret creation, encryption, and host sync are owned by `terraform-infra`.

## Runtime contract

This app repo still defines the runtime file shape expected by the deploy scripts:

- `/srv/apps/eli-coach-platform/.env`
- `/srv/postgres/eli-coach-platform.env`

Those files are created and synced by `terraform-infra`, not by this repository.

The app runtime file is shared by:

- `www`
- `client`
- `coach`
- `api`
- `worker`

The Postgres runtime file is only used by the Postgres container.

## Local authoring model

Plaintext local files live in the gitignored work folder under the sibling `terraform-infra` repository:

- `../terraform-infra/secrets/runtime/work/local-eli-coach-platform/eli-coach-platform.app.env`
- `../terraform-infra/secrets/runtime/work/local-eli-coach-platform/eli-coach-platform.postgres.env`

Create them from the `terraform-infra` templates with:

```bash
pnpm secrets:local:prepare
```

The local templates default to:

- PostgreSQL on `127.0.0.1:55433`
- API on `http://localhost:18080`

Local development reads those files directly from `terraform-infra`.

## CI deploy credentials owned by this repository

This repository still uses a small set of GitHub Actions secrets and variables for CI/CD transport, registry pulls, and TEST host access.

These are not application runtime secrets.

They do not replace the TEST or PROD `.env` files created by `terraform-infra`.

- `TAILSCALE_OAUTH_CLIENT_ID`
- `TAILSCALE_OAUTH_SECRET`
- `GHCR_PULL_USERNAME`
- `GHCR_PULL_TOKEN`
- `TEST_SSH_KNOWN_HOSTS`
- `TEST_NODE_HOSTNAME` as a GitHub repository variable
- `TEST_EDGE_HOSTNAME` as a GitHub repository variable or secret

`TEST_EDGE_HOSTNAME` should be only the hostname Traefik uses on the TEST VM.

`TEST_NODE_HOSTNAME` should be the stable Tailscale/MagicDNS hostname of the TEST VM. CI resolves the current Tailscale IP dynamically after connecting to the tailnet.

The TEST app mount path is part of the application architecture and is currently fixed to `/eli-coach-platform`.

`GHCR_PULL_USERNAME` and `GHCR_PULL_TOKEN` are dedicated registry pull credentials for the remote host deploy step.

The actual TEST and PROD runtime env contents remain owned by `terraform-infra`.
