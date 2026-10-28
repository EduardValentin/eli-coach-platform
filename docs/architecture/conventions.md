# Conventions

Where a file goes and what it may import. The import side is enforced by the path rules in `tools/dependency-cruiser.config.cjs`, each proven by one fixture that must trip and one that must pass under `tools/boundary-fixtures/` (`tools/boundaries.test.mjs`); a generated family, such as the bounded-context order or the component order, is proven once at family level. Published surfaces are held at zero unused exports by `knip.json` through the check:surfaces script, and the folder layout of every `domain/` and of `shared/` is checked by `tools/domain-layout.mjs`, exercised by `tools/domain-layout.test.mjs` over `tools/domain-layout-fixtures/`. The check:boundaries script runs all three from the repository root, since the rule config's alias paths resolve against the working directory.

## Surfaces

Three surfaces, one folder each under `apps/platform/src/surfaces/`:

| Surface | Serves | Character |
| --- | --- | --- |
| `public-site` | the landing page, blog, pricing, legal pages, public store, assessment-call booking | Server-rendered, SEO-relevant |
| `client-portal` | the client's pages | Authenticated, mobile-first, the only installable PWA |
| `coach-portal` | the coach's pages | Authenticated, operationally richer, not installable |

## The tree

```text
apps/platform/
  src/
    bounded-contexts/<bounded-context>/
      public/                    facades, DTOs, path literals, request-context re-exports
      composition.server.ts      composes the bounded context's components
      routes.ts                  aggregates the components' route fragments
      <component>/
        domain/                  entities, use cases, and every port the component needs
        adapters/
          inbound/http/          route modules, controllers, the component's request-context key
          inbound/facades/       implementations of the bounded context's facades this component backs
          outbound/persistence/  schema and repositories
          outbound/email/        email senders and their content builders
          outbound/logging/      the component's incidents adapter
          outbound/<provider>/   one folder per bounded context, sibling or vendor the component calls
        public/                  what sibling components may use
        ui/                      public/, client/, coach/ pages and shared/ widgets
        composition.server.ts    constructs the component
        config.server.ts         the component's environment shape
        routes.ts                the component's route fragment
    shared/<concern>/            technical concerns, no business rule
    surfaces/<surface>/          the three products
    composition-root/            the container, runtime environment, database handle, root middleware, platform routes
    types/                       ambient type declarations
    root.tsx, root.server.ts, root-error-page.tsx, routes.ts, app.css
  db/                            drizzle config, migrations, seeds, bootstrap SQL, local database scripts
  test-support/                  dev-only fixtures, never imported by production code
  e2e/                           browser journeys
  integration-test-config/       the containers and rig integration suites run against
  tooling/                       build-time tools (product covers, legal documents)
tools/                           the boundary rules, their fixtures and the layout and deploy checks
```

The seven bounded contexts, in order, each followed by its components in order: operations (feature-flags); legal (legal); access (accounts); scheduling (coach-schedule, assessment-calls); clients (clients, client-profile, client-resources, notifications, check-ins); programs (exercise-library, nutrition-library); sales (store, waitlist, coaching-sales). A bounded context imports only those before it, and a component only the siblings before it (rules: bounded-context-order, one per bounded context, and component-order, one per component); `shared/` sits below everything. A bounded context or component missing from the order fails the rule config's load. There is no `server/` folder at any level: the `.server` suffix on a file is what keeps it out of the browser build.

## Folder by folder

**`domain/`.** Entities, value objects, use cases and every port the component needs, including what it needs from another component or bounded context, declared over its own types; one concept folder per entity, each with its `index.ts` entry, its entity file named after the folder, and one use-case class per use-case file with one public execute method. It imports only its own `domain/`: no sibling's or other bounded context's `domain/`, no `shared/`, no other folder of its component, no package and no Node built-in, not even as a type (rule: domain-imports-only-itself). The clock, the email acceptance policy, hashing, tokens and every other runtime concern reach a use case only through a port it declares, and the composition hands in the implementation.

