# Authentication

Clerk is the identity provider. The application never loads Clerk in the
browser: there is no `ClerkProvider`, no `clerk-js`, and no publishable key in
any client bundle. Every question about who is signed in is answered on the
server, behind an adapter.

## Why server-only

Two constraints decide this, and both are structural rather than stylistic.

**A prerendered route can never be protected.** `/`, `/blog`, `/store/download`,
`/privacy` and `/terms` are baked to static files at build time. Their loaders
run once, on the build machine, and never again. Anything a loader returns is
frozen into the artifact and served identically to every visitor. So a
prerendered route cannot know who is asking, and the production build needs no
Clerk credentials at all — which is what lets `docker build` run without
secrets.

**Roles live in our database, not in Clerk.** The navigation has to know whether
to offer the Client Portal or the Coach Portal, and that answer comes from
`app.accounts`. A browser-side Clerk SDK could tell the page that *someone* is
signed in, but not which portal she may reach, so it would still need a server
round trip. Keeping Clerk on the server means one code path instead of two.

## How each surface learns the visitor

| Surface | Mechanism |
| --- | --- |
| Public site, prerendered and server-rendered alike | `GET /api/session` after hydration |
| `/client/*`, `/coach/*` | Route middleware on the portal layout |
| Server routes | The identity adapter, per request |

The public site therefore has exactly one authentication code path, whether the
page was prerendered or rendered per request. The navigation renders nothing
where the control will go until `/api/session` answers, because guessing and
correcting would shift the layout.

## Routes

| Route | Behaviour |
| --- | --- |
| `/auth/sign-in` | Redirects to Clerk's hosted Account Portal, carrying a validated return destination |
| `/auth/complete` | Provisions or resolves the account, then returns the visitor to that destination |
| `/auth/sign-out` | Revokes the Clerk session, clears cookies, returns to the Store |
| `/api/session` | `{"status":"anonymous"}` or `{"status":"authenticated","role":…}`, `no-store` |
| `/api/auth/clerk-webhook` | Verified Clerk deliveries; acts on `user.deleted` |
| `/403`, `/sign-in-failed` | Dedicated pages for refusal and for a sign-in that could not complete |

`/auth/complete` is entered **twice** per sign-in. The first pass carries no
session and Clerk answers with a redirect the browser must follow — the
handshake that establishes the session cookie, and, on a development instance,
the dev-browser sync. That response is returned untouched. Only the second pass
reaches account provisioning.

Any destination arriving in `redirect_url` is attacker-controlled. Only a
same-origin absolute path survives validation; anything that could name another
host, change scheme, or smuggle a header falls back to `/store`.

## Authorization

The portal layouts carry **route middleware**, not a loader.

This is load-bearing. React Router's single fetch lets the client choose which
loaders run, through the `_routes` query parameter — so a loader-based guard is
one the caller can decline by asking for a child route directly. Middleware runs
in the server pipeline that wraps the whole request, where nothing the client
sends can filter it out.

Two consequences follow from that choice:

- **Middleware covers every route in the matched branch, including resource
  routes**, which skip loaders. Each portal's `readyz` and `manifest.webmanifest`
  are therefore registered *outside* its layout — a readiness probe and a PWA
  manifest have to answer without a session.
- **A redirect thrown from middleware is not basename-normalized.** React Router
  prepends the basename only to redirects thrown from a loader or an action, so
  the authorization redirects apply `APP_BASE_PATH` themselves. Every other
  redirect in the authentication controller stays relative and is normalized for
  it.

**The integration suite cannot see either property.** It drives a flattened
route table through `createStaticHandler`, which matches a middleware only for
its own route and runs no framework server — so that the guard covers what nests
beneath it, and that the resource routes outside it stay reachable, are
assertions it structurally cannot make. Against a running server the behaviour is:
`/client` and `/coach` redirect, `/client/readyz`, `/coach/readyz` and both
`manifest.webmanifest` answer `200`, and `/client.data?_routes=x` redirects
rather than returning data.

