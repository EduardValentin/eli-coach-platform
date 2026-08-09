# Surfaces

Three places people meet the product, served by one deployable.

| Surface | URL | Installable |
| --- | --- | --- |
| `public-site` | `/` | no |
| `client-portal` | `/client/*` | yes, scope `/client/` |
| `coach-portal` | `/coach/*` | yes, scope `/coach/` |

A feature's `ui/` subfolders use the short form of these names: `public-site` → `ui/public/`, `client-portal` → `ui/client/`, `coach-portal` → `ui/coach/`.

Each surface holds:

- `shell/` — layout, navigation, footer, sidebar
- `sections/` — presentation-only page sections (public site only)
- `pages/` — pages this surface owns
- `api/` — resource routes this surface owns, such as `readyz` and its web manifest

## Where a page lives

| Features behind the page | Home |
| --- | --- |
| none | the surface |
| one | that feature's `ui/<public|client|coach>/` |
| several | the surface, composing each feature's `ui/` |

Pages migrate between cases as features arrive. The triggers are named in
advance so a move reads as a plan rather than a rule change:

| Page | Today | Trigger | Then |
| --- | --- | --- | --- |
| `/pricing` | one feature — `coaching-bundles/ui/public/` | billing lands | this surface's `pages/`, composing `coaching-bundles` and `billing` |
| `/blog` | no features — this surface's `pages/` | it gains posts | `features/blog/ui/public/` |

## Import rules

A surface may import only its own UI slice and shared code:

```tsx
// surfaces/coach-portal/pages/dashboard.tsx
import { PlanBuilder } from "~/features/training/ui/coach";            // ok
import { ExerciseCard } from "~/features/training/ui/shared";          // ok
import { ActiveWorkoutTracker } from "~/features/training/ui/client";  // rejected
```

Never `data/`, `api/`, or `email/`. Surfaces must not import each other.

Features have no feature-root barrel that would re-export every surface's UI
together, so a violation is visible in the diff without knowing the rule. A
per-surface `ui/<surface>/index.ts` is fine and expected: it cannot leak one
surface's screens into another.
