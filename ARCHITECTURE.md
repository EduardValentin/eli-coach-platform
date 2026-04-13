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
- pnpm workspaces
- PostgreSQL 17
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
  /design-tokens
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
- call domain-level code
- select data for rendering
- return UI or resource responses

Routes should not:

- own business rules
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

### UI

Shared presentation belongs in `packages/ui`.

Public, client, and coach route trees may each render differently, but they should reuse shared primitives rather than duplicate structure or styling logic.

### Infrastructure Services

Infrastructure adapters belong in dedicated packages or service modules, not directly in route components.

Examples:

- database access in `packages/db`
- auth helpers in `packages/auth`
- config parsing in `packages/config`

When third-party integrations are added, they should follow the same pattern.

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

This keeps the runtime simple without hiding business dependencies inside globals.

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

This keeps runtime configuration rules centralized while still allowing the app, database bootstrap flow, and tests to evolve independently.

## Feature Flags

Feature flags are infrastructure-backed configuration.

- the database is the source of truth for which flags exist
- the backend returns persisted flags rather than maintaining a second server-side registry
- client or caller code is responsible for interpreting a missing flag value

This avoids duplicating the feature-flag catalog in both code and storage.

## Integration Test Model

Integration tests should mirror production object lifetimes where that improves confidence.

- each test suite owns its own isolated infrastructure
- within a suite, the database runtime and app runtime are long-lived
- test reset strategies must preserve those long-lived connections instead of dropping and recreating the whole database underneath them

For ephemeral databases such as local bootstrap containers and integration-test containers, Postgres bootstrap should be delegated to container init so the setup mechanism stays aligned across environments.

Schema migrations remain a separate concern from bootstrap:

- tests, local flows, and deploy flows all run the operational `drizzle-kit migrate` path

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

- public pages are server-rendered and pre-rendered where it helps
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
- typecheck
- build the workspace
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