A signed-out visitor is sent to sign in and returned to where she was aiming. An
authenticated visitor holding the wrong role is sent to `/403`, which reads her
session and offers the place she can actually reach — never bounced back through
sign-in, which would loop her through a portal she can never enter.

## Accounts

One table, `app.accounts`: an id, the Clerk subject, a role, and a `deleted`
flag. No identity-link table, no provider column, no duplicated email, no
application session table.

Provisioning is a single idempotent upsert, because `/auth/complete` is entered
twice per sign-in and two tabs can finish at once. The conflict arm writes only
`updated_at`, so a returning account keeps whatever role it was promoted to.

Roles are `USER`, `CLIENT` and `COACH`. Public registration always produces
`USER`. The single exception is `BOOTSTRAP_COACH_AUTH_SUBJECT_ID`: one
configured Clerk subject becomes `COACH` on first sign-in. It is matched by
subject rather than by email, so no public flow can reach an elevated role by
controlling an address.

## Identity deletion

Self-service deletion is disabled. When an identity is removed in Clerk, the
webhook marks the account `deleted` and **keeps** `auth_subject_id`.

Keeping it is deliberate. A session token minted just before the identity was
removed stays valid for its remaining lifetime, and only a row still reachable
by subject can refuse it — a detached row is invisible to the upsert, so that
visitor would be handed a brand-new account instead. Ownership history is not
personal data and outlives the Clerk account.

The endpoint is public, so the Standard Webhooks signature is the only thing
that makes a delivery trustworthy. The body is capped before it is read, and
nothing is taken out of it before the signature verifies. An accepted delivery
answers `204` whether or not an account matched: Clerk retries anything it does
not see accepted, and an identity that never signed in here is not a failure.

Verification is local — no network call — and a correctly signed delivery may be
replayed within the Standard Webhooks timestamp tolerance. That is harmless
while the only effect is an idempotent `deleted = true`; a non-idempotent event
type added to this endpoint would need its own deduplication.

## Configuration

### Environment

| Variable | Purpose |
| --- | --- |
| `CLERK_PUBLISHABLE_KEY` | Identifies the instance. The Frontend API host, base64-encoded — the Account Portal URL is derived from it rather than configured separately |
| `CLERK_SECRET_KEY` | Backend API calls and JWKS retrieval |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Verifies webhook deliveries |
| `CLERK_JWT_KEY` | Clerk's session verification key, in PEM. Without it every unrecognised `kid` sends the SDK to Clerk's JWKS endpoint, which an anonymous caller can drive by presenting tokens carrying random `kid`s |
| `CLERK_API_URL` | Test-only override, pointing the adapter at a stub |
| `BOOTSTRAP_COACH_AUTH_SUBJECT_ID` | The one Clerk subject that becomes `COACH` |

All are server-only and never reach a browser bundle. Values live in the
gitignored `.env`; see [SECRET_MANAGEMENT.md](SECRET_MANAGEMENT.md).

`PUBLIC_APP_URL` matters to authentication too, though it is not a Clerk value.
Clerk works out this application's own address from `X-Forwarded-Host` before
falling back to `Host`, and builds the handshake's return address from it — so a
request arriving with an attacker's value would send the visitor, and the
session Clerk plants for her, to that host. When `PUBLIC_APP_URL` is set it wins
over anything a header claims, and it is also the origin a session token must
have been minted for. **Set it in every deployment.**

LOCAL may leave any of them at the `replace-me` placeholder, since none of them
guards anything there.

`CLERK_WEBHOOK_SIGNING_SECRET` is exempt more widely, because it guards an
inbound delivery rather than an outbound call: Clerk can only post to an
environment reachable from the internet. TEST sits inside the tailnet with no
public ingress, so requiring one there would demand a credential for an event
that cannot arrive. Production is the only deployment Clerk can reach, and that
is where it is mandatory.

A value that *is* supplied must still be well formed in every environment, so a
typo fails at boot rather than at first use. Supplying an unusable secret does
not fail open — `ClerkWebhookVerifier` refuses the delivery and reports the
configuration fault.

