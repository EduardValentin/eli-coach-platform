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
| `Alert` | Form-level error message, one look wherever a form reports a failure | No variants |
| `Button` | Every text action control, as a button or through `buttonVariants` on a link | `variant`: `primary`, `secondary`, `inverted`, `outline`, `outline-brand`, `glass`; `size` by height: `xs` (32px), `md` (48px), `lg` (56px), `lg-tight` (56px with the narrow padding); `width`: `content`, `full`, `full-below-sm`; `weight`: `regular`, `medium`, `semibold`; `textSize`: `sm`, `base`, `lg`; `lettering`: `plain`, `wide`, `caps`; `elevation`: `flat`, `raised`; `press`: `none`, `scale` |
| `Card` | Bordered content container, as a `div` or through `cardVariants` on any element | `variant`: `card` (16px corner, faint border, card shadow), `quiet` (the same corner on the quiet surface, flat), `panel` (24px corner, subtle border, soft shadow, for large frames) |
| `Checkbox` | The one check box: 20px, base surface, soft shadow, brand fill and white check when checked | No variants |
| `IconButton` | Labelled icon-only action; icon-only buttons are circular | `variant`: `ghost`, `plain`, `soft` |
| `Input` | Single-line form control: 48px tall, quiet grey fill, soft border | No variants |
| `Link` | Router-aware text or navigation link | `inline`, `subtle`, `pill` |
| `FormField` | Label, control, hint and error with the `aria-describedby`/`aria-invalid` wiring done once | No variants |
| `RadioGroup` | Fieldset-grouped radio options with a legend | No variants |
| `Stepper` | Wizard progress with a spoken step count and decorative bars | No variants |
| `Slider` | Single-thumb range control, labelled on the thumb Radix gives the role to | No variants |
| `MetricTile` | One figure with its name, an optional hint and a label suffix | `tone`: `neutral`, `brand` |
| `Select` and its compound parts | Styled Radix selection control | Trigger `size`: `sm`, `md` |
| `TextArea` | Multi-line form control with the `Input` look | No variants |
| `FilterChipGroup`, `FilterChip` | Filter chips offering one choice per group | `tone`: `brand`, `brand-secondary` |
| `SidebarSurfaceLayout` | Portal shell with sidebar navigation and main content | No variants |
| `PortalShell` | Portal chrome: sidebar, mobile top bar and navigation, main landmark | No variants |
| `PhoneFrame` | Reusable device chrome for product previews | `statusBarVariant`: `dark`, `light` |
| `SectionEyebrow` | Uppercase label above a section heading | `brand`, `muted` |

Every button shares one base: the 14px `control` corner, a 2-unit gap, no wrapping, 50% opacity when disabled, and the one focus rule below. A size sets only the height and one horizontal padding (`px-4` for `xs` and `lg-tight`, `px-8` otherwise); `lg-tight` is for a full button that shares its row with another action. A `full` button fills its row; `full-below-sm` fills it only below the `sm` breakpoint, where stacked actions take the whole width. `raised` is the only elevation: the `action` shadow lifting to `action-hover` on hover. `glass` is the one translucent tone for an action over the hero; the header's portal link uses it while the header is transparent and `primary` once it turns solid. The reference app's `ThemeButton` mirrors production's `Button` variant for variant, and its shadcn `Button` keeps the same corner and no focus border. Its shadcn `Tabs` carries a `segmented` variant — the filter bar of the coach's assessment calls page and of both check-in pages — which wraps to a second row rather than overflowing its container, so its triggers grow from their own width instead of sharing a zero basis; production has no counterpart yet. Its shadcn `Badge` adds a prototype-only `brand-secondary` variant for the coach's "Today" call badge, on the assessment calls page and on the dashboard's upcoming-calls widget: teal ink and a teal outline on `brand-secondary-surface`, because the tint alone does not separate the pill from the surfaces it sits on. A second prototype-only `muted` variant — muted ink inside the standard border and no fill — is the quiet status tag that stands in for the join action on a call that has ended. Its shadcn `Pagination` has its first consumer on the assessment calls page, and it keeps shadcn's own geometry rather than the app's: the numbered links are `size-9` circles and the previous and next controls `h-9`, where the app's control scale is `size-control-{xs,sm,md,lg}` at 32, 40, 48 and 56px and every other button takes the `control` corner. Production has no counterpart. `PaginationLink` also takes `asChild`, and the previous and next controls place their chevron and label around a `Slottable`, so a caller can hand in a router `Link` without restating the primitive's own content.

