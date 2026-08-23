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

It should also expose the Cloudflare Turnstile keys used to verify anonymous public submissions:

- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

The platform reads published store covers and download files from a private
asset root configured by `STORE_ASSET_ROOT`. Local development uses
the gitignored `local/store-assets/` directory. TEST bind-mounts the persistent
host directory `/srv/store-assets/eli-coach-platform` at
`/srv/store-assets` as read-write in both blue and green platform containers.
The asset root must never be served directly by the edge proxy; public covers
and granted downloads are streamed only through the application routes.

The application writes files beneath that root when a product is published
through the management API, and records each asset key with its MIME type, size,
and SHA-256. Rotating or removing a file does not alter already-issued grant
records, but integrity verification will prevent a mismatched file from being
delivered. See [STORE_PUBLISHING.md](STORE_PUBLISHING.md).

Publishing is guarded by one environment-scoped bearer secret:

- `MANAGEMENT_API_SECRET`

Outside LOCAL the app refuses to start with the `replace-me` placeholder or with
anything shorter than 32 characters. It is a `terraform-infra` value on TEST and
PROD like every other runtime secret.

Local development can use Cloudflare's published testing keys from `.env.example`. Production runtime config must provide real Cloudflare keys; the app rejects production startup with the testing keys.

Authentication is provided by Clerk, and every Clerk value is server-only — none
reaches a browser bundle:

- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `CLERK_JWT_KEY`
- `BOOTSTRAP_COACH_AUTH_SUBJECT_ID`

Despite its name, the publishable key is not published here: the application
loads no Clerk browser SDK, so the key is used only to identify the instance and
derive its Account Portal URL server-side.

The three secrets default to the `replace-me` placeholder so the production
build, which prerenders public pages without ever reaching Clerk, needs no
credentials. Outside LOCAL the app refuses to start on a placeholder. LOCAL may
leave any of them unset — webhooks cannot be delivered to localhost without a
tunnel, so real keys with no signing secret is the ordinary local setup — but a
value that *is* supplied must be well formed, so a typo fails at boot.

That tolerance keys on `ENVIRONMENT`, which defaults to `local`. **A deployment
must set `ENVIRONMENT` explicitly**, or it inherits the placeholder exemption. It
cannot additionally key on `NODE_ENV`, because prerendering builds the
application container and would then demand the credentials the build must not
need.

`BOOTSTRAP_COACH_AUTH_SUBJECT_ID` is a Clerk subject id rather than an email, so
no public flow can reach an elevated role by controlling an address. It is not a
secret in the usual sense, but it is the only configuration that grants a role,
so it is owned like one.

LOCAL and TEST share the Development instance; PROD uses the Production instance
of the same Clerk application. TEST and PROD values are `terraform-infra`-owned
like every other runtime secret. See [AUTHENTICATION.md](AUTHENTICATION.md) for
the Clerk Dashboard configuration these values assume.

Product transactional emails are sent by the app only when `PRODUCT_EMAIL_PROVIDER=resend`.
Clerk remains responsible for auth, sign-in, verification, and invitation emails.

Resend runtime config is:

- `PRODUCT_EMAIL_PROVIDER`
- `RESEND_API_KEY`
- `PRODUCT_EMAIL_FROM_NAME`
- `PRODUCT_EMAIL_FROM_ADDRESS`
- `PRODUCT_EMAIL_REPLY_TO`

Local and automated integration test defaults keep `PRODUCT_EMAIL_PROVIDER=disabled`.
TEST and PROD should use separate Resend tenants or API keys and separate verified sending domains.
The app uses the same delivery behavior in TEST and PROD; safe TEST behavior comes from TEST-only Resend configuration, not from recipient rewriting in application code.
PROD must use an authenticated business sending domain and route replies through the configured business support address.
The checked-in `contact@elipersonaltrainer.com` values are configurable defaults/placeholders for now; `RESEND_API_KEY=replace-me` remains a local placeholder and is rejected when Resend delivery is enabled.

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

- PostgreSQL on `127.0.0.1:55437`
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
