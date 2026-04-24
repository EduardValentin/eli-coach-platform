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
- **Surface Inverted:** `#0C0C0C` - Always-dark surface for sections that need a dark background regardless of theme mode. Token: `surface-inverted` / `surface-inverted-foreground`.

## Typography & Components
- **Typography:** Legible, elegant serif for headings (e.g., Playfair Display if available, or elegant sans-serif) and clean modern sans-serif for body (e.g., DM Sans or Inter).
- **Component Architecture:** Build with reusability in mind. Use CVA (Class Variance Authority) for consistent variant styling.
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
