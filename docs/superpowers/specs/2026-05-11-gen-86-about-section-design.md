# GEN-86 About Section Design

## Source Facts

- Ticket: GEN-86, "About section with Instagram story widget".
- Branch/worktree: `codex/GEN-86`, verified after `git fetch origin` to be based on `origin/main` at `9429ce3f0e0b2e5d28476700ff0950d9f955fbe1`.
- Reference route: `designs/react-reference-app/src/app/pages/Home.tsx`, where `<About />` renders immediately after `<Hero />`.
- Production route: `apps/platform/app/routes/marketing/home.tsx`, where the new section will render immediately after `MarketingHero`.
- Prototype source: `designs/react-reference-app/src/app/components/About.tsx` and `designs/react-reference-app/src/app/components/InstagramWidget.tsx`.
- User decisions: Instagram handle URL is `https://www.instagram.com/elilungu_`; credibility chips are exactly `IFBB Certified Trainer`, `Certified Nutritionist`, and `Women Focused`; story media temporarily uses the same hero test clip/poster already used by `MarketingHero`.

## Product Behavior

The production homepage gains an About section after the Hero. The section introduces Eli with a circular portrait, the prototype bio, the approved credibility chips, a mode-dependent closing line, and an Instagram-story-style widget beside the content. The Hero remains the only page `<h1>`, so the About heading is an `<h2>`.

Normal mode (`WAITLIST_MODE=false`) shows the closing line that encourages starting a plan, a primary `Start my plan` booking-shell CTA, and a secondary `See pricing` link to `/pricing`. The primary CTA points toward the existing booking-shell path used elsewhere in marketing, even though the actual booking flow is future work. Waitlist mode (`WAITLIST_MODE=true`) keeps the full About content visible but hides both CTA links and uses the waitlist-focused closing line.

## Architecture

Use a route-local production module under `apps/platform/app/routes/marketing/about/`.

- `MarketingAbout` owns the section layout, heading, portrait, bio, chips, closing line, and mode-based CTA visibility.
- `InstagramStoryWidget` owns active story state, tap/keyboard navigation, per-story like state, progress rendering, media fallback, and the external Instagram link.
- Local constants own static copy, chip labels, Instagram URL, and temporary story metadata.
- `apps/platform/app/routes/marketing/home.tsx` composes `MarketingAbout` after `MarketingHero` and passes the current `waitlist.enabled` value from the existing marketing outlet context.

This keeps the homepage a static shell. The About section does not add loader database access, API endpoints, or persistence. Runtime waitlist mode continues to flow through the existing TanStack Query hydration boundary.

## UI States

The implementation must cover:

- Default waitlist mode from the static shell, with About visible and CTAs hidden.
- Hydrated normal mode, with both CTA links visible.
- Mobile, tablet, and desktop layouts.
- Story 1, story 2, and story 3 active states, all temporarily using the hero clip/poster.
- Manual next and previous navigation by pointer.
- Manual next and previous navigation by ArrowRight and ArrowLeft.
- Auto-advance from each story to the next, including loop from last to first.
- Per-story liked and unliked visual state.
- Story media load failure, where the timer and controls still work against the poster/fallback surface.
- Reduced-motion mode.

## Interaction Design

The story widget should use native interactive elements instead of a broad `role="button"` wrapper around nested controls. The visual left and right hit zones navigate backward and forward, while the like button remains separately focusable and reachable by keyboard. Arrow keys on the widget move between stories. The Instagram handle is a normal external anchor with `target="_blank"` and `rel="noopener noreferrer"`.

Story progress uses a per-story duration. In normal motion, the active segment fills smoothly and a timer advances the story when the duration completes. On reduced motion, the timer still advances stories to satisfy the ticket, but the progress display avoids continuous fill animation and the active story remains clearly indicated.

Rapid taps should be handled by index-based state updates so the widget cannot skip unpredictably or desynchronize the progress display.

## Styling And Token Mapping

Production should translate the prototype into semantic production tokens instead of copying raw values.

- Prototype brand accents map to `brand` tokens.
- Prototype dark phone surface maps to `surface-inverted` tokens.
- Text uses existing foreground, muted foreground, and inverted foreground tokens.
- Borders, shadows, radii, and spacing use existing semantic utilities and CSS variables from `packages/ui/src/styles.css`.
- Buttons use shared production `Button` or link variants where they fit.
- Icons come from `lucide-react`, already available in `apps/platform`.

The reference app's `SectionEyebrow` pattern is required by design docs, but production does not currently export that primitive. For this ticket, create a small route-local equivalent inside the About module; do not broaden `packages/ui` unless implementation shows another current consumer needs it.

## Data And State

All About copy is static for MVP. Approved credibility chips are static and must not be embellished. Story metadata is static and temporary:

- The portrait uses the prototype source and alt text until a real production coach portrait asset is supplied.
- Three story entries, matching the prototype count.
- Each entry uses the existing hero poster and hero video sources for now.
- Each story has an id, accessible label, duration, poster source, and media sources.

Client state stays local to `InstagramStoryWidget`:

- Active story index.
- Per-story liked set keyed by story id.
- Timer/progress state keyed by story id and duration.

There is no persistence, no analytics event, no mutation, and no new backend route.

## Error Handling

If story media fails to load, the widget keeps the poster/fallback visual in place and continues to allow manual navigation and timed advancement. The external Instagram link is static and does not require runtime error handling. Waitlist API failures continue to use the existing static-shell fallback behavior, which defaults to waitlist mode.

## Testing

Add colocated tests for the new About feature:

- Unit/component tests for copy, approved chips, heading level, normal-mode CTA visibility, waitlist-mode CTA hiding, and external Instagram link attributes.
- Interaction tests using Testing Library and `user-event` for next/previous pointer controls, ArrowLeft/ArrowRight navigation, loop after the last story, and per-story like state.
- Timer tests with fake timers for auto-advance and progress behavior.
- Reduced-motion coverage using the existing production reduced-motion hook/test patterns.
- UI integration coverage where useful against the existing marketing layout/query pattern to prove runtime hydration can reveal the normal-mode CTAs.

Final verification before PR still includes the repository-required commands: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:a11y`, `pnpm test:lighthouse`, plus browser inspection of the production page across mobile, tablet, and desktop.

## Open Constraints

- The production `/book` route does not exist yet. This ticket treats the primary CTA as a visual shell that points toward the booking flow, consistent with existing marketing pricing CTA precedent.
- Real Instagram story assets are not available. The hero test clip/poster is temporary by user decision.
