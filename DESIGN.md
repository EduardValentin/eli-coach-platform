# Design Guidelines

## Vibe & Aesthetic
- **Core Identity:** Women-tailored, warm, empowering, premium, and elegant.
- **Balance:** Strive for the perfect balance between warmness (approachable, human) and competence (professional, effective).
- **Feel:** Clean, modern, and pleasant to navigate. Visually impressive through component design and tasteful animations.

## Illustration Strategy
- **In-app UI as illustration:** Marketing surfaces may use stylized in-app UI compositions (messaging, workout tracker, phone frame, plan overview) as their primary visual. Build these in React with semantic tokens — never static screenshots. They should evoke the real product without being 1:1 reproductions, and must stay decorative (`aria-hidden`) with the actual value prop carried in adjacent copy.
- **Photography:** Reserved for hero and coach-bio surfaces where a human presence is the subject.
- **Custom illustrations:** Not currently part of the system. Introduce deliberately if a future need can't be met by in-app mockups or photography.

## Color Palette
- **Primary Brand Color:** `#C81D6B` (Magenta/Pink) - Use for primary actions, highlights, and glowing accents. Token: `brand` / `brand-foreground`.
- **Secondary Brand Color:** `#00796B` (Teal/Green) - Use for secondary accents, recovery states, and balancing elements.
- **Neutrals:** Soft off-whites, elegant dark grays (`#121212`), and subtle borders to maintain a premium feel.
- **Fine neutral accents:** Use `stroke-faint` for very quiet panel borders, `control-border-soft` for light form control borders, `placeholder-soft` for placeholder text, `copy-muted` for muted CTA copy, and `bundle-muted` / `bundle-secondary` for pricing-card metadata that should match the reference app's neutral hierarchy.
- **Pricing savings badges:** Use `savings-badge-surface` and `savings-badge-text` for the small green discount pills on pricing cards. Waitlist email CTAs use `waitlist-button-hover` for their prototype-matched hover/active state, separate from the broader primary-button hover token.
- **Surface Inverted:** `#0C0C0C` - Always-dark surface for sections that need a dark background regardless of theme mode. Token: `surface-inverted` / `surface-inverted-foreground`.
- **Destructive / Feedback Danger (Errors):** `#d4183d` on light surfaces — token: `destructive` / `destructive-foreground` in the reference app and `feedback-danger` in production. For destructive text on dark or inverted surfaces, use `destructive-on-inverted` / `feedback-danger-on-inverted` (`#F87171`), especially form validation and server-error messages.

## Typography & Components
- **Typography:** Legible, elegant serif for headings (e.g., Playfair Display if available, or elegant sans-serif) and clean modern sans-serif for body (e.g., DM Sans or Inter).
- **Component Architecture:** Build with reusability in mind. Use CVA (Class Variance Authority) for consistent variant styling.
- **Phone frame:** Reusable phone mockups use the shared `PhoneFrame` primitive. The primitive owns only device chrome and uses `radius-phone-frame` plus `shadow-phone-frame`; feature-specific screen content stays in the consuming route or component.
- **Section Eyebrows:** Small uppercase labels that sit above section headings. Always rendered via the shared `SectionEyebrow` component — never inline. Typography is uppercase, `tracking-[0.2em]`, sans-serif. Two variants:
  - `brand` (default): `text-brand`, `font-semibold`, `text-xs md:text-sm`, `mb-4`. Used above every section heading on the landing page.
  - `muted`: `text-muted-foreground`, default weight, `text-sm`, `mb-6`. Reserved for section-intro cases where a heading group introduces several feature rows below (e.g., the PlatformShowcase intro). Signals hierarchy between the intro and the brand-colored eyebrows on the rows beneath it.
- **Interactions:** Subtle scale and opacity changes on hover. Use smooth, spring-based animations for transitions.

## Responsiveness
- **Breakpoints:** Must flawlessly support `sm` (mobile), `md` (tablet), and `lg` (desktop).
- **Testing:** Ensure no clipping, no overflow, and clean scaling right before and after breakpoints.

## Accessibility
- **WCAG Target:** The platform targets WCAG AAA compliance.
- **Contrast:** Maintain at least 7:1 contrast for normal text and 4.5:1 for large text.
- **Landmarks:** Every layout must provide clear landmark regions. Use labeled `<nav>` landmarks for navigation and labeled `<aside>` landmarks whenever a sidebar or complementary panel is present.
- **Heading Hierarchy:** Every page must render exactly one `h1`, and heading levels must progress without skipping.
- **Focus Management:** Client-side route changes must move focus to the main content area or page heading without breaking scroll restoration when users navigate back.
- **Reduced Motion:** All animations and transitions must respect `prefers-reduced-motion` and simplify or disable motion without causing layout shifts.
- **Skip Navigation:** Every surface must expose a keyboard-accessible skip link that jumps directly to the main content region.
- **Semantic HTML:** Prefer semantic HTML over ARIA when native elements already express the interaction or structure.
- **Minimum Body Label Size:** Meta/eyebrow labels (`text-xs` / 12px) are the floor for mobile surfaces. Do not use `text-[10px]` for anything that conveys meaning; it fails on-device legibility at 375px. Pure decorative indicators (tiny status dots) are the only exception.
- **Compact Pricing Badge Exception:** Pricing savings badges are allowed to use the dedicated 10px uppercase tokenized style because they are short supplemental card metadata and must remain visually subordinate to the price and bundle title.

## Mobile-First Patterns
- **Touch targets:** Every actionable element must provide at least a 44×44 px hit area. Prefer `min-h-11` / `min-h-12` on rows, pills, and icon buttons. Use the `Button` `icon-lg` size (48×48, 22 px glyph) for primary touch affordances like the exercise "play video" control.
- **Page gutters:** All portal pages render inside `PortalLayout`, which owns horizontal padding — `px-4` mobile, `sm:px-6` tablet, `lg:px-8` desktop. Pages must not add their own outer horizontal padding; they only manage internal rhythm (`space-y-*`) and optional `max-w-*` constraints.
- **PWA safe areas:** Fixed top bars, bottom tab bars, and sticky bottom CTAs must pad themselves with `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` so nothing hides under notches or home indicators.
- **Bottom navigation:** The client portal uses a persistent bottom tab bar on `<lg` (Dashboard, My Plan, Messages, Cycle) with a hamburger trigger in the top bar for the overflow `Sheet` containing secondary routes, the Next Check-in card, and a Sign-out action. Primary navigation landmarks (`<nav aria-label="Client portal primary">`) must be labeled on both surfaces.
- **Responsive modals:** Surfaces that show rich content (e.g. exercise video + description) use `ResponsiveSheetDialog` — a vaul `Drawer` on mobile, centered Radix `Dialog` on desktop. Keep the content identical across breakpoints; only the chrome changes.
- **Tables on mobile:** Data tables must collapse into a stacked card layout below `md`. Do not ship a page with `overflow-x-auto` on a multi-column table as the only mobile affordance — the content must be readable at 375px without horizontal scrolling.
- **Sticky CTAs:** When a page has a single primary action (e.g. "Start today's workout"), the mobile layout may anchor it above the bottom tab bar using `fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] lg:hidden`. Desktop keeps the action in the normal flow.

## Button Variants
- **`size="icon-lg"`** — `h-12 w-12 rounded-full`, glyph rendered at 22 px. Primary touch affordance for media triggers (exercise play button), full-screen-sheet close targets, and comparable thumb-first controls. Use the `default` variant for brand primary, `ghost` for secondary controls.
