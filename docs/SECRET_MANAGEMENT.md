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

Progress photos live in a second private root, configured by
`CLIENT_MEDIA_ROOT` when `CLIENT_MEDIA_PROVIDER=filesystem`. Local development
uses the gitignored `local/client-media/` directory, created by
`pnpm client:media:local:prepare`. TEST sets both values in
`deploy/test/docker-compose.application.yml` and bind-mounts the persistent
host directory `/srv/client-media/eli-coach-platform`, which the deploy script
creates, at `/srv/client-media` as read-write in both blue and green platform
containers. Like the store root, it must never be served by the edge proxy:
photos are decrypted and streamed only to their owning client and the coach.

Client resource files, the documents and images a coach shares with one client,
live in a third private root, configured by `CLIENT_RESOURCE_ROOT`. It is
required in every runtime, with no provider switch: a runtime without it fails
config validation, and a production runtime rejects the `replace-me`
placeholder. The root holds plain private files. Unlike progress photos they are
not encrypted, so it needs no key. Local development uses the gitignored
`local/client-resources/` directory, created by
`pnpm client:resources:local:prepare`. TEST sets the value in
`deploy/test/docker-compose.application.yml` and bind-mounts the persistent
host directory `/srv/client-resources/eli-coach-platform`, which the deploy
script creates, at `/srv/client-resources` as read-write in both blue and green
platform containers. It must never be served by the edge proxy: the application
streams a resource only to the client it was shared with and to the coach.

Every photo is encrypted before it is written, so the runtime file must also expose:

- `CLIENT_MEDIA_KEY` (base64 of 32 random bytes, for example `openssl rand -base64 32`; a production runtime rejects the `replace-me` placeholder)
- `CLIENT_MEDIA_KEY_ID` (a short label such as `test-1`, stored on every photo record to name the key that encrypted it)

`CLIENT_MEDIA_PROVIDER` is `memory | filesystem`; a production runtime rejects
`memory`. TEST runs as a production runtime with `filesystem`, so both secrets
must be in the TEST env file before the deploy that ships progress photos, or
the container fails config validation and exits at startup. The key in
`.env.example` is a development-only value that protects nothing. A `.env`
created before progress photos needs the four `CLIENT_MEDIA_*` lines copied
from `.env.example`.

