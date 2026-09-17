# Dependencies

Header: date 2026-09-17, commit dbe88053, scope apps/platform/src, apps/platform/db, packages/{config,content,db,domain,infrastructure,test-support,ui}/src plus the enforcement layer (tools/dependency-cruiser.config.cjs, tools/dependency-cruiser.tsconfig.json, tools/boundaries.test.mjs, tools/boundary-fixtures/, knip.json, eslint.config.mjs, workspace package.json export maps, tsconfigs, vite/react-router/vitest configs), mode change review (run 7).

## Component graph

Generated from the run-6 cruise at 871196af plus the fix wave (299 modules, 737 dependencies; `.architecture/slices/run6/` holds the per-slice returns and the per-module edge table is below). Count = distinct importing modules. Component IDs refer to `components.md`.

| From | To | Modules | Notes |
|---|---|---|---|
| C6 infrastructure | C1 domain | 9 | adapters implement C1 ports |
| C6 infrastructure | C2 db | 2 | feature-flags repository and table |
| C6 infrastructure | C3 config | 6 | concern types the factories read |
| C7 store | C1 domain | 18 | services, ports, rules, models |
| C7 store | C2 db | 6 | DatabaseClient, appSchema |
| C7 store | C3 config | 5 | joinBasePath and concern types |
| C7 store | C4 content | 2 | consent copy |
| C7 store | C5 ui | 6 | primitives in ui/public |
| C7 store | C6 infrastructure | 15 | bot-detection (browser and server), email/server, management-auth/server, http/server |
| C8 waitlist | C1 domain | 7 | |
| C8 waitlist | C2 db | 3 | |
| C8 waitlist | C3 config | 2 | |
| C8 waitlist | C4 content | 2 | |
| C8 waitlist | C5 ui | 2 | |
| C8 waitlist | C6 infrastructure | 5 | bot-detection, email/server, http/server |
| C9 accounts | C1 domain | 11 | |
| C9 accounts | C2 db | 3 | |
| C9 accounts | C3 config | 2 | |
| C9 accounts | C5 ui | 3 | |
| C9 accounts | C6 infrastructure | 3 | http/server |
| C9 accounts | C7 store | 2 | the store path literal from `contracts/paths.ts` |
| C10 coaching-bundles | C1 domain | 1 | the presenter reads bundles and offers |
| C10 coaching-bundles | C5 ui | 1 | |
| C11 public-site | C3 config | 3 | |
| C11 public-site | C4 content | 3 | legal documents |
| C11 public-site | C5 ui | 14 | |
| C11 public-site | C6 infrastructure | 4 | `BotDetectionConfig` type and the widget |
| C11 public-site | C7 store | 5 | cart drawer and provider, store paths |
| C11 public-site | C8 waitlist | 7 | contracts, `ui/shared` presentation, `ui/public` |
| C11 public-site | C9 accounts | 3 | contracts, guards, `ui/public/auth-nav-actions` |
| C11 public-site | C10 coaching-bundles | 1 | pricing page |
| C11 public-site | C14 server | 1 | `shell/layout.server.ts` reads `runtimeConfigContext` |
| C12 client-portal | C3 config | 1 | |
| C12 client-portal | C5 ui | 2 | |
| C12 client-portal | C6 infrastructure | 2 | pwa |
| C12 client-portal | C9 accounts | 4 | portal guard and paths |
| C13 coach-portal | C5 ui | 3 | |
| C13 coach-portal | C9 accounts | 3 | portal guard and paths |
| C14 server | C1 domain | 4 | the container and platform composition name ports and services |
| C14 server | C2 db | 2 | |
| C14 server | C3 config | 5 | |
| C14 server | C4 content | 1 | privacy email |
| C14 server | C6 infrastructure | 5 | bot verifier, product email, management auth, feature-flags repository, http/server |
| C14 server | C7 store | 2 | the container calls `composeStoreFeature` |
| C14 server | C8 waitlist | 2 | the container calls `composeWaitlistFeature` |
| C14 server | C9 accounts | 2 | the container calls `composeAccountsFeature` |
| C15 app root | C3 config | 1 | |
| C15 app root | C5 ui | 1 | app.css imports styles.css |
| C15 app root | C7 store | 1 | the registry imports `storePublicRoutes`/`storeApiRoutes` |
| C15 app root | C8 waitlist | 1 | the registry imports `waitlistApiRoutes` |
| C15 app root | C9 accounts | 3 | the registry, `root.tsx` (access-denied page) and `root.server.ts` (account resolution) |
| C15 app root | C11 public-site | 1 | the registry imports `publicSiteRoutes` |
| C15 app root | C12 client-portal | 1 | the registry imports `clientPortalRoutes` |
| C15 app root | C13 coach-portal | 1 | the registry imports `coachPortalRoutes` |
| C15 app root | C14 server | 2 | `root.server.ts` (container, feature contexts) and the registry (`server/api/routes.ts`) |

Cycles: none, at module, component, domain-slice and UI-subpath level, proven by the `no-circular` rule over 299 modules and by the cruise's own circular flag. The baseline's `C14 ↔ C7`, `C14 ↔ C8` and `C14 ↔ C9` are gone: no feature imports the app's `server/`, and the portals read `accountsContext`. C1, C2, C3, C4, C5 depend on no in-scope component. C1 has no external dependency at all. C16 has no edge in or out of the production graph.

External dependencies per component: C1 none; C2 drizzle-orm, pg; C3 zod; C4 node:crypto; C5 react, react-router, motion, radix-ui, class-variance-authority, clsx, tailwind-merge; C6 react, resend, drizzle-orm, zod, node:crypto, fetch; C7 react, react-dom, react-router, react-hook-form, @hookform/resolvers, zustand, lucide-react, zod, drizzle-orm, archiver, node:crypto, node:fs, node:path, node:stream; C8 react, react-dom, react-router, lucide-react, canvas-confetti, zod, drizzle-orm, pg, node:crypto; C9 @clerk/react-router, react, react-router, lucide-react, zod, drizzle-orm; C10 motion, lucide-react; C11 react, react-router, motion, lucide-react; C12 react-router; C13 react-router, lucide-react; C14 react-router, zod, pg; C15 @clerk/react-router, react, react-router, motion, lucide-react, @react-router/dev, vite, @tailwindcss/vite, drizzle-kit; C16 none.

## Forbidden edges

Every row is a named rule in `tools/dependency-cruiser.config.cjs` that fails `pnpm check:boundaries` — inside `pnpm typecheck`, `pnpm build`, every vitest run and the Docker builder stage — except the two rows marked review-owned. 36 rules; 35 have a fixture in `tools/boundary-fixtures/` and `tools/boundaries.test.mjs` asserts the exact set each fixture fires.