The reference app also has six reusable product compositions of its own: `ToggleChip` for multi-select pills built on the `Toggle` button primitive, `CheckboxChip` for a multi-select fieldset that must read as a checkbox group to assistive technology (same pill look and soft brand-tinted selected state as `ToggleChip`, but backed by a visually hidden native checkbox rather than a button), `ResponsiveSheetDialog`, which presents the same content in a mobile bottom sheet or desktop dialog, `ErrorPage`, the shared dead-end layout behind the 404, the 403, the failed-sign-in page and the "call link not ready" page a join link renders while the coach has not saved a meeting room — an icon medallion, a muted eyebrow, one `<h1>`, body copy, and exactly one action supplied by the caller — and two tiers of coach appointment. `AppointmentCard` carries the full record, on the check-in lists and the assessment calls page: an attendee's photo or initial, their name in a caller-chosen element, a date and time row, an optional mail link, and caller-supplied badges, quote, footnote and actions; its `past` status drops the shadow and mutes the name and the initial, and below `md` its actions stack under the content at full width. `DashboardAppointmentRow` carries the summary, and is the one row both dashboard cards use — an attendee's name, one muted date and time line, optional badges and a single action. A surface showing an appointment in full takes the card; a dashboard card summarising several takes the row. Its local `PhoneFrame` and `SectionEyebrow` mirror the production components. Its `MetricTile` carries a toned icon and four tones where the production component has two and tones the label instead; the two have not been reconciled.

Keyboard focus is drawn by one unlayered `:focus-visible` rule in `theme.css` rather than per component: the `focus-visible:ring-*` and `focus-visible:outline-*` utilities the primitives carry paint nothing in this app, and the primitives also carry `outline-none`, which as a utility beats anything in `@layer base`. The indicator is a 2px `--focus-ring` outline at 2px offset with a soft 16% halo, matching the brand ring production already draws. `--focus-ring` resolves to `--brand`, which clears 5.5:1 on white and 4.9:1 on the warm page background, well over the 3:1 SC 1.4.11 asks of a non-text indicator; controls inside an element marked `data-surface="inverted"` (the hero, and the header while it is transparent over it) switch to the lighter `--brand-on-inverted`, because the brand pink only reaches 2.7:1 against near-black. Menu and option items, and `tabindex="-1"` skip-link targets, are excluded because they suppress their outline deliberately and signal focus another way; a base rule also removes the browser outline those targets would get on programmatic focus. A sibling rule matches `label[data-chip-control]:has(:focus-visible)` with the same outline and halo: a chip whose real control is a visually hidden native input (`CheckboxChip`) cannot show its own outline, since an `opacity: 0` element's outline is invisible too, so the attribute hands the same indicator to the visible label instead. `data-chip-control` is the opt-in for that case; any future chip built the same way must carry it.

Every form built on `Input` and `TextArea` — the booking details, the cart, the coach tools — draws one field: 48px tall, the 8px `field` corner, a quiet grey fill at half strength, the soft control border, and the border darkening to `border-focus` on focus. Callers set only layout (width, an icon inset, a textarea height), never the look. The waitlist capture keeps its own pill field on its dark and light surfaces. Portal pages that still draw raw underlined inputs have not been moved onto `Input` yet. No field sets its own focus colour — the one rule above owns that.

### Semantic Tokens

Token names below omit the CSS `--color-` prefix used in production utilities.

| Family | Tokens and role |
| --- | --- |
| Surfaces | `surface-page`, `surface-base`, `surface-subtle`, `surface-soft`, `surface-brand-soft`, `surface-inverted` define the page, cards, quiet sections, brand tint, and always-dark areas. `surface-quiet` and `surface-muted` are the resting and hover fills of neutral controls, `surface-strong` the dark fill of a chosen option, `surface-neutral` a neutral chip fill. |
| Text | `text-primary`, `text-secondary`, `text-muted`, `text-inverted`, `copy-muted`, `placeholder-soft`, `link-muted` define content hierarchy and surface-aware copy. `text-label` is the ink of field labels, neutral control text and short credential lines, `text-inverted-secondary` the lead copy over the hero video, and `icon-muted` the decorative glyph of an empty state. |
| Borders and neutral metadata | `border-subtle`, `border-strong`, `border-soft`, `border-default`, `border-focus`, `control-border-soft`, `stroke-faint`, `divider`, `bundle-muted` separate controls and content without adding emphasis; `border-focus` is the border a field takes while focused and `divider` the short rule between the mobile menu's links and its account actions. |
| Primary brand | `brand-primary`, `brand-primary-hover`, `brand-primary-foreground`, `brand-primary-soft`, `brand-primary-on-inverted`, `focus-ring` cover primary emphasis, interaction states and the keyboard focus ring. |
| Secondary brand | `brand-secondary`, `brand-secondary-hover`, `brand-secondary-foreground`, `brand-secondary-soft` cover supporting actions and balancing accents. `brand-secondary-surface` is the opaque tint behind teal ink on a badge or pill, so its contrast does not depend on the fill underneath. Reference app only. |
| Feedback | `feedback-danger`, `feedback-danger-on-inverted`, `feedback-danger-soft`, `feedback-success`, `feedback-success-soft`, `feedback-info`, `feedback-info-soft`, `status-pending`, `status-pending-soft`, `savings-badge-text`, `savings-badge-surface` communicate outcomes and status. |
| Metrics | `metric-energy` and `metric-energy-soft` mark energy and effort readings — calories, streaks, and the day's training focus. They share a value with `status-pending` but answer to measured effort rather than workflow state. Reference app only. |
| Celebration | `celebration-accent` highlights success moments, such as the waitlist confetti burst. Reference app only. |
| Training | `training-strength`, `training-recovery`, `training-rest`, `training-hypertrophy` and their `-soft` partners identify day types. The reference app also uses `training-lighter`. |
| Effort | `effort-critical` marks being at or near muscular failure on the reps-in-reserve scale; the scale's other stops are `metric-energy` for moderate reserve and `training-recovery` for ample. Reference app only. |
| Cycle | `cycle-menstrual`, `cycle-follicular`, `cycle-ovulatory`, `cycle-luteal` identify menstrual-cycle phases. The reference app pairs each with a `-soft` partner for tinted phase banners. |
| Flow | `flow-spotting`, `flow-light`, `flow-medium`, `flow-heavy` and their `-soft` partners grade menstrual flow intensity. A separate scale from the cycle phases: `flow-light` and `flow-heavy` currently share values with `cycle-menstrual` and `brand` but not their roles, so the four move independently. Reference app only. |
| Overlays | `overlay-strong`, `overlay-medium`, `overlay-soft` provide consistent scrim strength. |
| Prototype nutrition | `macro-{protein,carb,fat,kcal}[-soft]` is for macro data; `nutrition-{protein,carb,fat,legume,extra,seasoning}[-soft]` is for food categories; `tag-{mealtime,cycle,nutrient,dietary}[-soft]` is for tag families. |

