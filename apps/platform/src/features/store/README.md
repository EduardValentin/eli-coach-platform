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

Public site only, but wider than the three store pages. The store's own pages
are the catalog (`/store`), the product detail page (`/store/:slug`) and the
download page (`/store/download`), and the public navigation and footer CTA
link to the store.

The **cart reaches every public page.** The cart provider, the cart button in
the navigation and the cart drawer are mounted in the public site's layout
(`surfaces/public-site/shell/layout.tsx`), which wraps all eight public routes —
`/`, `/blog`, `/pricing`, `/privacy`, `/terms` and the three store pages. The
acquisition form lives inside that drawer, not on the catalog or product page,
so a visitor can finish acquiring a resource from anywhere on the public site.

The store has no coach- or client-portal presence.

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
- `ui/public/` — everything the public store surface is made of. The three page
  route modules and the two `.server.ts` loaders behind them, the catalog view,
  the download page's fragment-token reader, the cart store, provider and
  drawer, the acquisition form, and the browser clients for the catalog and
  acquisition endpoints.

This is the feature's whole shape: `contracts/`, `data/`, `api/`, `email/` and
`ui/`, with `routes.ts` registering all seven of its routes — three pages and
four `/api/store/*` endpoints — from inside it.

Two boundary rules keep `ui/public/` honest, and both are proven in
`tools/lint-boundaries.test.mjs`. It may not import this feature's `data/`,
`api/` or `email/` at all; and only a `.server.ts` inside it — or a test — may
import the platform container.

What forces the loader split is React Router, not the rule: a module
registered in `routes.ts` cannot carry the `.server` suffix, because the
client route manifest has to import it, so it cannot be the file that reaches
the container. That is why `catalog-page.tsx` and `product-page.tsx` re-export
a `loader` from a `.server.ts` sibling rather than building one inline. The
second rule is what keeps it that way. `download-page.tsx` has no such sibling
because it has no loader: `/store/download` is prerendered and the page reads
its token in the browser.

## Pure rules

`packages/domain/src/store/` owns how long a download grant lasts and when one
no longer resolves (expired, or no longer active), how an acquisition payload
is canonicalised into an idempotency digest, what a replayed or conflicting
key means, and how a delivery outcome — accepted, rejected, transient —
becomes a result. This feature depends on those and does not restate them.

Two things a reader might expect there are deliberately not. **Which products
are public** — row `published`, a version carrying a publication timestamp,
highest sequence wins — is a query filter, so it lives as SQL in
`data/catalog-repository.server.ts`; `StoreCatalogService` only wraps the
repository call and turns a failure into "unavailable". **Revoking a grant**
likewise happens in SQL, inside the delivery-rejection transaction in
`data/acquisition-repository.server.ts`.
