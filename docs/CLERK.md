# Clerk

Clerk is the identity provider: email one-time-code sign-in/sign-up, session
management, and account deletion events. This document is the configuration
of record — what the Clerk Dashboard is set to, what each environment's
runtime needs, and how to exercise the integration locally.

## Application and instance

- Clerk application: **Evoa Fitness** (`app_3IDSQdcLIFjBRjtskzl4RJCnRYv`)
- Development instance: `ins_3IDSQcUIvh3U5zeMdXyXKihssQU`, shared by LOCAL and
  TEST
- Production instance: not created yet. PROD will get its own instance under
  the same application when it is provisioned.
- Account Portal sign-in URL for the Development instance (the LOCAL/TEST
  value of `CLERK_SIGN_IN_URL`):
  `https://distinct-mastiff-1353.accounts.dev/sign-in`

## Instance configuration

This is the approved configuration for the Development instance, verified
live via the Clerk CLI against the Dashboard/FAPI:

- **Sign-in/verification strategy**: email one-time code only. Passwords,
  phone, username, passkeys, web3, and every social connection are disabled.
- **MFA**: off.
- **Legal consent collection**: off (this app's own Terms acceptance is
  handled separately, not through Clerk).
- **Sign-up mode**: public.
- **Session lifetime**: `maximum_lifetime` 604800 seconds (7 days), enabled.
- **Multi-session**: disabled (`multi_session_enabled: false`) — one active
  session per browser.
- **Bot protection**: captcha, smart mode.
- **Self-service account deletion**: current state **enabled**
  (`user_settings.actions.delete_self: true`, verified against the instance's
  FAPI environment); required state **disabled**. This app renders no account
  deletion UI either way, so the capability being on is a Dashboard-level gap
  rather than something reachable from its routes.

  > **Manual owner step.** `delete_self` is Dashboard-only — it is not
  > settable through the Clerk CLI, the Backend API, or the Platform API. The
  > app owner flips it in the Clerk Dashboard: the **"Allow users to delete
  > their accounts"** toggle in the user-profile/security settings section.
  > Until that happens, the instance stays in the current state above.

- **Allowed origins**: `allowed_origins` is **null** on the Development
  instance. That is the dev-instance default — unrestricted — and it is
  acceptable while LOCAL and TEST share this instance. The future Production
  instance must set explicit allowed origins. The allowlist is what constrains
  which `redirect_url` targets the Account Portal will honour, so it is the
  instance-side complement to this app's own PUBLIC_APP_URL origin rewrite
  (see `buildSignInRedirectTarget` in
  `apps/platform/src/features/accounts/server/require-account.server.ts`):
  the app decides the origin it asks Clerk to return to, and the allowlist is
  what stops any other origin being asked for.

## Environment contract

| Variable | LOCAL | TEST | PROD |
| --- | --- | --- | --- |
| `CLERK_PUBLISHABLE_KEY` | Development instance value, in `.env` | Development instance value, sops-encrypted, infra-owned | Production instance value (future) |
| `CLERK_SECRET_KEY` | Development instance value, in `.env` | Development instance value, sops-encrypted, infra-owned | Production instance value (future) |
| `CLERK_SIGN_IN_URL` | `https://distinct-mastiff-1353.accounts.dev/sign-in` | same as LOCAL (shared Development instance) | Production instance's Account Portal URL (future) |
| `CLERK_WEBHOOK_SIGNING_SECRET` | optional; only needed to receive real webhook deliveries (see below) | required once the TEST relay is in use | required (`ENVIRONMENT=production` enforces this) |
| `BOOTSTRAP_COACH_AUTH_SUBJECT_ID` | optional | optional | set once, to the operator's Clerk subject id |

All five are read by `packages/config`'s runtime environment schema; the
first three are required unconditionally, the last two are optional and
validated only where present (a malformed value fails at boot rather than at
first use). LOCAL and TEST's actual values live in the gitignored root
`.env` and in `terraform-infra`'s sops-encrypted TEST env file respectively —
this repository does not own either value; see
[SECRET_MANAGEMENT.md](SECRET_MANAGEMENT.md).

### Deltas from the earlier GEN-188 infra ticket text

- **`CLERK_JWT_KEY` is dropped.** Session verification is JWKS-only through
  the Clerk SDK — there is no local networkless-verification key in this
  design. This is a deliberate deviation from GEN-188's original text, which
  predates the SDK-based approach this app actually took.