Layout tokens include `container-reading`, `container-content`, `container-portal` (the width the coach and client portal content columns share), and `container-stage`; `size-control-{xs,sm,md,lg}` and `size-avatar-{sm,md,lg}`. Radii are named by role, never by size: `checkbox` (4px) the check box, `tile` (6px) small tiles, tags, the logo mark and chat-bubble tails, `field` (8px) text fields and the thumbnails and rows inside a card, `compact` (10px) the pricing card's folder-tab badge and the coach portal's brand marks, `control` (14px) every button, time slot and calendar control, `card` (16px) every card and card-like surface, `panel` (24px) large framed panels, and `phone-frame` (40px) the device chrome. Both apps use the role names only; the framework's size steps keep their own values and are not used for corners. Fully rounded shapes use the framework's `rounded-full`; and `shadow-{soft,card,raised,floating,action,action-hover,phone-frame}`, where `card` is the low elevation of cards and chosen options and `action`/`action-hover` the resting and hover lift of a raised interactive control. Public-site compositions use narrowly scoped `public-*` radius, size, and shadow tokens rather than adding raw repeated values.

### Typography

- `DM Sans` is the body and interface family; `Playfair Display` is the heading and display family.
- The core scale is the framework's `xs` to `5xl` steps plus `caption` (11px) for the smallest readable text — calendar weekdays, chart axes, phone-preview body copy — `md` (15px) between `sm` and `base`, `label` (12px semibold at `tracking-label`, the uppercase store tags and badges), and the display steps `display-sm` (24px), `display-md` (32px), and fluid `display-lg` (44–72px).
- Available weights are regular 400, medium 500, and semibold 600. Two more are reserved: light 300 for the hero's lead copy over video, and bold 700 for prices and the tracked uppercase `micro` labels. Line heights are the framework's `tight` (1.25, every heading that sets one), `snug`, `normal` and `relaxed`, plus `display-snug` (1.1) for large display headings and `heading` (1.2) inside the display steps.
- `tracking-label` and `tracking-section-eyebrow` are the letter-spacing roles; everything else uses the framework's `tracking-*` steps at their own values, `tracking-wide` (0.025em) for navigation links and short badges.
- `micro` (10px) is the one step below the core scale: the count on an icon control such as the cart button, tracked uppercase overlines and badges, and phone-preview actions.
- `public-my-method-figure-heading`, `public-cycle-phase`, `public-footer-cta-*`, and `phone-*` typography tokens are intentionally scoped to compact public-site compositions and phone previews.

### Spacing

The spacing scale is `space-0` (0), `space-1` (4px), `space-2` (8px), `space-3` (10px), `space-4` (12px), `space-5` (16px), `space-6` (24px), `space-7` (32px), `space-8` (48px), `space-9` (64px), and `space-10` (96px).

- `space-1` to `space-2` handle icon gaps and other micro-spacing.
- `space-3` to `space-5` handle compact control padding and tightly related content.
- `space-6` to `space-7` handle card padding and component groups.
- `space-8` to `space-10` handle major layout and section separation.
