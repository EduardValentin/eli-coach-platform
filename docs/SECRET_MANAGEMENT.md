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

It should also expose the bot-detection provider and the Cloudflare Turnstile keys used to verify anonymous public submissions:

- `BOT_DETECTION_PROVIDER` (`turnstile | static`; a production runtime rejects `static` at startup)
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

It must also expose the public origin the app is served on:

- `PUBLIC_APP_URL` (required in every runtime; its scheme also decides whether the management API refuses plaintext traffic)

`BOT_DETECTION_PROVIDER=turnstile`, `PRODUCT_EMAIL_PROVIDER=resend` and `PUBLIC_APP_URL=<public https origin>` must be present in the TEST and PROD env files, which `terraform-infra` owns, before the next deploy: `BOT_DETECTION_PROVIDER` is new, the old `PRODUCT_EMAIL_PROVIDER=disabled` value no longer parses, and `PUBLIC_APP_URL` is no longer optional, so a runtime missing any of them fails config validation and the container exits at startup. `ASSESSMENT_CALL_COACH_EMAIL=<the address bookings are sent to>` belongs in the same env files, but nothing refuses a runtime that still carries its placeholder.

`terraform-infra` should drop `ASSESSMENT_CALL_MEETING_LINK` from the TEST and PROD env files: the coach's meeting room is no longer environment configuration. It is saved by the coach herself at `/coach/settings` and read from the database on every join. Until she saves a link there, every join link answers "not ready" instead of resolving to a room.

The platform reads published store covers and download files from a private
asset root configured by `STORE_ASSET_ROOT`. Local development uses
the gitignored `local/store-assets/` directory, created by
`pnpm store:assets:local:prepare`. TEST bind-mounts the persistent
host directory `/srv/store-assets/eli-coach-platform` at
`/srv/store-assets` as read-write in both blue and green platform containers.
The asset root must never be served directly by the edge proxy; public covers
and granted downloads are streamed only through the application routes.

The application writes files beneath that root when a product is published
through the management API, and records each asset key with its MIME type, size,
and SHA-256. Rotating or removing a file does not alter already-issued grant
records, but integrity verification will prevent a mismatched file from being
delivered. See [STORE_PUBLISHING.md](STORE_PUBLISHING.md).

It should also expose who is notified of a booked free assessment call:

- `ASSESSMENT_CALL_COACH_EMAIL` (the address every booking notification is sent to; the committed default, `4e1c7a93b5d2@example.invalid`, names no mailbox)

The coach's own meeting room is not runtime configuration: she saves it at
`/coach/settings`, and every booking resolves to that saved room at click
time. Its join link never expires, so the room's own lobby is the whole
security boundary: the room **must** have host-admit (knock) enabled, so
nobody holding a join link enters before the coach lets them in, and it must
not be attached to a calendar event with guests, which would let any guest
join unadmitted.

It should also expose the Clerk identity provider configuration:

- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_SIGN_IN_URL`
- `CLERK_WEBHOOK_SIGNING_SECRET` (required once `ENVIRONMENT=production`; validated wherever present)
- `BOOTSTRAP_COACH_AUTH_SUBJECT_ID` (optional)

See [CLERK.md](CLERK.md) for the full per-environment contract, the Clerk
Dashboard configuration this app assumes, and the opt-in TEST webhook relay
(`deploy/test/docker-compose.webhook-relay.yml`), which needs its own
`CLERK_WEBHOOK_RELAY_TOKEN` in the same runtime file.

Publishing is guarded by one environment-scoped bearer secret:

- `MANAGEMENT_API_SECRET`

Outside LOCAL the app refuses to start with the `replace-me` placeholder or with
anything shorter than 32 characters. It is a `terraform-infra` value on TEST and
PROD like every other runtime secret.

Local development can use Cloudflare's published testing keys from `.env.example`. Production runtime config must provide real Cloudflare keys; the app rejects production startup with the testing keys.

Product transactional emails are sent by the app only when `PRODUCT_EMAIL_PROVIDER=resend`.
Clerk remains responsible for auth, sign-in, verification, and invitation emails.

Resend runtime config is:

- `PRODUCT_EMAIL_PROVIDER` (`memory | resend`; a production runtime rejects `memory`, and the former `disabled` value no longer parses)
- `RESEND_API_KEY`
- `PRODUCT_EMAIL_FROM_NAME`
- `PRODUCT_EMAIL_FROM_ADDRESS`
- `PRODUCT_EMAIL_REPLY_TO`

Local and automated integration test defaults keep `PRODUCT_EMAIL_PROVIDER=memory`.
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

## Payments (Stripe)

Coaching bundles are paid on Stripe's hosted Checkout. The application runtime file should expose:

- `PAYMENTS_PROVIDER` (`memory | stripe`; a production runtime rejects `memory` at startup)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SIGNING_SECRET`

With `PAYMENTS_PROVIDER=stripe` both secrets are required and the `replace-me` placeholder is rejected. Local defaults keep `PAYMENTS_PROVIDER=memory`; the README covers a local run against Stripe test mode.

`STRIPE_API_BASE_URL` points the Stripe client at the integration suites' WireMock container. It is an integration-test rig override only and never belongs in a TEST or PROD env file: a production runtime refuses to start with it set.

The per-environment values of both secrets, and the Stripe Dashboard webhook endpoint whose signing secret becomes `STRIPE_WEBHOOK_SIGNING_SECRET`, are provisioned by `terraform-infra` like every other runtime secret. `PAYMENTS_PROVIDER=stripe` and both secrets must be present in the TEST and PROD env files before the next deploy: TEST also runs as a production runtime, so a runtime still on the `memory` default fails config validation and the container exits at startup.

Each deployed environment's Stripe Dashboard needs:

- Customer receipt emails turned on. Stripe's receipt is the payment record; the platform sends no receipt of its own.
- The webhook endpoint `<PUBLIC_APP_URL>/api/stripe/webhooks`, registered for the `checkout.session.completed` event. Where the app is served under a mount path, the path precedes `/api/`: on TEST the endpoint is `<PUBLIC_APP_URL>/eli-coach-platform/api/stripe/webhooks`. Its signing secret is `STRIPE_WEBHOOK_SIGNING_SECRET`. TEST has no public DNS today (Clerk reaches it through the TEST relay in `docs/CLERK.md`), so Stripe cannot deliver there until TEST gains a public route or a relay of its own; that is a `terraform-infra` step.

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
- `CLERK_SECRET_KEY`, for the Lighthouse CI job only

`TEST_EDGE_HOSTNAME` should be only the hostname Traefik uses on the TEST VM.

`TEST_NODE_HOSTNAME` should be the stable Tailscale/MagicDNS hostname of the TEST VM. CI resolves the current Tailscale IP dynamically after connecting to the tailnet.

The TEST app mount path is part of the application architecture and is currently fixed to `/eli-coach-platform`.

`GHCR_PULL_USERNAME` and `GHCR_PULL_TOKEN` are dedicated registry pull credentials for the remote deploy step.

`CLERK_SECRET_KEY` here is the same Development-instance value LOCAL and TEST
already use (see [CLERK.md](CLERK.md)), held as its own CI secret because the
Lighthouse job runs the real app with clerkMiddleware active and needs it to
complete Clerk's dev-browser handshake — see the comment on
`requireRealClerkSecretKey` in `lighthouserc.cjs` for why a dummy value fails
there. It is not a TEST or PROD deploy credential.

The actual TEST and PROD runtime env contents remain owned by `terraform-infra`.
