# Architecture

One full-stack React Router v7 Framework Mode app under `apps/platform`, one PostgreSQL database, one production Docker image, delivered behind Traefik as a modular monolith. The public site, client portal, and coach portal are boundaries in code, not separate deployables. `designs/react-reference-app` is the reference prototype: a TEST-only deployable that is never part of the production runtime.

This document answers two questions: where a file goes, and what it may import. Setup and commands live in `README.md`, operating rules in `AGENTS.md`, deployment and secrets in `docs/SECRET_MANAGEMENT.md` and `scripts/`.

## Surfaces

Three surfaces, one folder each under `apps/platform/src/surfaces/`:

| Surface | Serves | Character |
| --- | --- | --- |
| `public-site` | `/`: landing page, blog, pricing, legal pages, public store | Server-rendered, SEO-relevant |
| `client-portal` | `/client/*` | Authenticated, mobile-first, the only installable PWA |
| `coach-portal` | `/coach/*` | Authenticated, operationally richer, not installable |

## App Structure

`apps/platform/src` is organized feature-first, with surfaces as the layer that assembles features into products:

```text
/features   one folder per thing the product does for a user
/surfaces   the three places people meet the product
/server     composition root, runtime wiring, and resource routes no surface owns
/types      ambient type declarations
routes.ts   the single route registry
```

Route modules are leaves, not the organizing unit. `routes.ts` registers every one and points at three homes: a surface's `shell/`, `pages/` or `api/`; a feature's `ui/<public|client|coach>/` or `api/`; and `server/api/` for endpoints that belong to no surface.

### Feature folders

A feature creates only the folders it needs:

| Folder | Holds |
| --- | --- |
| `contracts/` | Zod wire schemas: request, response, error shapes. Browser-safe. |
| `data/` | Adapters implementing domain ports: repositories, file stores, crypto, Drizzle schema. Server-only. |
| `email/` | Adapters implementing domain email ports, plus templates. Server-only. |
| `api/` | Controllers, route modules, response transport. Server-only. |
| `server/` | Server-only modules that are neither route delivery nor persistence: guards, request-context definitions, middleware factories. Importable by surfaces and the app root. |
| `ui/` | Screens, components, browser data-access and state. Only `public/`, `client/`, `coach/` and `shared/` subfolders; nothing loose at the root. |

The pure half of a feature, its rules, ports and models, lives in `packages/domain/src/<feature>/`.

### Surface folders

