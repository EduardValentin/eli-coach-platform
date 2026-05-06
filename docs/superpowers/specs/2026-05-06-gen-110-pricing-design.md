# GEN-110 Pricing Page Design

## Context

GEN-110 adds the public Pricing page at `/pricing` and the public bundle selector for 1-on-1 coaching bundles. The ticket is part of the Linear Eli Coach Platform project and follows the React reference app as the source of truth for pricing copy, bundle data, badges, and waitlist pricing behavior.

GEN-85 is complete and provides the reusable waitlist email form, spot counter behavior, and backend waitlist submission contract. This ticket composes those primitives in the Pricing page closing CTA. Checkout mode for the bundle selector is intentionally deferred to a later checkout-flow ticket.

## Source Of Truth

- Linear GEN-110 defines the ticket scope, acceptance criteria, and waitlist-aware pricing behavior.
- PRD Business Rules 4, 19, 20, and 21 define the three bundle tiers, waitlist mode, reduced annual pricing for path-1 signups, and regular pricing for spots-full signups.
- `designs/react-reference-app/src/app/pages/Pricing.tsx` defines the public Pricing page copy and composition.
- `designs/react-reference-app/src/app/components/BundleSelector.tsx` defines the canonical bundle data, card order, benefit copy, badges, and annual waitlist-price display.
- `apps/platform/app/routes/marketing/waitlist/waitlist-email-form.tsx` is the production waitlist form primitive to reuse.

## Scope

This implementation will:

- Add one domain-owned source of truth for the three coaching bundles and shared benefits.
- Add domain logic for resolving display pricing in normal and waitlist modes.
- Add a public-only bundle selector presentation in the production marketing route tree.
- Replace the placeholder `/pricing` route with the waitlist-aware public Pricing page.
- Compose the existing waitlist email form in the waitlist-mode closing CTA.
- Add focused tests for domain bundle data, bundle display behavior, and Pricing page mode behavior.

This implementation will not:

- Build checkout mode or token-gated purchase behavior.
- Add new bundle tiers, benefits, prices, or badges beyond the prototype.
- Change waitlist persistence, bot detection, or email confirmation behavior.
- Update the reference app.

## Architecture

Bundle facts belong in `packages/domain` because GEN-110 requires one static model that can feed the public Pricing page, the future token-gated checkout flow, and any future tooling. The domain module will expose stable types, the ordered bundle definitions, shared benefit copy, and a resolver that returns effective display pricing for a bundle under a `waitlistMode` option.

The production app will own presentation. A route-local marketing component will import the domain contract and render the public `BundleSelector`. This keeps product-specific rendering near the public marketing route while preventing the generic `packages/ui` package from absorbing pricing rules too early.

The `/pricing` route remains inside the existing marketing layout. It will read `botDetectionConfig` and `waitlist` from `MarketingOutletContext`, using `waitlist.enabled` as the Pricing page's `waitlistMode` input. The public navbar is already provided by `PublicMarketingLayout`; this route will render only the main page content under that layout.

## UI Composition

The page renders:

- A single `<h1>`: `Coaching Plans`.
- A mode-aware subtitle:
  - Waitlist mode: `Join the waitlist and lock in reduced pricing on the 12-month plan.`
  - Normal mode: `Experience 1-on-1 premium coaching with personalized workout protocols, customized nutrition, and uninterrupted support.`
- The public `BundleSelector`.
- One closing CTA card:
  - Waitlist mode: heading `Interested in the waitlist price?`, supporting copy from the prototype, and the existing `WaitlistEmailForm` in light variant.
  - Normal mode: heading `Ready to start?`, supporting copy from the prototype, and a `/book` link labelled `Book Assessment Call`.

The public bundle selector renders the three cards in this order:

1. Quarterly, 3 months, `$250/mo`, billed as `$750`.
2. Biannual, 6 months, `$220/mo`, billed as `$1320`, `Save 12%`, `Most Popular` outside waitlist mode.
3. Annual, 12 months, `$190/mo`, billed as `$2280`, `Save 24%` outside waitlist mode.

When waitlist mode is enabled, only the annual tier changes:

- Original `$190/mo` is struck through.
- Active price becomes `$150/mo`.
- Original total `$2280` is struck through.
- Active total becomes `$1800`.
- `Waitlist price` replaces the regular annual discount badge.
- The biannual `Most Popular` badge is hidden.

The shared benefits list renders once below the cards:

- Personalized workout and nutrition program
- Periodic progress check-ins
- Uninterrupted support with your coach
- Video form review and correction
- Access to the private community

## Data Flow

`MarketingLayoutRoute` already provides a static waitlist shell and hydrates it at runtime through TanStack Query. The Pricing page will consume that same context. If the read endpoint fails, `waitlist.spotsRemaining` remains `null`; the waitlist form still renders and the spot-dependent notify/open label falls back to the open-list behavior, matching the GEN-85 edge-case rule.

The Pricing page will keep local `waitlistResponse` state for the closing CTA. `WaitlistEmailForm` calls `onResponseChange`; the page resolves the effective spots remaining from the latest successful response before passing `spotsRemaining` back to the form. This mirrors the hero pattern and lets the CTA switch to notify-me behavior after a successful reduced-price signup exhausts the remaining spots.

## Styling And Motion

The implementation will use existing production semantic tokens from `packages/ui/src/styles.css`, including `surface-page`, `surface-base`, `surface-brand-soft`, `text-primary`, `text-secondary`, `text-muted`, `brand-primary`, `brand-secondary`, `feedback-success`, `border-subtle`, `radius-panel`, `shadow-soft`, and `shadow-raised`.

The reference app uses Tailwind 4.1.12 and raw utility colors such as `#C81D6B`, `#121212`, and neutral grays. Production uses Tailwind 4.2.2 and semantic tokens. The production implementation will translate the reference visual intent into semantic production classes rather than copying raw color utilities.

Card and badge animation will use lightweight CSS classes under the UI stylesheet or existing transition utilities, with a `prefers-reduced-motion` fallback. Text labels will stay at or above the design-system minimum body label size.

## Accessibility

The Pricing page will preserve the existing marketing layout's skip link, labelled navigation, and labelled main content. The route will render exactly one `<h1>`, use heading levels without skipping, and use native link and button semantics.

Bundle cards in public mode are read-only article/list items, not fake buttons. The future checkout mode will introduce selectable card semantics in its own ticket. The current booking CTA is a normal React Router link to `/book`, and the waitlist CTA reuses the already keyboard-accessible `WaitlistEmailForm`.

## Testing

Domain tests will verify:

- Bundle tiers are ordered Quarterly, Biannual, Annual.
- Prices, totals, badges, waitlist price, and benefits match the prototype data.
- Waitlist display resolution only changes the annual tier.

Component tests will verify:

- Public bundle cards render one card per bundle and the shared benefit list once.
- Normal mode shows biannual popularity and annual savings.
- Waitlist mode shows the annual waitlist price, strikes original annual pricing, and hides biannual popularity.

Pricing route UI integration tests will verify:

- Waitlist mode renders the waitlist subtitle and the waitlist email form closing CTA.
- Normal mode renders the normal subtitle and `/book` assessment-call link.
- The page renders exactly one `<h1>`.
- A successful waitlist response updates the form state through the closing CTA composition.

Manual verification will compare production `/pricing` against the React reference app across mobile, tablet, and desktop, in both normal and waitlist modes. The behavior pass will exercise the closing CTA waitlist form in spots-available and spots-full states.

## Deferred Work

Checkout mode is deferred. The domain data and public selector should make future checkout implementation straightforward, but this ticket will not add the selectable card mode, default selected biannual tier, continue-to-checkout button, or token-gated route.