- **`CLERK_SIGN_IN_URL` is added.** The app redirects signed-out visitors to
  Clerk's hosted Account Portal; this variable is that redirect target and
  has no other source of truth in the runtime env.

## Webhook endpoint

`POST /api/clerk/webhooks` — verifies deliveries as Standard Webhooks (via
svix) and handles `user.deleted` by soft-deleting the matching account. It
answers `503` whenever `CLERK_WEBHOOK_SIGNING_SECRET` is unset, so a deploy
that hasn't configured a signing secret fails obviously rather than silently
accepting unverifiable requests.

### Local relay testing

TEST has no public DNS, and neither does a developer's `localhost`, so Clerk
cannot deliver webhooks to either directly. Both use the Clerk CLI's webhook
listener, which dials **out** to Clerk and forwards deliveries back in over a
stable, token-pinned inbox:

```bash
npx -y clerk@latest webhooks listen \
  --forward-to http://localhost:3000/api/clerk/webhooks \
  --token <your-relay-token>
```

`clerk webhooks token` mints a stable token; keep it and reuse it across
restarts rather than minting a new one each time, since a new token means a
new inbox and a new Dashboard endpoint to point at it. Add `--json` for
NDJSON output if you're scripting against it.

### TEST relay

`deploy/test/docker-compose.webhook-relay.yml` is the same listener as an
opt-in sidecar, run explicitly with:

```bash
docker compose -f deploy/test/docker-compose.webhook-relay.yml up -d
```

It is not part of the standard TEST deploy (`docker-compose.application.yml`
and `docker-compose.infrastructure.yml` only) — bring it up when TEST needs
to exercise real webhook delivery.

