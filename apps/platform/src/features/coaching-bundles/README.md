# Coaching Bundles

Presents the three coaching bundles — 1, 3, and 6 months — with waitlist
pricing swapped in when the waitlist is open. Used on the public `/pricing`
page.

## What it renders

`BundleSelector` renders one card per bundle (1, 3, 6 months) followed by a
shared "what's included" panel. Each card shows a monthly price and, for the
two multi-month bundles, a total billed amount; the 3-month bundle carries a
"Most Popular" badge.

When passed `waitlistMode`, the cards switch to waitlist pricing: each shows
the earlier price struck through next to the waitlist price, plus a
"Save N%" badge computed against what the 1-month bundle would cost under the
same waitlist state. The 1-month bundle itself never gets a savings badge,
and no badge appears if the reduction rounds to 0%. Outside waitlist mode,
every card shows normal pricing with no struck-through price and no badge.

## Structure

This feature has only `ui/public/` — no `contracts/`, `data/`, `api/`, or
`email/`. There is nothing to persist and no wire schema: the bundle catalog
is a static list in `packages/domain/src/coaching-bundles/`.

- `ui/public/bundle-selector.tsx` — the three bundle cards and the shared
  benefits panel. Its only dependencies are `packages/domain/src/coaching-bundles/`,
  `@eli-coach-platform/ui`, and presentation libraries (`lucide-react`,
  `motion/react`). It imports nothing from any other feature.

## Where `/pricing` lives, and why

`/pricing` is **not** owned by this feature. The page composes
`BundleSelector` with the waitlist email form and availability status, so it
lives at `surfaces/public-site/pages/pricing.tsx`, importing both
`~/features/coaching-bundles/ui/public/bundle-selector` and
`~/features/waitlist/ui/public/*`. That is the spec's placement rule for a
page behind more than one feature: the surface holds the page and composes
each feature's `ui/`, rather than either feature claiming the page for
itself.

## Pure rules

`packages/domain/src/coaching-bundles/` owns the bundle catalog (id, title,
months, regular price, and waitlist price for each of the three bundles), the
list of benefits shown under them, and `resolveCoachingBundleDisplay`, which
picks the active price for a bundle (waitlist vs. regular), computes its
savings badge against the 1-month bundle's active price, and marks whether
the price shown is a waitlist price. `bundle-selector.tsx` depends on that
module and does not reimplement any of it.
