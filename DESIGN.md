# Design

## Identity

Evoa has a warm, premium, and modern visual identity. Soft off-white surfaces, restrained borders and shadows, and generous whitespace keep the product calm and approachable. Magenta is the primary brand and action color; teal is the grounded counterpoint for secondary actions and recovery-oriented content. Elegant serif headings in `Playfair Display` add personality, while `DM Sans` keeps the interface practical and easy to scan.

The design balances human coaching with professional competence. Photography and small product-UI compositions may add warmth and context, but the interface itself stays clean, focused, and consistent across the public site, client portal, and coach portal. The landing page carries more visual impact and motion than the portals, which favor calm, predictable structure for use mid-workout and while managing detailed plans.

## Audience

Women seeking personalized strength and nutrition coaching, with or without an active menstrual cycle. The warm palette, editorial headings, supportive copy hierarchy, and body-aware domain colors for training day types, cycle phases, and flow intensity make the experience feel personal without stereotypically feminine decoration.

## Source of Truth

The design system lives in code. Read it there rather than expecting a catalogue here:

- Production tokens: `packages/ui/src/styles.css`. Production components and variants: the exports of `packages/ui/src/index.tsx`.
- The prototype in `designs/react-reference-app` mirrors the same visual roles and may carry tokens and compositions production does not have yet. Its `DESIGN.md` and `brand-voice.md` describe it.

Every color, spacing, radius, shadow, and typography value is a semantic token; raw values appear only in non-reusable layout mechanics. A token name means the same value in production and in the prototype. Radii, control sizes and letter-spacing are named by role (`rounded-card`, `rounded-field`, `rounded-control`, `size-control-lg`, `tracking-nav`); the framework's size-named steps are never overridden. Every text action is a `Button` or `buttonVariants`: one base with the 14px `control` corner, sizes that set only a height and one padding, one raised elevation, one disabled look and the one focus rule. Weights are regular, medium and semibold, with light kept for the hero's lead copy over video and bold for prices and tracked uppercase `micro` labels. The product targets WCAG AA, keyboard operability everywhere, and layout-stable reduced-motion fallbacks.