**`adapters/inbound/http/`.** Route modules, controllers and the component's own request-context key in `context.server.ts`. A route module is thin: it reads its key off the request context and calls its controller, and never imports `adapters/outbound/`, `adapters/inbound/facades/`, another inbound `.server` module, a composition, a config module or `shared/database` at runtime (a type-only import of a config or controller type is allowed; a database type never, not even as a type), and never a `domain/`, not even as a type (rules: route-thinness, route-thinness-domain). A controller opens the unit of work around a workflow that must commit as one. Across bounded contexts it reads only the provider's bounded-context `public/` (the access session among them) (rule: inbound-reads-request-keys-only-from-public). A key file creates a router context and imports nothing else at runtime (rule: keys-construct-nothing).

**`adapters/inbound/facades/`.** The implementations of the bounded context's facades this component backs: DTO in, use case, DTO out. It imports its own `domain/` and the facade interface in its bounded context's `public/`, never another bounded context, and opens a nested unit of work around its own work. No inbound adapter imports its component's persistence or email adapters; the composition hands them in through ports (rule: inbound-never-imports-outbound).

**`adapters/outbound/persistence/`.** The component's tables in `schema.server.ts` and the repositories that implement its domain ports; the only writer of those tables. A repository executes through the ambient transaction when one is active and the pool otherwise. A schema file may import another component's `schema.server.ts` only for a foreign key and only when that component is earlier in the combined order, so foreign keys point from consumer to provider (rule: schema-foreign-keys-point-at-providers). Only persistence, the composition files, `composition-root/` and `shared/database` import the database client, the ORM or the driver (rule: no-database-types-outside-persistence).

**`adapters/outbound/email/`.** Email senders and their content builders, rendering `shared/email`'s primitives and frame. Like a component `public/`, an email adapter may read another bounded context's `public/` for a path or a DTO type, and nothing else across.

**`adapters/outbound/logging/`.** The component's incidents port implemented over `shared/logging`.

**`adapters/outbound/<provider>/`.** One folder per bounded context, sibling component or vendor the component calls, each implementing a port its `domain/` declares. Across bounded contexts it is the only place that calls the provider's facade, and it imports only the provider's bounded-context `public/` (rule: outbound-provider-adapter-only-importer), translating the facade's DTOs into the consumer's own types. Inside a bounded context it reads the sibling's component `public/`, and may pass the sibling's published types straight through where they match. A provider adapter may export a factory that constructs its own concrete detail; the composition calls the factory.

**Component `public/`.** What sibling components may use: the shared model's types and operations, wire schemas, route paths and anything both halves must word identically. It may import its own `domain/` and `shared/`, and another bounded context's `public/` for a path or a DTO type, never another bounded context's component. It is the one browser-safe folder both a route module's client half and the component's `ui/` may import, so the instances they share live here: the client-resources and exercise-library upload-progress stores and the clients journey vocabulary in `client-journey.ts`. It never imports the design system (rule: design-system-browser-only).

**`ui/`.** Screens, components, browser data access and state, in `public/`, `client/`, `coach/` and `shared/` subfolders only. It never imports its own `adapters/`, composition or config, except its request-context keys for a page's loader (rule: browser-half), and no inbound adapter imports any `ui/` (rule: feature-api-never-imports-ui). Inside its bounded context it reaches a sibling through the sibling's `public/` and `ui/shared/` (rule: sibling-imports-published-only); across bounded contexts it reads the provider's bounded-context `public/` for paths and DTO types and a component's `ui/shared/` for widgets (rule: ui-reads-published-only). `ui/shared/` serves every actor UI of its component and never imports the component's own `ui/public/`, `ui/client/` or `ui/coach/` (rule: feature-shared-ui-never-imports-actor-ui); an actor's controls reach a shared widget as render slots.

**Component `composition.server.ts`.** Constructs the component: its repositories, adapters, use cases, controllers and the facade implementations it backs, from the concern values and the provider facades and sibling handles it is handed. Wiring only, and the only place outside its persistence adapters that meets the database client. It is imported only by its bounded context's composition (rule: composition-only-from-above).

