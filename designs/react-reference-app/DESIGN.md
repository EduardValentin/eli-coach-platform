# Design System

## Theme

Evoa has a warm, premium, and modern visual identity. Soft off-white surfaces, restrained borders and shadows, and generous whitespace keep the product calm and approachable. Magenta is the primary brand and action color; teal provides a grounded counterpoint for secondary actions and recovery-oriented content. Elegant serif headings add personality, while a clean sans-serif keeps the interface practical and easy to scan.

The design balances human coaching with professional competence. Photography and small product-UI compositions may add warmth and context, but the interface itself remains clean, focused, and consistent across the public, client, and coach surfaces.

## Audience

The product is designed for women seeking personalized strength and nutrition coaching, including women with or without an active menstrual cycle. Its warm palette, editorial headings, supportive copy hierarchy, and body-aware domain colors make the experience feel personal without relying on stereotypically feminine decoration. Clear controls, calm surfaces, and predictable structure support clients during workouts as well as the coach managing detailed plans.

## Design System

The production source of truth is `packages/ui/src/styles.css` and the components exported by `packages/ui/src/index.tsx`. The reference app mirrors the same visual roles and may keep prototype-only tokens and composed components where the production surface does not exist yet.

### Reusable Components

| Component | Role | Variants |
| --- | --- | --- |
| `AppShell`, `Panel` | Framed application and content-section shells | No variants |
| `Avatar`, `AvatarImage`, `AvatarFallback` | Profile image with initials fallback | `size`: `sm`, `md`, `lg` |
| `Badge` | Compact status or category label | `default`, `info`, `success`, `pending`, `destructive`, `secondary` |
| `Button` | Primary action control | `variant`: `primary`, `secondary`, `destructive`, `ghost`; `size`: `sm`, `md`, `lg`, `icon` |
| `Card` | Standard bordered, raised content container | No variants |
| `IconButton` | Labelled icon-only action | `variant`: `ghost`, `inverted`; `size`: `sm`, `md` |
| `Input` | Single-line form control | `variant`: `default`, `inverted`; `controlSize`: `md`, `lg` |
| `Link` | Router-aware text or navigation link | `inline`, `subtle`, `pill` |
| `Select` and its compound parts | Styled Radix selection control | Trigger `size`: `sm`, `md` |
| `TextArea` | Multi-line form control | No variants |
| `FilterChipGroup`, `FilterChip` | Filter chips offering one choice per group | `tone`: `brand`, `brand-secondary` |
| `SidebarSurfaceLayout` | Portal shell with sidebar navigation and main content | No variants |
| `PhoneFrame` | Reusable device chrome for product previews | `statusBarVariant`: `dark`, `light` |
| `SectionEyebrow` | Uppercase label above a section heading | `brand`, `muted` |

The reference app also has four reusable product compositions: `ToggleChip` for multi-select pills, `MetricTile` with `neutral`, `brand`, `brand-secondary`, and `success` icon tones, `ResponsiveSheetDialog`, which presents the same content in a mobile bottom sheet or desktop dialog, and `ErrorPage`, the shared dead-end layout behind the 404, the 403 and the failed-sign-in page — an icon medallion, a muted eyebrow, one `<h1>`, body copy, and exactly one action supplied by the caller. Its local `PhoneFrame` and `SectionEyebrow` mirror the production components.

Keyboard focus is drawn by one unlayered `:focus-visible` rule in `theme.css` rather than per component: the `focus-visible:ring-*` and `focus-visible:outline-*` utilities the primitives carry paint nothing in this app, and the primitives also carry `outline-none`, which as a utility beats anything in `@layer base`. The indicator is a 2px `foreground` outline at 2px offset — `ring` clears only ~2.5:1 against the surfaces it lands on, under the 3:1 SC 1.4.11 asks. Menu and option items, and `tabindex="-1"` skip-link targets, are excluded because they suppress their outline deliberately and signal focus another way.

### Semantic Tokens

Token names below omit the CSS `--color-` prefix used in production utilities.