| From | To | Source of the rule | Enforced by |
|---|---|---|---|
| any module | a dependency cycle, including between domain slices | R30 | `no-circular` |
| features/A | features/B outside contracts/, ui/shared/, server/guards/ | R3 | `feature-internals` |
| features/A/data/schema.server.ts | anything private in features/B except its `data/schema.server.ts` (foreign keys) | R3 carve-out | `feature-schema-foreign-key` (still unexercised at HEAD) |
| surfaces/public-site | a feature outside ui/public/, ui/shared/, contracts/, server/guards/, routes.ts | R2 | `surface-public-site-to-feature` |
| surfaces/client-portal | a feature outside ui/client/, ui/shared/, contracts/, server/guards/, routes.ts | R2 | `surface-client-portal-to-feature` |
| surfaces/coach-portal | a feature outside ui/coach/, ui/shared/, contracts/, server/guards/, routes.ts | R2 | `surface-coach-portal-to-feature` |
| surfaces/A | surfaces/B | R4 | `surface-to-surface` |
| features/**, server/**, root | surfaces/** | R7 | `surface-import` |
| anything but root.server.ts, the registry fragment and guards consumers | apps/platform/src/server/** | R5 | `composition-root` |
| a feature | the app's own `server/guards/`; a surface | anything in them but `runtime-config-context` | R5 refinement | `server-guards-consumers` |
| a feature's api/, data/, email/, contracts/, ui/, routes.ts | its own `server/` outside `guards/` | R5 refinement | `feature-server-private` |
| any module but the runtime-environment and database modules, the readyz controller, the migration config and the integration rig | `@eli-coach-platform/config/runtime` | R33 | `config-runtime-readers` |
| features/** | anything under the app's `server/` | cycle closure | `features-never-reach-server` (`composition-root` deliberately excludes `features/` so one rule owns the edge) |
| a `server/guards/` module | anything but the framework, its feature's contracts, domain slices, config types and sibling guards | R5 refinement | `guards-construct-nothing` (a guard takes its feature type from the composition as a type-only import — the recorded carve-out) |
| a controller or route module | its feature's `data/` or `email/` | R5 refinement | `feature-api-to-data` |
| the route registry | anything under `server/` but `server/api/routes.ts` | F78 | `root-registry-to-server` |
| anything but root.tsx and the registry | `routes.ts`, `root.tsx`, `root.server.ts`, `root-error-page.tsx` | F78 | `root-registry` |
| a feature's ui/** | its data/, api/, email/ or server/ | R6 | `browser-half` |
| a `ui/**/*.server.ts` loader | its feature's `server/` outside `guards/` | R6 | `browser-half-loaders` |
| a registered route module or its .server half | data/, email/, a controller, the db package, `config/runtime`, infrastructure server internals or `server/` outside guards/ | route thinness | `route-thinness` (carries `dependencyTypesNot: ["type-only"]` on every one of the rule's `to.path` entries, so a route may also name `packages/db` or a `*-controller.server.ts` type, not only a config or bot-detection type — no route exploits this at dbe88053) |
| a registered route module or its .server half | a domain subpath, including `import type` | route thinness | `route-thinness-domain` (no type-only carve-out) |
| a domain slice | another slice's internals | R3 (policy) | `domain-slices` |
| packages/domain | any vendor, framework, database or workspace package | domain purity | `domain-no-externals` (still carries `dependencyTypesNot: ["local", "type-only"]`, so the rule alone admits a type-only external; the gate that actually stops `import type { Readable } from "node:stream"` inside the domain is the package's closed type scope) **and** dependency-absence (`package.json` declares no dependencies) **and** `"types": []` in the package tsconfig, which keeps `@types/node`'s ambient globals (`NodeJS.*`, `Buffer`) out of scope — a fixture proves the rule fires |
| infrastructure subpath A | infrastructure subpath B | F77 | `infrastructure-subpaths` |
| a non-`.server` infrastructure module | a `*.server` module | browser-bundle safety | `infrastructure-browser-entries` |
| an app module | a package by relative path | package APIs | `workspace-by-name-app` |
| a package module | another package by relative path | package APIs | `workspace-by-name-packages` |
| a UI concern subpath | another concern subpath | design-system layering | `ui-subpaths` |
| `packages/ui/src/primitives` | anything but `lib/` | design-system layering | `ui-primitives-import-only-lib` |
| `packages/ui/src/lib` | anything else in the package | design-system layering | `ui-lib-is-the-base` |
| any module | an unresolvable specifier (`?raw` exempt) | hygiene | `not-to-unresolvable` |
| any module | an npm package not declared in its own package.json | hygiene | `no-non-package-json` |
| production code | a devDependency (`routes.ts` files and `*.config.*` exempt; type-only and peer imports allowed) | hygiene | `not-to-dev-dep` |
| production code | a test rig or fixture, including `packages/test-support` | R34 | `no-production-import-of-tests` |
| a package | a more unstable package | R31 | `stability`, scoped to cross-package edges only after the broader form fired on 45 intra-package barrel edges; the one rule with no fixture (`moreUnstable` needs dependent counts a fixture tree cannot express), proven only by the real-tree cruise |
| any module | nothing, and nothing imports it | hygiene | `no-orphans` (excludes `*.d.ts`, `*.css`, the client-portal service worker, `server/test-support/request-args.ts`, `packages/test-support/src/index.ts`, `apps/platform/src/routes.ts` and the two portal `readyz.ts` leaves) |
| any workspace consumer | a package's internal file (deep import) | package APIs | `package.json` export maps (resolution fails) plus `workspace-by-name-*` |
| any published surface | an unused export, file, dependency or undeclared dependency | published surfaces | `knip` through `pnpm check:surfaces` (`knip --no-config-hints`), at zero on all four counts; a fixture asserts one unused export is reported |
| controllers | request state on instance fields; a base controller hierarchy | review-owned rule (F88/F89 accepted) | review only; run 6 read all eleven controllers and found none |
| infrastructure failure | a business status (capacity, duplicate, availability) | review-owned rule (F88/F89 accepted) | review only, refined to "an adapter never swallows an infrastructure failure into a result-union member; exactly one named expected condition may be classified". The one sanctioned instance is ENOENT in `FilesystemProductAssetStore`; run 6 read all sixteen catch sites in the adapter ring |

ESLint residue: `js.recommended`, jsx-a11y strict, and the app-root-alias `no-restricted-imports`/`no-restricted-syntax` pair, switched off for `apps/platform/src/surfaces/*/routes.ts` because the `~` alias does not resolve inside React Router's route-config loader. The boundary regions R1–R7, `createContainerFencedConfigs`, `createFeatureBoundaryConfigs`, `createSurfaceBoundaryConfigs`, the fenced lists and `tools/lint-boundaries.test.mjs` are deleted.

## Cross-feature protocol

A feature depends on another feature only through a published interface; everything else (`data/`, `email/`, `api/`, composition) stays private, and runtime objects cross features only through the container and the request context.

| Need | Satisfied at | Mechanism | Enforced by | Exercised at HEAD |
|---|---|---|---|---|
| Use another feature's types and rules in policy code | domain slice to domain slice | import through the slice entry (`@eli-coach-platform/domain/<feature>`) | `domain-slices`, `no-circular` | six edges: store→`/email-address`, store→`/shared`, waitlist→`/coaching-bundles`, waitlist→`/email-address`, waitlist→`/shared` |
| Know the current account | request context | read the accounts feature's `server/guards/` key | `guards-construct-nothing`, `server-guards-consumers` | yes |
| Look another feature's data up | a port the consumer declares | the consuming slice declares the narrow interface; the composition satisfies it | `feature-internals`, `feature-api-to-data` | no exercising edge |
| Reference another feature's table | persistence | `data/schema.server.ts` may import the other feature's `data/schema.server.ts` for a foreign key | `feature-schema-foreign-key` | no exercising edge |
| Compose another feature's UI | `ui/shared/` | the owning feature publishes the component or presenter | `feature-internals`, the three `surface-<s>-to-feature` rules | yes |
| Exchange wire data | `contracts/` | zod schemas and path literals | `feature-internals`, the three `surface-<s>-to-feature` rules | yes |

## Boundaries (ports)

Enforcement names what fails if a consumer imports an implementer directly.

| ID | Port | Owner (ring) | Implementers (ring) | Consumers | Crossing data | Humble side | Enforcement |
|---|---|---|---|---|---|---|---|
| B190 | Accounts (U901) | C1 use-cases | U406 PostgresAccountRepository (adapters) | U902, U948 | Account (plain) | implementer | dependency-absence keeps C1 from naming the adapter; `feature-api-to-data` forbids the controller or route from importing the repository; `feature-internals` forbids another feature from reaching it; the composition hands it in |
| B191 | FeatureFlags (U906) | C1 use-cases | U1027 PostgresFeatureFlagRepository (adapters, C6) | U909 | PersistedFeatureFlag[] | implementer | dependency-absence; exports |
| B192 | FeatureFlagReader (U907) | C1 use-cases | U909 FeatureFlagService | U534 FeatureFlagController | FeatureFlagSet | service | dependency-absence |
| B193 | WaitlistEntries (U912) | C1 use-cases | U303 PostgresWaitlistRepository | U914 | signup commands/results (plain) | implementer | dependency-absence |
| B194 | WaitlistConfirmationService (U913) | C1 use-cases | U307 EmailWaitlistConfirmationService | U914 | SendWaitlistConfirmationCommand in; `WaitlistConfirmationResult` = sent \| failed out | implementer | dependency-absence |
| B195 | StoreCatalog (U919) | C1 use-cases | U120 PostgresStoreCatalogRepository | U920, U927 | PublishedStoreProduct[] | implementer | dependency-absence |
| B196 | StoreAcquisitions (U922) | C1 use-cases | U117 PostgresStoreAcquisitionRepository | U927 | PrepareAcquisitionCommand / AcquisitionPreparation | implementer | dependency-absence |
| B197 | StoreDeliveryService (U923) | C1 use-cases | U129 EmailStoreDeliveryService | U927 | command in; `StoreDeliveryResult` = delivered(provider, providerMessageId) \| rejected(reason) \| unconfirmed out. The third member is a deliberate deviation from the spec's two-member union (owner ruling); a thrown `deliver()` stays a domain-audited retryable outcome through `recordRetryableDelivery` | implementer | dependency-absence |
| B199 | PayloadDigestGenerator (U925) | C1 use-cases | U124 PayloadSha256Digest | U927 | string | implementer | dependency-absence |
| B200 | Clock (U957) | C1 `/shared` | `{ now: () => new Date() }` at `container.server.ts:49` | U927 StoreAcquisitionService, U933 DownloadGrantService, U914 WaitlistService | Date | implementer | dependency-absence |
| B201 | DownloadTokenHasher (U931) | C1 use-cases | U123 DownloadTokenSha256 | U933 | string | implementer | dependency-absence |
| B202 | DownloadGrants (U932) | C1 use-cases | U121 PostgresDownloadGrantRepository | U933 | DownloadGrant | implementer | dependency-absence |
| B203 | ProductAssets (U935) | C1 use-cases | U119 FilesystemProductAssetStore | U104, U107, U114 (adapters, C7) | `ProductAssetOpenResult` = opened(bytes: `AsyncIterable<Uint8Array>`) \| unavailable | implementer | dependency-absence. Substitutability holds on all three consumer paths: the cover and download controllers and the zip stream all adapt with `Readable.from(...)` and none casts the port's iterable to a Node type. The filesystem store hands back an iterable whose `return()` destroys the read stream, so a consumer that opens a source and gives up releases the handle |
| B204 | ProductAssetWriter (U937) | C1 use-cases | U119 FilesystemProductAssetStore | U944 | ProductAssetContent (Uint8Array) | implementer | dependency-absence |
| B205 | ProductAssetDigest (U938) | C1 use-cases | U118 ProductAssetSha256Digest | U944 | Uint8Array / string | implementer | dependency-absence |
| B206 | StoreProductPublications (U943) | C1 use-cases | U125 PostgresStoreProductPublicationRepository | U944 | PersistPublicationCommand / PublishableProduct | implementer | dependency-absence |
| B207 | Logger (U958) | C1 `/shared` | U519 `createConsoleLogger` (`server/logger.server.ts:3`) | U927 StoreAcquisitionService, U914 WaitlistService | a message and a details record | implementer | dependency-absence |
| B240 | BotVerifier (U959) | C1 `/shared` | U1007 StaticTokenBotVerifier, U1012 TurnstileBotVerifier, behind `createBotVerifier` | U301 WaitlistController, U100 StoreAcquisitionController | BotVerificationRequest/Result (plain) | implementers | exports (both implementers are un-exported) |
| B241 | ProductEmail (U960) | C1 `/shared` | U1023 ResendProductEmail, U1038 InMemoryProductEmail, behind `createProductEmail` | U129, U307 adapters | ProductEmailCommand / ProductEmailResult. `ProductEmail.provider` is boundary data the use case records in its delivery audit, not a detail leak | implementer | exports |
| B242 | ManagementAuthenticator (U961) | C1 `/shared` | U1029 BearerSecretManagementAuthenticator, behind `createManagementAuthenticator` | U109 StoreProductManagementController | `ManagementCredentials` (`{ authorizationHeader }`) in, `ManagementAuthenticationResult` out | implementer | exports |
| B100 | ZipDeliveryStream (structural type declared by its consumer, `downloads-controller.server.ts:12-14`) | C7 adapters | U114 ZipDeliveryStream | U107 | DownloadGrant in, ProductAssetOpenResult out. `planGrantEntries` walks `grant.items` rather than `GrantDelivery.bundle.assets` because it needs `item.productSlug` for the zip entry name | U114 | none (structural typing, which is where R5 puts it) |
| B120 | StoreCartState (U204, Zustand store shape) | C7 ui/public (adapters) | U205 createStoreCartStore | U210–U218, U237, U248, C11 shell/layout.tsx | object with functions and productSlugs | consumers | none |
| B121 | useStoreCatalogFetcher / useStoreAcquisitionFetcher (U202, U203) | C7 ui/public | same | U213, U218 | StoreCatalogResponse / parsed acquisition response | callers | none |
| B122 | usePrivateDownloadToken (U244) | C7 ui/public | same | U241 | string or null | download page | none |
| B123 | React Router loader contract | framework | U231, U247, U604, U415, U521 | routes.ts, page modules | loader data types | page view | React Router strips `.server` modules from the client build; `browser-half-loaders` |
| B140 | sessionContext RouterContext<ResolvedSession> (U408) | C9 server/guards (frameworks) | U410 sets it | U411, U412, U604 | `ResolvedSession` with `account: AccountSnapshot`; default `{ kind: "anonymous" }` | React Router context | `guards-construct-nothing`, `server-guards-consumers` |
| B143 | requirePortalAccess (U411) | C9 server/guards | portal layout middleware in C12, C13 | U705, U711 | `(args, { role })`, reading `accountsContext.portal`; returns `AccountSnapshot` | caller | `server-guards-consumers` |
| B144 | the five request-context keys | C7, C8, C9 `server/guards/` and C14 `server/guards/` | `createFeatureContextMiddleware` (U517) sets all five from the container | `accountsContext` (accounts routes, the resolution middleware, the portal guards), `storeContext` (store routes and loaders), `waitlistContext` (the waitlist route and the public-site layout loader), `platformContext` (`server/api/*` only), `runtimeConfigContext` (the public-site layout loader only) | the feature slice or `{ appBasePath, botDetection }` | the context key | each is created with `createContext<…>()` and constructs nothing (`guards-construct-nothing`); `server-guards-consumers` fences `platformContext` |
| B151 | PlatformDatabase.client deferred DatabaseClient proxy | C14 (frameworks) | private createDeferredDatabaseClient in U503 | every repository built by a feature composition | DatabaseClient (Drizzle type) | proxy | none |
| B152 | PlatformContainer (U502) composition output | C14 composition | U500 | `root.server.ts` only | a record of feature slices `{ accounts, closeDatabase, platform, store, waitlist }` | root.server.ts | `composition-root` |
| B180 | Radix wrapper boundary in C5 | C5 frameworks | checkbox, filter-chip-group, sheet (avatar, dialog and select are deleted) | apps through the concern subpaths | React props | C5 component | none |
| B181 | SearchParamsWriter (U805) | C5 lib (adapters) | C5 | U237 catalog-view | { searchParams, writeSearchParams } | consumer | none |
| B182 | packages/ui export map | C5 | six concern `index.ts` entries plus `styles.css`; no root barrel | apps/platform/src, app.css | components, CSS | consumers | exports, `ui-subpaths`, `ui-primitives-import-only-lib`, `ui-lib-is-the-base` |
| B260 | DatabaseClient (U1151, Drizzle NodePgDatabase) | C2 adapters | drizzle() | U503; every repository in C7, C8, C9, C6 | Drizzle ORM instance (detail type) | C2 | exports |
| B261 | appSchema (U1154, the `app` Postgres namespace) | C2 frameworks | tables attached by U126, U304, U407, U1028 | same four | drizzle PgSchema builder | consumers | convention; drizzle.config.ts globs discover the tables |
| B262 | RuntimeEnvironment (U1170) | C3 frameworks | the intersection of eight concern shapes with five refinements, composed in `runtime-environment.ts` and loaded from the `./runtime` entry by U1171 | U510 (memoised) only; every other consumer imports the concern type it reads (`AppConfig`, `DatabaseConfig`, `WaitlistConfig`, `BotDetectionSettings`, `ProductEmailConfig`, `ManagementApiConfig`) from `.` | typed env object | C3 | exports, `config-runtime-readers` |
| B263 | DatabaseBootstrapEnvironment / DatabaseConnection / DatabaseUserCredentials | C3 | U1174 | U503 | plain credential structures | C3 | exports |
| B265 | packages/test-support (U1191) | C16 | fixture only | test files only | Clerk-shaped fixture | tests | exports plus `no-production-import-of-tests` and `not-to-dev-dep`; after `pnpm --prod deploy` a production import does not even resolve |

## Entry points and composition roots

| Kind | Path | Constructs |
|---|---|---|
| composition-root | apps/platform/src/server/container.server.ts (createPlatformContainer, memoised by getPlatformContainer) | the shared handles once — `createPlatformDatabase`, the `Clock` implementation (`{ now: () => new Date() }`), `createConsoleLogger()`, `createBotVerifier()`, `createManagementAuthConfig()` and `createManagementAuthenticator()`, `createProductEmail()` — then `composeAccountsFeature`, `composePlatformFeature`, `composeStoreFeature`, `composeWaitlistFeature`. It also reads `process.env.GIT_SHA ?? "dev"` at `:75`, the one environment read outside `runtime-environment.server.ts` |
| composition-root (second) | apps/platform/src/root.server.ts | `clerkMiddleware()`, `createFeatureContextMiddleware(getPlatformContainer)`, `createAccountResolutionMiddleware()`; the container's only importer |
| composition-site | apps/platform/src/features/accounts/server/accounts-composition.server.ts | the account repository, provisioning and deletion services, the account and webhook controllers; `AccountsFeatureHandles` names only what the feature reads |
| composition-site | apps/platform/src/features/store/server/store-composition.server.ts | the store repositories, asset store and digests, token generators, zip stream, delivery service, domain services and the five store controllers; `StoreFeatureHandles` names only what the feature reads |
| composition-site | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | the waitlist repository, confirmation service, `WaitlistService` and the waitlist controller |
| composition-site | apps/platform/src/server/platform-composition.server.ts | the readyz, metadata and feature-flag controllers plus the runtime config the public site reads |
| construction-site | apps/platform/src/server/database.server.ts (openPool, lazy) | pg Pool via createManagedDatabasePool; Drizzle client via createDatabaseClient |
| construction-site | apps/platform/src/features/store/email/create-store-delivery-service.server.ts | EmailStoreDeliveryService over the `ProductEmail` it is handed; no provider branch |
| construction-site | apps/platform/src/features/waitlist/email/create-waitlist-confirmation-service.server.ts | EmailWaitlistConfirmationService over the `ProductEmail` it is handed; no provider branch |
| construction-site | packages/infrastructure/src/email/create-product-email.server.ts | InMemoryProductEmail or `new Resend()` + ResendProductEmail, selected on `PRODUCT_EMAIL_PROVIDER` (`memory \| resend`) |
| construction-site | packages/infrastructure/src/bot-detection/verifier/create-bot-verifier.server.ts | StaticTokenBotVerifier or TurnstileBotVerifier, selected on `BOT_DETECTION_PROVIDER`; no `ENVIRONMENT` sniff |
| construction-site | packages/infrastructure/src/management-auth/create-management-authenticator.server.ts | BearerSecretManagementAuthenticator (bearer only) |
| construction-site | apps/platform/src/features/store/api/downloads/zip-stream.server.ts (ZipDeliveryStream.create) | archiver ZipArchive at request time |
| construction-site | apps/platform/src/features/store/ui/public/cart/cart.ts, cart-provider.tsx | Zustand store with persist over localStorage (`cart-storage.ts`); one store per provider |
| route registry | apps/platform/src/routes.ts | a concatenation of seven fragments (`publicSiteRoutes`, `platformApiRoutes`, `accountsApiRoutes`, `waitlistApiRoutes`, `storeApiRoutes`, `clientPortalRoutes`, `coachPortalRoutes`), each built with `relative(import.meta.dirname)` in its own feature or surface, with no path literals of its own. The registered route table is identical to the baseline in paths and files, but React Router assigns different route ids to `relative()`-built routes; nothing in the app consumes a route id, so the difference is inert. `surfaces/public-site/routes.ts` imports `index` unscoped while destructuring `layout` and `route` from `relative(…)`, so the index child's file path is app-root-relative where its siblings are directory-relative |
| route (page) | surfaces/public-site/shell/layout.tsx (+ layout.server.ts loader), pages/{home,pricing,blog,privacy,terms}.tsx | the loader reads `waitlistContext`, `sessionContext` and `runtimeConfigContext` off `args.context` and returns `presentWaitlist(...)` |
| route (page) | features/store/ui/public/{catalog/catalog-page,product/product-page,download/download-page}.tsx (+ .server.ts loaders) | the loaders read `storeContext` |
| route (page) | features/accounts/ui/public/sign-in-failed-page.tsx (+ .server.ts) | reads `accountsContext` |
| route (page) | surfaces/client-portal/shell/layout.tsx (+ middleware), pages/home.tsx; surfaces/coach-portal/shell/layout.tsx (+ middleware), pages/home.tsx | middleware calls `requirePortalAccess(args, { role })` |
| route (resource) | features/store/api/{acquisitions/acquisitions,catalog/catalog,covers/covers,downloads/downloads,management/management-product-validations,management/management-products,management/management-product,management/management-product-versions}.ts | read `storeContext` |
| route (resource) | features/waitlist/api/waitlist.ts; features/accounts/api/{account,clerk-webhooks}.ts | read `waitlistContext` / `accountsContext` |
| route (resource) | server/api/{readyz/readyz,meta/meta,feature-flags/feature-flags}.ts | read `platformContext` |
| route (resource) | surfaces/client-portal/api/{manifest,sw,readyz}.ts; surfaces/coach-portal/api/readyz.ts | pwa definitions; static Response |
| middleware | root.server.ts (Clerk, feature contexts, account resolution); portal layout.server.ts (role guards) | see above |
| CLI/build | apps/platform/db/drizzle.config.ts (schema globs), vite.config.ts, react-router.config.ts | tooling entry points, not imported by app code |

## Shared data shapes

| Shape | Components reading or writing it | Owning component |
|---|---|---|
| Postgres namespace `app` (appSchema) and the migration journal apps/platform/db/drizzle | C2 declares the namespace; C7 (store tables), C8 (waitlist_entries), C9 (accounts, account_role enum), C6 (feature_flags) attach tables; C15 drizzle.config.ts discovers them by glob | C2 owns the namespace; each table is owned by the feature that declares it |
| store zod contracts (contracts/store.ts, store-management.ts) | C7 server half and C7 ui half; C11 through `contracts/` | C7 |
| waitlist zod contracts (contracts/waitlist.ts) | C8; C11 | C8 |
| accounts contracts (PublicSessionState, accountResponseSchema, AccountRole) | C9; C11; AccountRole originates in C1 | C9 (wire) / C1 (role) |
| BotDetectionConfig (zod schema in C6) | C6; C7 ui; C8 ui; C11 loader data and props | C6 |
| FeatureFlagSnapshot (featureFlagSnapshotSchema) | C14 controller and route; integration tests | C14 (`server/api/feature-flags/feature-flags-contract.ts`) |
| RuntimeEnvironment | eight concern shapes, each owned by its `concerns/*.ts` module; consumers read the concern type, and only `apps/platform/src/server/runtime-environment.server.ts` loads the process environment | C3 |
| Route path literals | one owner each: `features/<feature>/contracts/paths.ts` and `surfaces/public-site/paths.ts`. The `client` and `coach` portal segments are owned by the accounts feature because `surface-import` forbids a feature importing a surface | C7, C8, C9, C11 |
| The offer-plan literal `"all-bundles"` | C1 `/coaching-bundles` owns it (`bundle-offers.ts:CoachingBundleWaitlistOfferPlan`); consumers `/waitlist` (through the slice entry), C8 `ui/shared` (`bundleOfferPlan`), C10 `ui/shared` | C1 |
| WaitlistPresentation (mode, isClosed, isUnavailable, showsAuthControls, availabilityStatus, bundleOfferPlan) | C11 shell, hero, about, footer CTA, pricing and the email form. The closed/unavailable/open **copy** branch is re-derived in `hero.tsx`, `footer-cta.tsx` and `pricing.tsx` rather than carried on the presentation (owner ruling: copy tables stay in views) | C8 `ui/shared` |
| CoachingBundleCard (+ the presenter's `benefits` and `showsWaitlistPricing`) | consumer `BundleSelector`, which reads every member and decides nothing itself | C10 `ui/shared` |
| localStorage cart (STORE_CART_STORAGE_KEY) | C7 ui only | C7 |
| Email HTML rendered from React primitives (Email*) | C6 owns the primitives; the content builders live in each feature's `email/` folder (accepted exception) | C6 |
| CLERK_TEST_ENVIRONMENT | read only by tests | C16 |

## Edges

An edge from A to B means A's source names B. Direction `inward` points toward policy (ring order: entities, use-cases, adapters, frameworks, composition). Generated from every `import`, `export … from`, dynamic `import()` and CSS `@import` in the 299 in-scope modules at 871196af plus the fix wave; kind is `import` for all rows (the `implements` and `constructs` relationships are recorded in the Boundaries and Entry points sections above). Crosses-ring compares the majority ring of the two modules from `units.md`; externals are tagged framework, vendor or runtime. Component membership is by path (see `components.md`). The generating command is `npx depcruise --config tools/dependency-cruiser.config.cjs --output-type json apps/platform/src packages/{config,content,db,domain,infrastructure,test-support,ui}/src`.

| ID | From | To | Kind | Crosses component | Crosses ring | Direction | Status |
|---|---|---|---|---|---|---|---|
| E1 | apps/platform/src/features/accounts/api/account-controller.server.ts | apps/platform/src/features/accounts/contracts/account.ts | import | no | no | lateral | present |
| E2 | apps/platform/src/features/accounts/api/account-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-account.server.ts | import | no | no | lateral | present |
| E3 | apps/platform/src/features/accounts/api/account.ts | apps/platform/src/features/accounts/server/guards/accounts-context.server.ts | import | no | no | lateral | present |
| E4 | apps/platform/src/features/accounts/api/account.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E5 | apps/platform/src/features/accounts/api/clerk-webhooks.ts | apps/platform/src/features/accounts/server/guards/accounts-context.server.ts | import | no | no | lateral | present |
| E6 | apps/platform/src/features/accounts/api/clerk-webhooks.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E7 | apps/platform/src/features/accounts/api/webhook-controller.server.ts | packages/domain/src/accounts/index.ts | import | yes | no | lateral | present |
| E8 | apps/platform/src/features/accounts/api/webhook-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E9 | apps/platform/src/features/accounts/contracts/account.ts | external:zod (framework) | import | n/a | yes | outward | present |
| E10 | apps/platform/src/features/accounts/contracts/account.ts | packages/domain/src/accounts/index.ts | import | yes | no | lateral | present |
| E11 | apps/platform/src/features/accounts/contracts/paths.ts | packages/domain/src/accounts/index.ts | import | yes | no | lateral | present |
| E12 | apps/platform/src/features/accounts/data/account-repository.server.ts | apps/platform/src/features/accounts/data/schema.server.ts | import | no | no | lateral | present |
| E13 | apps/platform/src/features/accounts/data/account-repository.server.ts | packages/db/src/index.ts | import | yes | yes | outward | present |
| E14 | apps/platform/src/features/accounts/data/account-repository.server.ts | packages/domain/src/accounts/index.ts | import | yes | no | lateral | present |
| E15 | apps/platform/src/features/accounts/data/schema.server.ts | packages/db/src/index.ts | import | yes | yes | outward | present |
| E16 | apps/platform/src/features/accounts/data/schema.server.ts | packages/domain/src/accounts/index.ts | import | yes | no | lateral | present |
| E17 | apps/platform/src/features/accounts/routes.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | no | yes | inward | present |
| E18 | apps/platform/src/features/accounts/server/account-resolution-middleware.server.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | no | no | lateral | present |
| E19 | apps/platform/src/features/accounts/server/account-resolution-middleware.server.ts | apps/platform/src/features/accounts/server/guards/accounts-context.server.ts | import | no | yes | outward | present |
| E20 | apps/platform/src/features/accounts/server/account-resolution-middleware.server.ts | apps/platform/src/features/accounts/server/guards/session-context.server.ts | import | no | yes | outward | present |
| E21 | apps/platform/src/features/accounts/server/account-resolution-middleware.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E22 | apps/platform/src/features/accounts/server/account-resolution-middleware.server.ts | packages/domain/src/accounts/index.ts | import | yes | no | lateral | present |
| E23 | apps/platform/src/features/accounts/server/accounts-composition.server.ts | apps/platform/src/features/accounts/api/account-controller.server.ts | import | no | yes | inward | present |
| E24 | apps/platform/src/features/accounts/server/accounts-composition.server.ts | apps/platform/src/features/accounts/api/webhook-controller.server.ts | import | no | yes | inward | present |
| E25 | apps/platform/src/features/accounts/server/accounts-composition.server.ts | apps/platform/src/features/accounts/data/account-repository.server.ts | import | no | yes | inward | present |
| E26 | apps/platform/src/features/accounts/server/accounts-composition.server.ts | packages/db/src/index.ts | import | yes | yes | inward | present |
| E27 | apps/platform/src/features/accounts/server/accounts-composition.server.ts | packages/domain/src/accounts/index.ts | import | yes | yes | inward | present |
| E28 | apps/platform/src/features/accounts/server/guards/accounts-context.server.ts | apps/platform/src/features/accounts/server/accounts-composition.server.ts | import | no | yes | outward | present |
| E29 | apps/platform/src/features/accounts/server/guards/require-account.server.ts | apps/platform/src/features/accounts/server/guards/session-context.server.ts | import | no | yes | outward | present |
| E30 | apps/platform/src/features/accounts/server/guards/require-account.server.ts | packages/domain/src/accounts/index.ts | import | yes | no | lateral | present |
| E31 | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | apps/platform/src/features/accounts/server/guards/accounts-context.server.ts | import | no | yes | outward | present |
| E32 | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | apps/platform/src/features/accounts/server/guards/session-context.server.ts | import | no | yes | outward | present |
| E33 | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | packages/domain/src/accounts/index.ts | import | yes | no | lateral | present |
| E34 | apps/platform/src/features/accounts/server/guards/session-context.server.ts | packages/domain/src/accounts/index.ts | import | yes | yes | inward | present |
| E35 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | apps/platform/src/features/accounts/contracts/account.ts | import | no | yes | inward | present |
| E36 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | apps/platform/src/features/accounts/contracts/paths.ts | import | no | yes | inward | present |
| E37 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E38 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | packages/domain/src/accounts/index.ts | import | yes | yes | inward | present |
| E39 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E40 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.server.ts | apps/platform/src/features/accounts/server/guards/accounts-context.server.ts | import | no | yes | outward | present |
| E41 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.server.ts | apps/platform/src/features/store/contracts/paths.ts | import | yes | no | lateral | present |
| E42 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E43 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.tsx | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.server.ts | import | no | yes | inward | present |
| E44 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E45 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E46 | apps/platform/src/features/accounts/ui/shared/access-denied-page.tsx | apps/platform/src/features/accounts/contracts/paths.ts | import | no | yes | inward | present |
| E47 | apps/platform/src/features/accounts/ui/shared/access-denied-page.tsx | apps/platform/src/features/store/contracts/paths.ts | import | yes | yes | inward | present |
| E48 | apps/platform/src/features/accounts/ui/shared/access-denied-page.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E49 | apps/platform/src/features/accounts/ui/shared/access-denied-page.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E50 | apps/platform/src/features/coaching-bundles/ui/public/bundle-selector.tsx | apps/platform/src/features/coaching-bundles/ui/shared/coaching-bundles-presentation.ts | import | no | yes | inward | present |
| E51 | apps/platform/src/features/coaching-bundles/ui/public/bundle-selector.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E52 | apps/platform/src/features/coaching-bundles/ui/public/bundle-selector.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E53 | apps/platform/src/features/coaching-bundles/ui/public/bundle-selector.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E54 | apps/platform/src/features/coaching-bundles/ui/shared/coaching-bundles-presentation.ts | packages/domain/src/coaching-bundles/index.ts | import | yes | no | lateral | present |
| E55 | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E56 | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | external:crypto (vendor) | import | n/a | yes | outward | present |
| E57 | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E58 | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | packages/domain/src/store/index.ts | import | yes | no | lateral | present |
| E59 | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | packages/infrastructure/src/bot-detection/index.server.ts | import | yes | no | lateral | present |
| E60 | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | outward | present |
| E61 | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E62 | apps/platform/src/features/store/api/acquisitions/acquisitions.ts | apps/platform/src/features/store/server/guards/store-context.server.ts | import | no | no | lateral | present |
| E63 | apps/platform/src/features/store/api/acquisitions/acquisitions.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E64 | apps/platform/src/features/store/api/catalog/catalog-controller.server.ts | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E65 | apps/platform/src/features/store/api/catalog/catalog-controller.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E66 | apps/platform/src/features/store/api/catalog/catalog-controller.server.ts | packages/domain/src/store/index.ts | import | yes | no | lateral | present |
| E67 | apps/platform/src/features/store/api/catalog/catalog.ts | apps/platform/src/features/store/server/guards/store-context.server.ts | import | no | no | lateral | present |
| E68 | apps/platform/src/features/store/api/catalog/catalog.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E69 | apps/platform/src/features/store/api/covers/covers-controller.server.ts | packages/domain/src/store/index.ts | import | yes | no | lateral | present |
| E70 | apps/platform/src/features/store/api/covers/covers-controller.server.ts | packages/domain/src/store/index.ts | import | yes | no | lateral | present |
| E71 | apps/platform/src/features/store/api/covers/covers-controller.server.ts | external:stream (vendor) | import | n/a | yes | outward | present |
| E72 | apps/platform/src/features/store/api/covers/covers.ts | apps/platform/src/features/store/server/guards/store-context.server.ts | import | no | no | lateral | present |
| E73 | apps/platform/src/features/store/api/covers/covers.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E74 | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | apps/platform/src/features/store/api/downloads/download-recovery.html | import | no | no | lateral | present |
| E75 | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | apps/platform/src/features/store/contracts/paths.ts | import | no | no | lateral | present |
| E76 | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E77 | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E78 | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | packages/domain/src/store/index.ts | import | yes | no | lateral | present |
| E79 | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E80 | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | external:path (vendor) | import | n/a | yes | outward | present |
| E81 | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | external:stream (vendor) | import | n/a | yes | outward | present |
| E82 | apps/platform/src/features/store/api/downloads/downloads.ts | apps/platform/src/features/store/server/guards/store-context.server.ts | import | no | no | lateral | present |
| E83 | apps/platform/src/features/store/api/downloads/downloads.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E84 | apps/platform/src/features/store/api/management/management-controller.server.ts | apps/platform/src/features/store/contracts/store-management.ts | import | no | no | lateral | present |
| E85 | apps/platform/src/features/store/api/management/management-controller.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E86 | apps/platform/src/features/store/api/management/management-controller.server.ts | packages/domain/src/store/index.ts | import | yes | no | lateral | present |
| E87 | apps/platform/src/features/store/api/management/management-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E88 | apps/platform/src/features/store/api/management/management-controller.server.ts | packages/infrastructure/src/management-auth/index.server.ts | import | yes | no | lateral | present |
| E89 | apps/platform/src/features/store/api/management/management-product-validations.ts | apps/platform/src/features/store/server/guards/store-context.server.ts | import | no | no | lateral | present |
| E90 | apps/platform/src/features/store/api/management/management-product-validations.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E91 | apps/platform/src/features/store/api/management/management-product-versions.ts | apps/platform/src/features/store/server/guards/store-context.server.ts | import | no | no | lateral | present |
| E92 | apps/platform/src/features/store/api/management/management-product-versions.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E93 | apps/platform/src/features/store/api/management/management-product.ts | apps/platform/src/features/store/server/guards/store-context.server.ts | import | no | no | lateral | present |
| E94 | apps/platform/src/features/store/api/management/management-product.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E95 | apps/platform/src/features/store/api/management/management-products.ts | apps/platform/src/features/store/server/guards/store-context.server.ts | import | no | no | lateral | present |
| E96 | apps/platform/src/features/store/api/management/management-products.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E97 | apps/platform/src/features/store/api/downloads/zip-stream.server.ts | external:archiver (vendor) | import | n/a | yes | outward | present |
| E98 | apps/platform/src/features/store/api/downloads/zip-stream.server.ts | packages/domain/src/store/index.ts | import | yes | no | lateral | present |
| E99 | apps/platform/src/features/store/api/downloads/zip-stream.server.ts | external:stream (vendor) | import | n/a | yes | outward | present |
| E100 | apps/platform/src/features/store/api/downloads/zip-stream.server.ts | external:stream/promises (vendor) | import | n/a | yes | outward | present |
| E101 | apps/platform/src/features/store/contracts/store-management.ts | external:zod (framework) | import | n/a | yes | outward | present |
| E102 | apps/platform/src/features/store/contracts/store.ts | external:zod (framework) | import | n/a | yes | outward | present |
| E103 | apps/platform/src/features/store/data/acquisitions/acquisition-repository.server.ts | packages/db/src/index.ts | import | yes | yes | outward | present |
| E104 | apps/platform/src/features/store/data/acquisitions/acquisition-repository.server.ts | packages/domain/src/store/index.ts | import | yes | no | lateral | present |
| E105 | apps/platform/src/features/store/data/assets/asset-confinement.server.ts | packages/domain/src/store/index.ts | import | yes | no | lateral | present |
| E106 | apps/platform/src/features/store/data/assets/asset-confinement.server.ts | external:path (vendor) | import | n/a | yes | outward | present |
| E107 | apps/platform/src/features/store/data/assets/asset-digest.server.ts | external:crypto (vendor) | import | n/a | yes | outward | present |
| E108 | apps/platform/src/features/store/data/assets/asset-digest.server.ts | packages/domain/src/store/index.ts | import | yes | no | lateral | present |
| E109 | apps/platform/src/features/store/data/assets/asset-store.server.ts | apps/platform/src/features/store/data/assets/asset-confinement.server.ts | import | no | no | lateral | present |
| E110 | apps/platform/src/features/store/data/assets/asset-store.server.ts | external:crypto (vendor) | import | n/a | yes | outward | present |
| E111 | apps/platform/src/features/store/data/assets/asset-store.server.ts | external:fs (vendor) | import | n/a | yes | outward | present |
| E112 | apps/platform/src/features/store/data/assets/asset-store.server.ts | external:fs/promises (vendor) | import | n/a | yes | outward | present |
| E113 | apps/platform/src/features/store/data/assets/asset-store.server.ts | packages/domain/src/store/index.ts | import | yes | no | lateral | present |
| E114 | apps/platform/src/features/store/data/assets/asset-store.server.ts | external:path (vendor) | import | n/a | yes | outward | present |
| E115 | apps/platform/src/features/store/data/assets/asset-store.server.ts | external:stream (vendor) | import | n/a | yes | outward | present |
| E116 | apps/platform/src/features/store/data/catalog/catalog-repository.server.ts | packages/db/src/index.ts | import | yes | yes | outward | present |
| E117 | apps/platform/src/features/store/data/catalog/catalog-repository.server.ts | packages/domain/src/store/index.ts | import | yes | no | lateral | present |
| E118 | apps/platform/src/features/store/data/download-grants/download-grant-repository.server.ts | packages/db/src/index.ts | import | yes | yes | outward | present |
| E119 | apps/platform/src/features/store/data/download-grants/download-grant-repository.server.ts | packages/domain/src/store/index.ts | import | yes | no | lateral | present |
| E120 | apps/platform/src/features/store/data/download-grants/download-token.server.ts | external:crypto (vendor) | import | n/a | yes | outward | present |
| E121 | apps/platform/src/features/store/data/download-grants/download-token.server.ts | packages/domain/src/store/index.ts | import | yes | no | lateral | present |
| E122 | apps/platform/src/features/store/data/publications/publication-repository.server.ts | packages/db/src/index.ts | import | yes | yes | outward | present |
| E123 | apps/platform/src/features/store/data/publications/publication-repository.server.ts | packages/domain/src/store/index.ts | import | yes | no | lateral | present |
| E124 | apps/platform/src/features/store/data/schema.server.ts | packages/db/src/index.ts | import | yes | yes | outward | present |
| E125 | apps/platform/src/features/store/email/create-store-delivery-service.server.ts | apps/platform/src/features/store/email/email-store-delivery-service.server.ts | import | no | no | lateral | present |
| E126 | apps/platform/src/features/store/email/create-store-delivery-service.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E127 | apps/platform/src/features/store/email/create-store-delivery-service.server.ts | packages/domain/src/store/index.ts | import | yes | no | lateral | present |
| E128 | apps/platform/src/features/store/email/email-store-delivery-service.server.ts | apps/platform/src/features/store/contracts/paths.ts | import | no | no | lateral | present |
| E129 | apps/platform/src/features/store/email/email-store-delivery-service.server.ts | apps/platform/src/features/store/email/store-delivery-email.server.ts | import | no | no | lateral | present |
| E130 | apps/platform/src/features/store/email/email-store-delivery-service.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E131 | apps/platform/src/features/store/email/email-store-delivery-service.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E132 | apps/platform/src/features/store/email/email-store-delivery-service.server.ts | packages/domain/src/store/index.ts | import | yes | no | lateral | present |
| E133 | apps/platform/src/features/store/email/store-delivery-email-template.server.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E134 | apps/platform/src/features/store/email/store-delivery-email-template.server.tsx | packages/infrastructure/src/email/index.server.ts | import | yes | yes | inward | present |
| E135 | apps/platform/src/features/store/email/store-delivery-email.server.ts | apps/platform/src/features/store/email/store-delivery-email-template.server.tsx | import | no | yes | outward | present |
| E136 | apps/platform/src/features/store/email/store-delivery-email.server.ts | external:react-dom/server (framework) | import | n/a | yes | outward | present |
| E137 | apps/platform/src/features/store/email/store-delivery-email.server.ts | external:react (framework) | import | n/a | yes | outward | present |
| E138 | apps/platform/src/features/store/routes.ts | apps/platform/src/features/store/contracts/paths.ts | import | no | yes | inward | present |
| E139 | apps/platform/src/features/store/server/guards/store-context.server.ts | apps/platform/src/features/store/server/store-composition.server.ts | import | no | yes | outward | present |
| E140 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | import | no | yes | inward | present |
| E141 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/api/catalog/catalog-controller.server.ts | import | no | yes | inward | present |
| E142 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/api/covers/covers-controller.server.ts | import | no | yes | inward | present |
| E143 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | import | no | yes | inward | present |
| E144 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/api/management/management-controller.server.ts | import | no | yes | inward | present |
| E145 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/api/downloads/zip-stream.server.ts | import | no | yes | inward | present |
| E146 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/data/acquisitions/acquisition-repository.server.ts | import | no | yes | inward | present |
| E147 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/data/assets/asset-digest.server.ts | import | no | yes | inward | present |
| E148 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/data/assets/asset-store.server.ts | import | no | yes | inward | present |
| E149 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/data/catalog/catalog-repository.server.ts | import | no | yes | inward | present |
| E150 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/data/download-grants/download-grant-repository.server.ts | import | no | yes | inward | present |
| E151 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/data/download-grants/download-token.server.ts | import | no | yes | inward | present |
| E152 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/data/publications/publication-repository.server.ts | import | no | yes | inward | present |
| E153 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/email/create-store-delivery-service.server.ts | import | no | yes | inward | present |
| E154 | apps/platform/src/features/store/server/store-composition.server.ts | packages/content/src/index.ts | import | yes | yes | inward | present |
| E155 | apps/platform/src/features/store/server/store-composition.server.ts | packages/db/src/index.ts | import | yes | yes | inward | present |
| E156 | apps/platform/src/features/store/server/store-composition.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E157 | apps/platform/src/features/store/server/store-composition.server.ts | packages/domain/src/store/index.ts | import | yes | yes | inward | present |
| E158 | apps/platform/src/features/store/server/store-composition.server.ts | packages/infrastructure/src/management-auth/index.server.ts | import | yes | yes | inward | present |
| E159 | apps/platform/src/features/store/ui/public/acquisition/acquisition-flow.ts | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E160 | apps/platform/src/features/store/ui/public/acquisition/acquisition-form.ts | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E161 | apps/platform/src/features/store/ui/public/acquisition/acquisition-form.ts | apps/platform/src/features/store/ui/public/acquisition/acquisition-flow.ts | import | no | no | lateral | present |
| E162 | apps/platform/src/features/store/ui/public/acquisition/acquisition-form.ts | apps/platform/src/features/store/ui/public/api-client.ts | import | no | no | lateral | present |
| E163 | apps/platform/src/features/store/ui/public/acquisition/acquisition-form.ts | apps/platform/src/features/store/ui/public/cart/cart.ts | import | no | no | lateral | present |
| E164 | apps/platform/src/features/store/ui/public/acquisition/acquisition-form.ts | external:react (framework) | import | n/a | yes | outward | present |
| E165 | apps/platform/src/features/store/ui/public/acquisition/acquisition-form.ts | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | outward | present |
| E166 | apps/platform/src/features/store/ui/public/api-client.ts | apps/platform/src/features/store/contracts/paths.ts | import | no | no | lateral | present |
| E167 | apps/platform/src/features/store/ui/public/api-client.ts | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E168 | apps/platform/src/features/store/ui/public/api-client.ts | external:react (framework) | import | n/a | yes | outward | present |
| E169 | apps/platform/src/features/store/ui/public/api-client.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E170 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | apps/platform/src/features/store/contracts/store.ts | import | no | yes | inward | present |
| E171 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | apps/platform/src/features/store/ui/public/acquisition/acquisition-form.ts | import | no | yes | inward | present |
| E172 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | apps/platform/src/features/store/ui/public/api-client.ts | import | no | yes | inward | present |
| E173 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | apps/platform/src/features/store/ui/public/cart/cart-provider.tsx | import | no | no | lateral | present |
| E174 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | apps/platform/src/features/store/ui/public/cart/cart.ts | import | no | yes | inward | present |
| E175 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E176 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E177 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | packages/content/src/index.ts | import | yes | yes | inward | present |
| E178 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | packages/infrastructure/src/bot-detection/index.ts | import | yes | no | lateral | present |
| E179 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | packages/ui/src/overlays/index.ts | import | yes | no | lateral | present |
| E180 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E181 | apps/platform/src/features/store/ui/public/cart/cart-provider.tsx | apps/platform/src/features/store/ui/public/cart/cart.ts | import | no | yes | inward | present |
| E182 | apps/platform/src/features/store/ui/public/cart/cart-provider.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E183 | apps/platform/src/features/store/ui/public/cart/cart-provider.tsx | external:zustand (framework) | import | n/a | yes | outward | present |
| E184 | apps/platform/src/features/store/ui/public/cart/cart-storage.ts | external:zustand/middleware (framework) | import | n/a | yes | outward | present |
| E185 | apps/platform/src/features/store/ui/public/cart/cart.ts | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E186 | apps/platform/src/features/store/ui/public/cart/cart.ts | apps/platform/src/features/store/ui/public/cart/cart-focus.ts | import | no | no | lateral | present |
| E187 | apps/platform/src/features/store/ui/public/cart/cart.ts | apps/platform/src/features/store/ui/public/cart/cart-storage.ts | import | no | no | lateral | present |
| E188 | apps/platform/src/features/store/ui/public/cart/cart.ts | apps/platform/src/features/store/ui/public/cart/cart-storage.ts | import | no | no | lateral | present |
| E189 | apps/platform/src/features/store/ui/public/cart/cart.ts | external:react (framework) | import | n/a | yes | outward | present |
| E190 | apps/platform/src/features/store/ui/public/cart/cart.ts | external:zustand/middleware (framework) | import | n/a | yes | outward | present |
| E191 | apps/platform/src/features/store/ui/public/cart/cart.ts | external:zustand/vanilla (framework) | import | n/a | yes | outward | present |
| E192 | apps/platform/src/features/store/ui/public/cart/cart.ts | packages/domain/src/store/index.ts | import | yes | no | lateral | present |
| E193 | apps/platform/src/features/store/ui/public/catalog/catalog-filter-controls.tsx | apps/platform/src/features/store/ui/public/catalog/catalog-filters.ts | import | no | yes | inward | present |
| E194 | apps/platform/src/features/store/ui/public/catalog/catalog-filter-controls.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E195 | apps/platform/src/features/store/ui/public/catalog/catalog-filter-controls.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E196 | apps/platform/src/features/store/ui/public/catalog/catalog-filter-controls.tsx | packages/ui/src/filters/index.ts | import | yes | no | lateral | present |
| E197 | apps/platform/src/features/store/ui/public/catalog/catalog-filters.ts | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E198 | apps/platform/src/features/store/ui/public/catalog/catalog-filters.ts | packages/ui/src/filters/index.ts | import | yes | yes | outward | present |
| E199 | apps/platform/src/features/store/ui/public/catalog/catalog-page.server.ts | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E200 | apps/platform/src/features/store/ui/public/catalog/catalog-page.server.ts | apps/platform/src/features/store/server/guards/store-context.server.ts | import | no | yes | outward | present |
| E201 | apps/platform/src/features/store/ui/public/catalog/catalog-page.server.ts | apps/platform/src/features/store/ui/public/catalog/catalog-filters.ts | import | no | no | lateral | present |
| E202 | apps/platform/src/features/store/ui/public/catalog/catalog-page.tsx | apps/platform/src/features/store/ui/public/catalog/catalog-filters.ts | import | no | yes | inward | present |
| E203 | apps/platform/src/features/store/ui/public/catalog/catalog-page.tsx | apps/platform/src/features/store/ui/public/catalog/catalog-page.server.ts | import | no | yes | inward | present |
| E204 | apps/platform/src/features/store/ui/public/catalog/catalog-page.tsx | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | import | no | no | lateral | present |
| E205 | apps/platform/src/features/store/ui/public/catalog/catalog-presenter.ts | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E206 | apps/platform/src/features/store/ui/public/catalog/catalog-presenter.ts | apps/platform/src/features/store/ui/public/catalog/catalog-filters.ts | import | no | no | lateral | present |
| E207 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | apps/platform/src/features/store/contracts/paths.ts | import | no | yes | inward | present |
| E208 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | apps/platform/src/features/store/contracts/store.ts | import | no | yes | inward | present |
| E209 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | apps/platform/src/features/store/ui/public/cart/cart-provider.tsx | import | no | no | lateral | present |
| E210 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | apps/platform/src/features/store/ui/public/cart/cart.ts | import | no | yes | inward | present |
| E211 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | apps/platform/src/features/store/ui/public/catalog/catalog-filter-controls.tsx | import | no | no | lateral | present |
| E212 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | apps/platform/src/features/store/ui/public/catalog/catalog-filters.ts | import | no | yes | inward | present |
| E213 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | apps/platform/src/features/store/ui/public/catalog/catalog-presenter.ts | import | no | yes | inward | present |
| E214 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E215 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E216 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E217 | apps/platform/src/features/store/ui/public/download/download-page.tsx | apps/platform/src/features/store/contracts/paths.ts | import | no | yes | inward | present |
| E218 | apps/platform/src/features/store/ui/public/download/download-page.tsx | apps/platform/src/features/store/ui/public/download/download-state.ts | import | no | yes | inward | present |
| E219 | apps/platform/src/features/store/ui/public/download/download-page.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E220 | apps/platform/src/features/store/ui/public/download/download-page.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E221 | apps/platform/src/features/store/ui/public/download/download-state.ts | apps/platform/src/features/store/contracts/paths.ts | import | no | no | lateral | present |
| E222 | apps/platform/src/features/store/ui/public/download/download-state.ts | external:react (framework) | import | n/a | yes | outward | present |
| E223 | apps/platform/src/features/store/ui/public/download/download-state.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E224 | apps/platform/src/features/store/ui/public/product/product-page.server.ts | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E225 | apps/platform/src/features/store/ui/public/product/product-page.server.ts | apps/platform/src/features/store/server/guards/store-context.server.ts | import | no | yes | outward | present |
| E226 | apps/platform/src/features/store/ui/public/product/product-page.tsx | apps/platform/src/features/store/contracts/paths.ts | import | no | yes | inward | present |
| E227 | apps/platform/src/features/store/ui/public/product/product-page.tsx | apps/platform/src/features/store/ui/public/cart/cart-provider.tsx | import | no | no | lateral | present |
| E228 | apps/platform/src/features/store/ui/public/product/product-page.tsx | apps/platform/src/features/store/ui/public/product/product-page.server.ts | import | no | yes | inward | present |
| E229 | apps/platform/src/features/store/ui/public/product/product-page.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E230 | apps/platform/src/features/store/ui/public/product/product-page.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E231 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | apps/platform/src/features/waitlist/contracts/waitlist.ts | import | no | no | lateral | present |
| E232 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | external:crypto (vendor) | import | n/a | yes | outward | present |
| E233 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E234 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | packages/domain/src/waitlist/index.ts | import | yes | no | lateral | present |
| E235 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | packages/infrastructure/src/bot-detection/index.server.ts | import | yes | no | lateral | present |
| E236 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | outward | present |
| E237 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E238 | apps/platform/src/features/waitlist/api/waitlist.ts | apps/platform/src/features/waitlist/server/guards/waitlist-context.server.ts | import | no | no | lateral | present |
| E239 | apps/platform/src/features/waitlist/api/waitlist.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E240 | apps/platform/src/features/waitlist/contracts/waitlist.ts | external:zod (framework) | import | n/a | yes | outward | present |
| E241 | apps/platform/src/features/waitlist/data/repository.server.ts | apps/platform/src/features/waitlist/data/schema.server.ts | import | no | no | lateral | present |
| E242 | apps/platform/src/features/waitlist/data/repository.server.ts | external:pg (vendor) | import | n/a | yes | outward | present |
| E243 | apps/platform/src/features/waitlist/data/repository.server.ts | packages/db/src/index.ts | import | yes | yes | outward | present |
| E244 | apps/platform/src/features/waitlist/data/repository.server.ts | packages/domain/src/waitlist/index.ts | import | yes | no | lateral | present |
| E245 | apps/platform/src/features/waitlist/data/schema.server.ts | packages/db/src/index.ts | import | yes | yes | outward | present |
| E246 | apps/platform/src/features/waitlist/email/create-waitlist-confirmation-service.server.ts | apps/platform/src/features/waitlist/email/email-waitlist-confirmation-service.server.ts | import | no | no | lateral | present |
| E247 | apps/platform/src/features/waitlist/email/create-waitlist-confirmation-service.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E248 | apps/platform/src/features/waitlist/email/create-waitlist-confirmation-service.server.ts | packages/domain/src/waitlist/index.ts | import | yes | no | lateral | present |
| E249 | apps/platform/src/features/waitlist/email/email-waitlist-confirmation-service.server.ts | apps/platform/src/features/waitlist/email/waitlist-confirmation-email.server.ts | import | no | no | lateral | present |
| E250 | apps/platform/src/features/waitlist/email/email-waitlist-confirmation-service.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E251 | apps/platform/src/features/waitlist/email/email-waitlist-confirmation-service.server.ts | packages/domain/src/waitlist/index.ts | import | yes | no | lateral | present |
| E252 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email-template.server.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E253 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email-template.server.tsx | packages/infrastructure/src/email/index.server.ts | import | yes | yes | inward | present |
| E254 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email.server.ts | apps/platform/src/features/waitlist/email/waitlist-confirmation-email-template.server.tsx | import | no | yes | outward | present |
| E255 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email.server.ts | external:react-dom/server (framework) | import | n/a | yes | outward | present |
| E256 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email.server.ts | external:react (framework) | import | n/a | yes | outward | present |
| E257 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email.server.ts | packages/domain/src/waitlist/index.ts | import | yes | no | lateral | present |
| E258 | apps/platform/src/features/waitlist/routes.ts | apps/platform/src/features/waitlist/contracts/paths.ts | import | no | yes | inward | present |
| E259 | apps/platform/src/features/waitlist/server/guards/waitlist-context.server.ts | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | import | no | yes | outward | present |
| E260 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | import | no | yes | inward | present |
| E261 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | apps/platform/src/features/waitlist/data/repository.server.ts | import | no | yes | inward | present |
| E262 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | apps/platform/src/features/waitlist/email/create-waitlist-confirmation-service.server.ts | import | no | yes | inward | present |
| E263 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | packages/config/src/index.ts | import | yes | yes | inward | present |
| E264 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | packages/content/src/index.ts | import | yes | yes | inward | present |
| E265 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | packages/db/src/index.ts | import | yes | yes | inward | present |
| E266 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E267 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | packages/domain/src/waitlist/index.ts | import | yes | yes | inward | present |
| E268 | apps/platform/src/features/waitlist/ui/public/api-client.ts | apps/platform/src/features/waitlist/contracts/paths.ts | import | no | no | lateral | present |
| E269 | apps/platform/src/features/waitlist/ui/public/api-client.ts | apps/platform/src/features/waitlist/contracts/waitlist.ts | import | no | no | lateral | present |
| E270 | apps/platform/src/features/waitlist/ui/public/api-client.ts | apps/platform/src/features/waitlist/ui/public/errors.ts | import | no | no | lateral | present |
| E271 | apps/platform/src/features/waitlist/ui/public/api-client.ts | external:react (framework) | import | n/a | yes | outward | present |
| E272 | apps/platform/src/features/waitlist/ui/public/api-client.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E273 | apps/platform/src/features/waitlist/ui/public/availability-status.tsx | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | import | no | yes | inward | present |
| E274 | apps/platform/src/features/waitlist/ui/public/availability-status.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E275 | apps/platform/src/features/waitlist/ui/public/confetti.ts | external:canvas-confetti (vendor) | import | n/a | yes | outward | present |
| E276 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | apps/platform/src/features/waitlist/ui/public/api-client.ts | import | no | yes | inward | present |
| E277 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | apps/platform/src/features/waitlist/ui/public/errors.ts | import | no | yes | inward | present |
| E278 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | apps/platform/src/features/waitlist/ui/public/submission.ts | import | no | yes | inward | present |
| E279 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | import | no | yes | inward | present |
| E280 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E281 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E282 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E283 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | packages/content/src/index.ts | import | yes | yes | inward | present |
| E284 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | packages/infrastructure/src/bot-detection/index.ts | import | yes | no | lateral | present |
| E285 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E286 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E287 | apps/platform/src/features/waitlist/ui/public/errors.ts | apps/platform/src/features/waitlist/contracts/waitlist.ts | import | no | no | lateral | present |
| E288 | apps/platform/src/features/waitlist/ui/public/submission-flow.ts | apps/platform/src/features/waitlist/contracts/waitlist.ts | import | no | no | lateral | present |
| E289 | apps/platform/src/features/waitlist/ui/public/submission-flow.ts | apps/platform/src/features/waitlist/ui/public/errors.ts | import | no | no | lateral | present |
| E290 | apps/platform/src/features/waitlist/ui/public/submission.ts | apps/platform/src/features/waitlist/ui/public/api-client.ts | import | no | no | lateral | present |
| E291 | apps/platform/src/features/waitlist/ui/public/submission.ts | apps/platform/src/features/waitlist/ui/public/confetti.ts | import | no | no | lateral | present |
| E292 | apps/platform/src/features/waitlist/ui/public/submission.ts | apps/platform/src/features/waitlist/ui/public/submission-flow.ts | import | no | no | lateral | present |
| E293 | apps/platform/src/features/waitlist/ui/public/submission.ts | external:react (framework) | import | n/a | yes | outward | present |
| E294 | apps/platform/src/features/waitlist/ui/public/submission.ts | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | outward | present |
| E295 | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | packages/domain/src/coaching-bundles/index.ts | import | yes | no | lateral | present |
| E296 | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | packages/domain/src/waitlist/index.ts | import | yes | no | lateral | present |
| E297 | apps/platform/src/root-error-page.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E298 | apps/platform/src/root-error-page.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E299 | apps/platform/src/root.server.ts | apps/platform/src/features/accounts/server/account-resolution-middleware.server.ts | import | yes | yes | inward | present |
| E300 | apps/platform/src/root.server.ts | apps/platform/src/server/container.server.ts | import | yes | no | lateral | present |
| E301 | apps/platform/src/root.server.ts | apps/platform/src/server/feature-contexts.server.ts | import | yes | no | lateral | present |
| E302 | apps/platform/src/root.tsx | apps/platform/src/app.css | import | no | no | lateral | present |
| E303 | apps/platform/src/root.tsx | apps/platform/src/features/accounts/ui/shared/access-denied-page.tsx | import | yes | no | lateral | present |
| E304 | apps/platform/src/root.tsx | apps/platform/src/root-error-page.tsx | import | no | no | lateral | present |
| E305 | apps/platform/src/root.tsx | apps/platform/src/root.server.ts | import | no | yes | outward | present |
| E306 | apps/platform/src/root.tsx | apps/platform/src/root.server.ts | import | no | yes | outward | present |
| E307 | apps/platform/src/root.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E308 | apps/platform/src/root.tsx | packages/config/src/index.ts | import | yes | no | lateral | present |
| E309 | apps/platform/src/routes.ts | apps/platform/src/features/accounts/routes.ts | import | yes | no | lateral | present |
| E310 | apps/platform/src/routes.ts | apps/platform/src/features/store/routes.ts | import | yes | no | lateral | present |
| E311 | apps/platform/src/routes.ts | apps/platform/src/features/waitlist/routes.ts | import | yes | no | lateral | present |
| E312 | apps/platform/src/routes.ts | apps/platform/src/server/api/routes.ts | import | yes | no | lateral | present |
| E313 | apps/platform/src/routes.ts | apps/platform/src/surfaces/client-portal/routes.ts | import | yes | no | lateral | present |
| E314 | apps/platform/src/routes.ts | apps/platform/src/surfaces/coach-portal/routes.ts | import | yes | no | lateral | present |
| E315 | apps/platform/src/routes.ts | apps/platform/src/surfaces/public-site/routes.ts | import | yes | no | lateral | present |
| E316 | apps/platform/src/server/api/meta/app-metadata-controller.server.ts | apps/platform/src/server/api/meta/service-metadata.ts | import | no | no | lateral | present |
| E317 | apps/platform/src/server/api/feature-flags/feature-flags-contract.ts | external:zod (framework) | import | n/a | yes | outward | present |
| E318 | apps/platform/src/server/api/feature-flags/feature-flags-controller.server.ts | apps/platform/src/server/api/feature-flags/feature-flags-contract.ts | import | no | no | lateral | present |
| E319 | apps/platform/src/server/api/feature-flags/feature-flags-controller.server.ts | packages/domain/src/feature-flags/index.ts | import | yes | no | lateral | present |
| E320 | apps/platform/src/server/api/feature-flags/feature-flags.ts | apps/platform/src/server/guards/platform-context.server.ts | import | no | no | lateral | present |
| E321 | apps/platform/src/server/api/feature-flags/feature-flags.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E322 | apps/platform/src/server/api/meta/meta.ts | apps/platform/src/server/guards/platform-context.server.ts | import | no | no | lateral | present |
| E323 | apps/platform/src/server/api/meta/meta.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E324 | apps/platform/src/server/api/readyz/readyz-controller.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E325 | apps/platform/src/server/api/readyz/readyz-controller.server.ts | packages/config/src/runtime.ts | import | yes | yes | outward | present |
| E326 | apps/platform/src/server/api/readyz/readyz.ts | apps/platform/src/server/guards/platform-context.server.ts | import | no | no | lateral | present |
| E327 | apps/platform/src/server/api/readyz/readyz.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E328 | apps/platform/src/server/api/meta/service-metadata.ts | external:zod (framework) | import | n/a | yes | outward | present |
| E329 | apps/platform/src/server/container.server.ts | apps/platform/src/features/accounts/server/accounts-composition.server.ts | import | yes | no | lateral | present |
| E330 | apps/platform/src/server/container.server.ts | apps/platform/src/features/store/server/store-composition.server.ts | import | yes | no | lateral | present |
| E331 | apps/platform/src/server/container.server.ts | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | import | yes | no | lateral | present |
| E332 | apps/platform/src/server/container.server.ts | apps/platform/src/server/database.server.ts | import | no | yes | inward | present |
| E333 | apps/platform/src/server/container.server.ts | apps/platform/src/server/logger.server.ts | import | no | yes | inward | present |
| E334 | apps/platform/src/server/container.server.ts | apps/platform/src/server/platform-composition.server.ts | import | no | no | lateral | present |
| E335 | apps/platform/src/server/container.server.ts | apps/platform/src/server/runtime-environment.server.ts | import | no | yes | inward | present |
| E336 | apps/platform/src/server/container.server.ts | packages/config/src/index.ts | import | yes | yes | inward | present |
| E337 | apps/platform/src/server/container.server.ts | packages/content/src/index.ts | import | yes | yes | inward | present |
| E338 | apps/platform/src/server/container.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E339 | apps/platform/src/server/container.server.ts | packages/infrastructure/src/bot-detection/index.server.ts | import | yes | yes | inward | present |
| E340 | apps/platform/src/server/container.server.ts | packages/infrastructure/src/email/index.server.ts | import | yes | yes | inward | present |
| E341 | apps/platform/src/server/container.server.ts | packages/infrastructure/src/management-auth/index.server.ts | import | yes | yes | inward | present |
| E342 | apps/platform/src/server/database.server.ts | external:pg (vendor) | import | n/a | yes | outward | present |
| E343 | apps/platform/src/server/database.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E344 | apps/platform/src/server/database.server.ts | packages/config/src/runtime.ts | import | yes | yes | outward | present |
| E345 | apps/platform/src/server/database.server.ts | packages/db/src/index.ts | import | yes | yes | outward | present |
| E346 | apps/platform/src/server/feature-contexts.server.ts | apps/platform/src/features/accounts/server/guards/accounts-context.server.ts | import | yes | yes | inward | present |
| E347 | apps/platform/src/server/feature-contexts.server.ts | apps/platform/src/features/store/server/guards/store-context.server.ts | import | yes | yes | inward | present |
| E348 | apps/platform/src/server/feature-contexts.server.ts | apps/platform/src/features/waitlist/server/guards/waitlist-context.server.ts | import | yes | yes | inward | present |
| E349 | apps/platform/src/server/feature-contexts.server.ts | apps/platform/src/server/container.server.ts | import | no | no | lateral | present |
| E350 | apps/platform/src/server/feature-contexts.server.ts | apps/platform/src/server/guards/platform-context.server.ts | import | no | yes | inward | present |
| E351 | apps/platform/src/server/feature-contexts.server.ts | apps/platform/src/server/guards/runtime-config-context.server.ts | import | no | yes | inward | present |
| E352 | apps/platform/src/server/guards/platform-context.server.ts | apps/platform/src/server/platform-composition.server.ts | import | no | yes | outward | present |
| E353 | apps/platform/src/server/guards/runtime-config-context.server.ts | apps/platform/src/server/platform-composition.server.ts | import | no | yes | outward | present |
| E354 | apps/platform/src/server/logger.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E355 | apps/platform/src/server/platform-composition.server.ts | apps/platform/src/server/api/meta/app-metadata-controller.server.ts | import | no | yes | inward | present |
| E356 | apps/platform/src/server/platform-composition.server.ts | apps/platform/src/server/api/feature-flags/feature-flags-controller.server.ts | import | no | yes | inward | present |
| E357 | apps/platform/src/server/platform-composition.server.ts | apps/platform/src/server/api/readyz/readyz-controller.server.ts | import | no | yes | inward | present |
| E358 | apps/platform/src/server/platform-composition.server.ts | packages/config/src/index.ts | import | yes | yes | inward | present |
| E359 | apps/platform/src/server/platform-composition.server.ts | packages/db/src/index.ts | import | yes | yes | inward | present |
| E360 | apps/platform/src/server/platform-composition.server.ts | packages/domain/src/feature-flags/index.ts | import | yes | yes | inward | present |
| E361 | apps/platform/src/server/platform-composition.server.ts | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | inward | present |
| E362 | apps/platform/src/server/platform-composition.server.ts | packages/infrastructure/src/feature-flags/index.server.ts | import | yes | yes | inward | present |
| E363 | apps/platform/src/server/runtime-environment.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E364 | apps/platform/src/server/runtime-environment.server.ts | packages/config/src/runtime.ts | import | yes | yes | outward | present |
| E365 | apps/platform/src/surfaces/client-portal/api/manifest.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | yes | inward | present |
| E366 | apps/platform/src/surfaces/client-portal/api/manifest.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E367 | apps/platform/src/surfaces/client-portal/api/manifest.ts | packages/infrastructure/src/pwa/index.ts | import | yes | no | lateral | present |
| E368 | apps/platform/src/surfaces/client-portal/api/sw.ts | apps/platform/src/surfaces/client-portal/api/service-worker.js | import | no | yes | inward | present |
| E369 | apps/platform/src/surfaces/client-portal/pages/home.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E370 | apps/platform/src/surfaces/client-portal/routes.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | yes | inward | present |
| E371 | apps/platform/src/surfaces/client-portal/shell/layout.server.ts | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | import | yes | yes | inward | present |
| E372 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | apps/platform/src/surfaces/client-portal/shell/layout.server.ts | import | no | no | lateral | present |
| E373 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | apps/platform/src/surfaces/client-portal/shell/navigation-links.ts | import | no | no | lateral | present |
| E374 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | packages/infrastructure/src/pwa/index.ts | import | yes | no | lateral | present |
| E375 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E376 | apps/platform/src/surfaces/client-portal/shell/navigation-links.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | yes | inward | present |
| E377 | apps/platform/src/surfaces/coach-portal/pages/home.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E378 | apps/platform/src/surfaces/coach-portal/routes.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | yes | inward | present |
| E379 | apps/platform/src/surfaces/coach-portal/shell/layout.server.ts | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | import | yes | yes | inward | present |
| E380 | apps/platform/src/surfaces/coach-portal/shell/layout.tsx | apps/platform/src/surfaces/coach-portal/shell/layout.server.ts | import | no | no | lateral | present |
| E381 | apps/platform/src/surfaces/coach-portal/shell/layout.tsx | apps/platform/src/surfaces/coach-portal/shell/navigation-links.tsx | import | no | no | lateral | present |
| E382 | apps/platform/src/surfaces/coach-portal/shell/layout.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E383 | apps/platform/src/surfaces/coach-portal/shell/layout.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E384 | apps/platform/src/surfaces/coach-portal/shell/navigation-links.tsx | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | yes | inward | present |
| E385 | apps/platform/src/surfaces/coach-portal/shell/navigation-links.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E386 | apps/platform/src/surfaces/coach-portal/shell/navigation-links.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E387 | apps/platform/src/surfaces/public-site/pages/blog.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E388 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/sections/about/about.tsx | import | no | no | lateral | present |
| E389 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | import | no | no | lateral | present |
| E390 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | import | no | no | lateral | present |
| E391 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/sections/my-method/my-method.tsx | import | no | no | lateral | present |
| E392 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | import | no | no | lateral | present |
| E393 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/sections/workouts/workouts.tsx | import | no | no | lateral | present |
| E394 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/shell/layout.tsx | import | no | no | lateral | present |
| E395 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/features/coaching-bundles/ui/public/bundle-selector.tsx | import | yes | no | lateral | present |
| E396 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/features/coaching-bundles/ui/shared/coaching-bundles-presentation.ts | import | yes | yes | inward | present |
| E397 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/features/waitlist/ui/public/availability-status.tsx | import | yes | no | lateral | present |
| E398 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/features/waitlist/ui/public/email-form.tsx | import | yes | no | lateral | present |
| E399 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/surfaces/public-site/shell/layout.tsx | import | no | no | lateral | present |
| E400 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E401 | apps/platform/src/surfaces/public-site/pages/privacy.tsx | apps/platform/src/surfaces/public-site/sections/legal/legal-document-view.tsx | import | no | no | lateral | present |
| E402 | apps/platform/src/surfaces/public-site/pages/privacy.tsx | packages/content/src/index.ts | import | yes | yes | inward | present |
| E403 | apps/platform/src/surfaces/public-site/pages/terms.tsx | apps/platform/src/surfaces/public-site/sections/legal/legal-document-view.tsx | import | no | no | lateral | present |
| E404 | apps/platform/src/surfaces/public-site/pages/terms.tsx | packages/content/src/index.ts | import | yes | yes | inward | present |
| E405 | apps/platform/src/surfaces/public-site/routes.ts | apps/platform/src/features/accounts/routes.ts | import | yes | no | lateral | present |
| E406 | apps/platform/src/surfaces/public-site/routes.ts | apps/platform/src/features/store/routes.ts | import | yes | no | lateral | present |
| E407 | apps/platform/src/surfaces/public-site/routes.ts | apps/platform/src/surfaces/public-site/paths.ts | import | no | yes | inward | present |
| E408 | apps/platform/src/surfaces/public-site/sections/about/about-content.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E409 | apps/platform/src/surfaces/public-site/sections/about/about.tsx | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | import | yes | yes | inward | present |
| E410 | apps/platform/src/surfaces/public-site/sections/about/about.tsx | apps/platform/src/surfaces/public-site/paths.ts | import | no | yes | inward | present |
| E411 | apps/platform/src/surfaces/public-site/sections/about/about.tsx | apps/platform/src/surfaces/public-site/sections/about/about-content.ts | import | no | no | lateral | present |
| E412 | apps/platform/src/surfaces/public-site/sections/about/about.tsx | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | import | no | no | lateral | present |
| E413 | apps/platform/src/surfaces/public-site/sections/about/about.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E414 | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | apps/platform/src/surfaces/public-site/sections/about/about-content.ts | import | no | no | lateral | present |
| E415 | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E416 | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E417 | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E418 | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E419 | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E420 | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition-content.ts | import | no | no | lateral | present |
| E421 | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.css | import | no | no | lateral | present |
| E422 | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E423 | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E424 | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E425 | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E426 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | apps/platform/src/features/store/contracts/paths.ts | import | yes | yes | inward | present |
| E427 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | apps/platform/src/features/waitlist/ui/public/availability-status.tsx | import | yes | no | lateral | present |
| E428 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | apps/platform/src/features/waitlist/ui/public/email-form.tsx | import | yes | no | lateral | present |
| E429 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | import | yes | yes | inward | present |
| E430 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | apps/platform/src/surfaces/public-site/paths.ts | import | no | yes | inward | present |
| E431 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | apps/platform/src/surfaces/public-site/sections/legal/legal-nav.tsx | import | no | no | lateral | present |
| E432 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E433 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | packages/infrastructure/src/bot-detection/index.ts | import | yes | no | lateral | present |
| E434 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E435 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E436 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | apps/platform/src/features/waitlist/ui/public/availability-status.tsx | import | yes | no | lateral | present |
| E437 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | apps/platform/src/features/waitlist/ui/public/email-form.tsx | import | yes | no | lateral | present |
| E438 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | import | yes | yes | inward | present |
| E439 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | apps/platform/src/surfaces/public-site/paths.ts | import | no | yes | inward | present |
| E440 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E441 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E442 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E443 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | packages/config/src/index.ts | import | yes | no | lateral | present |
| E444 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | packages/infrastructure/src/bot-detection/index.ts | import | yes | no | lateral | present |
| E445 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E446 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E447 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E448 | apps/platform/src/surfaces/public-site/sections/legal/legal-document-view.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E449 | apps/platform/src/surfaces/public-site/sections/legal/legal-document-view.tsx | packages/content/src/index.ts | import | yes | yes | inward | present |
| E450 | apps/platform/src/surfaces/public-site/sections/legal/legal-document-view.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E451 | apps/platform/src/surfaces/public-site/sections/legal/legal-nav.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E452 | apps/platform/src/surfaces/public-site/sections/legal/legal-nav.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E453 | apps/platform/src/surfaces/public-site/sections/my-method/my-method.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E454 | apps/platform/src/surfaces/public-site/sections/my-method/my-method.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E455 | apps/platform/src/surfaces/public-site/sections/my-method/my-method.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E456 | apps/platform/src/surfaces/public-site/sections/my-method/my-method.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E457 | apps/platform/src/surfaces/public-site/sections/platform/platform-content.ts | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E458 | apps/platform/src/surfaces/public-site/sections/platform/platform-content.ts | external:react (framework) | import | n/a | yes | outward | present |
| E459 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | apps/platform/src/surfaces/public-site/sections/platform/platform-content.ts | import | no | no | lateral | present |
| E460 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E461 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E462 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E463 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E464 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E465 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E466 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E467 | apps/platform/src/surfaces/public-site/sections/workouts/workouts.tsx | apps/platform/src/surfaces/public-site/sections/workouts/swipe-intent.ts | import | no | no | lateral | present |
| E468 | apps/platform/src/surfaces/public-site/sections/workouts/workouts.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E469 | apps/platform/src/surfaces/public-site/sections/workouts/workouts.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E470 | apps/platform/src/surfaces/public-site/sections/workouts/workouts.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E471 | apps/platform/src/surfaces/public-site/sections/workouts/workouts.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E472 | apps/platform/src/surfaces/public-site/sections/workouts/workouts.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E473 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/features/accounts/contracts/account.ts | import | yes | yes | inward | present |
| E474 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/features/accounts/server/guards/session-context.server.ts | import | yes | no | lateral | present |
| E475 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/features/store/contracts/paths.ts | import | yes | yes | inward | present |
| E476 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/features/waitlist/server/guards/waitlist-context.server.ts | import | yes | no | lateral | present |
| E477 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | import | yes | yes | inward | present |
| E478 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/server/guards/runtime-config-context.server.ts | import | yes | no | lateral | present |
| E479 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E480 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | packages/infrastructure/src/bot-detection/index.ts | import | yes | no | lateral | present |
| E481 | apps/platform/src/surfaces/public-site/shell/layout.tsx | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | import | yes | no | lateral | present |
| E482 | apps/platform/src/surfaces/public-site/shell/layout.tsx | apps/platform/src/features/store/ui/public/cart/cart-provider.tsx | import | yes | no | lateral | present |
| E483 | apps/platform/src/surfaces/public-site/shell/layout.tsx | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | import | yes | yes | inward | present |
| E484 | apps/platform/src/surfaces/public-site/shell/layout.tsx | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | import | no | no | lateral | present |
| E485 | apps/platform/src/surfaces/public-site/shell/layout.tsx | apps/platform/src/surfaces/public-site/shell/layout.server.ts | import | no | no | lateral | present |
| E486 | apps/platform/src/surfaces/public-site/shell/layout.tsx | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | import | no | no | lateral | present |
| E487 | apps/platform/src/surfaces/public-site/shell/layout.tsx | packages/infrastructure/src/bot-detection/index.ts | import | yes | no | lateral | present |
| E488 | apps/platform/src/surfaces/public-site/shell/logo.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E489 | apps/platform/src/surfaces/public-site/shell/public-footer.tsx | apps/platform/src/surfaces/public-site/sections/legal/legal-nav.tsx | import | no | no | lateral | present |
| E490 | apps/platform/src/surfaces/public-site/shell/public-footer.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E491 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/features/accounts/contracts/account.ts | import | yes | yes | inward | present |
| E492 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | import | yes | no | lateral | present |
| E493 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/features/store/contracts/paths.ts | import | yes | yes | inward | present |
| E494 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | import | yes | yes | inward | present |
| E495 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/surfaces/public-site/paths.ts | import | no | yes | inward | present |
| E496 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/surfaces/public-site/shell/public-footer.tsx | import | no | no | lateral | present |
| E497 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | import | no | no | lateral | present |
| E498 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E499 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E500 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | apps/platform/src/surfaces/public-site/shell/logo.tsx | import | no | no | lateral | present |
| E501 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E502 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E503 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E504 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E505 | packages/config/src/concerns/app.ts | external:zod (framework) | import | n/a | yes | outward | present |
| E506 | packages/config/src/concerns/bot-detection.ts | external:zod (framework) | import | n/a | yes | outward | present |
| E507 | packages/config/src/concerns/bot-detection.ts | packages/config/src/concerns/app.ts | import | no | no | lateral | present |
| E508 | packages/config/src/concerns/clerk.ts | external:zod (framework) | import | n/a | yes | outward | present |
| E509 | packages/config/src/concerns/clerk.ts | packages/config/src/concerns/app.ts | import | no | no | lateral | present |
| E510 | packages/config/src/concerns/database.ts | external:zod (framework) | import | n/a | yes | outward | present |
| E511 | packages/config/src/concerns/management-api.ts | external:zod (framework) | import | n/a | yes | outward | present |
| E512 | packages/config/src/concerns/management-api.ts | packages/config/src/concerns/app.ts | import | no | no | lateral | present |
| E513 | packages/config/src/concerns/product-email.ts | external:zod (framework) | import | n/a | yes | outward | present |
| E514 | packages/config/src/concerns/product-email.ts | packages/config/src/concerns/app.ts | import | no | no | lateral | present |
| E515 | packages/config/src/concerns/store-assets.ts | external:zod (framework) | import | n/a | yes | outward | present |
| E516 | packages/config/src/concerns/store-assets.ts | packages/config/src/concerns/app.ts | import | no | no | lateral | present |
| E517 | packages/config/src/concerns/waitlist.ts | external:zod (framework) | import | n/a | yes | outward | present |
| E518 | packages/config/src/index.ts | packages/config/src/base-path.ts | import | no | no | lateral | present |
| E519 | packages/config/src/index.ts | packages/config/src/concerns/app.ts | import | no | no | lateral | present |
| E520 | packages/config/src/index.ts | packages/config/src/concerns/bot-detection.ts | import | no | no | lateral | present |
| E521 | packages/config/src/index.ts | packages/config/src/concerns/bot-detection.ts | import | no | no | lateral | present |
| E522 | packages/config/src/index.ts | packages/config/src/concerns/database.ts | import | no | no | lateral | present |
| E523 | packages/config/src/index.ts | packages/config/src/concerns/management-api.ts | import | no | no | lateral | present |
| E524 | packages/config/src/index.ts | packages/config/src/concerns/product-email.ts | import | no | no | lateral | present |
| E525 | packages/config/src/index.ts | packages/config/src/concerns/waitlist.ts | import | no | no | lateral | present |
| E526 | packages/config/src/index.ts | packages/config/src/runtime-environment.ts | import | no | no | lateral | present |
| E527 | packages/config/src/runtime-environment.ts | external:zod (framework) | import | n/a | yes | outward | present |
| E528 | packages/config/src/runtime-environment.ts | packages/config/src/concerns/app.ts | import | no | no | lateral | present |
| E529 | packages/config/src/runtime-environment.ts | packages/config/src/concerns/bot-detection.ts | import | no | no | lateral | present |
| E530 | packages/config/src/runtime-environment.ts | packages/config/src/concerns/clerk.ts | import | no | no | lateral | present |
| E531 | packages/config/src/runtime-environment.ts | packages/config/src/concerns/database.ts | import | no | no | lateral | present |
| E532 | packages/config/src/runtime-environment.ts | packages/config/src/concerns/management-api.ts | import | no | no | lateral | present |
| E533 | packages/config/src/runtime-environment.ts | packages/config/src/concerns/product-email.ts | import | no | no | lateral | present |
| E534 | packages/config/src/runtime-environment.ts | packages/config/src/concerns/store-assets.ts | import | no | no | lateral | present |
| E535 | packages/config/src/runtime-environment.ts | packages/config/src/concerns/waitlist.ts | import | no | no | lateral | present |
| E536 | packages/config/src/runtime.ts | packages/config/src/concerns/database.ts | import | no | no | lateral | present |
| E537 | packages/config/src/runtime.ts | packages/config/src/runtime-environment.ts | import | no | no | lateral | present |
| E538 | packages/content/src/index.ts | packages/content/src/legal-document.ts | import | no | no | lateral | present |
| E539 | packages/content/src/index.ts | packages/content/src/privacy-policy.ts | import | no | no | lateral | present |
| E540 | packages/content/src/index.ts | packages/content/src/store-marketing-consent.ts | import | no | no | lateral | present |
| E541 | packages/content/src/index.ts | packages/content/src/website-and-store-terms/current.ts | import | no | no | lateral | present |
| E542 | packages/content/src/legal-document-hash.ts | external:crypto (vendor) | import | n/a | yes | outward | present |
| E543 | packages/content/src/legal-document-hash.ts | packages/content/src/legal-document.ts | import | no | no | lateral | present |
| E544 | packages/content/src/privacy-policy.ts | packages/content/src/legal-document.ts | import | no | no | lateral | present |
| E545 | packages/content/src/website-and-store-terms/current.ts | packages/content/src/legal-document.ts | import | no | no | lateral | present |
| E546 | packages/content/src/website-and-store-terms/current.ts | packages/content/src/website-and-store-terms/types.ts | import | no | no | lateral | present |
| E547 | packages/content/src/website-and-store-terms/index.ts | packages/content/src/legal-document-hash.ts | import | no | no | lateral | present |
| E548 | packages/content/src/website-and-store-terms/index.ts | packages/content/src/website-and-store-terms/current.ts | import | no | no | lateral | present |
| E549 | packages/content/src/website-and-store-terms/index.ts | packages/content/src/website-and-store-terms/types.ts | import | no | no | lateral | present |
| E550 | packages/content/src/website-and-store-terms/types.ts | packages/content/src/legal-document.ts | import | no | no | lateral | present |
| E551 | packages/db/src/database-client.ts | external:pg (vendor) | import | n/a | yes | outward | present |
| E552 | packages/db/src/database-client.ts | packages/db/src/schema/index.ts | import | no | no | lateral | present |
| E553 | packages/db/src/database-pool.ts | external:pg (vendor) | import | n/a | yes | outward | present |
| E554 | packages/db/src/index.ts | packages/db/src/database-client.ts | import | no | no | lateral | present |
| E555 | packages/db/src/index.ts | packages/db/src/database-pool.ts | import | no | no | lateral | present |
| E556 | packages/db/src/index.ts | packages/db/src/schema/index.ts | import | no | no | lateral | present |
| E557 | packages/db/src/schema/index.ts | packages/db/src/schema/app-schema.ts | import | no | no | lateral | present |
| E558 | packages/domain/src/accounts/account-deletion-service.ts | packages/domain/src/accounts/accounts.ts | import | no | no | lateral | present |
| E559 | packages/domain/src/accounts/account-provisioning-service.ts | packages/domain/src/accounts/account-model.ts | import | no | yes | inward | present |
| E560 | packages/domain/src/accounts/account-provisioning-service.ts | packages/domain/src/accounts/accounts.ts | import | no | no | lateral | present |
| E561 | packages/domain/src/accounts/accounts.ts | packages/domain/src/accounts/account-model.ts | import | no | yes | inward | present |
| E562 | packages/domain/src/accounts/index.ts | packages/domain/src/accounts/account-deletion-service.ts | import | no | yes | inward | present |
| E563 | packages/domain/src/accounts/index.ts | packages/domain/src/accounts/account-model.ts | import | no | yes | inward | present |
| E564 | packages/domain/src/accounts/index.ts | packages/domain/src/accounts/account-provisioning-service.ts | import | no | yes | inward | present |
| E565 | packages/domain/src/accounts/index.ts | packages/domain/src/accounts/accounts.ts | import | no | yes | inward | present |
| E566 | packages/domain/src/coaching-bundles/bundle-offers.ts | packages/domain/src/coaching-bundles/coaching-bundles.ts | import | no | no | lateral | present |
| E567 | packages/domain/src/coaching-bundles/index.ts | packages/domain/src/coaching-bundles/bundle-offers.ts | import | no | yes | inward | present |
| E568 | packages/domain/src/coaching-bundles/index.ts | packages/domain/src/coaching-bundles/coaching-bundles.ts | import | no | yes | inward | present |
| E569 | packages/domain/src/email-address/index.ts | packages/domain/src/email-address/normalize-email.ts | import | no | yes | inward | present |
| E570 | packages/domain/src/feature-flags/feature-flag-service.ts | packages/domain/src/feature-flags/feature-flag-model.ts | import | no | yes | inward | present |
| E571 | packages/domain/src/feature-flags/index.ts | packages/domain/src/feature-flags/feature-flag-model.ts | import | no | yes | inward | present |
| E572 | packages/domain/src/feature-flags/index.ts | packages/domain/src/feature-flags/feature-flag-service.ts | import | no | yes | inward | present |
| E573 | packages/domain/src/shared/index.ts | packages/domain/src/shared/bot-verifier.ts | import | no | no | lateral | present |
| E574 | packages/domain/src/shared/index.ts | packages/domain/src/shared/clock.ts | import | no | no | lateral | present |
| E575 | packages/domain/src/shared/index.ts | packages/domain/src/shared/logger.ts | import | no | no | lateral | present |
| E576 | packages/domain/src/shared/index.ts | packages/domain/src/shared/management-authenticator.ts | import | no | no | lateral | present |
| E577 | packages/domain/src/shared/index.ts | packages/domain/src/shared/product-email.ts | import | no | no | lateral | present |
| E578 | packages/domain/src/store/download-grants/download-grant-service.ts | packages/domain/src/shared/index.ts | import | no | no | lateral | present |
| E579 | packages/domain/src/store/download-grants/download-grant-service.ts | packages/domain/src/store/download-grants/download-grant.ts | import | no | yes | inward | present |
| E580 | packages/domain/src/store/download-grants/download-grant-service.ts | packages/domain/src/store/models.ts | import | no | yes | inward | present |
| E581 | packages/domain/src/store/download-grants/download-grant.ts | packages/domain/src/store/models.ts | import | no | no | lateral | present |
| E582 | packages/domain/src/store/index.ts | packages/domain/src/store/cart/cart.ts | import | no | yes | inward | present |
| E583 | packages/domain/src/store/index.ts | packages/domain/src/store/delivery/delivery-limits.ts | import | no | yes | inward | present |
| E584 | packages/domain/src/store/index.ts | packages/domain/src/store/download-grants/download-grant-service.ts | import | no | yes | inward | present |
| E585 | packages/domain/src/store/index.ts | packages/domain/src/store/download-grants/download-grant.ts | import | no | yes | inward | present |
| E586 | packages/domain/src/store/index.ts | packages/domain/src/store/models.ts | import | no | yes | inward | present |
| E587 | packages/domain/src/store/index.ts | packages/domain/src/store/models.ts | import | no | yes | inward | present |
| E588 | packages/domain/src/store/index.ts | packages/domain/src/store/assets/product-asset-writer.ts | import | no | yes | inward | present |
| E589 | packages/domain/src/store/index.ts | packages/domain/src/store/assets/product-assets.ts | import | no | yes | inward | present |
| E590 | packages/domain/src/store/index.ts | packages/domain/src/store/product-file-formats.ts | import | no | yes | inward | present |
| E591 | packages/domain/src/store/index.ts | packages/domain/src/store/publication/product-publication-models.ts | import | no | yes | inward | present |
| E592 | packages/domain/src/store/index.ts | packages/domain/src/store/publication/product-publication-rules.ts | import | no | yes | inward | present |
| E593 | packages/domain/src/store/index.ts | packages/domain/src/store/acquisition/purchasability.ts | import | no | yes | inward | present |
| E594 | packages/domain/src/store/index.ts | packages/domain/src/store/acquisition/store-acquisition-service.ts | import | no | yes | inward | present |
| E595 | packages/domain/src/store/index.ts | packages/domain/src/store/catalog/store-catalog-service.ts | import | no | yes | inward | present |
| E596 | packages/domain/src/store/index.ts | packages/domain/src/store/publication/store-product-publication-service.ts | import | no | yes | inward | present |
| E597 | packages/domain/src/store/assets/product-assets.ts | packages/domain/src/store/models.ts | import | no | yes | inward | present |
| E598 | packages/domain/src/store/publication/product-publication-models.ts | packages/domain/src/store/models.ts | import | no | no | lateral | present |
| E599 | packages/domain/src/store/publication/product-publication-rules.ts | packages/domain/src/store/models.ts | import | no | no | lateral | present |
| E600 | packages/domain/src/store/publication/product-publication-rules.ts | packages/domain/src/store/publication/product-publication-models.ts | import | no | no | lateral | present |
| E601 | packages/domain/src/store/acquisition/store-acquisition-service.ts | packages/domain/src/email-address/index.ts | import | no | yes | outward | present |
| E602 | packages/domain/src/store/acquisition/store-acquisition-service.ts | packages/domain/src/shared/index.ts | import | no | no | lateral | present |
| E603 | packages/domain/src/store/acquisition/store-acquisition-service.ts | packages/domain/src/store/delivery/delivery-limit-key.ts | import | no | yes | inward | present |
| E604 | packages/domain/src/store/acquisition/store-acquisition-service.ts | packages/domain/src/store/delivery/delivery-limits.ts | import | no | yes | inward | present |
| E605 | packages/domain/src/store/acquisition/store-acquisition-service.ts | packages/domain/src/store/models.ts | import | no | yes | inward | present |
| E606 | packages/domain/src/store/acquisition/store-acquisition-service.ts | packages/domain/src/store/catalog/store-catalog-service.ts | import | no | no | lateral | present |
| E607 | packages/domain/src/store/catalog/store-catalog-service.ts | packages/domain/src/store/models.ts | import | no | yes | inward | present |
| E608 | packages/domain/src/store/publication/store-product-publication-service.ts | packages/domain/src/store/models.ts | import | no | yes | inward | present |
| E609 | packages/domain/src/store/publication/store-product-publication-service.ts | packages/domain/src/store/assets/product-asset-writer.ts | import | no | yes | inward | present |
| E610 | packages/domain/src/store/publication/store-product-publication-service.ts | packages/domain/src/store/product-file-formats.ts | import | no | yes | inward | present |
| E611 | packages/domain/src/store/publication/store-product-publication-service.ts | packages/domain/src/store/publication/product-publication-models.ts | import | no | yes | inward | present |
| E612 | packages/domain/src/store/publication/store-product-publication-service.ts | packages/domain/src/store/publication/product-publication-rules.ts | import | no | yes | inward | present |
| E613 | packages/domain/src/waitlist/index.ts | packages/domain/src/waitlist/waitlist-registration.ts | import | no | yes | inward | present |
| E614 | packages/domain/src/waitlist/index.ts | packages/domain/src/waitlist/waitlist-service.ts | import | no | yes | inward | present |
| E615 | packages/domain/src/waitlist/waitlist-service.ts | packages/domain/src/coaching-bundles/index.ts | import | no | yes | outward | present |
| E616 | packages/domain/src/waitlist/waitlist-service.ts | packages/domain/src/email-address/index.ts | import | no | yes | outward | present |
| E617 | packages/domain/src/waitlist/waitlist-service.ts | packages/domain/src/shared/index.ts | import | no | no | lateral | present |
| E618 | packages/domain/src/waitlist/waitlist-service.ts | packages/domain/src/waitlist/waitlist-availability.ts | import | no | yes | inward | present |
| E619 | packages/infrastructure/src/bot-detection/bot-detection-config.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E620 | packages/infrastructure/src/bot-detection/bot-detection-config.server.ts | packages/infrastructure/src/bot-detection/bot-detection-contract.ts | import | no | no | lateral | present |
| E621 | packages/infrastructure/src/bot-detection/bot-detection-contract.ts | external:zod (framework) | import | n/a | yes | outward | present |
| E622 | packages/infrastructure/src/bot-detection/submission/bot-detection-flow.ts | packages/infrastructure/src/bot-detection/bot-detection-contract.ts | import | no | no | lateral | present |
| E623 | packages/infrastructure/src/bot-detection/submission/bot-detection-widget.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E624 | packages/infrastructure/src/bot-detection/submission/bot-detection-widget.tsx | packages/infrastructure/src/bot-detection/bot-detection-contract.ts | import | no | yes | inward | present |
| E625 | packages/infrastructure/src/bot-detection/submission/bot-detection-widget.tsx | packages/infrastructure/src/bot-detection/turnstile/turnstile-widget.tsx | import | no | no | lateral | present |
| E626 | packages/infrastructure/src/bot-detection/verifier/bot-verifier.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E627 | packages/infrastructure/src/bot-detection/verifier/create-bot-verifier.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E628 | packages/infrastructure/src/bot-detection/verifier/create-bot-verifier.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E629 | packages/infrastructure/src/bot-detection/verifier/create-bot-verifier.server.ts | packages/infrastructure/src/bot-detection/verifier/bot-verifier.server.ts | import | no | no | lateral | present |
| E630 | packages/infrastructure/src/bot-detection/verifier/create-bot-verifier.server.ts | packages/infrastructure/src/bot-detection/turnstile/turnstile-bot-verifier.server.ts | import | no | no | lateral | present |
| E631 | packages/infrastructure/src/bot-detection/index.server.ts | packages/infrastructure/src/bot-detection/bot-detection-config.server.ts | import | no | no | lateral | present |
| E632 | packages/infrastructure/src/bot-detection/index.server.ts | packages/infrastructure/src/bot-detection/verifier/bot-verifier.server.ts | import | no | no | lateral | present |
| E633 | packages/infrastructure/src/bot-detection/index.server.ts | packages/infrastructure/src/bot-detection/verifier/create-bot-verifier.server.ts | import | no | no | lateral | present |
| E634 | packages/infrastructure/src/bot-detection/index.ts | packages/infrastructure/src/bot-detection/bot-detection-contract.ts | import | no | yes | inward | present |
| E635 | packages/infrastructure/src/bot-detection/index.ts | packages/infrastructure/src/bot-detection/submission/bot-detection-widget.tsx | import | no | no | lateral | present |
| E636 | packages/infrastructure/src/bot-detection/index.ts | packages/infrastructure/src/bot-detection/submission/use-bot-detection-submission.ts | import | no | yes | inward | present |
| E637 | packages/infrastructure/src/bot-detection/turnstile/turnstile-bot-verifier.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E638 | packages/infrastructure/src/bot-detection/turnstile/turnstile-client.ts | external:react (framework) | import | n/a | yes | outward | present |
| E639 | packages/infrastructure/src/bot-detection/turnstile/turnstile-client.ts | packages/infrastructure/src/bot-detection/bot-detection-contract.ts | import | no | no | lateral | present |
| E640 | packages/infrastructure/src/bot-detection/turnstile/turnstile-widget.tsx | packages/infrastructure/src/bot-detection/bot-detection-contract.ts | import | no | yes | inward | present |
| E641 | packages/infrastructure/src/bot-detection/turnstile/turnstile-widget.tsx | packages/infrastructure/src/bot-detection/turnstile/turnstile-client.ts | import | no | yes | inward | present |
| E642 | packages/infrastructure/src/bot-detection/turnstile/turnstile-widget.tsx | packages/infrastructure/src/bot-detection/turnstile/turnstile-client.ts | import | no | yes | inward | present |
| E643 | packages/infrastructure/src/bot-detection/submission/use-bot-detection-submission.ts | external:react (framework) | import | n/a | yes | outward | present |
| E644 | packages/infrastructure/src/bot-detection/submission/use-bot-detection-submission.ts | packages/infrastructure/src/bot-detection/bot-detection-contract.ts | import | no | no | lateral | present |
| E645 | packages/infrastructure/src/bot-detection/submission/use-bot-detection-submission.ts | packages/infrastructure/src/bot-detection/submission/bot-detection-flow.ts | import | no | no | lateral | present |
| E646 | packages/infrastructure/src/bot-detection/submission/use-bot-detection-submission.ts | packages/infrastructure/src/bot-detection/submission/bot-detection-widget.tsx | import | no | yes | outward | present |
| E647 | packages/infrastructure/src/email/create-product-email.server.ts | external:resend (vendor) | import | n/a | yes | outward | present |
| E648 | packages/infrastructure/src/email/create-product-email.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E649 | packages/infrastructure/src/email/create-product-email.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E650 | packages/infrastructure/src/email/create-product-email.server.ts | packages/infrastructure/src/email/in-memory-product-email.server.ts | import | no | no | lateral | present |
| E651 | packages/infrastructure/src/email/create-product-email.server.ts | packages/infrastructure/src/email/resend-product-email.server.ts | import | no | no | lateral | present |
| E652 | packages/infrastructure/src/email/email-primitives.server.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E653 | packages/infrastructure/src/email/in-memory-product-email.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E654 | packages/infrastructure/src/email/index.server.ts | packages/infrastructure/src/email/create-product-email.server.ts | import | no | no | lateral | present |
| E655 | packages/infrastructure/src/email/index.server.ts | packages/infrastructure/src/email/email-primitives.server.tsx | import | no | yes | outward | present |
| E656 | packages/infrastructure/src/email/index.server.ts | packages/infrastructure/src/email/in-memory-product-email.server.ts | import | no | no | lateral | present |
| E657 | packages/infrastructure/src/email/resend-product-email.server.ts | external:resend (vendor) | import | n/a | yes | outward | present |
| E658 | packages/infrastructure/src/email/resend-product-email.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E659 | packages/infrastructure/src/feature-flags/index.server.ts | packages/infrastructure/src/feature-flags/repository.server.ts | import | no | no | lateral | present |
| E660 | packages/infrastructure/src/feature-flags/repository.server.ts | packages/db/src/index.ts | import | yes | yes | outward | present |
| E661 | packages/infrastructure/src/feature-flags/repository.server.ts | packages/domain/src/feature-flags/index.ts | import | yes | no | lateral | present |
| E662 | packages/infrastructure/src/feature-flags/repository.server.ts | packages/infrastructure/src/feature-flags/schema.server.ts | import | no | no | lateral | present |
| E663 | packages/infrastructure/src/feature-flags/schema.server.ts | packages/db/src/index.ts | import | yes | yes | outward | present |
| E664 | packages/infrastructure/src/http/index.server.ts | packages/infrastructure/src/http/http.server.ts | import | no | no | lateral | present |
| E665 | packages/infrastructure/src/management-auth/bearer-secret-authenticator.server.ts | external:crypto (vendor) | import | n/a | yes | outward | present |
| E666 | packages/infrastructure/src/management-auth/bearer-secret-authenticator.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E667 | packages/infrastructure/src/management-auth/create-management-authenticator.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E668 | packages/infrastructure/src/management-auth/create-management-authenticator.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E669 | packages/infrastructure/src/management-auth/create-management-authenticator.server.ts | packages/infrastructure/src/management-auth/bearer-secret-authenticator.server.ts | import | no | no | lateral | present |
| E670 | packages/infrastructure/src/management-auth/create-management-authenticator.server.ts | packages/infrastructure/src/management-auth/management-auth-config.server.ts | import | no | no | lateral | present |
| E671 | packages/infrastructure/src/management-auth/index.server.ts | packages/infrastructure/src/management-auth/create-management-authenticator.server.ts | import | no | no | lateral | present |
| E672 | packages/infrastructure/src/management-auth/index.server.ts | packages/infrastructure/src/management-auth/management-auth-config.server.ts | import | no | no | lateral | present |
| E673 | packages/infrastructure/src/management-auth/index.server.ts | packages/infrastructure/src/management-auth/management-auth-contract.server.ts | import | no | no | lateral | present |
| E674 | packages/infrastructure/src/management-auth/management-auth-config.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E675 | packages/infrastructure/src/management-auth/management-auth-config.server.ts | packages/infrastructure/src/management-auth/management-auth-contract.server.ts | import | no | no | lateral | present |
| E676 | packages/infrastructure/src/pwa/index.ts | packages/infrastructure/src/pwa/pwa-registration.ts | import | no | yes | inward | present |
| E677 | packages/infrastructure/src/pwa/index.ts | packages/infrastructure/src/pwa/pwa-surfaces.ts | import | no | yes | inward | present |
| E678 | packages/infrastructure/src/pwa/pwa-registration.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E679 | packages/infrastructure/src/pwa/pwa-registration.ts | packages/infrastructure/src/pwa/pwa-surfaces.ts | import | no | no | lateral | present |
| E680 | packages/ui/src/filters/filter-chip-group.tsx | external:class-variance-authority (framework) | import | n/a | yes | outward | present |
| E681 | packages/ui/src/filters/filter-chip-group.tsx | external:radix-ui (framework) | import | n/a | yes | outward | present |
| E682 | packages/ui/src/filters/filter-chip-group.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E683 | packages/ui/src/filters/filter-chip-group.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E684 | packages/ui/src/filters/index.ts | packages/ui/src/filters/filter-chip-group.tsx | import | no | no | lateral | present |
| E685 | packages/ui/src/layout/app-shell.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E686 | packages/ui/src/layout/index.ts | packages/ui/src/layout/app-shell.tsx | import | no | no | lateral | present |
| E687 | packages/ui/src/layout/index.ts | packages/ui/src/layout/phone-frame.tsx | import | no | no | lateral | present |
| E688 | packages/ui/src/layout/index.ts | packages/ui/src/layout/portal-shell.tsx | import | no | no | lateral | present |
| E689 | packages/ui/src/layout/index.ts | packages/ui/src/layout/sidebar-surface-layout.tsx | import | no | no | lateral | present |
| E690 | packages/ui/src/layout/phone-frame.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E691 | packages/ui/src/layout/phone-frame.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E692 | packages/ui/src/layout/portal-shell.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E693 | packages/ui/src/layout/portal-shell.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E694 | packages/ui/src/layout/portal-shell.tsx | packages/ui/src/lib/constants.ts | import | no | no | lateral | present |
| E695 | packages/ui/src/layout/portal-shell.tsx | packages/ui/src/lib/focus-trap.ts | import | no | no | lateral | present |
| E696 | packages/ui/src/layout/portal-shell.tsx | packages/ui/src/primitives/icon-button.tsx | import | no | no | lateral | present |
| E697 | packages/ui/src/layout/sidebar-surface-layout.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E698 | packages/ui/src/layout/sidebar-surface-layout.tsx | packages/ui/src/lib/constants.ts | import | no | no | lateral | present |
| E699 | packages/ui/src/layout/sidebar-surface-layout.tsx | packages/ui/src/primitives/link.tsx | import | no | no | lateral | present |
| E700 | packages/ui/src/lib/cn.ts | external:clsx (framework) | import | n/a | yes | outward | present |
| E701 | packages/ui/src/lib/index.ts | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E702 | packages/ui/src/lib/index.ts | packages/ui/src/lib/constants.ts | import | no | no | lateral | present |
| E703 | packages/ui/src/lib/index.ts | packages/ui/src/lib/use-search-params-writer.ts | import | no | no | lateral | present |
| E704 | packages/ui/src/lib/use-search-params-writer.ts | external:react (framework) | import | n/a | yes | outward | present |
| E705 | packages/ui/src/motion/index.ts | packages/ui/src/motion/motion.ts | import | no | no | lateral | present |
| E706 | packages/ui/src/motion/motion.ts | external:react (framework) | import | n/a | yes | outward | present |
| E707 | packages/ui/src/overlays/index.ts | packages/ui/src/overlays/sheet.tsx | import | no | no | lateral | present |
| E708 | packages/ui/src/overlays/sheet.tsx | external:radix-ui (framework) | import | n/a | yes | outward | present |
| E709 | packages/ui/src/overlays/sheet.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E710 | packages/ui/src/overlays/sheet.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E711 | packages/ui/src/primitives/button.tsx | external:class-variance-authority (framework) | import | n/a | yes | outward | present |
| E712 | packages/ui/src/primitives/button.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E713 | packages/ui/src/primitives/button.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E714 | packages/ui/src/primitives/card.tsx | external:class-variance-authority (framework) | import | n/a | yes | outward | present |
| E715 | packages/ui/src/primitives/card.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E716 | packages/ui/src/primitives/card.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E717 | packages/ui/src/primitives/checkbox.tsx | external:radix-ui (framework) | import | n/a | yes | outward | present |
| E718 | packages/ui/src/primitives/checkbox.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E719 | packages/ui/src/primitives/checkbox.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E720 | packages/ui/src/primitives/icon-button.tsx | external:class-variance-authority (framework) | import | n/a | yes | outward | present |
| E721 | packages/ui/src/primitives/icon-button.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E722 | packages/ui/src/primitives/icon-button.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E723 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/button.tsx | import | no | no | lateral | present |
| E724 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/card.tsx | import | no | no | lateral | present |
| E725 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/checkbox.tsx | import | no | no | lateral | present |
| E726 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/icon-button.tsx | import | no | no | lateral | present |
| E727 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/input.tsx | import | no | no | lateral | present |
| E728 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/link.tsx | import | no | no | lateral | present |
| E729 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/section-eyebrow.tsx | import | no | no | lateral | present |
| E730 | packages/ui/src/primitives/input.tsx | external:class-variance-authority (framework) | import | n/a | yes | outward | present |
| E731 | packages/ui/src/primitives/input.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E732 | packages/ui/src/primitives/input.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E733 | packages/ui/src/primitives/link.tsx | external:class-variance-authority (framework) | import | n/a | yes | outward | present |
| E734 | packages/ui/src/primitives/link.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E735 | packages/ui/src/primitives/link.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E736 | packages/ui/src/primitives/section-eyebrow.tsx | external:class-variance-authority (framework) | import | n/a | yes | outward | present |
| E737 | packages/ui/src/primitives/section-eyebrow.tsx | external:react (framework) | import | n/a | yes | outward | present |
