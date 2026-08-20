# Architecture

## Status

This document captures the current architecture for the coaching platform.

The PRD and design reference are still evolving, so this document focuses on the stable implementation direction:

- one production app
- clear internal boundaries
- self-hosted delivery
- fast MVP execution
- a clean path to future extraction if the product outgrows the monolith

## Product Surfaces

The product has three business-critical surfaces, and they carry the same names in code, one folder each under `apps/platform/src/surfaces/`:

- `public-site`: landing page, blog, public digital store; served at `/`
- `client-portal`: authenticated, mobile-friendly, installable; served at `/client/*`
- `coach-portal`: authenticated, operationally richer; served at `/coach/*`

*Production App Structure* below is the source of truth for what each surface owns and for where a given file goes.

The repository also contains `designs/react-reference-app`, which is a TEST-only design reference and not part of the production runtime.

## Current Architecture

The decided production architecture is:

- one full-stack React Router v7 Framework Mode app under `apps/platform`
- one PostgreSQL database
- one Docker image for the production app
- one Docker image for the TEST-only design reference app
- one Docker Compose stack per environment
- Traefik at the edge
- Tailscale for private CI/CD access to hosts
- runtime secrets provisioned by `terraform-infra`

This is a modular monolith.
The public site, client portal, and coach portal still exist as product boundaries in code, but they are delivered by one runtime.

## Why This Direction

This architecture is optimized for the current constraints:

- low hosting cost
- one-person development and maintenance
- fast MVP delivery
- self-hosted infrastructure
- ability to keep public, client, and coach concerns cleanly separated in code

The goal is to keep the runtime simple while preserving extraction seams for later.

## Core Stack

- React Router v7 Framework Mode
- React 19
- TypeScript
- Vite 7
- TanStack Query 5
- React Hook Form 7
- Zustand 5
- pnpm workspaces
- PostgreSQL 18
- Docker Compose
- Traefik

The TEST and PROD hosts are expected to run the app behind Traefik with Postgres as a sibling container on the same VPS or VM.

## Repository Layout

```text
/apps
  /platform

/packages
  /config
  /content
  /db
  /domain
  /infrastructure
  /ui

/deploy
  /test

/docker
/docs
/scripts
/tools
/designs/react-reference-app
```

## Production App Structure

The production app lives in `apps/platform`. Its source tree is organized feature-first, with the three surfaces as the layer that assembles features into products:

```text
/apps/platform/src
  /features      one folder per thing the product does for a user
  /surfaces      the three places people meet the product
  /server        the composition root, the runtime wiring around it, and the resource routes no surface owns
  /types         ambient type declarations
  app.css
  query-client.tsx
  root.tsx
  routes.ts
```

Route modules are not the organizing unit; they are leaves that sit inside whichever feature or surface owns the work they deliver. `routes.ts` is the single registry, and it points at all three homes today: a surface's `shell/`, `pages/` or `api/`; a feature's `ui/<public|client|coach>/` or `api/`; and `server/api/` for the endpoints that belong to no surface.

The app is deployed as one server-rendered React Router application, not as multiple independently deployed frontends.

### Feature folders

A feature creates only the folders it needs, and no others:

| Folder | Holds |
| --- | --- |
| `contracts/` | Zod wire schemas — request, response, error shapes. Browser-safe. |
| `data/` | Adapters implementing domain ports: repositories, file stores, crypto, Drizzle schema. Server-only. |
| `email/` | Adapters implementing domain email ports, plus templates. Server-only. |
| `api/` | Controllers, route modules, response transport. Server-only. |
| `ui/` | Screens, components, browser data-access and state. Only `public/`, `client/`, `coach/` and `shared/` subfolders; nothing loose at the root. |

The pure half of a feature — rules, ports, models — lives in `packages/domain/src/<feature>/` instead.

### Surface folders

