# Conventions

Where a file goes and what it may import, as the code stands after the last audit. The dependency rules that enforce the import side live in `tools/dependency-cruiser.config.cjs`; this file explains the folder layout those rules assume.

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

### Client state

- React Router owns state fetched from or mutated through server APIs: loaders carry request-time data into the server-rendered HTML, fetchers submit forms and load on demand, and `shouldRevalidate` decides what a navigation or submission re-reads.
- Feature-scoped Zustand stores own browser state shared across components or routes, including their actions, selectors, normalization and persistence. Consumers select only what they use. Provide a stable store instance through the React tree wherever SSR could otherwise share state between requests. Persisted browser state is validated at runtime and never duplicates server-owned data.
- React Hook Form owns active form values, client validation and field errors. Shared schemas may validate in the browser for feedback; server validation is authoritative.
- Local React state owns transient presentation and workflow state.

## Server Composition

The runtime environment and the root app container are process-level singletons. The container owns database lifecycles and is the source of long-lived controller instances reused across requests; routes delegate to them and never instantiate their own. Request-scoped data stays inside request method scope. Shared HTTP behavior and error-to-response mapping live in standalone utilities or middleware, not a base controller hierarchy.

Internal resource endpoints follow HTTP semantics: `GET` for reads; explicit `POST`, `PATCH` or `DELETE` for writes; one handler export per method rather than a method switch; controller methods named for the operation they perform.

## Rendering

SSR with no prerendering. Every route, public or authenticated, renders at request time and reads runtime configuration then. Public pages use request-time loaders so current products, links and signed-in navigation state are in the server-rendered HTML; portal routes are server-rendered on first load and hydrated afterward. Prerendering was dropped because Clerk credentials are runtime-only configuration and every page's nav depends on per-visitor session state (see `docs/CLERK.md`).

A client-side navigation re-runs every matched loader unless the route declares `shouldRevalidate`, and the URL commits only once they resolve. A route whose URL carries page state, such as a filter, tab or sort, declares `shouldRevalidate` so those changes do not wait on a round-trip; `/store` does this for `type` and `goal`. The public-site shell declines revalidation for query-only changes and for router submissions: availability is derived on the server from a delayed bucket, so a signup has nothing new to show, and only a page change or an explicit `revalidate()` re-reads the shell. The `/store` predicate still lets an unchanged URL through, which is what re-runs the catalog after a checkout.

## PWA

Only `client-portal` is installable. It owns its manifest route, service worker registration, install scope and user-facing name. The coach portal serves no manifest and registers no service worker; the public site is not treated as a PWA.

## Tests

**Integration tests drive the deployed artifact.** A suite starts its own containers, spawns the production build (the same `@react-router/serve` command the image runs) as its own process on its own port with a complete environment, and talks to it over HTTP. The test process assembles nothing and imports no application module. The build is produced once per run, only for runs that include integration tests, because `APP_BASE_PATH` is baked into the router basename at build time. Database and app runtimes are long-lived within a suite, and reset strategies preserve their connections. The rig injects a controllable `Date` into the child process through a `node --import` preload driven over IPC; `suite.setServerClock` names an instant and the clock is released between cases. Ephemeral Postgres bootstrap is delegated to container init, and migrations run through the operational `drizzle-kit migrate` path everywhere.

**Component tests** assert user-visible behavior, accessibility semantics and business logic, never classes, inline styles or animation timing. API-backed coverage renders the real route tree with MSW rather than mocking hook internals. Styling and motion confidence comes from browser-level checks: Playwright for responsive states and keyboard paths, visual regression for styling-sensitive pages, `vitest-axe` only in `jsdom` or real-browser tests and never in `happy-dom`, and Lighthouse CI over the public pages in `lighthouserc.cjs` as a regression gate for accessibility, SEO, best practices and performance.

## Third Parties

Clerk provides authentication: email one-time-code sign-in, sessions, and account deletion events (`docs/CLERK.md`). Resend delivers transactional email through the `packages/infrastructure` email adapter. Cloudflare Turnstile backs bot detection. Payments, scheduling and push notifications are not yet integrated; each will sit behind an explicit port and adapter, never in route code.
