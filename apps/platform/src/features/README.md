# Features

A feature is something the product does for a user. If you cannot describe it
to the product owner in their own words, it is not a feature — it is either
infrastructure (`packages/infrastructure`) or a single-feature technical
adapter, which lives in that feature's `data/`.

Each feature uses the same five folder names, and creates only the ones it needs:

| Folder | Holds |
| --- | --- |
| `contracts/` | Zod wire schemas — request, response, error shapes. Browser-safe. |
| `data/` | Adapters implementing domain ports: repositories, file stores, crypto, Drizzle schema. Server-only. |
| `email/` | Adapters implementing domain email ports, plus templates. Server-only. |
| `api/` | Controllers, route modules, response transport. Server-only. |
| `ui/` | Screens, components, browser data-access and state. Exactly four subfolders: `public/`, `client/`, `coach/`, `shared/`. Nothing loose at the root. |

Every file in `data/`, `api/`, and `email/` carries the `.server` suffix.

The pure half of each feature — rules, ports, models — lives in
`packages/domain/<feature>/`, which declares no dependencies and therefore
cannot import React, Postgres, or any vendor SDK.

## Built

| Feature | What it does |
| --- | --- |
| `store` | Digital product catalog, free acquisition, delivery email, and download. |
| `waitlist` | Join the waiting list, availability status, confirmation email. |
| `coaching-bundles` | The 1-, 3-, and 6-month coaching bundles and the pricing page. |

## Planned

identity, billing, onboarding, client-management, messaging, check-ins,
training, nutrition, cycle, notifications, settings, booking, blog.

No placeholder folders are created for these, so the tree never claims code
that does not exist.

## Decided ahead of build

- **`nutrition` → `cycle`.** `cycle` owns calendar and body facts only — phases,
  period logs, symptoms, conditions — and knows nothing about food. `nutrition`
  asks which phase a client is in and owns every food consequence. This keeps
  `cycle` a leaf, which is what keeps it optional for clients who do not track one.
- **`onboarding` → `identity`.** `identity` owns accounts, roles, and invitation
  tokens. `onboarding` owns the flow that runs over them, both halves of it:
  the coach's onboard-client wizard in `ui/coach/` and the client's six-step
  self-onboarding in `ui/client/`.
- **`client-management`** holds the coach's steady-state screens only — roster,
  client details, profile editing — not the onboarding flow.
- **`training`** holds both halves of a plan's life: the coach's hub, plan builder
  and review in `ui/coach/`, the client's plan, viewer, tracker and history in
  `ui/client/`.

The general rule: **when two features meet, the one that owns raw facts stays
the leaf, and the one that owns consequences depends on it.**

`onboarding` and `training` share a shape worth naming — **one feature, two
actors, one handoff.** The coach starts, the client finishes, and what they
share is the model.