A surface creates only what it needs from `shell/` (the layout route module and the chrome around every page), `sections/` (the page blocks its pages are assembled from), `pages/` and `api/`. Today that means `shell/`, `sections/` and `pages/` for `public-site`, and `shell/`, `pages/` and `api/` for each portal, the last holding that portal's web manifest and its own `readyz`; the endpoints no surface owns — `/readyz`, `/api/meta`, `/api/feature-flags` and `/api/bot-detection` — sit in `server/api/` instead. A feature's `ui/` subfolders use the short form of the surface names: `public-site` → `ui/public/`, `client-portal` → `ui/client/`, `coach-portal` → `ui/coach/`.

### Where a page lives

Count the features the page **file itself** imports — the feature it sits in, if any, plus every `~/features/<name>/` in its own import list:

| Features the page file imports | Home |
| --- | --- |
| none | the surface |
| exactly one | that feature's `ui/<public\|client\|coach>/` |
| several | the surface, composing each feature's `ui/` |

The page file, not the page's rendered tree, is the whole of the criterion: a surface's `shell/` and `sections/` may reach for features of their own without changing where the page belongs.

### The `.server` suffix

Every TypeScript module in `data/`, `api/` and `email/` carries the `.server` suffix, and so does any server-only file under `ui/` — **except a module registered in `routes.ts`, which must not carry it**. React Router strips `.server` files from the client build, but the client route manifest still imports every registered route, so a registered module carrying the suffix breaks the build. Merging the loader into the route module is not a way out either: React Router removes only `loader`, `action`, `middleware` and `headers` from the client build, so everything else that module pulls in would still reach the browser. A registered page therefore re-exports its `loader` from a `.server.ts` sibling, and an `api/` endpoint resolves its controller through the container rather than importing one.

The rule reaches modules only. `store/api/download-recovery.html` is a document rather than a module — `downloads-controller.server.ts` imports it `?raw` and interpolates it server-side — so there is nothing for React Router to strip and it carries no suffix. A test named after a single module carries `.server` exactly when that module does: `zip-stream.server.test.ts`, `acquisitions-controller.server.test.ts`, `catalog-page.server.test.ts`. A test covering several modules is named for what it covers and takes no suffix, like `internal-controllers.test.ts`. The suffix is never load-bearing on a test file, because `routes.ts` registers none. Setting tests aside, the only module inside `api/` that is neither registered nor suffixed is `server/api/service-metadata.ts`, a browser-safe schema shared with the controller that serves it, and the only ones inside `data/` are the `*-migration-test-context.ts` helpers.

## Internal Boundaries

The codebase must treat the product as multiple surfaces inside one runtime.

### Features and Surfaces

Inside the app, features and surfaces are the organizing units.

- a **feature** is something the product does for a user. Its pure half — rules, ports, models — lives in `packages/domain`; the halves that touch the browser, the database, HTTP, or email live in `apps/platform/src/features/<feature>/`.
- a **surface** is one of the three places people meet the product. It assembles features into a product, and owns the chrome around every page, the sections its pages are built from, the pages that belong to no single feature, and any resource route that is the surface's own — a portal's web manifest, for instance.

Where a given file belongs is the subject of *Production App Structure* above. What it may then import is the subject of *Boundary Rules* below.

### Route Modules

Route modules are the delivery layer, not the organizing unit. They sit inside the feature or surface whose work they deliver, and `routes.ts` is the only place they are registered.

Routes should:

- validate request shape
- resolve the required controller from the app container into a local constant
- call controller methods to serve requests and loader data
- select data for rendering
- return UI or resource responses

Routes should not:

- own business rules
- call domain services or repositories directly
- contain ad hoc persistence logic
- become the home of cross-cutting authorization logic

### Domain

Business logic belongs in `packages/domain` and related domain-oriented modules.

The domain layer should own:

- core types
- validation schemas where appropriate
- use cases
- permissions and policy checks
- repository or persistence abstractions
- stable internal contracts between route handlers and business logic

This is the main seam that makes future extraction possible.

Domain services should return domain objects rather than primitive launch modes, raw persistence records, or UI-shaped view data.
Domain objects should hold the business state and business behavior for their concern, so callers ask the object what is true instead of duplicating rules at the route or UI boundary.

