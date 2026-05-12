# GEN-86 About Section Design Spec

## Purpose

Build the landing-page About section from the React reference prototype on a fresh production branch. The section introduces Eli with a circular portrait, coach bio, credibility chips, normal-mode CTAs, waitlist-mode alternate closing copy, and an Instagram-story-style phone widget.

Prototype parity is the governing design rule for this ticket. The production implementation must mirror the prototype's visible layout, spacing, typography hierarchy, chip copy, phone proportions, story controls, and interaction details as closely as the platform constraints allow.

## Source Of Truth

- Ticket: `GEN-86`
- Prototype route: `designs/react-reference-app/src/app/pages/Home.tsx`
- Prototype About section: `designs/react-reference-app/src/app/components/About.tsx`
- Prototype story widget: `designs/react-reference-app/src/app/components/InstagramWidget.tsx`
- Prototype phone shell: `designs/react-reference-app/src/app/components/PhoneFrame.tsx`
- Production route: `apps/platform/app/routes/marketing/home.tsx`

When ticket wording and prototype details differ, the prototype wins. This explicitly keeps the `Women Focused` chip.

## Approved Architecture

Use a hybrid of the route-local About approach and a reusable phone shell:

- Add a reusable `PhoneFrame` primitive to `packages/ui`.
- Add the production About feature under `apps/platform/app/routes/marketing/about/`.
- Render the About section immediately after `MarketingHero` in `apps/platform/app/routes/marketing/home.tsx`.
- Keep story data, timers, likes, progress, handle link, and waitlist-mode branching inside the route-local About feature.

The reusable `PhoneFrame` owns only device chrome and layout: rounded shell, border, shadow, notch, status bar, time text, status dots, overflow clipping, and sizing composition. It must not know about Instagram stories, marketing copy, or waitlist state.

## Production Components

### Shared PhoneFrame

Create a `PhoneFrame` primitive in `packages/ui` and export it through the UI package barrel.

Responsibilities:

- Render a phone-shaped container with prototype-matched rounded corners, subtle border, elevated shadow, and overflow clipping.
- Support light and dark status bar variants.
- Render the notch, time, and status dots as decorative chrome with `aria-hidden="true"`.
- Accept children for the screen content.
- Accept `className` so feature components can set width and aspect ratio.

The component should use semantic tokens and local component classes where Tailwind utility strings would become hard to read.

### MarketingAbout

Create `MarketingAbout` as a route-local marketing feature component.

Responsibilities:

- Render a semantic `section` after the Hero.
- Use an `h2` for `Meet Eli, your coach`; do not add another page `h1`.
- Match the prototype layout: vertical stacking on mobile, two-column bio/widget layout on large screens, centered content on small screens, left-aligned content on desktop.
- Render the circular portrait with glowing brand-to-secondary ring.
- Render the prototype eyebrow: `Strength & nutrition for women`.
- Render the prototype bio copy.
- Render the prototype closing line based on `waitlist.enabled`.
- Render the prototype chip row with:
  - `IFBB Certified Trainer`
  - `Certified Nutritionist`
  - `Women Focused`
- Render normal-mode CTAs only when `waitlist.enabled` is false:
  - `Start my plan` links to `/book`
  - `See pricing` links to `/pricing`
- Hide both CTA links when `waitlist.enabled` is true.
- Render the story widget alongside the bio.

### Instagram Story Widget

Create a route-local widget component that composes the shared `PhoneFrame`.

Responsibilities:

- Match the prototype phone/story layout: full-screen story media, dark top and bottom gradient overlays, top progress segments, header row, bottom message affordance, like control, and share control.
- Reuse existing hero media assets for portrait/story visuals, per user direction. Do not add new image files in this pass.
- Use three story items, matching the prototype story count.
- Keep story state local:
  - active story index
  - per-story liked/unliked state
  - progress value for the active story
- Advance to the next story when the right half is clicked or tapped.
- Move to the previous story when the left half is clicked or tapped.
- Loop from the last story back to the first.
- Toggle like state for the current story only.
- Keep the share control visual unless a later ticket wires sharing.
- Style the Instagram handle like the prototype, but implement it as a hardened external link to the coach Instagram page with `target="_blank"` and `rel="noopener noreferrer"`.

## Data Flow

`MarketingLayoutRoute` already resolves the static waitlist shell and runtime waitlist snapshot, then exposes `waitlist` through `MarketingOutletContext`.

`HomeRoute` should pass `waitlist` to `MarketingAbout`.

