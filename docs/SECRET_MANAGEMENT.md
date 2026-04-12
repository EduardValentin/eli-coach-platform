# Secret Management

This repository does not own TEST or PROD runtime secret values.

Runtime secret creation, encryption, and host sync are owned by `terraform-infra`.

## Runtime contract

This app repo defines the runtime file shape expected by the deploy scripts:

- `/srv/apps/eli-coach-platform/.env`
- `/srv/postgres/eli-coach-platform.env`

Those files are created and synced by `terraform-infra`, not by this repository.

The application runtime file is consumed by the single production app container.
It should expose the runtime database connection pieces rather than a prebuilt URL:

- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`

The Postgres runtime file is only used by the Postgres container.

It now also carries the database bootstrap and migration-role inputs used by provisioning automation, including:

- `APP_DB_SCHEMA`
- `APP_DB_APP_USER`
- `APP_DB_APP_PASSWORD`
- `APP_DB_MIGRATION_USER`
- `APP_DB_MIGRATION_PASSWORD`

## Local authoring model

Local development uses gitignored files in the repository root:

- `.env`
- `.env.postgres`

Create them from the checked-in local templates with:

```bash
pnpm secrets:local:prepare
```

The local templates default to:

- PostgreSQL on `127.0.0.1:55433`
- the full-stack app on `http://localhost:3000`
- separate runtime, migration, and bootstrap credentials for database access

Local development reads those files directly from the repository root.

The app startup uses standard framework/runtime env loading:

- Vite config loads root `.env` values with `loadEnv(...)`
- local React Router dev startup uses Node's native `--env-file`
- server runtime code reads server-only values from `process.env`

## CI deploy credentials owned by this repository

This repository uses a small set of GitHub Actions secrets and variables for CI/CD transport, registry pulls, and TEST host access.

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

`GHCR_PULL_USERNAME` and `GHCR_PULL_TOKEN` are dedicated registry pull credentials for the remote deploy step.

The actual TEST and PROD runtime env contents remain owned by `terraform-infra`.
