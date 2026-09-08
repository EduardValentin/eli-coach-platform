# GEN-161 — Authenticated Owned-Products Library

**Status:** published to Linear on 2026-09-08 as the GEN-161 description; the epic-level GEN-82 blocker was removed. This file is a reference copy; Linear is the source of truth.
**Relations to set on publish:** parent GEN-147 (unchanged) · blocked by GEN-163 and GEN-169 (both done, unchanged) · related GEN-159 (unchanged) · remove the epic-level GEN-82 blocker.

---

## User Story

As a signed-in customer, I want a Library that lists every store product I own and lets me download each one again at any time, so that I never depend on a delivery email or its seven-day link.

## Acceptance Criteria

- [ ] Every signed-in account, whatever its role, reaches the Library from the public navigation's Library link, shown on desktop and in the mobile menu and hidden in waiting list mode. A signed-out visitor opening the Library URL is sent to sign-in and returned to the Library afterwards (PRD Business Rule 5, §1 waiting list mode, §2 req 4).
- [ ] Opening the Library links prior guest acquisitions to the account by verified email before listing, the same claim the Store runs, so a first visit after sign-in already shows everything she owns. If the identity provider is unavailable, the page still lists what is already linked and the next visit retries (Business Rule 19).
- [ ] Each owned product appears once, even when several recipient rows hold acquisitions for it, in catalog display order. A row shows the latest published version's cover and title, the free badge, and the product's type and goal labels. Products retired from the catalog stay listed (Business Rule 19).
- [ ] With nothing owned, the page shows the prototype's empty state with its store action. When owned products cannot be loaded, it shows the prototype's failure state, whose retry reloads the list in place (§2 req 4).
- [ ] A row's download action fetches fresh access for that product alone. While in flight the row shows the prototype's busy state; on success the browser saves the product's latest published version, one asset under its own filename or several assets as one zip named after the product; on failure the row shows the prototype's inline retryable message and other rows are unaffected (Business Rule 20, §2 req 4).
- [ ] Download access is session-authenticated and per product: no email, no token, no seven-day window, nothing recorded, no delivery allowance consumed. A signed-out request is refused, a product the account does not own or that does not exist gets one privacy-safe not-found response, and storage trouble gets a temporary-unavailable response (Business Rules 18 and 20).
- [ ] The download-grant tables and the code tied to them are renamed to state their responsibility, email delivery links, and the email delivery flow behaves exactly as before.
- [ ] The visual design copies the prototype: layout, components, and interaction patterns match the reference screens listed in Source Context.

## Technical Notes

- Library downloads use no download grants: a stateless, session-authenticated download per product that checks ownership and serves the product's latest published version, whatever the product's catalog lifecycle status. Nothing is recorded.
- Ownership comes from the recipient rows the account claimed under GEN-169; the Library groups their acquisitions by product, and the ownership claim runs before the list is read.
- The download is script-driven from the page, because the prototype's busy and inline failure states require it. The publication cap is 25 MB per product.
- A signed-out visitor is redirected the way the portal guard already does it, returning to the Library after sign-in.
- Rename first, with no behavior change: `download_grants` and `download_grant_items` become `email_download_grants` and `email_download_grant_items`, and the domain model, service, repository, and tests named after them follow. Pre-launch, so no compatibility step.

## Source Context

- Prototype: `designs/react-reference-app/src/app/pages/Library.tsx` (loading, failure, empty, and list states with per-row busy and failure), `services/libraryService.ts` (error copy), `components/Navbar.tsx` (Library link), `routes.tsx` (Library under the any-session guard).
- PRD: Business Rules 5, 18, 19, 20; §1 Waiting list mode; §2 Digital Store req 4.
- Production: `apps/platform/src/features/store/` (downloads controller, zip stream, schema, download-grant and acquisition repositories, ownership controller, catalog page loader), `features/accounts/server/require-account.server.ts`, `features/accounts/ui/public/auth-nav-actions.tsx`, `apps/platform/src/routes.ts`, `packages/domain/src/store/`.

## Out of Scope

- Paid products, purchases, and the purchased badge (GEN-159, GEN-167).
- Any change to email delivery links, their seven-day window, revocation, or rate limits beyond the rename.
- Download history or analytics, unit preferences, portal surfaces.
- Prototype changes: none needed.