**`config.server.ts`.** The component's environment shape, read by the composition root's runtime reader, which merges every shape and validates once; only the readers read the environment at runtime (rule: config-runtime-readers).

**Component `routes.ts`.** The component's route fragment, built with React Router's relative route helpers: a child list for pages and a top-level list for resource routes.

**Bounded-context `public/`.** The facades: several narrow interfaces, one per consumer capability, with their DTOs; the route paths other bounded contexts and the surfaces link to; and `request-context.ts`, which re-exports each component's key and feature type for the surfaces and the root. It holds nothing that runs and imports no `domain/`, not even its own components' (rule: bounded-context-public-imports-no-domain); a DTO is strings, numbers and plain shapes. The access bounded context publishes the resolved session and its key in `access/public/session.ts`.

**Bounded-context `composition.server.ts` and `routes.ts`.** Compose the bounded context's components in order, passing an earlier component's handles to a later one, expose the facade instances, and aggregate the route fragments. They reach another bounded context only through its `public/` (rule: bounded-context-root-own-components), and the composition is imported only by `composition-root/` (rule: composition-only-from-above-bounded-context).

**`shared/<concern>/`.** Technical concerns no coach or client would state as a rule: `brand`, `clock`, `contact`, `database` (the client, pool, the app schema namespace and the ambient unit of work), `design-system`, `documents`, `email`, `http` (including the unit-of-work function type), `images`, `logging`, `private-files`, `pwa`, `runtime`, `submission-checks`, `time-format`, `tokens`. A concern imports other concerns and never a bounded context or the composition root (rule: shared-imports-no-context), holds no `domain/` or `adapters/` folder (the layout tool), publishes no domain concept, and a non-`.server` module never imports a `.server` one (rule: shared-browser-entries). There is no root barrel; each concern is imported by its own folder.

**`surfaces/<surface>/`.** `shell/` (the layout route module and the chrome around every page), `sections/` (the blocks its pages are assembled from), `pages/` (every file a registered route) and `api/` (its own resource routes). A surface reaches a bounded context only through a component's `ui/<its actor>/`, `ui/shared/` and `public/`, the bounded context's `public/` and `routes.ts` (rules: surface-public-site-to-feature, surface-client-portal-to-feature, surface-coach-portal-to-feature), never another surface (rule: surface-to-surface), and of `composition-root/` only the runtime-config key in `composition-root/guards/`. Only surfaces and the root registry import surfaces (rule: surface-import).

**`composition-root/`.** `container.server.ts` composes the seven bounded contexts in order and hands each consumer composition the provider facades it names; it constructs and never adapts. `runtime-environment.ts` merges the components' environment shapes. Beside them: the database handle, the root middleware, the platform composition with its readiness and metadata routes, and the platform and runtime-config keys in `guards/`. Nothing under `bounded-contexts/` imports it (rule: features-never-reach-server); the container is imported only by `root.server.ts` (rule: composition-only-from-above-container), and only the feature-flags composition imports its own override folder (rule: feature-flag-overrides-root-only).

**Root files.** `routes.ts` concatenates the surfaces' trees and the platform's route fragment and has no path literals of its own (rules: root-registry, root-registry-to-server); `root.tsx` and `root.server.ts` mount the document, the toaster and the root middleware.

**Outside `src`.** `apps/platform/db/` holds the drizzle config, which finds every table by the schema file glob, the migrations, the seed folder applied after every migrate, the bootstrap SQL and the local database scripts. `apps/platform/test-support/` is dev-only: no production module imports it or any test file (rules: no-production-import-of-tests, not-to-dev-dep), and the image's deploy check proves neither reaches the image.