**Per GEN-188: LOCAL and TEST are two separate relay inboxes.** Each needs
its own `CLERK_WEBHOOK_RELAY_TOKEN` and its own Clerk Dashboard endpoint
registration, even though the Development instance's events reach both
endpoints (the instance doesn't know or care which relay is listening).
Reusing one token across environments would let one environment's deliveries
land on the other's relay. `CLERK_WEBHOOK_SIGNING_SECRET` in each
environment's runtime env must be the signing secret of the Dashboard
endpoint registered against *that* environment's relay inbox — pairing it
with the wrong endpoint's secret fails verification on every forwarded
delivery.

## Bootstrap-coach procedure

Set `BOOTSTRAP_COACH_AUTH_SUBJECT_ID` to a Clerk user id (`user_...`) before
that person's first sign-in. Account provisioning
(`AccountProvisioningService.ensureAccount` in
`packages/domain/src/accounts/account-provisioning-service.ts`) first looks up
the signing-in Clerk subject by `auth_subject_id`. If no row exists, it
inserts one — role `COACH` if the subject matches this configured value,
`USER` otherwise — a plain `INSERT`, not an upsert; `auth_subject_id` is
unique, and the table carries no `updated_at` column to refresh. Two
concurrent first-sign-ins for the same brand-new subject (both tabs finishing
at once) can both reach that `INSERT`; the loser's unique-constraint violation
is caught and answered by re-reading the row the winner just inserted
(`PostgresAccountRepository.insert` in
`apps/platform/src/features/accounts/data/account-repository.server.ts`), so
both converge on the same row instead of one surfacing a database error.

**This only applies on first sign-in — it does not retroactively promote an
existing account.** Once a row exists for a subject, `ensureAccount` returns
it as-is; nothing in this path ever updates `role` on an existing row. So:

- Setting the variable before the named subject's first-ever sign-in works as
  intended.
- Setting it (or changing it to a different subject) after that subject
  already has an `app.accounts` row does nothing — the existing row's role is
  preserved, matching every other returning account. Promoting an existing
  account to `COACH` afterward is a direct data change, not something this
  variable does.

## E2E lane

`pnpm test:e2e` runs the Playwright suite under `apps/platform/e2e/`. It is
**local-only** — there is no CI wiring for it.

Prerequisites:

- Real Google Chrome installed. The suite pins `channel: "chrome"` rather
  than Playwright's bundled Chromium, because Clerk's hosted Account Portal's
  bot-protection challenge behaves differently under Chromium.
- Real Development-instance keys in the repo root `.env`
  (`CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) — the suite drives the real
  hosted Account Portal, there is no mock instance to fall back to, and
  `global-setup.ts` fails loudly on a placeholder value rather than letting a
  journey time out mid-run.
- `CLERK_SIGN_IN_URL` set to the real Account Portal URL above.
- `WAITLIST_MODE=false` — the public nav renders no auth controls at all
  while the waitlist is on, so every journey's starting point (a Sign In
  click or a signed-in/out nav assertion) would have nothing to find.

Journeys run sequentially (`fullyParallel: false`, one worker), not in
parallel: several browsers hitting the same Clerk dev instance and local dev
server at once reads as more bot-like to Clerk's bot-protection challenge
than one visitor at a time, and sequential execution is what kept the suite
deterministic while this was being built.

**Rate-limit caveat:** this dev instance has ordinary Clerk rate limits.
Heavy or repeated local runs (rerunning the full suite back-to-back, running
it alongside manual sign-in testing) can trip a `429` from Clerk. If a run
starts failing at the email/code step with no other explanation, wait a few
minutes before rerunning rather than assuming a regression.

**Cleanup:** the suite deletes every Clerk user it creates. This is what
keeps the shared Development instance under its hard 100-user cap.

Each journey records the `+clerk_test` email it generates to a run-scoped
registry file, `e2e/.runtime/created-emails-<run-id>.log` (gitignored;
`e2e/support/clerk-users.ts`) — one file per run rather than one shared file,
so an aborted run (Ctrl-C, a hang, a kill) leaves a record behind instead of
truncating or corrupting a file other runs depend on.

At the end of a run, Playwright's `globalTeardown`
(`e2e/support/global-teardown.ts`) reads that run's own registry file back,
resolves each recorded address to a user id via the Clerk Backend API, and
deletes it, logging a one-line summary of how many were created versus
deleted. The registry file is deleted too, but only once every recorded
email resolved without a genuine failure — a run that hit a real deletion
error leaves its file in place for the next run's sweep to retry.

At the *start* of a run, `globalSetup` (`e2e/support/global-setup.ts`) sweeps
leftover registry files from prior runs that never reached teardown — the
same cleanup, run against whatever an aborted run left behind. The sweep
only touches files whose most recent write is older than two hours: this
suite's own runs finish in minutes, so a younger foreign file is presumed to
belong to a suite still running concurrently rather than one that aborted,
and is left in place with a one-line log
(`skipping possibly-active registry <file>`) instead of being swept. Sweeping
a still-active run's file would delete a concurrently running suite's users
out from under it.

Both teardown and the setup sweep delete through the same routine
(`deleteRecordedClerkUser`), which applies a double guard before deleting
anything: the address has to match a user Clerk actually returns for that
exact recorded email, *and* the address has to carry the `+clerk_test`
subaddress (see below) — an address that doesn't is skipped rather than
looked up. A deletion failure is reported, not thrown, so a cleanup hiccup
never fails an otherwise-green run and never blocks a later sweep from
retrying.

### Test-email convention

Every journey uses a fresh address of the form
`e2e-<run-id>-<sequence>+clerk_test@evoa.fit`. Clerk treats any address
carrying a `+clerk_test` subaddress as a test email: instead of sending a
real code, it accepts the fixed code `424242` at the verification step (see
[Clerk's test emails and phones docs](https://clerk.com/docs/guides/development/testing/test-emails-and-phones)).
The `+clerk_test` tag has to be the last subaddress segment for Clerk to
recognize it, which is why the run/sequence marker sits *before* it rather
than after.

## Lighthouse

`lighthouserc.cjs` runs the built SSR server and audits it with a real
Development-instance publishable key, so clerk-js actually initializes
against the real instance rather than failing immediately. That in turn
means `CLERK_SECRET_KEY` in that run also has to be real (not a placeholder):
the audited pages mount `clerkMiddleware`, and a Development instance's first
visit from a cookie-less browser — true of every Lighthouse run — is answered
with a redirect through Clerk's own dev-browser handshake, which this app's
server completes by fetching the instance's JWKS from the Clerk Backend API.
That fetch requires a real secret key; see the `requireRealClerkSecretKey`
comment in `lighthouserc.cjs` for the specifics. Locally this is picked up
from the root `.env`; in CI it comes from the `CLERK_SECRET_KEY` repository
secret (see [SECRET_MANAGEMENT.md](SECRET_MANAGEMENT.md)).

The `best-practices` Lighthouse category is asserted per-audit rather than as
a single category score, because two of its audits fail unconditionally
against this Development instance for reasons outside this app's control —
see the comment above the `assert.assertions` block in `lighthouserc.cjs`.
