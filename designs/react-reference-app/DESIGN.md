# Design Guidelines

## Vibe & Aesthetic
- **Core Identity:** Women-tailored, warm, empowering, premium, and elegant.
- **Balance:** Strive for the perfect balance between warmness (approachable, human) and competence (professional, effective).
- **Feel:** Clean, modern, and pleasant to navigate. Visually impressive through component design and tasteful animations.

## Color Palette
- **Primary Brand Color:** `#C81D6B` (Magenta/Pink) - Use for primary actions, highlights, and glowing accents. Token: `brand` / `brand-foreground`.
- **Secondary Brand Color:** `#00796B` (Teal/Green) - Use for secondary accents, recovery states, and balancing elements.
- **Neutrals:** Soft off-whites, elegant dark grays (`#121212`), and subtle borders to maintain a premium feel.
- **Surface Inverted:** `#0C0C0C` - Always-dark surface for sections that need a dark background regardless of theme mode. Token: `surface-inverted` / `surface-inverted-foreground`.

## Typography & Components
- **Typography:** Legible, elegant serif for headings (e.g., Playfair Display if available, or elegant sans-serif) and clean modern sans-serif for body (e.g., DM Sans or Inter).
- **Component Architecture:** Build with reusability in mind. Use CVA (Class Variance Authority) for consistent variant styling.
- **Interactions:** Subtle scale and opacity changes on hover. Use smooth, spring-based animations for transitions.

## Responsiveness & Accessibility
- **Breakpoints:** Must flawlessly support `sm` (mobile), `md` (tablet), and `lg` (desktop).
- **Testing:** Ensure no clipping, no overflow, and clean scaling right before and after breakpoints.
- **Accessibility:** Follow web standards for contrast, focus states, and semantic HTML.