| Folder | May import | Never imports |
| --- | --- | --- |
| `<component>/domain/` | its own `domain/` | a sibling's or another bounded context's `domain/`, `shared/`, a package, a Node built-in |
| `<component>/adapters/inbound/http/` | its own component, `shared/`, another bounded context's `public/` | its own persistence or email adapters, any `ui/` |
| `<component>/adapters/inbound/facades/` | its own `domain/`, its bounded context's `public/` | another bounded context |
| `<component>/adapters/outbound/<provider>/` | its own `domain/`, the provider's bounded-context `public/` across, the sibling's component `public/` inside | the provider's `domain/` or adapters |
| `<component>/public/` | its own `domain/`, `shared/`, another bounded context's `public/` | another bounded context's component, the design system |
| `<component>/ui/` | its own component's `public/`, `ui/` and keys, `shared/`, a sibling's `public/` and `ui/shared/`, another bounded context's `public/` and `ui/shared/` | its own adapters, composition or config |
| `<component>/composition.server.ts` | its own component, `shared/`, the facades and handles it is handed | another bounded context's internals |
| `<bounded-context>/public/` | its components' keys and paths, other bounded contexts' `public/` | any `domain/`, anything that runs |
| `<bounded-context>/composition.server.ts` | its own components, `shared/database` | another bounded context's internals |
| `shared/<concern>/` | other `shared/` concerns | any bounded context, `composition-root/` |

## Across and within bounded contexts

Across bounded contexts the consumer owns the port and the adapter: a use case declares what it needs over its own types, and its component's `adapters/outbound/<bounded-context>/` implements that port over the provider's facade, translating both ways. The provider publishes narrow facades in its bounded-context `public/`, implements each in the component that owns the capability, and never knows its consumers. The browser half and the email adapters may read a provider's bounded-context `public/` for paths and DTO types, and `ui/` may also render the provider's `ui/shared/` widgets. No file imports another bounded context's `domain/`, not even as a type (rule: no-cross-context-domain-import). Navigation between bounded contexts belongs to the surface that composes their pages.

Within a bounded context, components share its model and language. A component never imports a sibling's `domain/`: it declares its own port, and the adapter in its `adapters/outbound/<sibling>/` implements it over the sibling's `public/`, which may re-export the sibling's own domain types; where those match, the adapter passes them straight through. A port is implemented in the component that declares it, never in the sibling.

## The unit of work

A unit of work is ambient and never a parameter. A controller in `adapters/inbound/http/` opens it with the function its composition hands in (the type lives in `shared/http/unit-of-work.ts`, the implementation in `shared/database/unit-of-work.server.ts`), and the workflow runs inside it; a facade implementation opens a nested one around its own work, so a facade called inside a caller's unit of work joins it. No port, facade or use case names a database type, and `composition.server.ts` is the only file of a component outside its persistence adapters that meets the database client. A write to another component's table goes through that component's published operation or facade, inside the caller's unit of work, never through a handed database handle.

## Request context

Each component's key lives in its `adapters/inbound/http/context.server.ts`, typed to its composed feature, and is read only by that component's `adapters/inbound/http/` and `ui/`, its composition and its bounded context's composition, which sets it, and re-exported by the bounded context's `public/request-context.ts` for the surfaces and the root (rule: component-key-consumers). A key never carries handles or facades. The access bounded context's session, with its anonymous default and its guards, and the clients bounded context's portal standing are published DTOs and keys in their bounded contexts' `public/`.

## Route modules and pages

Route modules are leaves, registered in `routes.ts` through the surfaces' trees: a surface's `shell/`, `pages/` or `api/`; a component's `ui/<public|client|coach>/` or `adapters/inbound/http/`; and `composition-root/api/` for endpoints no surface owns. React Router's route-config loader resolves `routes.ts` files and the path literals they read without the app alias, so a surface's `routes.ts`, a component's `routes.ts` and a component's `public/paths.ts` are the only app-local modules that import across directories relatively, exempt from the alias lint rule in `eslint.config.mjs`; every other app-local import goes through the app alias.

Count the components the page file itself imports: none, and the page lives in the surface; exactly one, and it lives in that component's `ui/<public|client|coach>/`; several, and it lives in the surface, composing each component's `ui/`. The page file, not its rendered tree, is the criterion; a surface's `shell/` and `sections/` may import components without moving the page. A section that another component's blocks extend takes typed slots on its own data, never the other component's types. A portal's dashboard page belongs to the surface whatever it imports.

## The `.server` suffix