`packages/domain/package.json` declares no `dependencies`, `devDependencies` or `peerDependencies` key at all, and that absence is the enforcement. Under pnpm's per-package resolution a package resolves only what it declares, so declaring nothing leaves `react`, `pg`, `drizzle-orm`, `resend` and `zod` genuinely unresolvable there: impurity becomes a build failure rather than a review note. The invariant is exactly *resolves nothing beyond what the workspace root hoists* — root devDependencies stay reachable by walking up, so `vitest`, the only one the domain test files import, does resolve here, and keeping production `src/` clear of it is still review's job. Needing a dependency here means the code belongs on the other side of a port: declare the port here, implement it in the feature's `data/` or `email/`, and let the composition root wire the two together.

### UI

Shared presentation belongs in `packages/ui`.

The three surfaces may each render differently, but they should reuse shared primitives rather than duplicate structure or styling logic. What two surfaces share goes through `packages/ui` or a feature's `ui/shared/`, never through one surface reaching into another.

- Keep components and logic that directly determine rendered structure, styling, accessibility, or interaction state in `.tsx` files.
- Move persistence, data shaping, API access, response normalization, and integration orchestration into cohesive sibling `.ts` modules.
- Prefer colocation when code changes as one unit for the same reasons. Split or promote it only when ownership, runtime boundaries, reuse, or reasons for change diverge.

### Client State

Client state is separated by ownership and lifetime:

- TanStack Query owns state fetched from or mutated through server APIs
- feature-scoped Zustand stores own browser state shared across components or routes
- React Hook Form owns active form values, client validation, and field errors
- local React state owns transient presentation and workflow state
- Zustand store modules own their actions, selectors, normalization, and persistence

Zustand consumers should select only the state and actions they use. When server rendering could otherwise share state between requests, provide a stable store instance through the relevant React tree. Persisted browser state must be validated at runtime and must not duplicate server-owned data. Shared form schemas may validate in the browser for immediate feedback, but server validation remains authoritative.

### Infrastructure Services

Infrastructure adapters belong in dedicated packages or service modules, not directly in route components.

Examples:

- database access in `packages/db`
- config parsing in `packages/config`
- cross-cutting technical adapters in `packages/infrastructure`, which has no root barrel: a subpath export map per concern is what keeps its server-only halves out of browser bundles. It declares five subpaths today: `bot-detection`, reached for by the `store` and `waitlist` features and by the public site's shell and sections; `bot-detection/server`, by those two features' controllers and by the composition root; `email/server`, by those two features' `email/`; `pwa`, by the two portal surfaces; and `feature-flags/server`, by the composition root alone.

What belongs here is decided by kind, not by how many callers it has: a technical concern rather than something the product does for a user. An adapter that serves exactly one feature is that feature's own and lives in its `data/` or `email/`, as *Feature folders* above explains.

When third-party integrations are added, they should follow the same pattern.

## Package APIs

Every workspace package should expose only intentional public contracts, through its package barrel or, where a barrel would blur a boundary the package must enforce (for example keeping server-only code out of browser bundles), through a declared subpath export map instead.
Public exports should be stable types, service classes, UI components, adapters, or shared utilities that are meant to be used across package boundaries.
Implementation helpers that only support one class, component, adapter, or module should stay private as private methods or unexported module-local details.
Do not export helper functions from package barrels just because they are easy to unit test.
Export standalone functions only when they are deliberate shared contracts used by multiple packages, surfaces, or services.

## Boundary Rules

These rules are required for long-term maintainability:

- keep the three surfaces separated, and let them share only through `packages/ui` or a feature's `ui/shared/`
- keep features composable: a feature must not reach into another feature's internals, and must not reach back for a surface
- keep a feature's browser half out of its server half
- keep route modules thin
- put domain rules in domain packages, not route files
- centralize auth and authorization checks
- separate server-only logic from browser-rendered code
- keep infrastructure adapters behind explicit modules
- avoid hidden coupling through global provider sprawl

The first three are mechanically enforced, by the numbered rules R1–R7 in `eslint.config.mjs`. The seven do not line up one-to-one with the bullets: between them they fence what a surface may reach for (R2, R4), what a feature may reach for (R3, R6), who may reach a surface (R7), and who may reach the composition root (R5) — plus R1, the app root alias, which earns no bullet of its own because its job is to make the other six enforceable, by removing the deep relative spellings that would otherwise slip past them.

