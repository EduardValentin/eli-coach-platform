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

The pure half of each feature — rules, ports, models — lives in
`packages/domain/src/<feature>/`, which declares no dependencies and therefore
cannot import React, Postgres, or any vendor SDK.

## The `.server` suffix

Every source file in `data/`, `api/`, and `email/` carries the `.server`
suffix, and so does any server-only file under `ui/` — **except** a module
registered in `routes.ts`. React Router strips `.server` files from the client
build, but the client route manifest still has to import every registered
route, resource routes included, so the one file per endpoint
(`api/<endpoint>.ts`) and per page (`ui/<surface>/<page>.tsx`) must not carry
the suffix. Everything else it depends on — the loader, the controller, the
repository, the email sender — can and should still carry it.

How the registered module reaches what it depends on differs by folder: a page
imports its loader from the sibling directly (`catalog-page.tsx` imports
`./catalog-page.server`), while an `api/` endpoint resolves its controller
through the container rather than importing a sibling.

Tests and their helpers sit outside this convention: `*.test.ts` and the
`*-migration-test-context.ts` helpers carry no `.server` suffix even inside
`data/`, `api/` and `email/`.

Part of the split is enforced: inside `ui/`, only a `.server.ts` or a test may
import `~/server/container.server`, so a page's route module has to go through
its loader sibling rather than build the container itself. Route modules in
`api/` may reach it directly; the rule's full allowlist lives in
`eslint.config.mjs` and is proven in `tools/lint-boundaries.test.mjs`.

## Built

Shipped to users. The third column says where the code sits **today**, because
the restructure moves one feature at a time and a half-moved feature must be
readable as half-moved rather than as finished.

| Feature | What it does | Where it lives |
| --- | --- | --- |
| `waitlist` | Join the waiting list, availability status, confirmation email. | Fully here: `waitlist/`. |
| `store` | Digital product catalog, free acquisition, delivery email, and download. | Fully here: `store/`, the first feature to register its own page routes from inside the feature folder. |
| `coaching-bundles` | The 1-, 3-, and 6-month coaching bundles and the pricing page. | Not here yet. Rules in `packages/domain/src/coaching-bundles/`. `/pricing` registers from the sibling file `routes/marketing/pricing.tsx`; `routes/marketing/pricing/` holds only `bundle-selector.tsx` and its test. No `features/coaching-bundles/` exists. |

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
