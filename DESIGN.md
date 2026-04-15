# Design System

## Principles

- The product should feel premium, warm, supportive, and competent across every surface.
- Shared design tokens live in `packages/ui` and are the source of truth for product visuals.
- Token names are semantic and should keep their meaning even if underlying values change.
- The system is single-layer semantic. Do not create primitive-to-semantic indirection.
- Shared tokens must work across public, client, and coach surfaces without surface-specific renaming.
- App-specific visual values that are not part of the shared system belong in `apps/platform`.

## Usage Rules

- Use shared semantic tokens for color, typography, spacing, border, radius, and shadow decisions.
- Do not introduce raw hex values, ad hoc shadows, or one-off spacing values in product UI when an existing token fits.
- If a new reusable visual concept appears, add a semantic token instead of hardcoding a value.
- Use `font-body` for interface and body copy, and `font-heading` for editorial or display headings.
- Use brand colors primarily for actions, highlights, and state accents, not dense body text on light backgrounds.
- Light theme only. Do not add dark-mode tokens or theme switching in this system.

## Accessibility

- The product targets WCAG AAA contrast for normal text where content roles allow it.
- Default readable pairings should come from the shared semantic foreground and surface tokens, not one-off color choices.
- Brand and domain colors are accent tokens first. Use them for controls, highlights, icons, badges, and large-display text unless a specific pairing has been checked for AAA compliance.
- Focus indicators, semantic HTML, and reduced-motion-safe interactions remain required even when styling evolves.

## Naming Conventions

- Surfaces use `surface-*`.
- Readable foreground colors use `text-*`.
- Shared action and identity colors use `brand-*`.
- Reusable product state colors use `feedback-*` or `status-*`.
- Domain concepts use domain-aware names such as `training-*` and `cycle-*`.
- Size and rhythm tokens use `space-*`, `container-*`, `radius-*`, and `shadow-*`.

## Source Of Truth

### Shared Implementation

- Exact token definitions, values, and Tailwind theme mappings live in [`packages/ui/src/styles.css`](./packages/ui/src/styles.css).
- Shared UI primitives that consume those tokens live in [`packages/ui/src/index.tsx`](./packages/ui/src/index.tsx).
- The production app Tailwind entrypoint that imports the shared system lives in [`apps/platform/app/app.css`](./apps/platform/app/app.css).
- The Vite plugin wiring for Tailwind v4 lives in [`apps/platform/vite.config.ts`](./apps/platform/vite.config.ts).

### Design Inputs

- The current design-reference token inputs come from [`designs/react-reference-app/src/styles/theme.css`](./designs/react-reference-app/src/styles/theme.css).
- Font choices and imports come from [`designs/react-reference-app/src/styles/fonts.css`](./designs/react-reference-app/src/styles/fonts.css).
- The reference app’s design guidance lives in [`designs/react-reference-app/DESIGN.md`](./designs/react-reference-app/DESIGN.md).
- Repeated component styling patterns in `designs/react-reference-app/src/app` are valid evidence for token values when the shared system evolves.

## Change Management

- `DESIGN.md` should document the rules, boundaries, and ownership of the design system, not duplicate implementation-level token tables.
- When the design system changes, update this document to reflect the new principles, naming rules, ownership, or source-of-truth paths.
- When reviewing exact token inventory, CSS custom properties, or Tailwind mappings, read the implementation files directly instead of relying on copied documentation.