The remaining bullets are not lint-checkable as written. *Architecture Enforcement* below splits what lint covers from what human review owns.

`eslint.config.mjs` carries each rule's exact statement, its scope, and the reasoning behind its granularity — including where a rule is deliberately coarser than the principle it serves. `tools/lint-boundaries.test.mjs` runs ESLint over a probe import at a path inside each fenced region and asserts the rule's own message, so a rule that stops firing fails the suite; it does this for the static and the dynamic-`import()` form of every rule. Read those two files rather than a summary here, so there is one source of truth per rule.

The app is one deployable, but it should never feel like one unstructured code blob.

## Server Composition

The server uses a hybrid composition model.

- true app-wide runtime singletons are owned at the app boundary
- domain services, repositories, and controllers are composed explicitly
- routes stay thin and delegate into reused application objects

In practice, this means:

- runtime environment and the root app container are process-level singletons
- database lifecycles are owned by the root app container
- the root app container is the source of long-lived controller instances
- controllers are long-lived and reused across requests
- routes do not instantiate their own controllers; they delegate to controllers provided by the app container
- request-scoped data must stay inside request method scope rather than on controller instances
- shared HTTP behavior lives in standalone utility modules, not a base controller hierarchy
- repeated endpoint error handling and error-to-response mapping should move into shared HTTP middleware or utilities rather than being reimplemented per controller

This keeps the runtime simple without hiding business dependencies inside globals.

## Architecture Enforcement

The GEN-94 architecture guardrails are split between lint rules that can be checked reliably and semantic rules that need human review.

Lint enforces:

- the seven app boundary rules R1–R7 indexed under *Boundary Rules* above, whose statements and rationale live in `eslint.config.mjs`
- workspace packages are imported through package names and package barrels, except for two intentional exemptions: the `@eli-coach-platform/ui/styles.css` stylesheet export, and all of `@eli-coach-platform/infrastructure/*`, whose subpath export map — not lint — is what enforces its boundary between browser and server code
- standard ESLint recommended rules for JavaScript best practices
- `eslint-plugin-jsx-a11y` strict rules for static accessibility coverage

No workspace gate covers `designs/react-reference-app`, and each of the four excludes it for its own reason: `pnpm lint` runs over `apps` and `packages`, and the ESLint config ignores `designs/**` outright; `pnpm typecheck` and `pnpm build` reach only workspace projects, and `pnpm-workspace.yaml` lists just `apps/*` and `packages/*`; `pnpm test` is bound not by workspace membership but by the two projects' `include` globs in `vitest.config.mts`, which between them name `apps/**`, `packages/**` and `tools/**` — `tools/` is tested despite being no package at all. The prototype is checked instead by its own `npm test` and `npm run build`, which CI runs as a separate step. A change that moves files there has to be verified by building it.

Human review still owns the semantic boundaries that syntax cannot prove safely:

- route code must stay thin and should not accumulate domain rules or persistence decisions
- controllers should expose operation-shaped methods and keep shared HTTP behavior in utilities rather than base classes
- controller inheritance is not banned outright, but inheritance must not smuggle shared HTTP response or error behavior into a base controller
- API routes should use controllers from `getPlatformContainer()` instead of instantiating or value-importing controller classes directly
- controller instances should not store request state in instance fields or post-constructor `this.*` assignments
- R5 fences `~/server/container.server` by folder, not by file role, so human review still owns whether a file inside an allowed folder is genuinely a route module or its `.server` half
- domain objects should model business state and behavior rather than returning primitive launch modes or UI-shaped data
- package barrels should export intentional contracts only, not private helpers made public for test convenience
- infrastructure failures must not be converted into business statuses such as capacity, duplicates, or feature availability

## Internal API Design

Internal resource-style endpoints should follow normal HTTP semantics.

- read-only resources use `GET`
- write operations use explicit mutating methods such as `POST`, `PATCH`, or `DELETE`
- routes should expose separate handler exports per HTTP method rather than funneling all behavior through a generic method switch
- controller methods should be named after the operation they perform, such as `getSnapshot`, `getMetadata`, or `getStatus`

