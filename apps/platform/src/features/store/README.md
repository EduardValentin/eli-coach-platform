# Store

Publishes Eli's digital resources on the public marketing site, hands them out
free in exchange for an email address, and delivers the files through a
private, time-limited download link.

## Flows

- **Browse the catalog** — the catalog page and each product page call the
  catalog controller directly from their route loaders, so the first paint
  needs no HTTP round trip. A product is public only when its row is
  `published` *and* it has a version with a publication timestamp; the
  highest-numbered such version is the one shown, and products are ordered by
  their configured display order. Cover images stream from
  `GET /api/store/covers/:assetKey`, sandboxed and typed from the recorded
  MIME type. The browser refetches `GET /api/store/catalog` when the cart
  drawer opens, so a cart saved in an earlier session is reconciled against
  what is still published. If the catalog cannot be read, the pages fail with
  a temporarily-unavailable response rather than rendering an empty store.
- **Acquire free resources** — the visitor submits an email, accepts the
  terms, optionally opts into marketing, and sends one to fifty unique product
  slugs to `POST /api/store/acquisitions` along with a client-generated
  idempotency key. The submission passes the browser bot-detection gate first;
  a rejected challenge and an unreachable challenge service are answered
  differently, so a verification outage never reads as a bot. Everything after
  that lands in one serializable transaction: the recipient, the request with
  the terms, privacy and marketing-consent versions in force, a per-product
  acquisition counter, a delivery attempt, and a download grant. Replaying the
  same idempotency key with the same payload returns the earlier outcome and
  sends nothing new; replaying it with a *different* payload is refused as a
  conflict. Asking for a slug that is no longer published is refused too, and
  the response names the slugs that are still available so the browser can
  offer them.
- **Delivery email** — the store, unlike the waitlist, does not answer before
  it has tried to deliver. The response is success only once the email
  provider has accepted the message. A provider rejection revokes the grant
  and reports the delivery as unavailable; a transient failure leaves the
  grant alive, marks the attempt retryable, and tells the visitor to try
  again. The email lists what was requested and carries the download link with
  the raw token in the URL *fragment*, which browsers never send to a server.
  Failing to write the audit trail after a send is logged for reconciliation
  rather than retried inline, and never re-sends the email on that request.
- **Download** — a grant lives for seven days. The download page reads the
  token out of the fragment, strips it from the address bar, and posts it to
  `POST /api/store/downloads`; only the token's hash is ever stored. A single
  file streams as itself, several stream as one ZIP, and every file is
  re-read and checked against the size and checksum recorded at publication
  before a byte is served — a swapped or truncated file on disk is refused,
  not delivered. Asset paths are confined to the store's asset root, so a
  crafted key cannot escape it. An expired, revoked or unknown token sends the
  visitor back to the download page with an unavailable notice; an
  infrastructure failure renders a self-contained recovery page pointing at
  the store, because at that point the app shell may not be renderable.

## Surfaces

Public site only: the store catalog page, the product detail page, the
download page, and the store links in the public navigation and the footer
CTA. The store has no coach- or client-portal presence.

## Structure

- `contracts/` — wire schemas for the catalog, the acquisition request and
  response, and the download request. Browser-safe.
- `data/` — the Drizzle schema for the store's tables, the catalog,
  acquisition and download-grant repositories, the filesystem asset store, and
  the token and payload hashing.
- `api/` — the four route modules and controllers behind `/api/store/*`, the
  ZIP delivery stream, and the static download-recovery document.
- `email/` — the delivery email content and template, the provider-backed and
  disabled delivery services, and the factory that picks between them.

**The store's UI has not moved yet.** The catalog page, product page, download
page, cart and browser data-access still live in
`apps/platform/src/routes/marketing/store/`, and the three page routes
(`store`, `store/download`, `store/:slug`) are still registered from there.
They move into `ui/public/` in PR 5. Until then `ui/` holds nothing but a lint
fixture, which exists to prove the browser-bundle boundary rule already binds
this feature's `ui/**`; see `tools/lint-boundaries.test.mjs`.

The pure rules — catalog publication, idempotency and delivery outcomes,
grant expiry and revocation — live in `packages/domain/src/store/`, which this
feature depends on and never reimplements.
