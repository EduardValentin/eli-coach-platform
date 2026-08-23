# Authentication security review

A record of what an independent security review found in the Clerk integration
(GEN-163), why each one was hard to see, and what it means for the next person
who touches this code.

Kept because most of these are not mistakes in the ordinary sense. They are
places where a reasonable reading of an SDK is wrong in a way nothing local can
demonstrate.

## The one that mattered: dropped response headers

**What was wrong.** The identity adapter returned a response to the caller only
when Clerk's request state carried a `Location` header, and discarded that state
entirely otherwise.

**Why that breaks production.** In `@clerk/backend`, a resolved handshake builds
its headers like this:

```js
cookiesToSet.forEach((x) => headers.append("Set-Cookie", x));   // always
if (this.authenticateContext.instanceType === "development") {
  headers.append(constants.Headers.Location, newUrl.toString()); // development only
}
```

On a **development** instance the handshake finishes with a redirect, so keying
on `Location` happens to work. On a **production** instance it finishes with
`Set-Cookie` and no redirect — so the adapter took the "authenticated" branch,
threw the cookies away, and the browser never stored a session. Sign-in could not
complete at all.

The same drop discarded cookies Clerk refreshes on ordinary requests. A browser
kept a permanently expired token, and every authenticated request paid a Clerk
Backend API round trip to compensate — for the whole signed-in population,
forever.

**Why nothing caught it.** LOCAL and TEST share the *development* instance.
Every test, every integration suite and a real end-to-end OTP round trip all ran
against the one instance kind where the bug is invisible. PROD would have been
the first place it appeared.

**The lesson.** When an SDK's behaviour is conditioned on environment kind, the
environment you develop in cannot verify the environment you ship to. Read the
branch, do not infer it from a passing test.

**Fixed by** carrying `headers` on every arm of `IdentityAuthentication` and
applying them to whatever response the controller or the portal middleware
finally returns.

## Anonymous JWKS amplification

**What was wrong.** The Clerk client was built without `jwtKey`, so every token
verification resolved its signing key remotely.

**The attack.** The SDK refetches the entire JWKS whenever a token's `kid` is not
in its cache, and there is no negative cache. The `kid` lookup happens *before*
signature verification, so the token does not have to be valid. An
unauthenticated caller presenting tokens with random `kid`s turns each inbound
request into one outbound authenticated call to Clerk. Once Clerk begins rate
limiting, each inbound request becomes several, each holding a request handler
through exponential backoff — and no token in the system verifies, so every
legitimate visitor reads as signed out.

Measured: a request with a random-`kid` cookie took 70–490 ms against a 6–9 ms
baseline, every time, with nothing cached in between.

**The lesson.** "Verification fails closed" is not the same as "verification is
cheap to fail". An attacker does not need to pass a check to make you pay for it.

**Fixed by** wiring `CLERK_JWT_KEY` through, which makes verification networkless.
**This requires the key to actually be set** — Clerk Dashboard → API keys → Show
JWT public key → PEM Public Key, one per instance.

## A forwarded header decided our own origin

**What was wrong.** `authenticateRequest` was called with the raw request. Clerk
derives this application's URL from `X-Forwarded-Host`, falling back to `Host`,
and builds the handshake's return address from it.

**The attack.** A request carrying `X-Forwarded-Host: evil.example` produced a
handshake redirect whose return address was that host. Following it to Clerk's
real API returned a redirect to `evil.example` carrying a live session JWT and a
refresh token valid for a year — durable account takeover, not a 60-second
window. `X-Forwarded-Host: evil.example, real.host` also wins, so a proxy that
appends rather than replaces does not save you.

**Scope, honestly.** A browser cannot set that header on a top-level navigation,
and cross-origin `fetch` never gets past preflight. Exploitation needs an edge
that forwards a client-supplied `X-Forwarded-Host`. Most edges strip it. That is
a configuration you do not control from here, which is exactly why the
application should not depend on it.

**Fixed by** pinning the request's origin to `PUBLIC_APP_URL` when set, and
passing that origin as `authorizedParties` so a token minted for anywhere else is
refused.

## Sign-out never cleared the real refresh cookie

**What was wrong.** The clear-list named `__refresh`. Clerk reads the refresh
token from the *suffixed* name only — `__refresh_<instance suffix>` — so that
entry had never removed anything. A year-long refresh token survived every
sign-out.

Survivable alone, because sign-out also revokes server-side. But revocation is
deliberately best-effort: a transient Clerk failure produced a page saying the
visitor was signed out, a browser still holding a valid refresh token, and
nothing anywhere saying so. On a shared machine that is a real exposure.

**The lesson.** Cookie names an SDK writes and cookie names it reads are not
guaranteed to be the same list. Check what it actually set, in a browser, once.

**Fixed by** clearing by prefix, including the suffixed names actually presented.

## CSRF on sign-out

`/auth/sign-out` is a POST that reads no body and checked no origin, so another
site could submit it and log a visitor out. Impact is nuisance rather than data
exposure — but it was the only unguarded state-changing route in the change.

**Fixed by** requiring a same-origin submission (`Sec-Fetch-Site`, falling back
to `Origin`).

## What the review confirmed was sound

Worth recording, so nobody re-spends the effort:

- **Open redirect.** 17 adversarial payloads — protocol-relative, backslash,
  encoded, CRLF, tab-prefixed, fullwidth — all refused or resolved same-origin.
- **Portal authorization**, route by route, for every HTTP method, plus path
  normalization probes (`/CLIENT`, `/client/..`, `/client%00`, `/client;x=1`,
  `//client`, `.data` variants). No path to portal content without the role.
- **Role mutation.** `role` is written in exactly one place and the upsert's
  conflict arm touches only `updated_at`. Nothing derived from request input
  reaches it. The bootstrap subject is compared against a verified token `sub`.
- **Webhook.** Constant-time signature comparison, local verification, no
  network amplification, no header-injection surface, oversized bodies refused
  before any HMAC.
- **JWKS unavailability fails closed** — a verification error reads as signed
  out; only expiry escalates to a handshake.
- **Client bundle.** The auth route chunks are 0 bytes; `middleware` is a
  server-only export, so the guard never crosses into the browser. No Clerk
  package, no key material, no source maps.
- **Dependencies.** `@clerk/backend`, `@clerk/shared` and `standardwebhooks` are
  each the latest published version and appear in no advisory.

## Known and accepted

- `/api/session` performs an upsert on GET, so an authenticated visitor writes a
  row on every page. Anonymous callers cannot reach it, so it is row churn rather
  than a denial of service. A read-then-write path would fix it.
- A correctly signed webhook delivery can be replayed inside the Standard
  Webhooks five-minute window. Harmless while the only effect is an idempotent
  `deleted = true`; a non-idempotent event added to that endpoint would need
  deduplication.
- No security headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`) on any
  response. Pre-existing and app-wide, but this integration is what first put
  authenticated surfaces behind a login.
- `BOOTSTRAP_COACH_AUTH_SUBJECT_ID` silently does nothing once that subject
  already has a row, because the upsert preserves the existing role. An
  operational trap rather than a vulnerability.