Every server-only module carries the `.server` suffix (repositories, senders, controllers, request-context keys, compositions, config files, and any server-only file under `ui/`), and a module that is safe in the browser carries none, wherever its folder; a module registered in a `routes.ts` must not carry it: the client route manifest imports every registered route, so a registered module with the suffix breaks the build. A route module keeps its loader, action, middleware and headers in itself, and React Router removes them from the client build with the imports only they use. A test named after one module carries `.server` exactly when that module does; a test covering several modules takes no suffix. A non-module asset carries no suffix.

## Vendors

Each vendor stays behind one folder: Clerk behind the accounts component, the app root modules and the clients identity adapter; Stripe behind coaching sales' `adapters/outbound/payments/stripe/`; Resend behind `shared/email`; sharp behind `shared/images`; the PDF renderer and file-type detection behind `shared/documents`; the multipart reader behind one `shared/http` module; drag and drop behind the recipe builder (rules: clerk-confined, stripe-confined, resend-confined, sharp-confined, pdf-rendering-confined, file-type-confined, busboy-confined, react-dnd-confined).

## The design system

`shared/design-system/` has no root barrel and is imported by concern folder (appointments, calendar, filters, layout, lib, motion, overlays, portal, primitives, tabs, toast). `lib/` is the base and imports nothing else of the design system, `primitives/` imports only `lib/`, and the other concern folders never import each other (rules: ui-lib-is-the-base, ui-primitives-import-only-lib, ui-subpaths). A composite over a third-party widget takes its own concern folder, so a consumer that does not render the widget does not carry the vendor. An actor-agnostic helper two components read belongs in `lib/`.

## Domain code

An entity or value object is a class with a private constructor, built by a static reconstitute factory (an entity read back by an adapter) or a named static factory (a value object, or an entity the domain constructs under an id from its concept's ids port); fields are read-only and a rule is an instance method, or a static method where no instance holds it. A use case is one class with a constructor taking one options object of ports and configuration and exactly one public execute method, answering a result union wherever the flow can fail. A port is named after the capability it provides, never after the mechanism; it lives in the concept folder of the use cases that consume it, an incidents port beside them. Orchestration two use cases share lives on an entity or a value object of their concept, never in a helper module. A factory throws only when its inputs are module-load literals.

## Client state

React Router owns server state. Loaders read; a user action's write goes through a fetcher when the page stays, or a route action answering a redirect when it changes, or a native form post when the answer leaves the site. Every resource route a fetcher writes to exports a one-line client action over `shared/http`'s fetcher outcome, so a refused or unreachable write comes back as data and an error boundary serves reads only; an upload that shows real progress swaps only the transport, through `shared/http`'s upload transport and a progress store in the component's `public/`. Raw fetch is kept for named background synchronisation that is not a user action, today only the client profile's onboarding draft autosave, and `eslint.config.mjs` refuses it everywhere else under `ui/` and the surfaces, as it refuses XMLHttpRequest outside the shared upload transport. Component-scoped Zustand stores own browser state shared across components or routes; React Hook Form owns active form values; local React state owns transient presentation.

## Rendering

Every route renders at request time; nothing is prerendered. Public pages read database-backed state through request-time loaders, and portal routes are server-rendered on first load and hydrated afterwards. A route whose address carries page state the browser applies to data it already holds (a filter, tab or sort over a loaded list) declares a revalidation predicate so those changes do not wait on a round trip; a list the server narrows re-runs its loader instead. Waiting-list mode is persisted policy input, seeded true in the feature-flags table after every migrate, never runtime configuration.

## PWA

Only `client-portal` is installable: it owns its manifest route, service worker registration, install scope and user-facing name.

## Tests

Tests sit beside the code they cover. Integration suites drive the built server over HTTP from `apps/platform/integration-test-config/`, and the only `apps/platform` module they import is the seed runner in `apps/platform/db/`. Browser journeys live in `apps/platform/e2e/`. Shared fixtures live in `apps/platform/test-support/`, and the route-argument helpers integration UI tests use live in `composition-root/test-support/`; neither is imported by production code.
