# Conventions

Header: date 2026-09-18, commit 9cce4e16, baseline 79fa1e95, scope the changed units and their direct graph neighborhood in apps/platform, packages/{config,db,domain,infrastructure}, tests, migrations, package deployment, and delivery enforcement, mode change review.

Where a file goes and what it may import, as the code stands after the last audit. The dependency rules that enforce the import side live in `tools/dependency-cruiser.config.cjs`; this file explains the folder layout those rules assume. Published surfaces are enforced by `knip.json` through `pnpm check:surfaces` (`knip --no-config-hints`), and the 35 dependency rules are proven by `tools/boundaries.test.mjs` over `tools/boundary-fixtures/`, one fixture per rule except `stability`. The domain package's per-entity folder layout is checked by `tools/domain-layout.mjs` and exercised by `tools/domain-layout.test.mjs` over `tools/domain-layout-fixtures/`; all six checks have fixtures, including a missing `index.ts` and a `*-use-case.ts` without an `execute` method. `pnpm check:boundaries` runs from the repository root, since the tool's tsconfig alias paths are resolved relative to the current working directory.

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
/server     composition root, feature-context middleware, runtime wiring, the app's own server/guards/ entry, and resource routes no surface owns
/types      ambient type declarations
routes.ts   the single route registry
```

Route modules are leaves, not the organizing unit. `routes.ts` registers every one and points at three homes: a surface's `shell/`, `pages/` or `api/`; a feature's `ui/<public|client|coach>/` or `api/`; and `server/api/` for endpoints that belong to no surface.

### Feature folders

A feature creates only the folders it needs:

| Folder | Holds |
| --- | --- |
| `routes.ts` | Route fragments built with React Router's `relative(import.meta.dirname)` helpers: a child list for pages, a top-level list for resource routes. A surface's `routes.ts` assembles its tree from the feature fragments it serves; the root `routes.ts` only concatenates surface trees and API fragments, with no path literals of its own. |
| `contracts/paths.ts` | Browser-safe route-path literals, imported by the feature's `routes.ts` fragment and by any server code that redirects to them, so a route's URL and the links pointing at it share one source. |
| `contracts/` | Zod wire schemas: request, response, error shapes. Browser-safe. |
| `data/` | Adapters implementing domain ports: repositories, file stores, crypto, Drizzle schema. Server-only. |
| `email/` | Adapters implementing domain email ports, plus templates. Server-only. |
| `api/` | Controllers, route modules, response transport. Server-only. |
| `server/guards/` | The feature's surface-facing entry: its request-context key and portal access guards. The only part of `server/` a surface or another feature may import. |
| `server/<feature>-composition.server.ts` | Assembles the feature's controllers, repositories and email adapters from the runtime environment. Reachable only from the root and the container. |
| `server/` (other) | Server-only modules that are neither route delivery, persistence, nor the two entries above: middleware factories, request-context definitions that are not the published key. Reachable only from the root and the container. |
| `ui/` | Screens, components, browser data-access and state. Only `public/`, `client/`, `coach/` and `shared/` subfolders; nothing loose at the root. |

A layer folder that holds more than one domain concept groups each concept in a subfolder named for it (`api/catalog/`, `data/download-grants/`, `ui/public/cart/`), one level deep. File names do not change when a file moves, tests move with their module, and the folder's shared files stay at its root: `routes.ts`, `index.ts`, `data/schema.server.ts`, a shared `api-client.ts`. A folder that serves a single concept stays flat. The same rule applies to `server/api/`, to a domain slice under `packages/domain/src/`, and to a concern folder under `packages/infrastructure/src/`. The boundary rules recognise a route module either directly under `api/` or `ui/<slice>/` or one concept folder down, never deeper (`route-thinness`, proven by the `catalog/deeper/` fixture).

The pure half of a feature, its rules, ports and use cases, lives in `packages/domain/src/`: one folder per entity, published as its own subpath (`account`, `acquisition`, `cart`, `download-grant`, `email-address`, `feature-flag`, `product`, `shared`, `waitlist`). The domain package has no root barrel; `/shared` is the one interface-only subpath (`Clock`, `Logger`, `BotVerifier`, `ProductEmail`, `ManagementAuthenticator`). A subpath imports another subpath only through its entry, never a deep path.

A feature's domain code is not confined to a subpath named after the feature; it spans the entities the feature works with. `email-address` is missing from this table on purpose: `EmailAddress` is used only inside the domain package, by the waitlist and acquisition use cases, so no app module imports its subpath.

| Feature | Domain subpath(s) |
| --- | --- |
| `accounts` | `account` |
| `waitlist` | `waitlist`, `feature-flag`, `shared` |
| `store` | `product`, `acquisition`, `download-grant`, `cart`, `shared` |
| platform (`server/`) | `feature-flag`, `shared` |
| infrastructure | `feature-flag`, `shared` |

### Domain package

An entity or value object is a class with `private constructor` and `static reconstitute(props)` (entities, called by adapters and tests) or a named static factory (value objects: `EmailAddress.normalize`, `AcquisitionRequest.from`, `Cart.of`). Fields are `readonly`; no setters. A rule is an instance method. A rule with no instance to hang it on is a static method on the entity: over a collection (`FeatureFlag.toSet`, `Product.evaluatePurchasability`), over a snapshot the session guard holds rather than an instance (`Account.canAccessClientPortal`), or over plain inputs an adapter has under lock (`Waitlist.decideReducedPricingRegistration`, `Waitlist.availabilityBucketStart`). An entity is built by `static reconstitute(props)` and a value object by a named factory, except `Waitlist`, which is configured rather than rehydrated and so uses `static configure(props)`. Instances never cross a loader or a request-context boundary — a snapshot (`account.toSnapshot()`) or a contract type from the feature's `contracts/` does.

A port lives in the entity folder, named after the capability it provides (`StoreAcquisitions`, `ProductDelivery`, `DownloadGrants`), never after the delivery mechanism, the store technology or "Service". `Store*` in `StoreCatalog`, `StoreAcquisitions` and `StoreProductPublications` names the product's digital store, the PRD's own word, not the `features/store` folder they are consumed from. Its data shapes stay plain (strings, dates, plain commands); only the entity itself becomes a class instance where a port returns one.

A use case is `class <Verb><Noun>UseCase` with a constructor taking one options object of ports and configuration, and exactly one public method `execute`. It returns a result union wherever the flow can fail; a use case that cannot fail returns its result type directly (`GetWaitlistUseCase` a `WaitlistSnapshot`, `GetFeatureFlagsUseCase` a `FeatureFlagSet`, `DeleteAccountUseCase` nothing). `execute` takes a command object, or the single value the use case needs (a slug, a product id, a raw token, an auth subject id), or nothing. No base class, no helper class, and no request state on fields. Shared orchestration between use cases of one aggregate lives on the entity or a value object, never in a shared helper.

The port method is the atomic unit and the adapter owns the transaction. A use case that needs two aggregates changed atomically reshapes the port into one method instead of receiving a transaction; a unit-of-work port is the future escape hatch, not built today. `tools/domain-layout.mjs` checks the file-level part of these rules; the reviewer checks the rest.

The UI package (`packages/ui`) has no root barrel either: it is imported by concern subpath (primitives, layout, overlays, filters, motion, lib), never as a whole. The subpaths are layered: `lib/` is the base and imports nothing else in the package, `primitives/` imports only `lib/`, and every other concern subpath imports only `lib/` and `primitives/`, each enforced by its own rule (`ui-lib-is-the-base`, `ui-primitives-import-only-lib`, `ui-subpaths`).

`packages/test-support` is the dev-only fixture package: no production package declares it, and `no-production-import-of-tests` and `not-to-dev-dep` keep it that way.

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

Every module in `data/`, `server/`, `api/` and `email/` carries the `.server` suffix, and so does any server-only file under `ui/`, **except a module registered in `routes.ts`, which must not**. React Router strips `.server` files from the client build, but the client route manifest imports every registered route, so a registered module with the suffix breaks the build. The loader lives in the route module itself: React Router removes `loader`, `action`, `middleware` and `headers` from the client build together with the imports only they use, and any `.server` module that still reaches the client graph fails the build instead of leaking. A registered page therefore imports its feature's request-context key from `server/guards/` inside its loader, and an `api/` endpoint reads the same key off `args.context` rather than importing a controller. A `*-page.loader.test.ts` beside the page covers the loader.

Non-module assets, such as an HTML template imported `?raw`, carry no suffix. A test named after one module carries `.server` exactly when that module does; a test covering several modules takes no suffix.

### Client state

- React Router owns state fetched from or mutated through server APIs: loaders carry request-time data into the server-rendered HTML, fetchers submit forms and load on demand, and `shouldRevalidate` decides what a navigation or submission re-reads.
- Feature-scoped Zustand stores own browser state shared across components or routes, including their actions, selectors, normalization and persistence. Consumers select only what they use. Provide a stable store instance through the React tree wherever SSR could otherwise share state between requests. Persisted browser state is validated at runtime and never duplicates server-owned data.
- React Hook Form owns active form values, client validation and field errors. Shared schemas may validate in the browser for feedback; server validation is authoritative.
- Local React state owns transient presentation and workflow state.

## Server Composition

The runtime environment and root app container are process-level singletons. The container constructs one `PostgresFeatureFlagRepository` and one stateless `GetFeatureFlagsUseCase`, passes the same reader to the platform and waitlist compositions, and calls one composition function per feature. `platform-composition.server.ts` accepts that reader and does not construct persistence. Routes delegate to composed instances and never instantiate their own. Each platform API or public-shell request executes the reader again; no result cache or production write surface exists. Request-scoped data stays inside request method scope.

Each feature owns a request-context key in its own `server/guards/`, typed to that feature's composed slice. `root.server.ts` publishes every feature's slice onto the request through the feature-context middleware, and a route module reads its feature's key off `args.context` rather than importing the composition or the container directly. A feature's `server/` therefore has one surface-facing entry, `server/guards/`: everything else in `server/` — composition, middleware factories, request-context definitions that are not the published key — is reachable only from the root and the container. The app's own `server/` follows the same shape, with `server/guards/` as its one entry surfaces and features may read from for runtime configuration.

Route fragments live in each feature's and surface's own `routes.ts`, not in a shared registry; the root `routes.ts` only concatenates them. Path literals live in each feature's `contracts/paths.ts`, so a route's URL and the links that point at it share one source.

Internal resource endpoints follow HTTP semantics: `GET` for reads; explicit `POST`, `PATCH` or `DELETE` for writes; one handler export per method rather than a method switch; controller methods named for the operation they perform.

## Rendering

SSR with no prerendering. Every route, public or authenticated, renders at request time. Public pages use request-time loaders so current products, persisted waitlist mode, links and signed-in navigation state are in the server-rendered HTML; portal routes are server-rendered on first load and hydrated afterward. `WAITLIST_MODE` is not runtime environment configuration: migration 0018 seeds it true in `app.feature_flags`, true enables, false or absence disables, and a feature-flag read failure safe-enables while marking availability unavailable.

A client-side navigation re-runs every matched loader unless the route declares `shouldRevalidate`, and the URL commits only once they resolve. A route whose URL carries page state, such as a filter, tab or sort, declares `shouldRevalidate` so those changes do not wait on a round-trip; `/store` does this for `type` and `goal`. The public-site shell declines revalidation for query-only changes and for router submissions: availability is derived on the server from a delayed bucket, so a signup has nothing new to show, and only a page change or an explicit `revalidate()` re-reads the shell. The `/store` predicate still lets an unchanged URL through, which is what re-runs the catalog after a checkout.

## PWA

Only `client-portal` is installable. It owns its manifest route, service worker registration, install scope and user-facing name. The coach portal serves no manifest and registers no service worker; the public site is not treated as a PWA.

## Tests

**Integration tests drive the deployed artifact.** A suite starts its own containers, spawns the production build (the same `@react-router/serve` command the image runs) as its own process on its own port with a complete environment, and talks to it over HTTP. The test process assembles nothing and imports no application module. The build is produced once per run, only for runs that include integration tests, because `APP_BASE_PATH` is baked into the router basename at build time. The platform package's `files` allowlist emits only `build` during `pnpm --prod deploy`; source and E2E files remain in the Docker build context until compilation, and the builder then asserts that `/deploy/build/server/index.js` exists while `/deploy/src` and `/deploy/e2e` do not. Database and app runtimes are long-lived within a suite, and reset strategies preserve their connections. The rig injects a controllable `Date` into the child process through a `node --import` preload driven over IPC; `suite.setServerClock` names an instant and the clock is released between cases. Ephemeral Postgres bootstrap is delegated to container init, and migrations run through the operational `drizzle-kit migrate` path everywhere.

Wall-clock time is a named input: domain code takes a `Clock` port, and an integration suite names the instant through `suite.setServerClock`. `packages/test-support` holds dev-only fixtures; the two test helpers (`apps/platform/src/server/test-support/request-args.ts` and `packages/test-support/src/index.ts`) have no production importer and are excluded from `no-orphans` by exact path. Playwright setup disables persisted waitlist mode for protected journeys and teardown restores it in `finally`; both use the test-only, parameterized Postgres adapter under `e2e/support/`, which production imports are forbidden to reach.

**Component tests** assert user-visible behavior, accessibility semantics and business logic, never classes, inline styles or animation timing. API-backed coverage renders the real route tree with MSW rather than mocking hook internals. Styling and motion confidence comes from browser-level checks: Playwright for responsive states and keyboard paths, visual regression for styling-sensitive pages, `vitest-axe` only in `jsdom` or real-browser tests and never in `happy-dom`, and Lighthouse CI over the public pages in `lighthouserc.cjs` as a regression gate for accessibility, SEO, best practices and performance.

## Third Parties

Clerk provides authentication: email one-time-code sign-in, sessions, and account deletion events (`docs/CLERK.md`). Resend delivers transactional email through the `packages/infrastructure` email adapter. Cloudflare Turnstile backs bot detection. Payments, scheduling and push notifications are not yet integrated; each will sit behind an explicit port and adapter, never in route code.
