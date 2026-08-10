# Coaching Bundles

Presents the three coaching bundles — 1, 3, and 6 months — with waitlist
pricing swapped in when the waitlist is open. Used on the public `/pricing`
page.

## What it renders

`BundleSelector` renders one card per bundle (1, 3, 6 months) followed by a
shared "what's included" panel. Each card shows a monthly price and, for the
two multi-month bundles, a total billed amount. The 3-month bundle carries a
"Most Popular" badge, in both pricing modes — it is driven by the bundle's own
`isPopular` flag and never consults the waitlist state.

A card carries a "Save N%" badge whenever its monthly price undercuts the
1-month bundle's monthly price. At regular pricing that means 6% on the
3-month bundle and 12% on the 6-month one. The 1-month bundle never gets a
badge, and neither does a reduction that floors to 0%.

`waitlistMode` is a required boolean prop. When it is true the cards switch to
waitlist pricing: a "waitlist pricing" tag appears above them, each card shows
the regular price struck through beside the waitlist price, and the savings
baseline moves to the 1-month *waitlist* price — so the badges become 10% and
14% rather than 6% and 12%.

`waitlistOfferPlan` is the optional second prop, and `/pricing` passes it
through from the waitlist's own offer. It says which bundles the waitlist price
covers; `all-bundles` is the only value either its type or the waitlist wire
contract admits, so passing it and omitting it do the same thing today.

## Surfaces

Public site only, on `/pricing`. This feature has no coach- or client-portal
presence.

## Structure

This feature has only `ui/public/` — no `contracts/`, `data/`, `api/`, or
`email/`. There is nothing to persist and no wire schema: the bundle catalog
is a static list in `packages/domain/src/coaching-bundles/`.

- `ui/public/bundle-selector.tsx` — the three bundle cards and the shared
  benefits panel. Its only dependencies are `@eli-coach-platform/domain` (for
  the `coaching-bundles` module below), `@eli-coach-platform/ui`, and
  presentation libraries (`lucide-react`, `motion/react`). It imports nothing
  from any other feature.

## Where `/pricing` lives, and why

`/pricing` is **not** owned by this feature. The page composes
`BundleSelector` with the waitlist email form and availability status, so it
lives at `surfaces/public-site/pages/pricing.tsx`, importing both
`~/features/coaching-bundles/ui/public/bundle-selector` and
`~/features/waitlist/ui/public/*`. That is the placement rule in
`surfaces/README.md` for a page behind more than one feature: the surface holds
the page and composes each feature's `ui/`, rather than either feature claiming
the page for itself.

## Pure rules

`packages/domain/src/coaching-bundles/` owns the bundle catalog (id, title,
months, regular price, and waitlist price for each of the three bundles), the
list of benefits shown under them, and `resolveCoachingBundleDisplay`, which
picks the active price for a bundle (waitlist vs. regular), computes its
savings badge against the 1-month bundle's active price, and marks whether
the price shown is a waitlist price. `bundle-selector.tsx` depends on that
module and does not reimplement any of it.
