# Surfaces

Three places people meet the product, served by one deployable.

| Surface | URL | Installable |
| --- | --- | --- |
| `public-site` | `/` | no |
| `client-portal` | `/client/*` | yes, scope `/client/` |
| `coach-portal` | `/coach/*` | yes, scope `/coach/` |

A feature's `ui/` subfolders use the short form of these names: `public-site` → `ui/public/`, `client-portal` → `ui/client/`, `coach-portal` → `ui/coach/`.

A surface creates only the folders it needs:

- `shell/` — layout, navigation, footer, sidebar
- `sections/` — presentation-only page sections
- `pages/` — pages this surface owns
- `api/` — resource routes this surface owns

Today `public-site` has `shell/`, `sections/` and `pages/`; the two portals have
`shell/`, `pages/` and `api/`, the last holding each portal's web manifest and
its own `readyz`. The app-wide resource routes — `/readyz`, `/api/meta`,
`/api/feature-flags`, `/api/bot-detection` — belong to no surface and stay in
`server/api/`.

## Where a page lives

| Features behind the page | Home |
| --- | --- |
| none | the surface |
| one | that feature's `ui/<public\|client\|coach>/` |
| several | the surface, composing each feature's `ui/` |

Pages migrate between cases as features arrive. Naming the move before it
happens is what makes it read as a plan rather than a rule change, so the table
below records which of today's pages is expected to move, and why the two that
look like they should are staying put.

Every page registered in `routes.ts` today:

| Page | Features behind it | Lives in |
| --- | --- | --- |
| `/` | `waitlist`, through the hero section and the footer CTA the layout adds on `/` — not through the page file | `public-site/pages/home.tsx`, composing six of this surface's `sections/` |
| `/pricing` | `coaching-bundles` and `waitlist`, both imported by the page | `public-site/pages/pricing.tsx` |
| `/blog` | none | `public-site/pages/blog.tsx` |
| `/privacy`, `/terms` | none | `public-site/pages/`, over the shared legal view in `sections/legal/` |
| `/store`, `/store/:slug`, `/store/download` | `store` alone | `features/store/ui/public/`, which registers them from inside the feature |
| `/client`, `/coach` | none yet | each portal's `pages/home.tsx` |

Two of these are worth reading twice.

`/` resembles the one-feature case and is not it. What the page composes is six
marketing sections this surface owns; the waitlist form sits inside one of
them. Moving the page into `waitlist/ui/public/` would drag the surface's whole
marketing narrative with it. The case is decided by what the page is made of,
not by which features it eventually touches.

`/pricing` is the several-features case, and stays on the surface for that
reason. An earlier version of this table filed it as one feature —
`coaching-bundles` — and pointed it at `coaching-bundles/ui/public/`. That was
already wrong when written: the waitlist email form and availability status
have sat beside the bundle cards since before the restructure began. `/blog` is
the row that does move, to `features/blog/ui/public/`, when it gains posts.

## Import rules

Both rules below are enforced in `eslint.config.mjs`, in both their static and
dynamic-`import()` forms, and proven in `tools/lint-boundaries.test.mjs`.

A surface reaches a feature only through the `ui/` slice built for that
surface, that feature's surface-agnostic `ui/shared/`, or its `contracts/`:

```tsx
// anywhere under surfaces/public-site/
import { BundleSelector } from "~/features/coaching-bundles/ui/public/bundle-selector"; // ok
import { WaitlistEmailForm } from "~/features/waitlist/ui/public/waitlist-email-form";  // ok
import type { Waitlist } from "~/features/waitlist/contracts/waitlist";                 // ok
import { ExerciseCard } from "~/features/training/ui/shared";                           // ok
import { PlanBuilder } from "~/features/training/ui/coach";                             // rejected
import { catalogRepository } from "~/features/store/data/catalog-repository.server";    // rejected
```

The first three are real imports the public site makes today; swap `public` for
`client` or `coach` and the same shape holds for either portal.

Never `data/`, `api/`, or `email/` — those are the feature's server-only half.

The three surfaces must not import each other. What they legitimately share
goes through `features/*/ui/shared/` or `@eli-coach-platform/ui` instead, which
is why `SidebarSurfaceLayout` — used by both portal shells — lives in
`packages/ui` rather than in one portal.

Features have no feature-root barrel that would re-export every surface's UI
together, so a violation is visible in the diff without knowing the rule, and
the rule rejects a bare `~/features/<feature>` import outright to keep it that
way. A per-surface `ui/<surface>/index.ts` is fine and expected: it cannot leak
one surface's screens into another.
