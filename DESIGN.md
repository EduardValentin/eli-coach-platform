# Design System

## Principles

- The product should feel premium, warm, supportive, and competent across every surface.
- Shared tokens live in `packages/ui` and are the source of truth for product visuals.
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
- `text-text-primary` and `text-text-secondary` on light surfaces are the default text pairings for readable UI.
- Brand and domain colors are accent tokens first. Use them for controls, highlights, icons, badges, and large-display text unless a specific pairing has been checked for AAA compliance.
- Focus indicators, semantic HTML, and reduced-motion-safe interactions remain required even when styling evolves.

## Naming Conventions

- Surfaces use `surface-*`.
- Readable foreground colors use `text-*`.
- Shared action and identity colors use `brand-*`.
- Reusable product state colors use `feedback-*` or `status-*`.
- Domain concepts use domain-aware names such as `training-*` and `cycle-*`.
- Size and rhythm tokens use `space-*`, `container-*`, `radius-*`, and `shadow-*`.

## Token Inventory

### Color

| Token | Value | Intent |
| --- | --- | --- |
| `--color-surface-page` | `#FAFAFA` | Default app/page background |
| `--color-surface-base` | `#FFFFFF` | Cards, panels, elevated sections |
| `--color-surface-subtle` | `#F8F8F8` | Soft section contrast and nav backgrounds |
| `--color-surface-soft` | `#FAFAF7` | Warm editorial surface |
| `--color-surface-brand-soft` | `#FFF5F8` | Brand-tinted highlight surface |
| `--color-surface-inverted` | `#0C0C0C` | Always-dark surface |
| `--color-text-primary` | `#121212` | Primary readable text |
| `--color-text-secondary` | `#616161` | Secondary copy and supporting labels |
| `--color-text-muted` | `#717182` | Quiet metadata and helper text |
| `--color-text-inverted` | `#FFFFFF` | Text on dark or brand surfaces |
| `--color-border-subtle` | `#E9E6E2` | Default light border |
| `--color-border-strong` | `rgba(233, 230, 226, 0.6)` | Stronger light border treatment |
| `--color-border-soft` | `rgba(233, 230, 226, 0.25)` | Low-emphasis separators |
| `--color-brand-primary` | `#C81D6B` | Primary brand action/highlight |
| `--color-brand-primary-hover` | `#A31556` | Primary brand hover state |
| `--color-brand-primary-pressed` | `#B0185E` | Primary brand pressed state |
| `--color-brand-primary-foreground` | `#FFFFFF` | Text on primary brand surfaces |
| `--color-brand-primary-soft` | `rgba(200, 29, 107, 0.1)` | Soft primary brand fill |
| `--color-brand-secondary` | `#00796B` | Secondary action/recovery accent |
| `--color-brand-secondary-hover` | `#005A4F` | Secondary hover state |
| `--color-brand-secondary-foreground` | `#FFFFFF` | Text on secondary surfaces |
| `--color-brand-secondary-soft` | `rgba(0, 121, 107, 0.1)` | Soft secondary fill |
| `--color-feedback-danger` | `#D4183D` | Destructive/error state |
| `--color-feedback-danger-soft` | `rgba(212, 24, 61, 0.1)` | Soft destructive fill |
| `--color-feedback-success` | `#16A34A` | Success state |
| `--color-feedback-success-soft` | `rgba(22, 163, 74, 0.1)` | Soft success fill |
| `--color-feedback-info` | `#2563EB` | Informational state |
| `--color-feedback-info-soft` | `rgba(37, 99, 235, 0.1)` | Soft info fill |
| `--color-status-pending` | `#FF7A45` | Pending / needs attention state |
| `--color-status-pending-soft` | `rgba(255, 122, 69, 0.1)` | Soft pending fill |
| `--color-training-strength` | `#C81D6B` | Strength day / training emphasis |
| `--color-training-strength-soft` | `rgba(200, 29, 107, 0.1)` | Soft strength fill |
| `--color-training-recovery` | `#00796B` | Recovery day / supportive training state |
| `--color-training-recovery-soft` | `rgba(0, 121, 107, 0.1)` | Soft recovery fill |
| `--color-training-rest` | `#616161` | Rest day state |
| `--color-training-rest-soft` | `rgba(247, 243, 240, 0.6)` | Soft rest fill |
| `--color-cycle-menstrual` | `#FF4D6D` | Menstrual phase |
| `--color-cycle-follicular` | `#4A90E2` | Follicular phase |
| `--color-cycle-ovulatory` | `#F5A623` | Ovulatory phase |
| `--color-cycle-luteal` | `#BD10E0` | Luteal phase |
| `--color-overlay-strong` | `rgba(0, 0, 0, 0.56)` | Heavy image overlay |
| `--color-overlay-medium` | `rgba(0, 0, 0, 0.32)` | Medium overlay |
| `--color-overlay-soft` | `rgba(0, 0, 0, 0.14)` | Soft overlay |

### Typography

| Token | Value |
| --- | --- |
| `--font-family-body` | `"DM Sans", sans-serif` |
| `--font-family-heading` | `"Playfair Display", serif` |
| `--font-size-label` | `0.75rem` |
| `--font-size-body-sm` | `0.875rem` |
| `--font-size-body-base` | `1rem` |
| `--font-size-body-lg` | `1.125rem` |
| `--font-size-display-sm` | `1.5rem` |
| `--font-size-display-md` | `2rem` |
| `--font-size-display-lg` | `clamp(2.75rem, 6vw, 4.5rem)` |
| `--font-weight-regular` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--line-height-tight` | `1.15` |
| `--line-height-heading` | `1.2` |
| `--line-height-body` | `1.5` |
| `--tracking-label` | `0.12em` |
| `--tracking-wide` | `0.08em` |

### Spacing And Layout

| Token | Value |
| --- | --- |
| `--space-0` | `0rem` |
| `--space-1` | `0.25rem` |
| `--space-2` | `0.5rem` |
| `--space-3` | `0.625rem` |
| `--space-4` | `0.75rem` |
| `--space-5` | `1rem` |
| `--space-6` | `1.5rem` |
| `--space-7` | `2rem` |
| `--space-8` | `3rem` |
| `--space-9` | `4rem` |
| `--space-10` | `6rem` |
| `--container-reading` | `45rem` |
| `--container-content` | `70rem` |
| `--container-stage` | `90rem` |

### Border, Radius, And Shadow

| Token | Value |
| --- | --- |
| `--border-width-default` | `1px` |
| `--border-style-default` | `solid` |
| `--radius-xs` | `0.25rem` |
| `--radius-sm` | `0.75rem` |
| `--radius-md` | `1rem` |
| `--radius-panel` | `1.5rem` |
| `--radius-pill` | `999px` |
| `--shadow-soft` | `0 2px 12px rgba(0, 0, 0, 0.03)` |
| `--shadow-raised` | `0 8px 24px rgba(0, 0, 0, 0.08)` |
| `--shadow-floating` | `0 8px 40px rgba(0, 0, 0, 0.04)` |
| `--shadow-brand-glow` | `0 0 24px 4px rgba(200, 29, 107, 0.2)` |

## Implementation Notes

- Shared token definitions and Tailwind theme mappings live in `packages/ui/src/styles.css`.
- The production app imports the shared token system through `apps/platform/app/app.css`.
- Tailwind v4 scans both `apps/platform/app` and `packages/ui/src` so shared primitives and app routes can consume the same token-backed utilities.
- Future visual system changes must update both this document and the implementation in the same change set.
