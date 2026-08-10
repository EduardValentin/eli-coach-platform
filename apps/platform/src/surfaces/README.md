# Surfaces

Three places people meet the product, served by one deployable.

| Surface | URL | Installable |
| --- | --- | --- |
| `public-site` | `/` | no |
| `client-portal` | `/client/*` | yes, scope `/client/` |
| `coach-portal` | `/coach/*` | yes, scope `/coach/` |

A feature's `ui/` subfolders use the short form of these names: `public-site` → `ui/public/`, `client-portal` → `ui/client/`, `coach-portal` → `ui/coach/`.

A surface creates only the folders it needs:

- `shell/` — the layout route module and the chrome around every page
- `sections/` — the page blocks this surface assembles its pages from
- `pages/` — pages this surface owns
- `api/` — resource routes this surface owns

What separates a section from a page is registration, not purity. Nothing in
`routes.ts` points at a section, and a section is free to mount feature UI that
talks to the network: `sections/hero/` and `sections/footer-cta/` both mount
`waitlist/ui/public/waitlist-email-form`, which POSTs to `/api/waitlist`. The
R2 example block under *Import rules* is that permission written down — it
holds anywhere under a surface, `sections/` included.

Today `public-site` has `shell/`, `sections/` and `pages/`; the two portals have
`shell/`, `pages/` and `api/`, the last holding each portal's web manifest and
its own `readyz`. Neither portal's `shell/` holds a sidebar of its own — both
layouts render `SidebarSurfaceLayout` from `@eli-coach-platform/ui`, for the
reason in *Import rules* below.

`server/api/` — outside every surface — holds the four resource routes that
belong to no surface: `/readyz`, `/api/meta`, `/api/feature-flags` and
`/api/bot-detection`. It is not where every non-surface resource route lives,
though: a feature registers its own endpoints from its own `api/`, which is
where `/api/waitlist` and the four `/api/store/*` routes come from.

## Where a page lives

Count the features **the page file itself reaches for** — the feature it sits
in, if any, plus every `~/features/<name>/` it imports:

| Features the page file reaches for | Home |
| --- | --- |
| none | the surface |
| one | that feature's `ui/<public\|client\|coach>/` |
| several | the surface, composing each feature's `ui/` |

The page *file*, not the page's rendered tree, is the whole of the criterion.
A surface page renders that surface's `shell/` and `sections/`, and those may
reach for features of their own without changing where the page belongs —
otherwise every public page would count `waitlist` and `store`, which the
layout mounts on all eight of them.

Pages migrate between cases as features arrive, and naming the move before it
happens is what makes it read as a plan rather than a rule change.

Every page registered in `routes.ts` today, with the count from its own imports:

| Page | Features the page file reaches for | Lives in |
| --- | --- | --- |
| `/` | none — `home.tsx` imports only this surface's `sections/` | `public-site/pages/home.tsx` |
| `/pricing` | two — `coaching-bundles` and `waitlist` | `public-site/pages/pricing.tsx` |
| `/blog` | none | `public-site/pages/blog.tsx` |
| `/privacy`, `/terms` | none — the shared legal view lives in `sections/legal/` | `public-site/pages/` |
| `/store`, `/store/:slug`, `/store/download` | one — `store`, the feature the page files sit in | `features/store/ui/public/`, which registers them from inside the feature |
| `/client`, `/coach` | none yet | each portal's `pages/home.tsx` |

Every row falls out of the table above with no exception. `/blog` is the one
expected to move — to `features/blog/ui/public/`, when it gains posts.

`/pricing` is worth one note of history rather than an exception. An earlier
version of this table filed it as one feature — `coaching-bundles` — and
pointed it at `coaching-bundles/ui/public/`. That was already wrong when
written: the waitlist email form and availability status have sat beside the
bundle cards since before the restructure began, so the page file has reached
for two features all along. Billing will make it three, and it stays here.

## Import rules

The rules below are enforced in `eslint.config.mjs`, in both their static and
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

The traffic runs one way, and that is the third rule. Only a surface may import
`~/surfaces/**`: a feature composed into one surface has to stay composable into
the next, so `features/**` and the app's own `server/**` are fenced off the alias
outright. It is why the shared motion helpers sit in `packages/ui` rather than in
the public site, where a feature would have had to reach for them.
