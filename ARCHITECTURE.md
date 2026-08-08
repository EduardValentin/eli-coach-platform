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

The product has three business-critical surfaces:

- public marketing: landing page, blog, public digital store
- client portal: authenticated, mobile-friendly, installable
- coach portal: authenticated, operationally richer, installable

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
  /auth
  /config
  /content
  /contracts
  /db
  /domain
  /http-client
  /ui

/deploy
  /test

/docker
/scripts
/designs/react-reference-app
```

## Production App Structure

The production app lives in `apps/platform`.

The route tree currently owns all three product surfaces:

- `/` and public subroutes for marketing
- `/client/*` for the client portal
- `/coach/*` for the coach portal
- `/api/*` for internal resource-style endpoints exposed by the same full-stack app

The app is deployed as one server-rendered React Router application, not as multiple independently deployed frontends.

## Internal Boundaries

The codebase must treat the product as multiple surfaces inside one runtime.

### Routes

Route modules are the delivery layer.

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

### UI

Shared presentation belongs in `packages/ui`.

Public, client, and coach route trees may each render differently, but they should reuse shared primitives rather than duplicate structure or styling logic.

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
- auth helpers in `packages/auth`
- config parsing in `packages/config`

When third-party integrations are added, they should follow the same pattern.

## Package APIs

Every workspace package should expose only intentional public contracts through its package barrel.
Public exports should be stable types, service classes, UI components, adapters, or shared utilities that are meant to be used across package boundaries.
Implementation helpers that only support one class, component, adapter, or module should stay private as private methods or unexported module-local details.
Do not export helper functions from package barrels just because they are easy to unit test.
Export standalone functions only when they are deliberate shared contracts used by multiple packages, surfaces, or services.

## Boundary Rules

These rules are required for long-term maintainability:

- keep public, client, and coach route trees separated
- do not import one route tree directly into another
- keep route modules thin
- put domain rules in domain packages, not route files
- centralize auth and authorization checks
- separate server-only logic from browser-rendered code
- keep infrastructure adapters behind explicit modules
- avoid hidden coupling through global provider sprawl

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

- `apps/platform/app` uses the `~` app root alias for app-local imports that cross multiple directories
- workspace packages are imported through package names and package barrels, except for the intentional `@eli-coach-platform/ui/styles.css` stylesheet export
- standard ESLint recommended rules for JavaScript best practices
- `eslint-plugin-jsx-a11y` strict rules for static accessibility coverage

Human review still owns the semantic boundaries that syntax cannot prove safely:

- route code must stay thin and should not accumulate domain rules or persistence decisions
- controllers should expose operation-shaped methods and keep shared HTTP behavior in utilities rather than base classes
- controller inheritance is not banned outright, but inheritance must not smuggle shared HTTP response or error behavior into a base controller
- API routes should use controllers from `getPlatformContainer()` instead of instantiating or value-importing controller classes directly
- controller instances should not store request state in instance fields or post-constructor `this.*` assignments
- `getPlatformContainer()` should stay at route, root, and test app-boundary contexts
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

The app can still expose separate installable experiences for:

- `/client`
- `/coach`

Each portal keeps its own:

- manifest route
- service worker registration
- install scope
- user-facing name

The public marketing surface is not treated as an installable PWA.

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
- run Lighthouse CI against the public marketing pages to guard accessibility, SEO, best-practices, and performance regressions
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
- Lighthouse CI is reserved for broader public-page auditing and SEO protection on the marketing surface

This split keeps fast feedback loops for component work while still enforcing stronger accessibility and SEO checks where they are most trustworthy.

### Accessibility and SEO Rules

The following rules apply going forward:

- keep `eslint-plugin-jsx-a11y` in the repo and in CI
- keep `happy-dom` for ordinary fast component tests
- use `vitest-axe` only in `jsdom` or browser-based tests, never in `happy-dom`
- scope Lighthouse CI to public marketing routes unless a future browser-based authenticated test lane is introduced for client or coach pages
- treat Lighthouse CI as a regression gate for accessibility, SEO, best practices, and performance on public pages, not as a replacement for component tests or manual accessibility review

## Long-Term Extraction Path

The current architecture is intentionally a staging point, not a dead end.

If the product later needs more separation, the intended extraction order is:

1. keep the current route boundaries intact
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