`ENVIRONMENT` decides which placeholders are tolerated, and it defaults to
`local`. **A deployment must set it explicitly.** It cannot additionally key on
`NODE_ENV`, because prerendering builds the application container and would then
demand credentials the credential-free production build must not need.

### Clerk Dashboard

The instance must be configured to match what the application assumes:

- **Email verification code only.** Passwords, phone, social login, passkeys and
  required MFA are disabled, as is Clerk's own legal-consent collection.
- **Webhook endpoint** pointing at `/api/auth/clerk-webhook`, subscribed to
  `user.deleted`. Its signing secret becomes `CLERK_WEBHOOK_SIGNING_SECRET`.
- **The instance's PEM public key**, copied into `CLERK_JWT_KEY`. It is what
  keeps token verification off the network.
- **Default session lifetime** retained.

LOCAL and TEST share the Development instance; PROD uses the Production instance
of the same application. The two differ in how session state travels between
browser and Clerk, which is precisely why the application reaches Clerk only
through the SDK and never reads or writes its cookies directly.

TEST has no public ingress, so Clerk cannot post to it. Live delivery there runs
through the CLI relay, which dials out to Clerk and forwards each delivery to the
application over the compose network — see
`deploy/test/docker-compose.webhook-relay.yml`. `clerk webhooks token` pins the
inbox URL — `https://webhooks.clerk.com/in/<token>/` — so it survives a restart
and can be registered once as a Dashboard endpoint, whose signing secret is what
verifies the deliveries. The forwarded request keeps its original `svix-*`
headers, so verification runs through the real adapter rather than a stub.

`deploy_test.sh` brings the relay up on every deploy, as its own colourless
Compose project rather than inside the blue/green application project — both
colours run at once during a cutover, and two relays sharing one token would
make delivery ambiguous. It forwards to the edge hostname rather than a
container, because the application container's name carries the stack colour.
Presence of `CLERK_WEBHOOK_RELAY_TOKEN` in the runtime env is the switch: absent,
the relay is skipped.

Handler and persistence behaviour are covered by the integration suite, which
signs real deliveries and verifies them the same way, and which is what a
regression will fail against — the relay proves the wiring, not the logic.

## Exercising the flow without a browser

A development instance accepts any `+clerk_test` address with the fixed
verification code `424242` and sends no email, so the whole sign-in can be driven
from a script:

```bash
pnpm --filter @eli-coach-platform/platform clerk:test-session
# prints: __session=…; __client_uat=…; __clerk_db_jwt=…
```

Pass that cookie header to the running application and every authenticated path
is reachable — `/api/session` answers with the role, `/auth/complete` provisions
the account and returns to the destination, and the portals admit or refuse
according to it. Nothing is stubbed: the token is minted by Clerk and verified
against Clerk's real JWKS.

Three details make it work, and each is easy to lose:

- **Sign-up through the Frontend API is gated by bot protection**, which a script
  cannot answer. The identity is created through the Backend API instead; the
  flow under test is the sign-in.
- **A development instance also wants `__clerk_db_jwt` on this domain.** With
  only `__session` and `__client_uat` the request reads as signed out. A
  production instance does not need it.
- The script refuses to run against a production publishable key or a
  non-`+clerk_test` address, because it creates a user and would otherwise send
  real email.

This covers the flow but not the rendering. Anything about how a page looks or
behaves in a browser still needs a real one.

## Where the code lives

| Path | Holds |
| --- | --- |
| `packages/domain/src/accounts/` | Account model, role rules, repository ports, provisioning and deletion services |
| `packages/infrastructure/src/identity/` | The Clerk adapter and webhook verifier. Server-only subpath |
| `apps/platform/src/features/accounts/` | Schema and repository, route modules and controllers, the session contract, and the navigation's session query |
| `apps/platform/src/surfaces/*-portal/shell/layout.server.ts` | The authorization middleware on each portal |

The domain layer receives an account id and a role. It never sees a Clerk token,
a session id, or an email address.