A surface creates only what it needs from `shell/` (the layout route module and the chrome around every page), `sections/` (the blocks its pages are assembled from), `pages/`, and `api/` (the surface's own resource routes: `readyz`, plus the web manifest and service worker for `client-portal`). A feature's `ui/` subfolders use the short surface names: `public/`, `client/`, `coach/`.

### Where a page lives

Count the features the page **file itself** imports: the feature it sits in, plus every `~/features/<name>/` in its import list.

| Features the page file imports | Home |
| --- | --- |
| none | the surface |
| exactly one | that feature's `ui/<public\|client\|coach>/` |
| several | the surface, composing each feature's `ui/` |

The page file, not its rendered tree, is the criterion. A surface's `shell/` and `sections/` may import features without moving the page.

### The `.server` suffix

Every module in `data/`, `server/`, `api/` and `email/` carries the `.server` suffix, and so does any server-only file under `ui/`, **except a module registered in `routes.ts`, which must not**. React Router strips `.server` files from the client build, but the client route manifest imports every registered route, so a registered module with the suffix breaks the build. Merging the loader into the route module is no way out: only `loader`, `action`, `middleware` and `headers` are removed from the client build, so anything else that module imports reaches the browser. A registered page therefore re-exports its `loader` from a `.server.ts` sibling, and an `api/` endpoint resolves its controller through the container rather than importing one.

Non-module assets, such as an HTML template imported `?raw`, carry no suffix. A test named after one module carries `.server` exactly when that module does; a test covering several modules takes no suffix.

## Layers

### Features and surfaces

A **feature** is something the product does for a user. Its pure half lives in `packages/domain`; the halves that touch the browser, database, HTTP, or email live in `apps/platform/src/features/<feature>/`. A **surface** assembles features into a product and owns the chrome around every page, the sections its pages are built from, the pages that belong to no single feature, and any resource route that is the surface's own.

### Route modules

A route module validates request shape, resolves its controller from the app container into a local constant, calls controller methods for requests and loader data, selects data for rendering, and returns UI or resource responses. It owns no business rules, calls no domain service or repository directly, holds no ad hoc persistence, and is not the home of cross-cutting authorization.

### Domain

`packages/domain` owns core types, validation schemas where appropriate, use cases, permissions and policy checks, repository and port abstractions, and the contracts between route handlers and business logic. Domain services return domain objects, never raw persistence records or UI-shaped data, and domain objects hold business state and behavior so callers ask the object what is true.

`packages/domain/package.json` declares no dependencies at all, and that absence is the enforcement. Under pnpm's per-package resolution, `react`, `pg`, `drizzle-orm` and `zod` are unresolvable there, so impurity is a build failure. Only root devDependencies such as `vitest` resolve by hoisting. Needing a dependency in the domain means the code belongs on the other side of a port: declare the port here, implement it in the feature's `data/` or `email/`, and wire the two in the composition root.

### UI

Shared presentation belongs in `packages/ui`. What two surfaces share goes through `packages/ui` or a feature's `ui/shared/`, never through one surface reaching into another. Rendered structure, styling, accessibility and interaction state live in `.tsx`; persistence, data shaping, API access and orchestration live in cohesive sibling `.ts` modules. Colocate what changes together; split only when ownership, runtime boundary, reuse, or reasons for change diverge.

### Client state

- TanStack Query owns state fetched from or mutated through server APIs.
- Feature-scoped Zustand stores own browser state shared across components or routes, including their actions, selectors, normalization and persistence. Consumers select only what they use. Provide a stable store instance through the React tree wherever SSR could otherwise share state between requests. Persisted browser state is validated at runtime and never duplicates server-owned data.
- React Hook Form owns active form values, client validation and field errors. Shared schemas may validate in the browser for feedback; server validation is authoritative.
- Local React state owns transient presentation and workflow state.

### Infrastructure

Technical adapters that serve more than one feature live in dedicated packages: database access in `packages/db`, configuration schemas in `packages/config` (split by concern, never one catch-all shape, read at request time), and cross-cutting adapters such as bot detection, transactional email, feature flags and management auth in `packages/infrastructure`. `packages/infrastructure` has no root barrel; a subpath export map per concern keeps its server-only halves out of browser bundles. An adapter that serves exactly one feature is that feature's own and lives in its `data/` or `email/`. What belongs here is decided by kind, a technical concern rather than something the product does, not by caller count.

Feature flags are infrastructure-backed configuration: the database is the source of truth for which flags exist and their values, the backend returns persisted flags with no second code-defined catalog, callers interpret values, and an absent flag reads as `false`.

### Package APIs

Every workspace package exposes only intentional public contracts through its barrel or, where a barrel would blur a boundary the package must enforce, a declared subpath export map. Export stable types, service classes, UI components, adapters and shared utilities meant to cross package boundaries. Keep helpers that support one module private; never export a function just because it is easy to test.

## Boundary Rules

- Surfaces stay separated and share only through `packages/ui` or a feature's `ui/shared/` and `server/`.
- A feature never reaches into another feature's internals and never reaches back for a surface.
- A feature's browser half never imports its server half.
- Route modules stay thin; domain rules live in domain packages.
- Auth and authorization checks are centralized.
- Infrastructure adapters stay behind explicit modules, with no hidden coupling through provider sprawl.

The first three are enforced mechanically by rules R1–R7 in `eslint.config.mjs` and proven by `tools/lint-boundaries.test.mjs`. Those two files are the single source of truth for each rule's exact statement, scope, rationale and carve-outs; read them rather than a summary here. Lint also requires workspace packages to be imported through package names and barrels, with three intentional exemptions: the `@eli-coach-platform/ui/styles.css` stylesheet, all of `@eli-coach-platform/infrastructure/*`, and `@eli-coach-platform/config/test-support`.

No workspace gate reaches `designs/react-reference-app`. It is checked only by its own `npm test` and `npm run build`, which CI runs as a separate step.

Human review owns what lint cannot prove:

- routes stay thin and accumulate no domain rules or persistence decisions
- controllers expose operation-shaped methods such as `getSnapshot` or `getStatus`, and keep shared HTTP behavior in utilities, never in a base controller
- API routes take controllers from `getPlatformContainer()` and never instantiate or value-import controller classes
- controllers store no request state on instance fields
- a file inside a folder R5 admits is genuinely a route module or its `.server` half
- domain objects model business state and behavior
- package barrels export intentional contracts only
- infrastructure failures are never converted into business statuses such as capacity, duplicates, or feature availability

## Server Composition

The runtime environment and the root app container are process-level singletons. The container owns database lifecycles and is the source of long-lived controller instances reused across requests; routes delegate to them and never instantiate their own. Request-scoped data stays inside request method scope. Shared HTTP behavior and error-to-response mapping live in standalone utilities or middleware, not a base controller hierarchy.

Internal resource endpoints follow HTTP semantics: `GET` for reads; explicit `POST`, `PATCH` or `DELETE` for writes; one handler export per method rather than a method switch; controller methods named for the operation they perform.

## Rendering

SSR with no prerendering. Every route, public or authenticated, renders at request time and reads runtime configuration then. Public pages use request-time loaders so current products, links and signed-in navigation state are in the server-rendered HTML; portal routes are server-rendered on first load and hydrated afterward. Prerendering was dropped because Clerk credentials are runtime-only configuration and every page's nav depends on per-visitor session state (see `docs/CLERK.md`).

A client-side navigation re-runs every matched loader unless the route declares `shouldRevalidate`, and the URL commits only once they resolve. A route whose URL carries page state, such as a filter, tab or sort, declares `shouldRevalidate` so those changes do not wait on a round-trip; `/store` does this for `type` and `goal`. The public-site shell declines revalidation for query-only changes. Both predicates let an unchanged URL through, since that is an action or an explicit `revalidate()` asking for fresh data.

## PWA

Only `client-portal` is installable. It owns its manifest route, service worker registration, install scope and user-facing name. The coach portal serves no manifest and registers no service worker; the public site is not treated as a PWA.

## Tests

**Integration tests drive the deployed artifact.** A suite starts its own containers, spawns the production build (the same `@react-router/serve` command the image runs) as its own process on its own port with a complete environment, and talks to it over HTTP. The test process assembles nothing and imports no application module. The build is produced once per run, only for runs that include integration tests, because `APP_BASE_PATH` is baked into the router basename at build time. Database and app runtimes are long-lived within a suite, and reset strategies preserve their connections. The rig injects a controllable `Date` into the child process through a `node --import` preload driven over IPC; `suite.setServerClock` names an instant and the clock is released between cases. Ephemeral Postgres bootstrap is delegated to container init, and migrations run through the operational `drizzle-kit migrate` path everywhere.

**Component tests** assert user-visible behavior, accessibility semantics and business logic, never classes, inline styles or animation timing. API-backed coverage renders the real route tree with MSW rather than mocking hook internals. Styling and motion confidence comes from browser-level checks: Playwright for responsive states and keyboard paths, visual regression for styling-sensitive pages, `vitest-axe` only in `jsdom` or real-browser tests and never in `happy-dom`, and Lighthouse CI over the public pages in `lighthouserc.cjs` as a regression gate for accessibility, SEO, best practices and performance.

## Third Parties

Clerk provides authentication: email one-time-code sign-in, sessions, and account deletion events (`docs/CLERK.md`). Resend delivers transactional email through the `packages/infrastructure` email adapter. Cloudflare Turnstile backs bot detection. Payments, scheduling and push notifications are not yet integrated; each will sit behind an explicit port and adapter, never in route code.