Each environment has one key today. Rotation, a new `CLIENT_MEDIA_KEY_ID`
while the old key stays readable for the photos it encrypted, is future work:
until then, replacing `CLIENT_MEDIA_KEY` makes every stored photo unreadable,
and losing it loses them.

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
- `CLERK_SIGN_UP_URL` (required; TEST and PROD env files must add it — TEST uses the Development instance's Account Portal sign-up URL)
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
Clerk remains responsible for auth, sign-in and verification emails. Client invitation emails are the app's own: the Clerk invitations behind them are created with notifications off (see [CLERK.md](CLERK.md)).

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
- `STRIPE_PORTAL_CONFIGURATION_ID` (the customer-portal configuration every portal session is created against, a `bpc_…` id; required once `ENVIRONMENT=production`, validated wherever present)

With `PAYMENTS_PROVIDER=stripe` both secrets are required and the `replace-me` placeholder is rejected. Local defaults keep `PAYMENTS_PROVIDER=memory`; the README covers a local run against Stripe test mode.

`STRIPE_API_BASE_URL` points the Stripe client at the integration suites' WireMock container. It is an integration-test rig override only and never belongs in a TEST or PROD env file: a production runtime refuses to start with it set.

The per-environment values of both secrets are provisioned by `terraform-infra` like every other runtime secret. `PAYMENTS_PROVIDER=stripe` and both secrets must be present in the TEST and PROD env files before the next deploy: TEST also runs as a production runtime, so a runtime still on the `memory` default fails config validation and the container exits at startup.

Webhook delivery differs per environment:

- **TEST** has no public DNS, so Stripe cannot post to it. The `stripe-webhook-relay` service in `deploy/test/docker-compose.infrastructure.yml` runs `stripe listen` inside the stack and starts with every deploy beside postgres: it dials out to Stripe with `STRIPE_SECRET_KEY`, receives the account's test-mode `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded`, `invoice.paid`, `invoice.payment_failed`, `payment_method.attached`, `payment_method.automatically_updated` and `payment_method.detached` events and forwards them to the app over the compose network with the CLI's own signature. No Dashboard endpoint is registered for TEST. The signing secret is derived from the API key: run `stripe listen --api-key <the TEST STRIPE_SECRET_KEY> --print-secret` once and put its output in the TEST env file as `STRIPE_WEBHOOK_SIGNING_SECRET`; a rotated key needs the command run again. The key must be one `stripe listen` accepts (a test-mode secret key, or a restricted key that the command accepts on a dry run). Events that arrive while the relay is down are not redelivered: `stripe listen` has no redelivery, so the platform's copy of a subscription lags until Stripe sends the next event for it.
- **PROD** (future, with a public domain) registers the Dashboard endpoint `<PUBLIC_APP_URL>/api/stripe/webhooks` for the `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded`, `invoice.paid`, `invoice.payment_failed`, `payment_method.attached`, `payment_method.automatically_updated` and `payment_method.detached` events, and that endpoint's signing secret becomes `STRIPE_WEBHOOK_SIGNING_SECRET`. Where the app is served under a mount path, the path precedes `/api/`.

Each deployed environment's Stripe Dashboard (test mode for TEST, live mode for PROD) also needs these settings, which nothing in the app can set or check:

- **Customer emails** (Settings → Business → Customer emails): turn on **Successful payments** and **Refunds**, so the client gets Stripe's receipt for every payment and its notice for every refund. Stripe's receipt is the payment record; the platform sends no receipt of its own.
- **Customer portal configuration**: the platform creates every portal session against the configuration named by `STRIPE_PORTAL_CONFIGURATION_ID`, which allows payment-method updates only: subscription cancellation, subscription updates (switching plans) and customer-information updates off. TEST uses `bpc_1UNB5VJISLAbTg1k49odtOIK`, provisioned by `terraform-infra`. For live mode, create a configuration with payment-method updates on and cancellation, subscription updates and customer updates off (Dashboard → Settings → Billing → Customer portal, or `POST /v1/billing_portal/configurations`), then set its id as `STRIPE_PORTAL_CONFIGURATION_ID` in the PROD env file. The platform opens portal sessions only to the payment-method update flow and sends the client back to her Settings when she finishes, but a portal that allowed cancellation would let her cancel outside the platform's refund rules.
  - Fallback only: a runtime without `STRIPE_PORTAL_CONFIGURATION_ID` (local runs against Stripe test mode) gets Stripe's default configuration, which Stripe creates on the account's first portal session and which allows cancellation and customer updates; turn those off in the Dashboard's default customer-portal settings for such an account.
- **Failed renewals** (Billing → Revenue recovery): Smart Retries on, **Send emails when card payments fail** on, and the subscription status after all retries fail set to **Cancel the subscription**. Stripe retries a failed renewal and emails the client; while a renewal is unpaid her portal shows a payment problem, and when Stripe cancels the subscription after its last retry the platform mirrors the cancellation and her portal closes. Leaving the subscription past due or unpaid would keep her portal open with a payment problem indefinitely.

Renewal hold: when a coaching payment is recorded, the platform pauses collection on its subscription with behaviour `void` and no resume date, so no renewal is charged before her program starts. The subscription stays `active` in Stripe, and every cycle invoice until plan building lifts the hold is created and voided. Voided cycle invoices in the Dashboard are expected; nobody was charged.

Refunds are issued by the coach in the Stripe Dashboard (Payments → the charge → Refund), never by the platform. A client cancellation that owes a refund emails the coach the amount and the deadline; the platform records what Stripe refunded from `charge.refunded` on the subscription whose first payment was refunded, and a partial refund lowers what is still due. A refund of any other payment of the same customer is acknowledged and logged, and changes no subscription. A subscription the coach cancels in the Dashboard ends the client's access when Stripe reports it ended, and records no refund due; a refund she issues there anyway is still recorded as refunded.

Stripe test-mode behaviour behind these rules was probed on 2026-10-02 against API version `2026-08-26.dahlia`: pausing collection on a just-paid subscription keeps it `active` and voids each cycle invoice; an explicit cancellation date set on a paused subscription holds across a voided cycle; an immediate cancellation without proration raises no final invoice; and nothing on a refunded charge names its subscription, so refunds are matched to the client by Stripe customer.

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