This keeps the internal API predictable and makes controller behavior obvious from the method name.

## Module References

Inside `apps/platform`, app-local modules should use the app root alias rather than deep relative paths.

Workspace packages remain the boundary for shared contracts, domain logic, infrastructure adapters, and UI primitives.

This keeps module ownership easy to read as the monolith grows.

## Configuration Ownership

Environment loading uses the Node runtime's built-in support.

Environment schemas and parsing helpers belong in `packages/config`.
They should be split by concern rather than collapsed into one catch-all shape.

Prerendered public content may use deployment configuration but must not resolve database-backed services. A setting shared by prerendered and runtime behavior must be baked into the deployment artifact and retained as its runtime default.

This keeps runtime configuration rules centralized while still allowing the app, database bootstrap flow, and tests to evolve independently.

## Feature Flags

Feature flags are infrastructure-backed configuration.

- the database is the source of truth for which flags exist
- persisted feature flag rows are the source of truth for runtime flag values
- the backend returns persisted flags rather than maintaining a second server-side registry or code-defined flag catalog
- client or caller code is responsible for interpreting flag values
- absent flag values must be interpreted as `false` by consumers

This avoids duplicating the feature-flag catalog in both code and storage.

## Integration Test Model

Integration tests should mirror production object lifetimes where that improves confidence.

- each test suite owns its own isolated infrastructure
- within a suite, the database runtime and app runtime are long-lived
- test reset strategies must preserve those long-lived connections instead of dropping and recreating the whole database underneath them

For ephemeral databases such as local bootstrap containers and integration-test containers, Postgres bootstrap should be delegated to container init so the setup mechanism stays aligned across environments.

Schema migrations remain a separate concern from bootstrap:

- tests, local flows, and deploy flows all run the operational `drizzle-kit migrate` path

## Frontend Test Model

Component tests should focus on user-visible behavior, accessibility semantics, and business logic.
They should avoid asserting styling classes, inline style props, animation delays, or other presentation implementation details.

When a component needs API-backed integration coverage, prefer rendering the real route/component tree with a request mocking layer such as Mock Service Worker rather than mocking hook internals.
This keeps tests closer to how data flows through loaders, actions, fetchers, and future shared client-side stores.

Styling and motion confidence should come from browser-level checks instead:

- Playwright interaction tests for important responsive states and keyboard paths
- screenshot or visual-regression coverage for layout and styling-sensitive pages
- accessibility checks for semantic regressions
- Lighthouse checks for performance-sensitive media and public pages

## PWA Strategy

The app can still expose a separate installable experience for:

- `/client`

Each portal keeps its own:

- manifest route
- service worker registration
- install scope
- user-facing name

The `coach-portal` surface is not treated as an installable PWA for now: several of its workflows are not mobile-friendly, and making the portal installable requires planning of its own. The `public-site` surface is not treated as an installable PWA either.

## Rendering Strategy

The app uses React Router Framework Mode with SSR enabled.

Current strategy:

- static public pages are pre-rendered where it helps
- database-backed public catalog pages use request-time loaders so current products and links are present in server-rendered HTML
- client and coach routes are server-rendered on first load and hydrated afterward
- resource-style endpoints such as `/api/meta` live inside the same app

This keeps SEO strong for public pages while preserving app-like behavior for authenticated surfaces.

## Deployment Model

### Local Development

Local development uses:

- the full-stack app at `http://localhost:3000`
- local Postgres through Docker Compose
- the design reference app as a separate TEST-only-style dev server

`pnpm dev:all` starts:

- the production app
- local Postgres
- the design reference app

### TEST Deployment

TEST runs:

- the single production app container
- the TEST-only design reference container
- PostgreSQL
- Traefik on the shared TEST VM

Routing on TEST is currently:

- `https://<test-host>/eli-coach-platform/`
- `https://<test-host>/eli-coach-platform/client`
- `https://<test-host>/eli-coach-platform/coach`
- `https://<test-host>/eli-coach-platform/api/meta`
- `https://<test-host>/eli-coach-platform/design-reference`

### PROD Deployment

PROD will follow the same shape as TEST:

- same image built in CI
- same deployment model
- same Traefik pattern
- same Postgres sibling-container approach

The intended difference is only environment-specific configuration and promotion flow.

## CI/CD

The CI/CD model remains TEST-first.

### CI

On every push or pull request to `main`:

- install dependencies
- run lint, including `eslint-plugin-jsx-a11y`
- typecheck
- run Vitest suites, with `happy-dom` reserved for fast component tests and `vitest-axe` reserved for `jsdom` or real-browser accessibility scans
- build the workspace
- run Lighthouse CI against the prerendered public pages listed in `lighthouserc.cjs` to guard accessibility, SEO, best-practices, and performance regressions
- build the design reference app

On pushes to `main`:

- build and push the production app image
- build and push the TEST-only design reference image
- run vulnerability scans on both images
- deploy to TEST after the gate passes

### TEST CD

TEST deploy uses:

- GHCR image digests
- Tailscale SSH access
- Traefik file-provider routing
- blue/green cutover for the production app and design reference container

The deployment script updates the inactive color, waits for health, flips Traefik, and tears down the old color.

### PROD CD

PROD is intentionally not implemented yet in this repo.

The expected model is:

- manual approval
- deploy the same tested image digests that passed TEST

## Secret Ownership

This repository does not own runtime secrets for TEST or PROD.

`terraform-infra` owns:

- runtime secret templates
- secret encryption
- secret sync to hosts

This repository only owns the runtime contract and the CI/CD transport secrets needed to reach the TEST host and pull deployment images.

For local development, the repository uses gitignored root-level files:

- `.env`
- `.env.postgres`

Those files are local convenience only. They do not change the TEST or PROD secret ownership model.

Local startup follows the standard split for this stack:

- Vite config uses `loadEnv(...)` for config-time values
- the local server process uses Node's native `--env-file`
- server-only runtime code reads from `process.env`

## Third-Party Integrations

Current hard dependencies:

- GitHub Actions
- GitHub Container Registry
- Tailscale
- Traefik
- PostgreSQL

Current supporting infrastructure:

- Grafana
- Loki
- Tempo

Planned product integrations, still to be finalized as implementation begins:

- authentication provider
- payments provider
- email provider
- scheduling/calendar integration
- push notifications

Those integrations should be added behind explicit service boundaries so they do not leak through route code.

## Frontend Quality Gates

Frontend quality checks are layered on purpose.

- `eslint-plugin-jsx-a11y` is the static accessibility baseline and must stay enabled in workspace linting and CI
- `happy-dom` remains the default fast DOM environment for ordinary component tests that do not need real browser-style accessibility scanning
- `vitest-axe` is allowed only in `jsdom` or browser-based tests; do not run axe scans in `happy-dom`
- Lighthouse CI is reserved for broader public-page auditing and SEO protection on the `public-site` surface

This split keeps fast feedback loops for component work while still enforcing stronger accessibility and SEO checks where they are most trustworthy.

### Accessibility and SEO Rules

The following rules apply going forward:

- keep `eslint-plugin-jsx-a11y` in the repo and in CI
- keep `happy-dom` for ordinary fast component tests
- use `vitest-axe` only in `jsdom` or browser-based tests, never in `happy-dom`
- scope Lighthouse CI to `public-site` routes unless a future browser-based authenticated test lane is introduced for client or coach pages
- treat Lighthouse CI as a regression gate for accessibility, SEO, best practices, and performance on public pages, not as a replacement for component tests or manual accessibility review

## Long-Term Extraction Path

The current architecture is intentionally a staging point, not a dead end.

If the product later needs more separation, the intended extraction order is:

1. keep the current feature and surface boundaries intact
2. move more business logic behind domain service interfaces
3. extract infrastructure-heavy or asynchronous concerns first
4. only split deployables when operational or team constraints justify it

That means future splitting should be an extraction exercise, not a rewrite.

## Non-Goals for MVP

The current architecture is deliberately not optimizing for:

- microservices
- independent frontend deployables
- distributed realtime infrastructure
- team-scale repo orchestration
- high-cost cloud-first hosting

The current priority is one maintainable, self-hosted, production-quality app that can ship quickly and evolve safely.