| Family | Tokens and role |
| --- | --- |
| Surfaces | `surface-page`, `surface-base`, `surface-subtle`, `surface-soft`, `surface-brand-soft`, `surface-inverted` define the page, cards, quiet sections, brand tint, and always-dark areas. |
| Text | `text-primary`, `text-secondary`, `text-muted`, `text-inverted`, `copy-muted`, `placeholder-soft`, `link-muted`, `about-credential-text` define content hierarchy and surface-aware copy. |
| Borders and neutral metadata | `border-subtle`, `border-strong`, `border-soft`, `control-border-soft`, `stroke-faint`, `bundle-muted`, `bundle-secondary` separate controls and content without adding emphasis. |
| Primary brand | `brand-primary`, `brand-primary-hover`, `brand-primary-pressed`, `brand-primary-foreground`, `brand-primary-soft`, `waitlist-button-hover` cover primary emphasis and interaction states. |
| Secondary brand | `brand-secondary`, `brand-secondary-hover`, `brand-secondary-foreground`, `brand-secondary-soft` cover supporting actions and balancing accents. |
| Feedback | `feedback-danger`, `feedback-danger-on-inverted`, `feedback-danger-soft`, `feedback-success`, `feedback-success-soft`, `feedback-info`, `feedback-info-soft`, `status-pending`, `status-pending-soft`, `savings-badge-text`, `savings-badge-surface` communicate outcomes and status. |
| Metrics | `metric-energy` and `metric-energy-soft` mark energy and effort readings — calories, streaks, and the day's training focus. They share a value with `status-pending` but answer to measured effort rather than workflow state. Reference app only. |
| Celebration | `celebration-accent` highlights success moments, such as the waitlist confetti burst. Reference app only. |
| Training | `training-strength`, `training-recovery`, `training-rest`, `training-hypertrophy` and their `-soft` partners identify day types. The reference app also uses `training-lighter`. |
| Effort | `effort-critical` marks being at or near muscular failure on the reps-in-reserve scale; the scale's other stops are `metric-energy` for moderate reserve and `training-recovery` for ample. Reference app only. |
| Cycle | `cycle-menstrual`, `cycle-follicular`, `cycle-ovulatory`, `cycle-luteal` identify menstrual-cycle phases. The reference app pairs each with a `-soft` partner for tinted phase banners. |
| Flow | `flow-spotting`, `flow-light`, `flow-medium`, `flow-heavy` and their `-soft` partners grade menstrual flow intensity. A separate scale from the cycle phases: `flow-light` and `flow-heavy` currently share values with `cycle-menstrual` and `brand` but not their roles, so the four move independently. Reference app only. |
| Overlays | `overlay-strong`, `overlay-medium`, `overlay-soft` provide consistent scrim strength. |
| Prototype nutrition | `macro-{protein,carb,fat,kcal}[-soft]` is for macro data; `nutrition-{protein,carb,fat,legume,extra,seasoning}[-soft]` is for food categories; `tag-{mealtime,cycle,nutrient,dietary}[-soft]` is for tag families. |

Layout tokens include `container-reading`, `container-content`, and `container-stage`; `size-control-{sm,md,lg}` and `size-avatar-{sm,md,lg}`; `radius-{xs,control,sm,md,panel,pill,phone-frame}`; and `shadow-{soft,raised,floating,brand-glow,phone-frame}`. Public-site compositions use narrowly scoped `public-*` radius, size, and shadow tokens rather than adding raw repeated values.

### Typography

- `DM Sans` is the body and interface family; `Playfair Display` is the heading and display family.
- The core scale is `label` (12px), `body-sm` (14px), `body-base` (16px), `body-lg` (18px), `display-sm` (24px), `display-md` (32px), and fluid `display-lg` (44–72px).
- Available weights are regular 400, medium 500, and semibold 600. Shared line-height roles are `tight`, `heading`, `display-relaxed`, `body`, and `copy-relaxed`.
- `tracking-label`, `tracking-nav`, `tracking-section-eyebrow`, and `tracking-wide` cover the current letter-spacing roles.
- `count-badge` (10px) is the one step below the core scale, reserved for the numeric count overlaid on an icon control such as the cart button.
- `public-my-method-*`, `public-footer-cta-*`, and `phone-*` typography tokens are intentionally scoped to compact public-site compositions and phone previews.

### Spacing

The spacing scale is `space-0` (0), `space-1` (4px), `space-2` (8px), `space-3` (10px), `space-4` (12px), `space-5` (16px), `space-6` (24px), `space-7` (32px), `space-8` (48px), `space-9` (64px), and `space-10` (96px).

- `space-1` to `space-2` handle icon gaps and other micro-spacing.
- `space-3` to `space-5` handle compact control padding and tightly related content.
- `space-6` to `space-7` handle card padding and component groups.
- `space-8` to `space-10` handle major layout and section separation.