`MarketingAbout` uses only that snapshot for branching:

- `waitlist.enabled === true`: waitlist closing line, no About CTAs.
- `waitlist.enabled === false`: normal closing line, `Start my plan`, and `See pricing`.

No new backend data, loaders, actions, repositories, or TanStack Query calls are needed.

## Media Direction

Reuse the existing platform hero media assets for the About portrait and story visuals:

- `apps/platform/public/media/hero/hero-training-poster.jpg`
- `apps/platform/public/media/hero/hero-training-loop.mp4`
- `apps/platform/public/media/hero/hero-training-loop.webm`

The production implementation should avoid remote image URLs. If the hero video is used inside the story widget, it must still behave safely when media loading fails: the timer and navigation continue to work, and a poster/fallback visual remains visible.

## Styling And Tokens

Production must translate prototype raw values into semantic tokens and reusable classes instead of copying raw arbitrary colors directly into feature JSX.

Required visual targets:

- About section spacing mirrors the prototype: generous vertical padding, centered mobile layout, wide desktop gap between content and phone widget.
- Portrait shell reads as a glowing circular avatar with brand pink and secondary teal.
- Heading uses the production heading family and comparable prototype scale.
- Bio text uses muted body color and readable line height.
- Chip row stays compact and inline/wrapping like the prototype.
- Phone shell keeps the prototype rounded device silhouette, notch, status bar, and strong shadow.
- Story controls stay white over dark media overlays.

If a semantic token is missing for a repeated role, add a named token in the production design system and document it in both `DESIGN.md` files in the same diff.

## Accessibility

The implementation must start from semantic HTML.

Requirements:

- Preserve exactly one page `h1`; About uses `h2`.
- Use internal React Router `Link` for `/book` and `/pricing`.
- Use a raw external `a` only for the Instagram handle.
- Make the story navigation surface keyboard focusable and operable with `ArrowRight` and `ArrowLeft`.
- Ensure the like and share buttons are reachable by keyboard and have clear accessible names.
- Give story images useful alt text such as `Story 1 of 3`; if a video is used, pair it with the poster image text and hide purely decorative overlays from assistive tech.
- Keep decorative phone chrome and icons `aria-hidden`.
- Provide visible focus states for the story surface and controls.

## Motion And Reduced Motion

Mirror the prototype interaction timing where practical, but respect production reduced-motion rules.

Normal motion:

- Story progress fills in real time.
- Active story changes reset the active progress segment.
- Image/video transition may fade if implemented with CSS.
- About entrance animation may reuse existing public marketing animation classes.

Reduced motion:

- No animated entrance or story-media transition.
- No auto-advancing animated progress.
- Manual next/previous navigation still works.
- Current story remains understandable and controls remain usable.

## Testing Plan

Add focused tests before implementation for these behaviors.

Unit/component coverage:

- `PhoneFrame` renders phone chrome, supports light/dark status variants, hides decorative chrome from assistive tech, and preserves children.
- `MarketingAbout` renders portrait, bio, heading, chips, widget, and waitlist/normal closing line.
- Normal mode renders `/book` and `/pricing`; waitlist mode hides both.
- Story widget advances right, moves back left, loops after the final story, toggles like per story, and exposes the Instagram handle with hardened external-link attributes.
- Keyboard arrows navigate the story widget.
- Reduced-motion mode disables automatic animated progression while preserving manual navigation.

Integration coverage:

- Homepage renders About after Hero.
- Homepage still has exactly one `h1`.
- Existing marketing layout waitlist hydration behavior remains intact.

Verification coverage after implementation:

- Run lint, typecheck, unit tests, a11y tests, and Lighthouse per repo instructions.
- Exercise the production page in a browser across mobile, tablet, and desktop.
- Compare the production About section against the reference app side by side, including waitlist and normal mode.

## Risks And Mitigations

- Media parity risk: hero media is approved by the user but differs from the prototype's remote images. Mitigation: preserve the prototype's crop, phone framing, overlays, and layout so the approved asset substitution is the only visual divergence.
- Shared primitive scope risk: `PhoneFrame` could grow too feature-specific. Mitigation: keep it purely structural and move story behavior into the route-local feature.
- Token drift risk: raw prototype values may tempt one-off Tailwind classes. Mitigation: use semantic tokens and add documented tokens only for repeated missing roles.
- Timer reliability risk: rapid taps and timers could race. Mitigation: model story transition helpers explicitly and test rapid next/back behavior through observable state.
