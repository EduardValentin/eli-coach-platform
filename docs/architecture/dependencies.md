# Dependencies

Header: date 2026-09-15, commit 148d594f, scope apps/platform/src, apps/platform/db, packages/{config,content,db,domain,infrastructure,ui}/src plus the enforcement layer (eslint.config.mjs, tools/lint-boundaries.test.mjs, workspace package.json export maps, tsconfigs, vite/react-router/vitest configs), mode audit.

## Component graph

Generated from every import in the 217 in-scope modules (`.architecture/slices/` holds the per-unit returns; the per-module edge table is below). Count = distinct importing modules. Component IDs refer to `components.md`.

| From | To | Modules | Notes |
|---|---|---|---|
| C7 store | C1 domain | 15 | services, ports, models |
| C7 store | C14 server | 13 | eight route modules import `container.server` (R5) and `http.server`; two loaders import `container.server`; three controllers import `http.server` |
| C7 store | C6 infrastructure | 7 | bot-detection (browser and server), email/server, management-auth/server |
| C7 store | C3 config | 6 | joinBasePath, RuntimeEnvironment |
| C7 store | C5 ui | 6 | primitives in ui/public |
| C7 store | C2 db | 5 | DatabaseClient, appSchema |
| C7 store | C4 content | 1 | consent copy in cart drawer |
| C8 waitlist | C6 infrastructure | 6 | bot-detection, email/server |
| C8 waitlist | C1 domain | 5 | |
| C8 waitlist | C14 server | 2 | route module and controller |
| C8 waitlist | C2 db | 2 | |
| C8 waitlist | C3 config | 2 | |
| C8 waitlist | C4 content | 2 | |
| C8 waitlist | C5 ui | 2 | |
| C9 accounts | C1 domain | 8 | |
| C9 accounts | C14 server | 4 | two route modules import `container.server`; webhook controller imports `http.server`; sign-in-failed loader imports `runtime-environment.server` |
| C9 accounts | C5 ui | 3 | |
| C9 accounts | C2 db | 2 | |
| C9 accounts | C3 config | 2 | |
| C10 coaching-bundles | C1 domain | 1 | bundle model and display resolver |
| C10 coaching-bundles | C5 ui | 1 | |
| C11 public-site | C5 ui | 14 | |
| C11 public-site | C8 waitlist | 7 | contracts and ui/public (R2) |
| C11 public-site | C6 infrastructure | 4 | BotDetectionConfig type |
| C11 public-site | C3 config | 3 | |
| C11 public-site | C4 content | 3 | legal documents |
| C11 public-site | C9 accounts | 2 | contracts, server/account-context (layout.server.ts), ui/public/auth-nav-actions |
| C11 public-site | C14 server | 1 | layout.server.ts imports `container.server` and `runtime-environment.server` |
| C11 public-site | C7 store | 1 | shell/layout.tsx imports cart drawer and provider |
| C11 public-site | C10 coaching-bundles | 1 | pricing page |
| C12 client-portal | C5 ui | 2 | |
| C12 client-portal | C6 infrastructure | 2 | pwa |
| C12 client-portal | C9 accounts | 1 | server/require-account |
| C12 client-portal | C14 server | 1 | runtime-environment.server |
| C12 client-portal | C3 config | 1 | |
| C13 coach-portal | C5 ui | 3 | |
| C13 coach-portal | C9 accounts | 1 | server/require-account |
| C13 coach-portal | C14 server | 1 | runtime-environment.server |
| C14 server | C7 store | 1 | container constructs 5 controllers, 5 repositories, 3 token/digest adapters, zip stream, asset store, delivery-service factory |
| C14 server | C8 waitlist | 1 | container constructs controller, repository, confirmation-service factory |
| C14 server | C9 accounts | 1 | container constructs two controllers and the repository |
| C14 server | C3 config | 4 | |
| C14 server | C1 domain | 1 | container constructs seven services |
| C14 server | C6 infrastructure | 1 | container constructs bot verifier, feature-flag repository/controller, management authenticator |
| C14 server | C2 db | 1 | database.server.ts |
| C14 server | C4 content | 1 | consent versions |
| C15 app root | C9 accounts | 2 | root.tsx imports ui/shared/access-denied-page; root.server.ts imports server/account-resolution-middleware |
| C15 app root | C14 server | 1 | root.server.ts imports container and runtime environment |
| C15 app root | C3 config | 1 | |
| C15 app root | C5 ui | 1 | app.css imports styles.css |
| C15 app root | all routed modules | routes.ts | the route registry names 33 route modules across C7, C8, C9, C11, C12, C13, C14 (framework-glue; not counted in fan-in) |
| C6 infrastructure | C3 config | 5 | |
| C6 infrastructure | C2 db | 2 | feature-flags repository and table |
| C6 infrastructure | C1 domain | 2 | feature-flags implements domain ports |

Cycles: C14 -> C7 -> C14, C14 -> C8 -> C14, C14 -> C9 -> C14. C1, C2, C3, C4, C5 depend on no in-scope component. C1 has no external dependency at all.

External dependencies per component: C1 none; C2 drizzle-orm, pg; C3 zod; C4 node:crypto; C5 react, react-router, motion, radix-ui, class-variance-authority, clsx, tailwind-merge; C6 react, resend, drizzle-orm, zod, node:crypto, fetch; C7 react, react-dom, react-router, react-hook-form, @hookform/resolvers, zustand, lucide-react, zod, drizzle-orm, archiver, node:crypto, node:fs, node:path, node:stream; C8 react, react-dom, react-router, lucide-react, canvas-confetti, zod, drizzle-orm, pg, node:crypto; C9 @clerk/react-router, react, react-router, lucide-react, zod, drizzle-orm; C10 motion, lucide-react; C11 react, react-router, motion, lucide-react; C12 react-router; C13 react-router, lucide-react; C14 react-router, zod, pg; C15 @clerk/react-router, react, react-router, motion, lucide-react, @react-router/dev, vite, @tailwindcss/vite, drizzle-kit.

## Forbidden edges

| From | To | Source of the rule | Enforced by |
|---|---|---|---|
| any app file | app-local module through `../../` relative paths | R1 (ARCHITECTURE.md, AGENTS.md) | ESLint no-restricted-imports region (lint-only) |
| surfaces/* | features/*/{data,api,email,ui/<other slice>} (anything except ui/<its slice>, ui/shared, server/, contracts/) | R2 | ESLint region per surface (lint-only) |
| features/A | features/B internals other than contracts/, ui/shared/, and data/schema.server.ts (foreign keys) | R3 | ESLint region per feature (lint-only); the schema carve-out is unexercised today |
| surfaces/A | surfaces/B | R4 | ESLint region per surface (lint-only) |
| any file except features/*/api/**, server/api/**, *.server.ts under features/*/ui/** or surfaces/**, root.server.ts, tests | ~/server/container.server | R5 | ESLint (lint-only); note the fenced set is folders, so a non-route file in features/*/api/ may import the container |
| features/*/ui/** | that feature's data/, api/, email/, server/ | R6 | ESLint (lint-only) |
| features/**, server/**, root, routes | ~/surfaces/** | R7 | ESLint (lint-only) |
| any workspace consumer | a package's internal file (deep import) | package APIs (ARCHITECTURE.md) | package.json export maps (resolution fails) plus ESLint barrel rule; exemptions ui/styles.css, infrastructure/*, config/test-support |
| packages/domain | any vendor, framework, database, or workspace package | domain purity (ARCHITECTURE.md) | dependency-absence: package.json has no dependencies, so the import fails to resolve under pnpm; no test asserts the absence |
| route modules | domain services, repositories, ad hoc persistence, cross-cutting authorization | "Route modules stay thin" (ARCHITECTURE.md human-review list) | none (review only) |
| any production module | packages/config/test-support, test files, fixtures | package APIs; R34 | none technical: the subpath is declared, lint-exempt, and importable from production code; only convention keeps it test-only |
| infrastructure subpath A | infrastructure subpath B internals | implied by "subpath export map per concern keeps server-only halves out of browser bundles" | none inside the package (relative imports between folders resolve) |
| controllers | request state on instance fields; base controller hierarchy | ARCHITECTURE.md human-review list | none (review only) |
| infrastructure failure | business status (capacity, duplicate, availability) | ARCHITECTURE.md human-review list | none (review only) |

## Cross-feature protocol

A feature depends on another feature only through a published interface; everything else (`data/`, `email/`, `api/`, composition) stays private, and runtime objects cross features only through the container.

| Need | Satisfied at | Mechanism |
|---|---|---|
| Use another feature's types and rules in policy code | domain slice to domain slice | import through the slice entry (`@eli-coach-platform/domain/<feature>`); one direction only, `no-circular` fails the build otherwise |
| Know the current account | request context | read the accounts feature's context key from `server/guards/` |
| Look another feature's data up | a port the consumer declares | the consuming slice declares the narrow interface; the container satisfies it with the owning feature's adapter at composition |
| Reference another feature's table | persistence | `data/schema.server.ts` may import the other feature's `data/schema.server.ts` for a foreign key; no cross-feature queries |
| Compose another feature's UI | `ui/shared/` | the owning feature publishes the component |
| Exchange wire data | `contracts/` | zod schemas |

## Boundaries (ports)

Direction-verdict is filled by W1 in the ledger. Enforcement names what fails if a consumer imports an implementer directly.

| ID | Port | Owner (ring) | Implementers (ring) | Consumers | Crossing data | Humble side | Enforcement |
|---|---|---|---|---|---|---|---|
| B190 | AccountRepository (U901) | C1 use-cases | U406 PostgresAccountRepository (adapters) | U902; U403 webhook controller; U500 container | Account (plain) | implementer | dependency-absence keeps C1 from naming the adapter; nothing stops a consumer importing U406 (R5 only fences the container) |
| B191 | FeatureFlagRepository (U906) | C1 use-cases | U1027 PostgresFeatureFlagRepository (adapters, C6) | U909 | PersistedFeatureFlag[] | implementer | dependency-absence; exports |
| B192 | FeatureFlagReader (U907) | C1 use-cases | U909 FeatureFlagService | U1025 FeatureFlagController; U500 | FeatureFlagSet | service | dependency-absence |
| B193 | WaitlistRepository (U912) | C1 use-cases | U303 PostgresWaitlistRepository | U914 | signup commands/results (plain) | implementer | dependency-absence |
| B194 | WaitlistConfirmationService (U913) | C1 use-cases | U307 EmailWaitlistConfirmationService, U306 DisabledWaitlistConfirmationService | U914 | SendWaitlistConfirmationCommand | implementer | dependency-absence |
| B195 | StoreCatalogRepository (U919) | C1 use-cases | U120 PostgresStoreCatalogRepository | U920, U927 | PublishedStoreProduct[] | implementer | dependency-absence |
| B196 | StoreAcquisitionRepository (U922) | C1 use-cases | U117 PostgresStoreAcquisitionRepository | U927 | PrepareAcquisitionCommand / AcquisitionPreparation | implementer | dependency-absence |
| B197 | StoreDeliveryService (U923) | C1 use-cases | U129 EmailStoreDeliveryService, U128 DisabledStoreDeliveryService | U927 | delivery command/result | implementer | dependency-absence |
| B198 | DownloadTokenGenerator (U924) | C1 use-cases | U122 RandomDownloadTokenGenerator (structural) | U927 | CreateDownloadTokenResult | implementer | dependency-absence |
| B199 | PayloadDigestGenerator (U925) | C1 use-cases | U124 PayloadSha256Digest | U927 | string | implementer | dependency-absence |
| B200 | StoreClock (U926) | C1 use-cases | inline `{ now: () => new Date() }` in U500 | U927, U933 | Date | implementer | dependency-absence; U914 WaitlistService bypasses it with `new Date()` |
| B201 | DownloadTokenHasher (U931) | C1 use-cases | U123 DownloadTokenSha256 | U933 | string | implementer | dependency-absence |
| B202 | DownloadGrantRepository (U932) | C1 use-cases | U121 PostgresDownloadGrantRepository | U933 | DownloadGrant | implementer | dependency-absence |
| B203 | ProductAssetStore (U935) | C1 use-cases | U119 FilesystemProductAssetStore | U104, U107, U114 (adapters, C7) | NodeJS.ReadableStream (Node runtime type in the port signature) | implementer | dependency-absence |
| B204 | ProductAssetWriter (U937) | C1 use-cases | U119 FilesystemProductAssetStore | U944 | ProductAssetContent (Uint8Array) | implementer | dependency-absence |
| B205 | ProductAssetDigest (U938) | C1 use-cases | U118 ProductAssetSha256Digest | U944 | Uint8Array / string | implementer | dependency-absence |
| B206 | StoreProductPublicationRepository (U943) | C1 use-cases | U125 PostgresStoreProductPublicationRepository | U944 | PersistPublicationCommand / PublishableProduct | implementer | dependency-absence |
| B240 | BotVerifier (U1006) declared in C6, not C1 | C6 bot-detection/server (use-case-shaped type on the detail side) | U1007 StaticTokenBotVerifier, U1012 TurnstileBotVerifier | U301 WaitlistController, U100 StoreAcquisitionController, U500 | BotVerificationRequest/Result (plain) | implementers | exports |
| B241 | ProductEmailSender (U1020) declared in C6, not C1 | C6 email/server | U1023 ResendProductEmailSender; no null implementer | U127, U305 feature factories; U129, U307 adapters | SendProductEmailCommand/Result | implementer | exports |
| B242 | ManagementAuthenticator (U1032) declared in C6, not C1 | C6 management-auth/server | U1029 BearerSecretManagementAuthenticator; no null implementer | U109 StoreProductManagementController, U500 | `Request` in (framework type), ManagementAuthenticationResult out | implementer | exports |
| B100 | ZipDeliveryStream (structural type in U107) | C7 adapters | U114 ZipDeliveryStream | U107 | DownloadGrant in, NodeJS.ReadableStream out | U114 | none (structural typing) |
| B120 | StoreCartState (U204, Zustand store shape) | C7 ui/public (adapters) | U205 createStoreCartStore | U210-U218, U237-U240, U248, C11 shell/layout.tsx | object with functions and productSlugs | consumers | none |
| B121 | useStoreCatalogFetcher / useStoreAcquisitionFetcher (U202, U203) | C7 ui/public | same | U213, U218 | StoreCatalogResponse / parsed acquisition response | callers | none |
| B122 | usePrivateDownloadToken (U246) | C7 ui/public | same | U241 | string or null | download page | none |
| B123 | React Router loader contract | framework | U231, U247, U604, U415, U521 | routes.ts, page modules | loader data types | page view | React Router strips `.server` modules from the client build; R5 (lint) |
| B132 | WaitlistService concrete class as the controller's port | C1 use-cases | single concrete class | U301 | JoinWaitlistCommand / JoinWaitlistResult | controller | none (no interface) |
| B140 | accountContext RouterContext<ResolvedSession> (U408) | C9 server (frameworks) | U410 sets it | U411, U412, U604, U705, U711 | ResolvedSession | React Router context | none |
| B141 | AccountResolutionContainer = Pick<AccountProvisioningService,"ensureAccount"> (local to U410) | C9 server (adapters) | PlatformContainer (U502) structurally; test fakes | U410 | function call | container | none (structural; deliberate test seam) |
| B142 | AccountResolutionEnvironment = Pick<RuntimeEnvironment,"APP_BASE_PATH"> (local to U410) | C9 server | RuntimeEnvironment via U510 | U410 | none | runtime environment | none |
| B143 | GuardedRequest (local to require-account.server.ts) | C9 server | route args from C11-C13 middleware and U400 | U411 | Request, RouterContextProvider (framework types) | caller | none |
| B150 | (same port as B190; container wiring view) | | | | | | |
| B151 | PlatformDatabase.client deferred DatabaseClient proxy | C14 (frameworks) | private createDeferredDatabaseClient in U503 | every repository built in U500 | DatabaseClient (Drizzle type) | proxy | none |
| B152 | PlatformContainer (U502) composition output | C14 composition | U500 | 13 route modules and 3 loaders across C7, C8, C9, C11, C14, C15 | controller and service instances | route modules | import-rule (lint-only, R5) |
| B180 | Radix wrapper boundary in C5 (avatar, checkbox, dialog, select, filter-chip-group, sheet) | C5 frameworks | external radix-ui | apps via barrel | React props | C5 component | none |
| B181 | SearchParamsWriter (U805) | C5 lib (adapters) | C5 | U237 catalog-view | { searchParams, writeSearchParams } | consumer | none |
| B182 | packages/ui export map | C5 | index.ts, styles.css | apps/platform/src, app.css | components, CSS | consumers | exports |
| B260 | DatabaseClient (U1151, Drizzle NodePgDatabase) | C2 adapters | drizzle() | U503; every repository in C7, C8, C9, C6 | Drizzle ORM instance (detail type) | C2 | exports |
| B261 | appSchema (U1154, the `app` Postgres namespace) | C2 frameworks | tables attached by U126, U304, U407, U1028 | same four | drizzle PgSchema builder | consumers | convention; drizzle.config.ts globs discover the tables |
| B262 | RuntimeEnvironment (U1172) | C3 frameworks | U1171 loadRuntimeEnvironment (one zod schema with five superRefine gating rules) | U510 (memoized); by type C6 factories, U127, U305, U410, U500 | typed env object | C3 | exports |
| B263 | DatabaseBootstrapEnvironment / DatabaseConnection / DatabaseUserCredentials | C3 | U1174, U1181 | U503 | plain credential structures | C3 | exports |
| B264 | packages/config ./test-support subpath (U1191) | C3 (tests) | fixture only | test files only | Clerk-shaped fixture | tests | exports; lint-exempt; no technical block against a production importer |

## Entry points and composition roots

| Kind | Path | Constructs |
|---|---|---|
| composition-root | apps/platform/src/server/container.server.ts (createPlatformContainer, memoized by getPlatformContainer) | createPlatformDatabase; PostgresAccountRepository, AccountController, AccountWebhookController; PostgresStoreAcquisitionRepository, PostgresStoreCatalogRepository, PostgresDownloadGrantRepository, PostgresStoreProductPublicationRepository, FilesystemProductAssetStore, ProductAssetSha256Digest, RandomDownloadTokenGenerator, DownloadTokenSha256, PayloadSha256Digest, ZipDeliveryStream, StoreAcquisitionController, StoreCatalogController, StoreCoverAssetController, StoreDownloadController, StoreProductManagementController, createStoreDeliveryService(); PostgresWaitlistRepository, WaitlistController, createWaitlistConfirmationService(); createBotDetectionConfig(), createBotVerifier(), PostgresFeatureFlagRepository, FeatureFlagController, createManagementAuthConfig(), BearerSecretManagementAuthenticator; AppMetadataController, ReadyzController; domain AccountProvisioningService, FeatureFlagService, WaitlistService, StoreCatalogService, StoreAcquisitionService, DownloadGrantService, StoreProductPublicationService; inline StoreClock |
| composition-root (second) | apps/platform/src/root.server.ts | clerkMiddleware(); createAccountResolutionMiddleware(getPlatformContainer, getRuntimeEnvironment); rootAuthLoader |
| construction-site | apps/platform/src/server/database.server.ts (openPool, lazy) | pg Pool via createManagedDatabasePool; Drizzle client via createDatabaseClient |
| construction-site | apps/platform/src/features/store/email/create-store-delivery-service.server.ts | DisabledStoreDeliveryService or EmailStoreDeliveryService(createProductEmailSender()) selected on PRODUCT_EMAIL_PROVIDER |
| construction-site | apps/platform/src/features/waitlist/email/create-waitlist-confirmation-service.server.ts | DisabledWaitlistConfirmationService or EmailWaitlistConfirmationService(createProductEmailSender()) selected on PRODUCT_EMAIL_PROVIDER |
| construction-site | packages/infrastructure/src/email/create-product-email-sender.server.ts | new Resend(), ResendProductEmailSender |
| construction-site | packages/infrastructure/src/bot-detection/create-bot-verifier.server.ts | StaticTokenBotVerifier or TurnstileBotVerifier |
| construction-site | apps/platform/src/features/store/api/zip-stream.server.ts (ZipDeliveryStream.create) | archiver ZipArchive at request time |
| construction-site | apps/platform/src/features/store/ui/public/cart.ts, cart-provider.tsx | Zustand store with persist over localStorage; one store per provider |
| construction-site | packages/domain/src/waitlist/waitlist-service.ts | new Date() (system clock, bypassing any port) |
| route registry | apps/platform/src/routes.ts | registers 33 route modules (see components.md) |
| route (page) | surfaces/public-site/shell/layout.tsx (+ layout.server.ts loader), pages/{home,pricing,blog,privacy,terms}.tsx | loader reads container (botDetectionConfig, waitlistController.getWaitlist), accountContext, runtime environment |
| route (page) | features/store/ui/public/{catalog-page,product-page,download-page}.tsx (+ .server.ts loaders) | loaders read the container |
| route (page) | features/accounts/ui/public/sign-in-failed-page.tsx (+ .server.ts) | reads runtime environment |
| route (page) | surfaces/client-portal/shell/layout.tsx (+ layout.server.ts middleware), pages/home.tsx; surfaces/coach-portal/shell/layout.tsx (+ middleware), pages/home.tsx | middleware calls requirePortalAccess("CLIENT" / "COACH") |
| route (resource) | features/store/api/{acquisitions,catalog,covers,downloads,management-product-validations,management-products,management-product,management-product-versions}.ts | resolve controllers from the container |
| route (resource) | features/waitlist/api/waitlist.ts; features/accounts/api/{account,clerk-webhooks}.ts | resolve controllers from the container |
| route (resource) | server/api/{readyz,meta,feature-flags}.ts; surfaces/client-portal/api/{manifest,sw,readyz}.ts; surfaces/coach-portal/api/readyz.ts | container controllers; pwa definitions; static Response |
| middleware | root.server.ts (Clerk, account resolution); portal layout.server.ts (role guards) | see above |
| CLI/build | apps/platform/db/drizzle.config.ts (schema globs), vite.config.ts, react-router.config.ts | tooling entry points, not imported by app code |

## Shared data shapes

| Shape | Components reading or writing it | Owning component |
|---|---|---|
| Postgres namespace `app` (appSchema) and the migration journal apps/platform/db/drizzle | C2 declares the namespace; C7 (store tables), C8 (waitlist_entries), C9 (accounts, account_role enum), C6 (feature_flags) attach tables; C15 drizzle.config.ts discovers them by glob | C2 owns the namespace; each table is owned by the feature that declares it; no component owns the whole schema |
| store zod contracts (contracts/store.ts, store-management.ts) | C7 server half and C7 ui half (shared wire schema); tests | C7 |
| waitlist zod contracts (contracts/waitlist.ts: Waitlist, WaitlistAvailability, join response) | C8; C11 (five modules) | C8 |
| accounts contracts (PublicSessionState, accountResponseSchema, AccountRole) | C9; C11 (layout.server.ts, public-layout.tsx); AccountRole originates in C1 | C9 (wire) / C1 (role) |
| BotDetectionConfig (zod schema in C6) | C6; C7 ui; C8 ui; C11 (loader data and props) | C6 |
| FeatureFlagSnapshot (featureFlagSnapshotSchema) | C6 controller; C14 route; integration tests | C6 |
| RuntimeEnvironment (one zod schema) | C3; read by C14 and by type in C6, C7, C8, C9 | C3 |
| Route path literals: "sign-in-failed" in routes.ts vs SIGN_IN_FAILED_PATH in C9; "/store", "/client", "/coach" recovery paths in C9 require-account and access-denied | C15, C9, C11 | none |
| localStorage cart (STORE_CART_STORAGE_KEY) | C7 ui only | C7 |
| Email HTML rendered from React primitives (Email*) | C6 owns primitives; C7 and C8 email templates | C6 |

## Edges

An edge from A to B means A's source names B. Direction `inward` points toward policy (ring order: entities, use-cases, adapters, frameworks, composition). Generated from every `import`, `export ... from`, dynamic `import()`, and CSS `@import` in the 217 in-scope modules at commit 148d594f; kind is `import` for all rows (the `implements` and `constructs` relationships are recorded in the Boundaries and Entry points sections above and in the slice returns). Crosses-ring compares the majority ring of the two modules from `units.md`; externals are tagged framework, vendor, or runtime. Component membership is by path (see `components.md`).

| ID | From | To | Kind | Crosses component | Crosses ring | Direction | Status |
|---|---|---|---|---|---|---|---|
| E1 | apps/platform/src/app.css | external:tailwindcss (vendor) | import | n/a | yes | outward | present |
| E2 | apps/platform/src/app.css | @eli-coach-platform/ui/styles.css | import | yes | yes | inward | present |
| E3 | apps/platform/src/features/accounts/api/account-controller.server.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E4 | apps/platform/src/features/accounts/api/account-controller.server.ts | apps/platform/src/features/accounts/contracts/account | import | no | no | lateral | present |
| E5 | apps/platform/src/features/accounts/api/account-controller.server.ts | apps/platform/src/features/accounts/server/require-account.server | import | no | no | lateral | present |
| E6 | apps/platform/src/features/accounts/api/account.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E7 | apps/platform/src/features/accounts/api/account.ts | apps/platform/src/server/http.server | import | yes | yes | inward | present |
| E8 | apps/platform/src/features/accounts/api/account.ts | apps/platform/src/server/container.server | import | yes | yes | outward | present |
| E9 | apps/platform/src/features/accounts/api/clerk-webhooks.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E10 | apps/platform/src/features/accounts/api/clerk-webhooks.ts | apps/platform/src/server/http.server | import | yes | yes | inward | present |
| E11 | apps/platform/src/features/accounts/api/clerk-webhooks.ts | apps/platform/src/server/container.server | import | yes | yes | outward | present |
| E12 | apps/platform/src/features/accounts/api/webhook-controller.server.ts | external:@clerk/react-router/webhooks (vendor) | import | n/a | yes | outward | present |
| E13 | apps/platform/src/features/accounts/api/webhook-controller.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E14 | apps/platform/src/features/accounts/api/webhook-controller.server.ts | apps/platform/src/server/http.server | import | yes | no | lateral | present |
| E15 | apps/platform/src/features/accounts/contracts/account.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E16 | apps/platform/src/features/accounts/contracts/account.ts | external:zod (vendor) | import | n/a | yes | outward | present |
| E17 | apps/platform/src/features/accounts/data/account-repository.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E18 | apps/platform/src/features/accounts/data/account-repository.server.ts | @eli-coach-platform/db | import | yes | no | lateral | present |
| E19 | apps/platform/src/features/accounts/data/account-repository.server.ts | external:drizzle-orm (vendor) | import | n/a | yes | outward | present |
| E20 | apps/platform/src/features/accounts/data/account-repository.server.ts | apps/platform/src/features/accounts/data/schema.server | import | no | no | lateral | present |
| E21 | apps/platform/src/features/accounts/data/schema.server.ts | external:drizzle-orm/pg-core (vendor) | import | n/a | yes | outward | present |
| E22 | apps/platform/src/features/accounts/data/schema.server.ts | @eli-coach-platform/db | import | yes | no | lateral | present |
| E23 | apps/platform/src/features/accounts/data/schema.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E24 | apps/platform/src/features/accounts/server/account-context.server.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E25 | apps/platform/src/features/accounts/server/account-context.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E26 | apps/platform/src/features/accounts/server/account-resolution-middleware.server.ts | external:@clerk/react-router/server (vendor) | import | n/a | yes | outward | present |
| E27 | apps/platform/src/features/accounts/server/account-resolution-middleware.server.ts | @eli-coach-platform/config | import | yes | no | lateral | present |
| E28 | apps/platform/src/features/accounts/server/account-resolution-middleware.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E29 | apps/platform/src/features/accounts/server/account-resolution-middleware.server.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E30 | apps/platform/src/features/accounts/server/account-resolution-middleware.server.ts | apps/platform/src/features/accounts/server/account-context.server | import | no | yes | outward | present |
| E31 | apps/platform/src/features/accounts/server/require-account.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E32 | apps/platform/src/features/accounts/server/require-account.server.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E33 | apps/platform/src/features/accounts/server/require-account.server.ts | apps/platform/src/features/accounts/server/account-context.server | import | no | yes | outward | present |
| E34 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | external:@clerk/react-router (vendor) | import | n/a | yes | outward | present |
| E35 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E36 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E37 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E38 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E39 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | apps/platform/src/features/accounts/contracts/account | import | no | yes | inward | present |
| E40 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.server.ts | @eli-coach-platform/config | import | yes | yes | inward | present |
| E41 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.server.ts | apps/platform/src/server/runtime-environment.server | import | yes | no | lateral | present |
| E42 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.tsx | external:@clerk/react-router (vendor) | import | n/a | yes | outward | present |
| E43 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E44 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E45 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E46 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.tsx | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.server | import | no | no | lateral | present |
| E47 | apps/platform/src/features/accounts/ui/shared/access-denied-page.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E48 | apps/platform/src/features/accounts/ui/shared/access-denied-page.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E49 | apps/platform/src/features/accounts/ui/shared/access-denied-page.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E50 | apps/platform/src/features/coaching-bundles/ui/public/bundle-selector.tsx | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E51 | apps/platform/src/features/coaching-bundles/ui/public/bundle-selector.tsx | @eli-coach-platform/ui | import | yes | no | lateral | present |
| E52 | apps/platform/src/features/coaching-bundles/ui/public/bundle-selector.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E53 | apps/platform/src/features/coaching-bundles/ui/public/bundle-selector.tsx | external:motion/react (framework) | import | n/a | yes | outward | present |
| E54 | apps/platform/src/features/store/api/acquisitions-controller.server.ts | external:node:crypto (runtime) | import | n/a | no | outward | present |
| E55 | apps/platform/src/features/store/api/acquisitions-controller.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E56 | apps/platform/src/features/store/api/acquisitions-controller.server.ts | apps/platform/src/features/store/contracts/store | import | no | no | lateral | present |
| E57 | apps/platform/src/features/store/api/acquisitions-controller.server.ts | @eli-coach-platform/infrastructure/bot-detection | import | yes | no | lateral | present |
| E58 | apps/platform/src/features/store/api/acquisitions-controller.server.ts | @eli-coach-platform/infrastructure/bot-detection/server | import | yes | no | lateral | present |
| E59 | apps/platform/src/features/store/api/acquisitions-controller.server.ts | apps/platform/src/server/http.server | import | yes | no | lateral | present |
| E60 | apps/platform/src/features/store/api/acquisitions.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E61 | apps/platform/src/features/store/api/acquisitions.ts | apps/platform/src/server/http.server | import | yes | yes | inward | present |
| E62 | apps/platform/src/features/store/api/acquisitions.ts | apps/platform/src/server/container.server | import | yes | yes | outward | present |
| E63 | apps/platform/src/features/store/api/catalog-controller.server.ts | @eli-coach-platform/config | import | yes | no | lateral | present |
| E64 | apps/platform/src/features/store/api/catalog-controller.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E65 | apps/platform/src/features/store/api/catalog-controller.server.ts | apps/platform/src/features/store/contracts/store | import | no | no | lateral | present |
| E66 | apps/platform/src/features/store/api/catalog.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E67 | apps/platform/src/features/store/api/catalog.ts | apps/platform/src/server/http.server | import | yes | yes | inward | present |
| E68 | apps/platform/src/features/store/api/catalog.ts | apps/platform/src/server/container.server | import | yes | yes | outward | present |
| E69 | apps/platform/src/features/store/api/covers-controller.server.ts | external:node:stream (runtime) | import | n/a | no | outward | present |
| E70 | apps/platform/src/features/store/api/covers-controller.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E71 | apps/platform/src/features/store/api/covers-controller.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E72 | apps/platform/src/features/store/api/covers.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E73 | apps/platform/src/features/store/api/covers.ts | apps/platform/src/server/http.server | import | yes | yes | inward | present |
| E74 | apps/platform/src/features/store/api/covers.ts | apps/platform/src/server/container.server | import | yes | yes | outward | present |
| E75 | apps/platform/src/features/store/api/downloads-controller.server.ts | external:node:path (runtime) | import | n/a | no | outward | present |
| E76 | apps/platform/src/features/store/api/downloads-controller.server.ts | external:node:stream (runtime) | import | n/a | no | outward | present |
| E77 | apps/platform/src/features/store/api/downloads-controller.server.ts | @eli-coach-platform/config | import | yes | no | lateral | present |
| E78 | apps/platform/src/features/store/api/downloads-controller.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E79 | apps/platform/src/features/store/api/downloads-controller.server.ts | apps/platform/src/server/http.server | import | yes | no | lateral | present |
| E80 | apps/platform/src/features/store/api/downloads-controller.server.ts | apps/platform/src/features/store/contracts/store | import | no | no | lateral | present |
| E81 | apps/platform/src/features/store/api/downloads-controller.server.ts | apps/platform/src/features/store/api/download-recovery.html | import | no | no | lateral | present |
| E82 | apps/platform/src/features/store/api/downloads.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E83 | apps/platform/src/features/store/api/downloads.ts | apps/platform/src/server/http.server | import | yes | yes | inward | present |
| E84 | apps/platform/src/features/store/api/downloads.ts | apps/platform/src/server/container.server | import | yes | yes | outward | present |
| E85 | apps/platform/src/features/store/api/management-controller.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E86 | apps/platform/src/features/store/api/management-controller.server.ts | @eli-coach-platform/infrastructure/management-auth/server | import | yes | no | lateral | present |
| E87 | apps/platform/src/features/store/api/management-controller.server.ts | apps/platform/src/features/store/contracts/store-management | import | no | no | lateral | present |
| E88 | apps/platform/src/features/store/api/management-controller.server.ts | apps/platform/src/server/http.server | import | yes | no | lateral | present |
| E89 | apps/platform/src/features/store/api/management-product-validations.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E90 | apps/platform/src/features/store/api/management-product-validations.ts | apps/platform/src/server/http.server | import | yes | yes | inward | present |
| E91 | apps/platform/src/features/store/api/management-product-validations.ts | apps/platform/src/server/container.server | import | yes | yes | outward | present |
| E92 | apps/platform/src/features/store/api/management-product-versions.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E93 | apps/platform/src/features/store/api/management-product-versions.ts | apps/platform/src/server/http.server | import | yes | yes | inward | present |
| E94 | apps/platform/src/features/store/api/management-product-versions.ts | apps/platform/src/server/container.server | import | yes | yes | outward | present |
| E95 | apps/platform/src/features/store/api/management-product.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E96 | apps/platform/src/features/store/api/management-product.ts | apps/platform/src/server/http.server | import | yes | yes | inward | present |
| E97 | apps/platform/src/features/store/api/management-product.ts | apps/platform/src/server/container.server | import | yes | yes | outward | present |
| E98 | apps/platform/src/features/store/api/management-products.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E99 | apps/platform/src/features/store/api/management-products.ts | apps/platform/src/server/http.server | import | yes | yes | inward | present |
| E100 | apps/platform/src/features/store/api/management-products.ts | apps/platform/src/server/container.server | import | yes | yes | outward | present |
| E101 | apps/platform/src/features/store/api/zip-stream.server.ts | external:node:stream (runtime) | import | n/a | no | outward | present |
| E102 | apps/platform/src/features/store/api/zip-stream.server.ts | external:node:stream/promises (runtime) | import | n/a | no | outward | present |
| E103 | apps/platform/src/features/store/api/zip-stream.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E104 | apps/platform/src/features/store/api/zip-stream.server.ts | external:archiver (vendor) | import | n/a | yes | outward | present |
| E105 | apps/platform/src/features/store/contracts/store-management.ts | external:zod (vendor) | import | n/a | yes | outward | present |
| E106 | apps/platform/src/features/store/contracts/store.ts | external:zod (vendor) | import | n/a | yes | outward | present |
| E107 | apps/platform/src/features/store/data/acquisition-repository.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E108 | apps/platform/src/features/store/data/acquisition-repository.server.ts | external:drizzle-orm (vendor) | import | n/a | yes | outward | present |
| E109 | apps/platform/src/features/store/data/acquisition-repository.server.ts | @eli-coach-platform/db | import | yes | no | lateral | present |
| E110 | apps/platform/src/features/store/data/asset-digest.server.ts | external:node:crypto (runtime) | import | n/a | no | outward | present |
| E111 | apps/platform/src/features/store/data/asset-digest.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E112 | apps/platform/src/features/store/data/asset-store.server.ts | external:node:crypto (runtime) | import | n/a | no | outward | present |
| E113 | apps/platform/src/features/store/data/asset-store.server.ts | external:node:fs (runtime) | import | n/a | no | outward | present |
| E114 | apps/platform/src/features/store/data/asset-store.server.ts | external:node:fs/promises (runtime) | import | n/a | no | outward | present |
| E115 | apps/platform/src/features/store/data/asset-store.server.ts | external:node:path (runtime) | import | n/a | no | outward | present |
| E116 | apps/platform/src/features/store/data/asset-store.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E117 | apps/platform/src/features/store/data/catalog-repository.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E118 | apps/platform/src/features/store/data/catalog-repository.server.ts | external:drizzle-orm (vendor) | import | n/a | yes | outward | present |
| E119 | apps/platform/src/features/store/data/catalog-repository.server.ts | @eli-coach-platform/db | import | yes | no | lateral | present |
| E120 | apps/platform/src/features/store/data/download-grant-repository.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E121 | apps/platform/src/features/store/data/download-grant-repository.server.ts | external:drizzle-orm (vendor) | import | n/a | yes | outward | present |
| E122 | apps/platform/src/features/store/data/download-grant-repository.server.ts | @eli-coach-platform/db | import | yes | no | lateral | present |
| E123 | apps/platform/src/features/store/data/download-token.server.ts | external:node:crypto (runtime) | import | n/a | no | outward | present |
| E124 | apps/platform/src/features/store/data/download-token.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E125 | apps/platform/src/features/store/data/publication-repository.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E126 | apps/platform/src/features/store/data/publication-repository.server.ts | external:drizzle-orm (vendor) | import | n/a | yes | outward | present |
| E127 | apps/platform/src/features/store/data/publication-repository.server.ts | @eli-coach-platform/db | import | yes | no | lateral | present |
| E128 | apps/platform/src/features/store/data/schema.server.ts | external:drizzle-orm (vendor) | import | n/a | yes | outward | present |
| E129 | apps/platform/src/features/store/data/schema.server.ts | external:drizzle-orm/pg-core (vendor) | import | n/a | yes | outward | present |
| E130 | apps/platform/src/features/store/data/schema.server.ts | @eli-coach-platform/db | import | yes | yes | inward | present |
| E131 | apps/platform/src/features/store/email/create-store-delivery-service.server.ts | @eli-coach-platform/config | import | yes | no | lateral | present |
| E132 | apps/platform/src/features/store/email/create-store-delivery-service.server.ts | @eli-coach-platform/infrastructure/email/server | import | yes | no | lateral | present |
| E133 | apps/platform/src/features/store/email/create-store-delivery-service.server.ts | apps/platform/src/features/store/email/disabled-store-delivery-service.server | import | no | no | lateral | present |
| E134 | apps/platform/src/features/store/email/create-store-delivery-service.server.ts | apps/platform/src/features/store/email/email-store-delivery-service.server | import | no | no | lateral | present |
| E135 | apps/platform/src/features/store/email/disabled-store-delivery-service.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E136 | apps/platform/src/features/store/email/disabled-store-delivery-service.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E137 | apps/platform/src/features/store/email/email-store-delivery-service.server.ts | @eli-coach-platform/config | import | yes | no | lateral | present |
| E138 | apps/platform/src/features/store/email/email-store-delivery-service.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E139 | apps/platform/src/features/store/email/email-store-delivery-service.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E140 | apps/platform/src/features/store/email/email-store-delivery-service.server.ts | @eli-coach-platform/infrastructure/email/server | import | yes | no | lateral | present |
| E141 | apps/platform/src/features/store/email/email-store-delivery-service.server.ts | apps/platform/src/features/store/email/store-delivery-email.server | import | no | no | lateral | present |
| E142 | apps/platform/src/features/store/email/store-delivery-email-template.server.tsx | @eli-coach-platform/infrastructure/email/server | import | yes | no | lateral | present |
| E143 | apps/platform/src/features/store/email/store-delivery-email-template.server.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E144 | apps/platform/src/features/store/email/store-delivery-email.server.ts | external:react (framework) | import | n/a | yes | outward | present |
| E145 | apps/platform/src/features/store/email/store-delivery-email.server.ts | external:react-dom/server (framework) | import | n/a | yes | outward | present |
| E146 | apps/platform/src/features/store/email/store-delivery-email.server.ts | apps/platform/src/features/store/email/store-delivery-email-template.server | import | no | no | lateral | present |
| E147 | apps/platform/src/features/store/ui/public/acquisition-form.ts | external:@hookform/resolvers/zod (framework) | import | n/a | yes | outward | present |
| E148 | apps/platform/src/features/store/ui/public/acquisition-form.ts | external:react (framework) | import | n/a | yes | outward | present |
| E149 | apps/platform/src/features/store/ui/public/acquisition-form.ts | external:react-hook-form (framework) | import | n/a | yes | outward | present |
| E150 | apps/platform/src/features/store/ui/public/acquisition-form.ts | @eli-coach-platform/infrastructure/bot-detection | import | yes | no | lateral | present |
| E151 | apps/platform/src/features/store/ui/public/acquisition-form.ts | apps/platform/src/features/store/contracts/store | import | no | no | lateral | present |
| E152 | apps/platform/src/features/store/ui/public/acquisition-form.ts | apps/platform/src/features/store/ui/public/cart | import | no | no | lateral | present |
| E153 | apps/platform/src/features/store/ui/public/acquisition-form.ts | apps/platform/src/features/store/ui/public/api-client | import | no | no | lateral | present |
| E154 | apps/platform/src/features/store/ui/public/api-client.ts | @eli-coach-platform/config | import | yes | no | lateral | present |
| E155 | apps/platform/src/features/store/ui/public/api-client.ts | external:react (framework) | import | n/a | yes | outward | present |
| E156 | apps/platform/src/features/store/ui/public/api-client.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E157 | apps/platform/src/features/store/ui/public/api-client.ts | apps/platform/src/features/store/contracts/store | import | no | no | lateral | present |
| E158 | apps/platform/src/features/store/ui/public/cart-drawer.tsx | @eli-coach-platform/content | import | yes | yes | inward | present |
| E159 | apps/platform/src/features/store/ui/public/cart-drawer.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E160 | apps/platform/src/features/store/ui/public/cart-drawer.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E161 | apps/platform/src/features/store/ui/public/cart-drawer.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E162 | apps/platform/src/features/store/ui/public/cart-drawer.tsx | external:react-hook-form (framework) | import | n/a | yes | outward | present |
| E163 | apps/platform/src/features/store/ui/public/cart-drawer.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E164 | apps/platform/src/features/store/ui/public/cart-drawer.tsx | @eli-coach-platform/infrastructure/bot-detection | import | yes | yes | inward | present |
| E165 | apps/platform/src/features/store/ui/public/cart-drawer.tsx | apps/platform/src/features/store/contracts/store | import | no | yes | inward | present |
| E166 | apps/platform/src/features/store/ui/public/cart-drawer.tsx | apps/platform/src/features/store/ui/public/cart | import | no | yes | inward | present |
| E167 | apps/platform/src/features/store/ui/public/cart-drawer.tsx | apps/platform/src/features/store/ui/public/cart-provider | import | no | no | lateral | present |
| E168 | apps/platform/src/features/store/ui/public/cart-drawer.tsx | apps/platform/src/features/store/ui/public/acquisition-form | import | no | yes | inward | present |
| E169 | apps/platform/src/features/store/ui/public/cart-drawer.tsx | apps/platform/src/features/store/ui/public/api-client | import | no | yes | inward | present |
| E170 | apps/platform/src/features/store/ui/public/cart-provider.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E171 | apps/platform/src/features/store/ui/public/cart-provider.tsx | external:zustand (framework) | import | n/a | yes | outward | present |
| E172 | apps/platform/src/features/store/ui/public/cart-provider.tsx | apps/platform/src/features/store/ui/public/cart | import | no | yes | inward | present |
| E173 | apps/platform/src/features/store/ui/public/cart.ts | external:react (framework) | import | n/a | yes | outward | present |
| E174 | apps/platform/src/features/store/ui/public/cart.ts | external:zustand/middleware (framework) | import | n/a | yes | outward | present |
| E175 | apps/platform/src/features/store/ui/public/cart.ts | external:zustand/middleware (framework) | import | n/a | yes | outward | present |
| E176 | apps/platform/src/features/store/ui/public/cart.ts | external:zustand/vanilla (framework) | import | n/a | yes | outward | present |
| E177 | apps/platform/src/features/store/ui/public/cart.ts | apps/platform/src/features/store/contracts/store | import | no | no | lateral | present |
| E178 | apps/platform/src/features/store/ui/public/catalog-filter-controls.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E179 | apps/platform/src/features/store/ui/public/catalog-filter-controls.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E180 | apps/platform/src/features/store/ui/public/catalog-filter-controls.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E181 | apps/platform/src/features/store/ui/public/catalog-filter-controls.tsx | apps/platform/src/features/store/ui/public/catalog-filters | import | no | yes | inward | present |
| E182 | apps/platform/src/features/store/ui/public/catalog-filters.ts | @eli-coach-platform/ui | import | yes | no | lateral | present |
| E183 | apps/platform/src/features/store/ui/public/catalog-filters.ts | apps/platform/src/features/store/contracts/store | import | no | no | lateral | present |
| E184 | apps/platform/src/features/store/ui/public/catalog-page.server.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E185 | apps/platform/src/features/store/ui/public/catalog-page.server.ts | apps/platform/src/server/container.server | import | yes | yes | outward | present |
| E186 | apps/platform/src/features/store/ui/public/catalog-page.server.ts | apps/platform/src/features/store/contracts/store | import | no | no | lateral | present |
| E187 | apps/platform/src/features/store/ui/public/catalog-page.server.ts | apps/platform/src/features/store/ui/public/catalog-filters | import | no | no | lateral | present |
| E188 | apps/platform/src/features/store/ui/public/catalog-page.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E189 | apps/platform/src/features/store/ui/public/catalog-page.tsx | apps/platform/src/features/store/ui/public/catalog-view | import | no | no | lateral | present |
| E190 | apps/platform/src/features/store/ui/public/catalog-page.tsx | apps/platform/src/features/store/ui/public/catalog-filters | import | no | yes | inward | present |
| E191 | apps/platform/src/features/store/ui/public/catalog-page.tsx | apps/platform/src/features/store/ui/public/catalog-page.server | import | no | yes | inward | present |
| E192 | apps/platform/src/features/store/ui/public/catalog-view.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E193 | apps/platform/src/features/store/ui/public/catalog-view.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E194 | apps/platform/src/features/store/ui/public/catalog-view.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E195 | apps/platform/src/features/store/ui/public/catalog-view.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E196 | apps/platform/src/features/store/ui/public/catalog-view.tsx | apps/platform/src/features/store/contracts/store | import | no | yes | inward | present |
| E197 | apps/platform/src/features/store/ui/public/catalog-view.tsx | apps/platform/src/features/store/ui/public/cart | import | no | yes | inward | present |
| E198 | apps/platform/src/features/store/ui/public/catalog-view.tsx | apps/platform/src/features/store/ui/public/cart-provider | import | no | no | lateral | present |
| E199 | apps/platform/src/features/store/ui/public/catalog-view.tsx | apps/platform/src/features/store/ui/public/catalog-filter-controls | import | no | no | lateral | present |
| E200 | apps/platform/src/features/store/ui/public/catalog-view.tsx | apps/platform/src/features/store/ui/public/catalog-filters | import | no | yes | inward | present |
| E201 | apps/platform/src/features/store/ui/public/download-page.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E202 | apps/platform/src/features/store/ui/public/download-page.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E203 | apps/platform/src/features/store/ui/public/download-page.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E204 | apps/platform/src/features/store/ui/public/download-page.tsx | apps/platform/src/features/store/ui/public/download-state | import | no | yes | inward | present |
| E205 | apps/platform/src/features/store/ui/public/download-state.ts | @eli-coach-platform/config | import | yes | no | lateral | present |
| E206 | apps/platform/src/features/store/ui/public/download-state.ts | external:react (framework) | import | n/a | yes | outward | present |
| E207 | apps/platform/src/features/store/ui/public/product-page.server.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E208 | apps/platform/src/features/store/ui/public/product-page.server.ts | apps/platform/src/server/container.server | import | yes | yes | outward | present |
| E209 | apps/platform/src/features/store/ui/public/product-page.server.ts | apps/platform/src/features/store/contracts/store | import | no | no | lateral | present |
| E210 | apps/platform/src/features/store/ui/public/product-page.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E211 | apps/platform/src/features/store/ui/public/product-page.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E212 | apps/platform/src/features/store/ui/public/product-page.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E213 | apps/platform/src/features/store/ui/public/product-page.tsx | apps/platform/src/features/store/ui/public/cart-provider | import | no | no | lateral | present |
| E214 | apps/platform/src/features/store/ui/public/product-page.tsx | apps/platform/src/features/store/ui/public/product-page.server | import | no | yes | inward | present |
| E215 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | apps/platform/src/features/waitlist/contracts/waitlist | import | no | no | lateral | present |
| E216 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E217 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | external:node:crypto (runtime) | import | n/a | no | outward | present |
| E218 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | @eli-coach-platform/infrastructure/bot-detection | import | yes | no | lateral | present |
| E219 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | @eli-coach-platform/infrastructure/bot-detection/server | import | yes | no | lateral | present |
| E220 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | apps/platform/src/server/http.server | import | yes | no | lateral | present |
| E221 | apps/platform/src/features/waitlist/api/waitlist.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E222 | apps/platform/src/features/waitlist/api/waitlist.ts | apps/platform/src/server/http.server | import | yes | yes | inward | present |
| E223 | apps/platform/src/features/waitlist/api/waitlist.ts | apps/platform/src/server/container.server | import | yes | yes | outward | present |
| E224 | apps/platform/src/features/waitlist/contracts/waitlist.ts | external:zod (vendor) | import | n/a | yes | outward | present |
| E225 | apps/platform/src/features/waitlist/data/repository.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E226 | apps/platform/src/features/waitlist/data/repository.server.ts | @eli-coach-platform/db | import | yes | no | lateral | present |
| E227 | apps/platform/src/features/waitlist/data/repository.server.ts | external:drizzle-orm (vendor) | import | n/a | yes | outward | present |
| E228 | apps/platform/src/features/waitlist/data/repository.server.ts | external:pg (vendor) | import | n/a | yes | outward | present |
| E229 | apps/platform/src/features/waitlist/data/repository.server.ts | apps/platform/src/features/waitlist/data/schema.server | import | no | no | lateral | present |
| E230 | apps/platform/src/features/waitlist/data/schema.server.ts | external:drizzle-orm/pg-core (vendor) | import | n/a | yes | outward | present |
| E231 | apps/platform/src/features/waitlist/data/schema.server.ts | @eli-coach-platform/db | import | yes | no | lateral | present |
| E232 | apps/platform/src/features/waitlist/email/create-waitlist-confirmation-service.server.ts | @eli-coach-platform/config | import | yes | yes | inward | present |
| E233 | apps/platform/src/features/waitlist/email/create-waitlist-confirmation-service.server.ts | @eli-coach-platform/content | import | yes | yes | inward | present |
| E234 | apps/platform/src/features/waitlist/email/create-waitlist-confirmation-service.server.ts | @eli-coach-platform/infrastructure/email/server | import | yes | yes | inward | present |
| E235 | apps/platform/src/features/waitlist/email/create-waitlist-confirmation-service.server.ts | apps/platform/src/features/waitlist/email/disabled-waitlist-confirmation-service.server | import | no | yes | inward | present |
| E236 | apps/platform/src/features/waitlist/email/create-waitlist-confirmation-service.server.ts | apps/platform/src/features/waitlist/email/email-waitlist-confirmation-service.server | import | no | yes | inward | present |
| E237 | apps/platform/src/features/waitlist/email/disabled-waitlist-confirmation-service.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E238 | apps/platform/src/features/waitlist/email/email-waitlist-confirmation-service.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E239 | apps/platform/src/features/waitlist/email/email-waitlist-confirmation-service.server.ts | @eli-coach-platform/infrastructure/email/server | import | yes | no | lateral | present |
| E240 | apps/platform/src/features/waitlist/email/email-waitlist-confirmation-service.server.ts | apps/platform/src/features/waitlist/email/waitlist-confirmation-email.server | import | no | no | lateral | present |
| E241 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email-template.server.tsx | @eli-coach-platform/infrastructure/email/server | import | yes | no | lateral | present |
| E242 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email-template.server.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E243 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E244 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email.server.ts | external:react (framework) | import | n/a | yes | outward | present |
| E245 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email.server.ts | external:react-dom/server (framework) | import | n/a | yes | outward | present |
| E246 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email.server.ts | apps/platform/src/features/waitlist/email/waitlist-confirmation-email-template.server | import | no | no | lateral | present |
| E247 | apps/platform/src/features/waitlist/ui/public/api-client.ts | @eli-coach-platform/config | import | yes | no | lateral | present |
| E248 | apps/platform/src/features/waitlist/ui/public/api-client.ts | external:react (framework) | import | n/a | yes | outward | present |
| E249 | apps/platform/src/features/waitlist/ui/public/api-client.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E250 | apps/platform/src/features/waitlist/ui/public/api-client.ts | apps/platform/src/features/waitlist/contracts/waitlist | import | no | no | lateral | present |
| E251 | apps/platform/src/features/waitlist/ui/public/api-client.ts | apps/platform/src/features/waitlist/ui/public/errors | import | no | no | lateral | present |
| E252 | apps/platform/src/features/waitlist/ui/public/availability-status.tsx | apps/platform/src/features/waitlist/contracts/waitlist | import | no | no | lateral | present |
| E253 | apps/platform/src/features/waitlist/ui/public/availability-status.tsx | @eli-coach-platform/ui | import | yes | no | lateral | present |
| E254 | apps/platform/src/features/waitlist/ui/public/confetti.ts | external:canvas-confetti (framework) | import | n/a | yes | outward | present |
| E255 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | @eli-coach-platform/content | import | yes | yes | inward | present |
| E256 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | apps/platform/src/features/waitlist/contracts/waitlist | import | no | no | lateral | present |
| E257 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | @eli-coach-platform/ui | import | yes | no | lateral | present |
| E258 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E259 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E260 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E261 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | @eli-coach-platform/infrastructure/bot-detection | import | yes | no | lateral | present |
| E262 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | apps/platform/src/features/waitlist/ui/public/errors | import | no | no | lateral | present |
| E263 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | apps/platform/src/features/waitlist/ui/public/api-client | import | no | no | lateral | present |
| E264 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | apps/platform/src/features/waitlist/ui/public/submission | import | no | no | lateral | present |
| E265 | apps/platform/src/features/waitlist/ui/public/errors.ts | apps/platform/src/features/waitlist/contracts/waitlist | import | no | no | lateral | present |
| E266 | apps/platform/src/features/waitlist/ui/public/submission.ts | external:react (framework) | import | n/a | yes | outward | present |
| E267 | apps/platform/src/features/waitlist/ui/public/submission.ts | @eli-coach-platform/infrastructure/bot-detection | import | yes | no | lateral | present |
| E268 | apps/platform/src/features/waitlist/ui/public/submission.ts | apps/platform/src/features/waitlist/ui/public/api-client | import | no | no | lateral | present |
| E269 | apps/platform/src/features/waitlist/ui/public/submission.ts | apps/platform/src/features/waitlist/ui/public/confetti | import | no | no | lateral | present |
| E270 | apps/platform/src/features/waitlist/ui/public/submission.ts | apps/platform/src/features/waitlist/ui/public/errors | import | no | no | lateral | present |
| E271 | apps/platform/src/root-error-page.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E272 | apps/platform/src/root-error-page.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E273 | apps/platform/src/root-error-page.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E274 | apps/platform/src/root.server.ts | external:@clerk/react-router/server (vendor) | import | n/a | yes | outward | present |
| E275 | apps/platform/src/root.server.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E276 | apps/platform/src/root.server.ts | apps/platform/src/features/accounts/server/account-resolution-middleware.server | import | yes | yes | inward | present |
| E277 | apps/platform/src/root.server.ts | apps/platform/src/server/container.server | import | yes | no | lateral | present |
| E278 | apps/platform/src/root.server.ts | apps/platform/src/server/runtime-environment.server | import | yes | yes | inward | present |
| E279 | apps/platform/src/root.tsx | external:@clerk/react-router (vendor) | import | n/a | yes | outward | present |
| E280 | apps/platform/src/root.tsx | @eli-coach-platform/config | import | yes | yes | inward | present |
| E281 | apps/platform/src/root.tsx | external:motion/react (framework) | import | n/a | yes | outward | present |
| E282 | apps/platform/src/root.tsx | apps/platform/src/app.css | import | no | no | lateral | present |
| E283 | apps/platform/src/root.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E284 | apps/platform/src/root.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E285 | apps/platform/src/root.tsx | apps/platform/src/features/accounts/ui/shared/access-denied-page | import | yes | no | lateral | present |
| E286 | apps/platform/src/root.tsx | apps/platform/src/root-error-page | import | no | no | lateral | present |
| E287 | apps/platform/src/root.tsx | apps/platform/src/root.server | import | no | yes | outward | present |
| E288 | apps/platform/src/root.tsx | apps/platform/src/root.server | import | no | yes | outward | present |
| E289 | apps/platform/src/routes.ts | external:@react-router/dev/routes (framework) | import | n/a | yes | outward | present |
| E290 | apps/platform/src/server/api/app-metadata-controller.server.ts | apps/platform/src/server/api/service-metadata | import | no | no | lateral | present |
| E291 | apps/platform/src/server/api/feature-flags.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E292 | apps/platform/src/server/api/feature-flags.ts | apps/platform/src/server/http.server | import | no | yes | inward | present |
| E293 | apps/platform/src/server/api/feature-flags.ts | apps/platform/src/server/container.server | import | no | yes | outward | present |
| E294 | apps/platform/src/server/api/meta.ts | apps/platform/src/server/container.server | import | no | yes | outward | present |
| E295 | apps/platform/src/server/api/meta.ts | apps/platform/src/server/http.server | import | no | yes | inward | present |
| E296 | apps/platform/src/server/api/readyz-controller.server.ts | @eli-coach-platform/config | import | yes | no | lateral | present |
| E297 | apps/platform/src/server/api/readyz.ts | apps/platform/src/server/container.server | import | no | yes | outward | present |
| E298 | apps/platform/src/server/api/readyz.ts | apps/platform/src/server/http.server | import | no | yes | inward | present |
| E299 | apps/platform/src/server/api/service-metadata.ts | external:zod (vendor) | import | n/a | yes | outward | present |
| E300 | apps/platform/src/server/container.server.ts | apps/platform/src/server/api/app-metadata-controller.server | import | no | yes | inward | present |
| E301 | apps/platform/src/server/container.server.ts | apps/platform/src/features/accounts/api/account-controller.server | import | yes | yes | inward | present |
| E302 | apps/platform/src/server/container.server.ts | apps/platform/src/features/accounts/api/webhook-controller.server | import | yes | yes | inward | present |
| E303 | apps/platform/src/server/container.server.ts | apps/platform/src/features/accounts/data/account-repository.server | import | yes | yes | inward | present |
| E304 | apps/platform/src/server/container.server.ts | @eli-coach-platform/infrastructure/bot-detection | import | yes | yes | inward | present |
| E305 | apps/platform/src/server/container.server.ts | @eli-coach-platform/infrastructure/bot-detection/server | import | yes | yes | inward | present |
| E306 | apps/platform/src/server/container.server.ts | @eli-coach-platform/infrastructure/feature-flags/server | import | yes | yes | inward | present |
| E307 | apps/platform/src/server/container.server.ts | @eli-coach-platform/infrastructure/management-auth/server | import | yes | yes | inward | present |
| E308 | apps/platform/src/server/container.server.ts | apps/platform/src/server/api/readyz-controller.server | import | no | yes | inward | present |
| E309 | apps/platform/src/server/container.server.ts | apps/platform/src/features/store/data/asset-store.server | import | yes | yes | inward | present |
| E310 | apps/platform/src/server/container.server.ts | apps/platform/src/features/store/email/create-store-delivery-service.server | import | yes | yes | inward | present |
| E311 | apps/platform/src/server/container.server.ts | apps/platform/src/features/store/api/acquisitions-controller.server | import | yes | yes | inward | present |
| E312 | apps/platform/src/server/container.server.ts | apps/platform/src/features/store/api/catalog-controller.server | import | yes | yes | inward | present |
| E313 | apps/platform/src/server/container.server.ts | apps/platform/src/features/store/api/management-controller.server | import | yes | yes | inward | present |
| E314 | apps/platform/src/server/container.server.ts | apps/platform/src/features/store/data/asset-digest.server | import | yes | yes | inward | present |
| E315 | apps/platform/src/server/container.server.ts | apps/platform/src/features/store/data/publication-repository.server | import | yes | yes | inward | present |
| E316 | apps/platform/src/server/container.server.ts | apps/platform/src/features/store/api/covers-controller.server | import | yes | yes | inward | present |
| E317 | apps/platform/src/server/container.server.ts | apps/platform/src/features/store/api/downloads-controller.server | import | yes | yes | inward | present |
| E318 | apps/platform/src/server/container.server.ts | apps/platform/src/features/store/data/download-token.server | import | yes | yes | inward | present |
| E319 | apps/platform/src/server/container.server.ts | apps/platform/src/features/store/api/zip-stream.server | import | yes | yes | inward | present |
| E320 | apps/platform/src/server/container.server.ts | apps/platform/src/features/waitlist/api/waitlist-controller.server | import | yes | yes | inward | present |
| E321 | apps/platform/src/server/container.server.ts | apps/platform/src/features/waitlist/email/create-waitlist-confirmation-service.server | import | yes | no | lateral | present |
| E322 | apps/platform/src/server/container.server.ts | @eli-coach-platform/config | import | yes | yes | inward | present |
| E323 | apps/platform/src/server/container.server.ts | @eli-coach-platform/content | import | yes | yes | inward | present |
| E324 | apps/platform/src/server/container.server.ts | apps/platform/src/features/store/data/acquisition-repository.server | import | yes | yes | inward | present |
| E325 | apps/platform/src/server/container.server.ts | apps/platform/src/features/store/data/catalog-repository.server | import | yes | yes | inward | present |
| E326 | apps/platform/src/server/container.server.ts | apps/platform/src/features/store/data/download-grant-repository.server | import | yes | yes | inward | present |
| E327 | apps/platform/src/server/container.server.ts | apps/platform/src/features/waitlist/data/repository.server | import | yes | yes | inward | present |
| E328 | apps/platform/src/server/container.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E329 | apps/platform/src/server/container.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E330 | apps/platform/src/server/container.server.ts | apps/platform/src/server/database.server | import | no | yes | inward | present |
| E331 | apps/platform/src/server/container.server.ts | apps/platform/src/server/runtime-environment.server | import | no | yes | inward | present |
| E332 | apps/platform/src/server/database.server.ts | @eli-coach-platform/config | import | yes | yes | inward | present |
| E333 | apps/platform/src/server/database.server.ts | @eli-coach-platform/db | import | yes | yes | inward | present |
| E334 | apps/platform/src/server/database.server.ts | external:pg (vendor) | import | n/a | yes | outward | present |
| E335 | apps/platform/src/server/runtime-environment.server.ts | @eli-coach-platform/config | import | yes | yes | inward | present |
| E336 | apps/platform/src/surfaces/client-portal/api/manifest.ts | @eli-coach-platform/config | import | yes | no | lateral | present |
| E337 | apps/platform/src/surfaces/client-portal/api/manifest.ts | @eli-coach-platform/infrastructure/pwa | import | yes | no | lateral | present |
| E338 | apps/platform/src/surfaces/client-portal/api/sw.ts | apps/platform/src/surfaces/client-portal/api/service-worker.js | import | no | yes | outward | present |
| E339 | apps/platform/src/surfaces/client-portal/pages/home.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E340 | apps/platform/src/surfaces/client-portal/pages/home.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E341 | apps/platform/src/surfaces/client-portal/shell/layout.server.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E342 | apps/platform/src/surfaces/client-portal/shell/layout.server.ts | apps/platform/src/features/accounts/server/require-account.server | import | yes | yes | inward | present |
| E343 | apps/platform/src/surfaces/client-portal/shell/layout.server.ts | apps/platform/src/server/runtime-environment.server | import | yes | no | lateral | present |
| E344 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | @eli-coach-platform/infrastructure/pwa | import | yes | yes | inward | present |
| E345 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E346 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E347 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | apps/platform/src/surfaces/client-portal/shell/navigation-links | import | no | yes | inward | present |
| E348 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | apps/platform/src/surfaces/client-portal/shell/layout.server | import | no | no | lateral | present |
| E349 | apps/platform/src/surfaces/coach-portal/pages/home.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E350 | apps/platform/src/surfaces/coach-portal/pages/home.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E351 | apps/platform/src/surfaces/coach-portal/shell/layout.server.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E352 | apps/platform/src/surfaces/coach-portal/shell/layout.server.ts | apps/platform/src/features/accounts/server/require-account.server | import | yes | yes | inward | present |
| E353 | apps/platform/src/surfaces/coach-portal/shell/layout.server.ts | apps/platform/src/server/runtime-environment.server | import | yes | no | lateral | present |
| E354 | apps/platform/src/surfaces/coach-portal/shell/layout.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E355 | apps/platform/src/surfaces/coach-portal/shell/layout.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E356 | apps/platform/src/surfaces/coach-portal/shell/layout.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E357 | apps/platform/src/surfaces/coach-portal/shell/layout.tsx | apps/platform/src/surfaces/coach-portal/shell/navigation-links | import | no | yes | inward | present |
| E358 | apps/platform/src/surfaces/coach-portal/shell/layout.tsx | apps/platform/src/surfaces/coach-portal/shell/layout.server | import | no | no | lateral | present |
| E359 | apps/platform/src/surfaces/coach-portal/shell/navigation-links.tsx | @eli-coach-platform/ui | import | yes | no | lateral | present |
| E360 | apps/platform/src/surfaces/coach-portal/shell/navigation-links.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E361 | apps/platform/src/surfaces/public-site/pages/blog.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E362 | apps/platform/src/surfaces/public-site/pages/blog.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E363 | apps/platform/src/surfaces/public-site/pages/home.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E364 | apps/platform/src/surfaces/public-site/pages/home.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E365 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/shell/layout | import | no | yes | inward | present |
| E366 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/sections/about/about | import | no | no | lateral | present |
| E367 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition | import | no | no | lateral | present |
| E368 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/sections/hero/hero | import | no | no | lateral | present |
| E369 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/sections/my-method/my-method | import | no | no | lateral | present |
| E370 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/sections/platform/platform | import | no | no | lateral | present |
| E371 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/sections/workouts/workouts | import | no | no | lateral | present |
| E372 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E373 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E374 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/surfaces/public-site/shell/layout | import | no | yes | inward | present |
| E375 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/features/coaching-bundles/ui/public/bundle-selector | import | yes | yes | inward | present |
| E376 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/features/waitlist/ui/public/availability-status | import | yes | yes | inward | present |
| E377 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/features/waitlist/ui/public/email-form | import | yes | yes | inward | present |
| E378 | apps/platform/src/surfaces/public-site/pages/privacy.tsx | @eli-coach-platform/content | import | yes | yes | inward | present |
| E379 | apps/platform/src/surfaces/public-site/pages/privacy.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E380 | apps/platform/src/surfaces/public-site/pages/privacy.tsx | apps/platform/src/surfaces/public-site/sections/legal/legal-document-view | import | no | no | lateral | present |
| E381 | apps/platform/src/surfaces/public-site/pages/terms.tsx | @eli-coach-platform/content | import | yes | yes | inward | present |
| E382 | apps/platform/src/surfaces/public-site/pages/terms.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E383 | apps/platform/src/surfaces/public-site/pages/terms.tsx | apps/platform/src/surfaces/public-site/sections/legal/legal-document-view | import | no | no | lateral | present |
| E384 | apps/platform/src/surfaces/public-site/sections/about/about-content.ts | @eli-coach-platform/config | import | yes | no | lateral | present |
| E385 | apps/platform/src/surfaces/public-site/sections/about/about.tsx | apps/platform/src/features/waitlist/contracts/waitlist | import | yes | yes | inward | present |
| E386 | apps/platform/src/surfaces/public-site/sections/about/about.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E387 | apps/platform/src/surfaces/public-site/sections/about/about.tsx | external:motion/react (framework) | import | n/a | yes | outward | present |
| E388 | apps/platform/src/surfaces/public-site/sections/about/about.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E389 | apps/platform/src/surfaces/public-site/sections/about/about.tsx | apps/platform/src/surfaces/public-site/sections/about/about-content | import | no | yes | inward | present |
| E390 | apps/platform/src/surfaces/public-site/sections/about/about.tsx | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget | import | no | no | lateral | present |
| E391 | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E392 | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E393 | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | external:motion/react (framework) | import | n/a | yes | outward | present |
| E394 | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E395 | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | apps/platform/src/surfaces/public-site/sections/about/about-content | import | no | yes | inward | present |
| E396 | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E397 | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | external:motion/react (framework) | import | n/a | yes | outward | present |
| E398 | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E399 | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition-content | import | no | yes | inward | present |
| E400 | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.css | import | no | no | lateral | present |
| E401 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | apps/platform/src/features/waitlist/contracts/waitlist | import | yes | yes | inward | present |
| E402 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E403 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | external:motion/react (framework) | import | n/a | yes | outward | present |
| E404 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E405 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E406 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | @eli-coach-platform/infrastructure/bot-detection | import | yes | yes | inward | present |
| E407 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | apps/platform/src/surfaces/public-site/sections/legal/legal-nav | import | no | no | lateral | present |
| E408 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | apps/platform/src/features/waitlist/ui/public/availability-status | import | yes | yes | inward | present |
| E409 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | apps/platform/src/features/waitlist/ui/public/email-form | import | yes | yes | inward | present |
| E410 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | @eli-coach-platform/config | import | yes | yes | inward | present |
| E411 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | apps/platform/src/features/waitlist/contracts/waitlist | import | yes | yes | inward | present |
| E412 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E413 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E414 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | external:motion/react (framework) | import | n/a | yes | outward | present |
| E415 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E416 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E417 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E418 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | @eli-coach-platform/infrastructure/bot-detection | import | yes | yes | inward | present |
| E419 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | apps/platform/src/features/waitlist/ui/public/availability-status | import | yes | yes | inward | present |
| E420 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | apps/platform/src/features/waitlist/ui/public/email-form | import | yes | yes | inward | present |
| E421 | apps/platform/src/surfaces/public-site/sections/legal/legal-document-view.tsx | @eli-coach-platform/content | import | yes | yes | inward | present |
| E422 | apps/platform/src/surfaces/public-site/sections/legal/legal-document-view.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E423 | apps/platform/src/surfaces/public-site/sections/legal/legal-document-view.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E424 | apps/platform/src/surfaces/public-site/sections/legal/legal-nav.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E425 | apps/platform/src/surfaces/public-site/sections/my-method/my-method.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E426 | apps/platform/src/surfaces/public-site/sections/my-method/my-method.tsx | external:motion/react (framework) | import | n/a | yes | outward | present |
| E427 | apps/platform/src/surfaces/public-site/sections/my-method/my-method.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E428 | apps/platform/src/surfaces/public-site/sections/platform/platform-content.ts | external:react (framework) | import | n/a | yes | outward | present |
| E429 | apps/platform/src/surfaces/public-site/sections/platform/platform-content.ts | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E430 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E431 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E432 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | external:motion/react (framework) | import | n/a | yes | outward | present |
| E433 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E434 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E435 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | apps/platform/src/surfaces/public-site/sections/platform/platform-content | import | no | yes | inward | present |
| E436 | apps/platform/src/surfaces/public-site/sections/workouts/workouts.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E437 | apps/platform/src/surfaces/public-site/sections/workouts/workouts.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E438 | apps/platform/src/surfaces/public-site/sections/workouts/workouts.tsx | external:motion/react (framework) | import | n/a | yes | outward | present |
| E439 | apps/platform/src/surfaces/public-site/sections/workouts/workouts.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E440 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | @eli-coach-platform/config | import | yes | no | lateral | present |
| E441 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E442 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | @eli-coach-platform/infrastructure/bot-detection | import | yes | no | lateral | present |
| E443 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/features/accounts/contracts/account | import | yes | no | lateral | present |
| E444 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/features/accounts/server/account-context.server | import | yes | yes | outward | present |
| E445 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/features/waitlist/contracts/waitlist | import | yes | no | lateral | present |
| E446 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/server/container.server | import | yes | yes | outward | present |
| E447 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/server/runtime-environment.server | import | yes | yes | outward | present |
| E448 | apps/platform/src/surfaces/public-site/shell/layout.tsx | apps/platform/src/features/waitlist/contracts/waitlist | import | yes | yes | inward | present |
| E449 | apps/platform/src/surfaces/public-site/shell/layout.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E450 | apps/platform/src/surfaces/public-site/shell/layout.tsx | @eli-coach-platform/infrastructure/bot-detection | import | yes | yes | inward | present |
| E451 | apps/platform/src/surfaces/public-site/shell/layout.tsx | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta | import | no | no | lateral | present |
| E452 | apps/platform/src/surfaces/public-site/shell/layout.tsx | apps/platform/src/features/store/ui/public/cart-drawer | import | yes | no | lateral | present |
| E453 | apps/platform/src/surfaces/public-site/shell/layout.tsx | apps/platform/src/features/store/ui/public/cart-provider | import | yes | no | lateral | present |
| E454 | apps/platform/src/surfaces/public-site/shell/layout.tsx | apps/platform/src/surfaces/public-site/shell/public-layout | import | no | no | lateral | present |
| E455 | apps/platform/src/surfaces/public-site/shell/layout.tsx | apps/platform/src/surfaces/public-site/shell/layout.server | import | no | yes | inward | present |
| E456 | apps/platform/src/surfaces/public-site/shell/logo.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E457 | apps/platform/src/surfaces/public-site/shell/logo.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E458 | apps/platform/src/surfaces/public-site/shell/public-footer.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E459 | apps/platform/src/surfaces/public-site/shell/public-footer.tsx | apps/platform/src/surfaces/public-site/sections/legal/legal-nav | import | no | no | lateral | present |
| E460 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E461 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/features/accounts/contracts/account | import | yes | yes | inward | present |
| E462 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/features/accounts/ui/public/auth-nav-actions | import | yes | no | lateral | present |
| E463 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/features/waitlist/contracts/waitlist | import | yes | yes | inward | present |
| E464 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E465 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/surfaces/public-site/shell/public-navigation | import | no | no | lateral | present |
| E466 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/surfaces/public-site/shell/public-footer | import | no | no | lateral | present |
| E467 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | external:lucide-react (framework) | import | n/a | yes | outward | present |
| E468 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | external:motion/react (framework) | import | n/a | yes | outward | present |
| E469 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E470 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E471 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | @eli-coach-platform/ui | import | yes | yes | inward | present |
| E472 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | apps/platform/src/surfaces/public-site/shell/logo | import | no | no | lateral | present |
| E473 | apps/platform/db/drizzle.config.ts | external:drizzle-kit (vendor) | import | n/a | yes | outward | present |
| E474 | packages/config/src/index.ts | external:zod (vendor) | import | n/a | yes | outward | present |
| E475 | packages/content/src/index.ts | packages/content/src/legal-document | import | no | yes | inward | present |
| E476 | packages/content/src/index.ts | packages/content/src/privacy-policy | import | no | yes | inward | present |
| E477 | packages/content/src/index.ts | packages/content/src/website-and-store-terms/current | import | no | yes | inward | present |
| E478 | packages/content/src/index.ts | packages/content/src/store-marketing-consent | import | no | yes | inward | present |
| E479 | packages/content/src/legal-document-hash.ts | external:node:crypto (runtime) | import | n/a | no | outward | present |
| E480 | packages/content/src/legal-document-hash.ts | packages/content/src/legal-document | import | no | yes | inward | present |
| E481 | packages/content/src/privacy-policy.ts | packages/content/src/legal-document | import | no | no | lateral | present |
| E482 | packages/content/src/website-and-store-terms/current.ts | packages/content/src/legal-document | import | no | no | lateral | present |
| E483 | packages/content/src/website-and-store-terms/current.ts | packages/content/src/website-and-store-terms/types | import | no | no | lateral | present |
| E484 | packages/content/src/website-and-store-terms/index.ts | packages/content/src/website-and-store-terms/current | import | no | yes | inward | present |
| E485 | packages/content/src/website-and-store-terms/index.ts | packages/content/src/legal-document-hash | import | no | no | lateral | present |
| E486 | packages/content/src/website-and-store-terms/index.ts | packages/content/src/website-and-store-terms/types | import | no | yes | inward | present |
| E487 | packages/content/src/website-and-store-terms/index.ts | packages/content/src/website-and-store-terms/types | import | no | yes | inward | present |
| E488 | packages/content/src/website-and-store-terms/types.ts | packages/content/src/legal-document | import | no | no | lateral | present |
| E489 | packages/db/src/database-client.ts | external:drizzle-orm/node-postgres (vendor) | import | n/a | yes | outward | present |
| E490 | packages/db/src/database-client.ts | external:pg (vendor) | import | n/a | yes | outward | present |
| E491 | packages/db/src/database-client.ts | packages/db/src/schema | import | no | yes | outward | present |
| E492 | packages/db/src/database-pool.ts | external:pg (vendor) | import | n/a | yes | outward | present |
| E493 | packages/db/src/index.ts | packages/db/src/database-client | import | no | yes | inward | present |
| E494 | packages/db/src/index.ts | packages/db/src/database-pool | import | no | no | lateral | present |
| E495 | packages/db/src/index.ts | packages/db/src/schema | import | no | no | lateral | present |
| E496 | packages/db/src/schema/app-schema.ts | external:drizzle-orm/pg-core (vendor) | import | n/a | yes | outward | present |
| E497 | packages/db/src/schema/index.ts | packages/db/src/schema/app-schema | import | no | no | lateral | present |
| E498 | packages/domain/src/accounts/account-provisioning-service.ts | packages/domain/src/accounts/account-model | import | no | yes | inward | present |
| E499 | packages/domain/src/accounts/account-provisioning-service.ts | packages/domain/src/accounts/account-repository | import | no | no | lateral | present |
| E500 | packages/domain/src/accounts/account-repository.ts | packages/domain/src/accounts/account-model | import | no | yes | inward | present |
| E501 | packages/domain/src/accounts/index.ts | packages/domain/src/accounts/account-model | import | no | yes | inward | present |
| E502 | packages/domain/src/accounts/index.ts | packages/domain/src/accounts/account-repository | import | no | yes | inward | present |
| E503 | packages/domain/src/accounts/index.ts | packages/domain/src/accounts/account-provisioning-service | import | no | yes | inward | present |
| E504 | packages/domain/src/coaching-bundles/index.ts | packages/domain/src/coaching-bundles/coaching-bundle-model | import | no | yes | inward | present |
| E505 | packages/domain/src/feature-flags/feature-flag-service.ts | packages/domain/src/feature-flags/feature-flag-model | import | no | no | lateral | present |
| E506 | packages/domain/src/feature-flags/index.ts | packages/domain/src/feature-flags/feature-flag-model | import | no | yes | inward | present |
| E507 | packages/domain/src/feature-flags/index.ts | packages/domain/src/feature-flags/feature-flag-service | import | no | yes | inward | present |
| E508 | packages/domain/src/index.ts | packages/domain/src/accounts | import | no | no | lateral | present |
| E509 | packages/domain/src/index.ts | packages/domain/src/feature-flags | import | no | no | lateral | present |
| E510 | packages/domain/src/index.ts | packages/domain/src/coaching-bundles | import | no | no | lateral | present |
| E511 | packages/domain/src/index.ts | packages/domain/src/waitlist | import | no | no | lateral | present |
| E512 | packages/domain/src/index.ts | packages/domain/src/store | import | no | no | lateral | present |
| E513 | packages/domain/src/index.ts | packages/domain/src/store | import | no | no | lateral | present |
| E514 | packages/domain/src/store/download-grant-service.ts | packages/domain/src/store/models | import | no | no | lateral | present |
| E515 | packages/domain/src/store/download-grant-service.ts | packages/domain/src/store/store-acquisition-service | import | no | no | lateral | present |
| E516 | packages/domain/src/store/index.ts | packages/domain/src/store/models | import | no | yes | inward | present |
| E517 | packages/domain/src/store/index.ts | packages/domain/src/store/models | import | no | yes | inward | present |
| E518 | packages/domain/src/store/index.ts | packages/domain/src/store/store-catalog-service | import | no | yes | inward | present |
| E519 | packages/domain/src/store/index.ts | packages/domain/src/store/store-acquisition-service | import | no | yes | inward | present |
| E520 | packages/domain/src/store/index.ts | packages/domain/src/store/download-grant-service | import | no | yes | inward | present |
| E521 | packages/domain/src/store/index.ts | packages/domain/src/store/product-asset-store | import | no | yes | inward | present |
| E522 | packages/domain/src/store/index.ts | packages/domain/src/store/product-asset-writer | import | no | yes | inward | present |
| E523 | packages/domain/src/store/index.ts | packages/domain/src/store/product-publication-models | import | no | yes | inward | present |
| E524 | packages/domain/src/store/index.ts | packages/domain/src/store/store-product-publication-service | import | no | yes | inward | present |
| E525 | packages/domain/src/store/index.ts | packages/domain/src/store/product-file-formats | import | no | yes | inward | present |
| E526 | packages/domain/src/store/product-asset-store.ts | packages/domain/src/store/models | import | no | no | lateral | present |
| E527 | packages/domain/src/store/product-publication-models.ts | packages/domain/src/store/models | import | no | no | lateral | present |
| E528 | packages/domain/src/store/store-acquisition-service.ts | packages/domain/src/store/models | import | no | no | lateral | present |
| E529 | packages/domain/src/store/store-acquisition-service.ts | packages/domain/src/store/store-catalog-service | import | no | no | lateral | present |
| E530 | packages/domain/src/store/store-catalog-service.ts | packages/domain/src/store/models | import | no | no | lateral | present |
| E531 | packages/domain/src/store/store-product-publication-service.ts | packages/domain/src/store/models | import | no | no | lateral | present |
| E532 | packages/domain/src/store/store-product-publication-service.ts | packages/domain/src/store/product-asset-writer | import | no | no | lateral | present |
| E533 | packages/domain/src/store/store-product-publication-service.ts | packages/domain/src/store/product-file-formats | import | no | yes | inward | present |
| E534 | packages/domain/src/store/store-product-publication-service.ts | packages/domain/src/store/product-publication-models | import | no | no | lateral | present |
| E535 | packages/domain/src/waitlist/index.ts | packages/domain/src/waitlist/waitlist-service | import | no | yes | inward | present |
| E536 | packages/domain/src/waitlist/index.ts | packages/domain/src/waitlist/waitlist-availability | import | no | yes | inward | present |
| E537 | packages/domain/src/waitlist/waitlist-service.ts | packages/domain/src/waitlist/waitlist-availability | import | no | yes | inward | present |
| E538 | packages/infrastructure/src/bot-detection/bot-detection-config.server.ts | @eli-coach-platform/config | import | yes | no | lateral | present |
| E539 | packages/infrastructure/src/bot-detection/bot-detection-config.server.ts | packages/infrastructure/src/bot-detection/bot-detection-contract | import | no | no | lateral | present |
| E540 | packages/infrastructure/src/bot-detection/bot-detection-contract.ts | external:zod (vendor) | import | n/a | yes | outward | present |
| E541 | packages/infrastructure/src/bot-detection/bot-detection-widget.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E542 | packages/infrastructure/src/bot-detection/bot-detection-widget.tsx | packages/infrastructure/src/bot-detection/bot-detection-contract | import | no | no | lateral | present |
| E543 | packages/infrastructure/src/bot-detection/bot-detection-widget.tsx | packages/infrastructure/src/bot-detection/turnstile-widget | import | no | no | lateral | present |
| E544 | packages/infrastructure/src/bot-detection/create-bot-verifier.server.ts | @eli-coach-platform/config | import | yes | no | lateral | present |
| E545 | packages/infrastructure/src/bot-detection/create-bot-verifier.server.ts | packages/infrastructure/src/bot-detection/bot-verifier.server | import | no | yes | inward | present |
| E546 | packages/infrastructure/src/bot-detection/create-bot-verifier.server.ts | packages/infrastructure/src/bot-detection/bot-verifier.server | import | no | yes | inward | present |
| E547 | packages/infrastructure/src/bot-detection/create-bot-verifier.server.ts | packages/infrastructure/src/bot-detection/bot-detection-config.server | import | no | no | lateral | present |
| E548 | packages/infrastructure/src/bot-detection/create-bot-verifier.server.ts | packages/infrastructure/src/bot-detection/turnstile-bot-verifier.server | import | no | no | lateral | present |
| E549 | packages/infrastructure/src/bot-detection/index.server.ts | packages/infrastructure/src/bot-detection/bot-detection-config.server | import | no | yes | inward | present |
| E550 | packages/infrastructure/src/bot-detection/index.server.ts | packages/infrastructure/src/bot-detection/create-bot-verifier.server | import | no | yes | inward | present |
| E551 | packages/infrastructure/src/bot-detection/index.server.ts | packages/infrastructure/src/bot-detection/bot-verifier.server | import | no | yes | inward | present |
| E552 | packages/infrastructure/src/bot-detection/index.server.ts | packages/infrastructure/src/bot-detection/turnstile-bot-verifier.server | import | no | yes | inward | present |
| E553 | packages/infrastructure/src/bot-detection/index.ts | packages/infrastructure/src/bot-detection/bot-detection-contract | import | no | yes | inward | present |
| E554 | packages/infrastructure/src/bot-detection/index.ts | packages/infrastructure/src/bot-detection/bot-detection-widget | import | no | yes | inward | present |
| E555 | packages/infrastructure/src/bot-detection/index.ts | packages/infrastructure/src/bot-detection/turnstile-widget | import | no | yes | inward | present |
| E556 | packages/infrastructure/src/bot-detection/index.ts | packages/infrastructure/src/bot-detection/turnstile-client | import | no | yes | inward | present |
| E557 | packages/infrastructure/src/bot-detection/index.ts | packages/infrastructure/src/bot-detection/use-bot-detection-submission | import | no | yes | inward | present |
| E558 | packages/infrastructure/src/bot-detection/turnstile-bot-verifier.server.ts | packages/infrastructure/src/bot-detection/bot-verifier.server | import | no | yes | inward | present |
| E559 | packages/infrastructure/src/bot-detection/turnstile-client.ts | external:react (framework) | import | n/a | yes | outward | present |
| E560 | packages/infrastructure/src/bot-detection/turnstile-client.ts | packages/infrastructure/src/bot-detection/bot-detection-contract | import | no | no | lateral | present |
| E561 | packages/infrastructure/src/bot-detection/turnstile-widget.tsx | packages/infrastructure/src/bot-detection/bot-detection-contract | import | no | no | lateral | present |
| E562 | packages/infrastructure/src/bot-detection/turnstile-widget.tsx | packages/infrastructure/src/bot-detection/turnstile-client | import | no | no | lateral | present |
| E563 | packages/infrastructure/src/bot-detection/turnstile-widget.tsx | packages/infrastructure/src/bot-detection/turnstile-client | import | no | no | lateral | present |
| E564 | packages/infrastructure/src/bot-detection/use-bot-detection-submission.ts | external:react (framework) | import | n/a | yes | outward | present |
| E565 | packages/infrastructure/src/bot-detection/use-bot-detection-submission.ts | packages/infrastructure/src/bot-detection/bot-detection-contract | import | no | no | lateral | present |
| E566 | packages/infrastructure/src/bot-detection/use-bot-detection-submission.ts | packages/infrastructure/src/bot-detection/bot-detection-widget | import | no | no | lateral | present |
| E567 | packages/infrastructure/src/email/create-product-email-sender.server.ts | @eli-coach-platform/config | import | yes | no | lateral | present |
| E568 | packages/infrastructure/src/email/create-product-email-sender.server.ts | external:resend (vendor) | import | n/a | yes | outward | present |
| E569 | packages/infrastructure/src/email/create-product-email-sender.server.ts | packages/infrastructure/src/email/product-email-sender.server | import | no | yes | inward | present |
| E570 | packages/infrastructure/src/email/create-product-email-sender.server.ts | packages/infrastructure/src/email/resend-product-email-sender.server | import | no | no | lateral | present |
| E571 | packages/infrastructure/src/email/email-primitives.server.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E572 | packages/infrastructure/src/email/index.server.ts | packages/infrastructure/src/email/create-product-email-sender.server | import | no | yes | inward | present |
| E573 | packages/infrastructure/src/email/index.server.ts | packages/infrastructure/src/email/email-primitives.server | import | no | yes | inward | present |
| E574 | packages/infrastructure/src/email/index.server.ts | packages/infrastructure/src/email/product-email-sender.server | import | no | yes | inward | present |
| E575 | packages/infrastructure/src/email/resend-product-email-sender.server.ts | external:resend (vendor) | import | n/a | yes | outward | present |
| E576 | packages/infrastructure/src/email/resend-product-email-sender.server.ts | packages/infrastructure/src/email/product-email-sender.server | import | no | yes | inward | present |
| E577 | packages/infrastructure/src/feature-flags/contracts.ts | external:zod (vendor) | import | n/a | yes | outward | present |
| E578 | packages/infrastructure/src/feature-flags/controller.server.ts | packages/infrastructure/src/feature-flags/contracts | import | no | no | lateral | present |
| E579 | packages/infrastructure/src/feature-flags/controller.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E580 | packages/infrastructure/src/feature-flags/index.server.ts | packages/infrastructure/src/feature-flags/controller.server | import | no | yes | inward | present |
| E581 | packages/infrastructure/src/feature-flags/index.server.ts | packages/infrastructure/src/feature-flags/contracts | import | no | yes | inward | present |
| E582 | packages/infrastructure/src/feature-flags/index.server.ts | packages/infrastructure/src/feature-flags/repository.server | import | no | yes | inward | present |
| E583 | packages/infrastructure/src/feature-flags/index.server.ts | packages/infrastructure/src/feature-flags/schema.server | import | no | no | lateral | present |
| E584 | packages/infrastructure/src/feature-flags/repository.server.ts | @eli-coach-platform/domain | import | yes | yes | inward | present |
| E585 | packages/infrastructure/src/feature-flags/repository.server.ts | @eli-coach-platform/db | import | yes | no | lateral | present |
| E586 | packages/infrastructure/src/feature-flags/repository.server.ts | packages/infrastructure/src/feature-flags/schema.server | import | no | yes | outward | present |
| E587 | packages/infrastructure/src/feature-flags/schema.server.ts | external:drizzle-orm/pg-core (vendor) | import | n/a | yes | outward | present |
| E588 | packages/infrastructure/src/feature-flags/schema.server.ts | @eli-coach-platform/db | import | yes | yes | inward | present |
| E589 | packages/infrastructure/src/management-auth/bearer-secret-authenticator.server.ts | external:node:crypto (runtime) | import | n/a | no | outward | present |
| E590 | packages/infrastructure/src/management-auth/bearer-secret-authenticator.server.ts | packages/infrastructure/src/management-auth/management-auth-contract.server | import | no | yes | inward | present |
| E591 | packages/infrastructure/src/management-auth/index.server.ts | packages/infrastructure/src/management-auth/bearer-secret-authenticator.server | import | no | yes | inward | present |
| E592 | packages/infrastructure/src/management-auth/index.server.ts | packages/infrastructure/src/management-auth/management-auth-config.server | import | no | yes | inward | present |
| E593 | packages/infrastructure/src/management-auth/index.server.ts | packages/infrastructure/src/management-auth/management-auth-contract.server | import | no | yes | inward | present |
| E594 | packages/infrastructure/src/management-auth/management-auth-config.server.ts | @eli-coach-platform/config | import | yes | no | lateral | present |
| E595 | packages/infrastructure/src/management-auth/management-auth-config.server.ts | packages/infrastructure/src/management-auth/management-auth-contract.server | import | no | yes | inward | present |
| E596 | packages/infrastructure/src/pwa/index.ts | packages/infrastructure/src/pwa/pwa-surfaces | import | no | yes | inward | present |
| E597 | packages/infrastructure/src/pwa/index.ts | packages/infrastructure/src/pwa/pwa-registration | import | no | yes | inward | present |
| E598 | packages/infrastructure/src/pwa/pwa-registration.ts | @eli-coach-platform/config | import | yes | no | lateral | present |
| E599 | packages/infrastructure/src/pwa/pwa-registration.ts | packages/infrastructure/src/pwa/pwa-surfaces | import | no | no | lateral | present |
| E600 | packages/ui/src/components/app-shell.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E601 | packages/ui/src/components/app-shell.tsx | packages/ui/src/components/card | import | no | no | lateral | present |
| E602 | packages/ui/src/components/avatar.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E603 | packages/ui/src/components/avatar.tsx | external:class-variance-authority (framework) | import | n/a | yes | outward | present |
| E604 | packages/ui/src/components/avatar.tsx | external:radix-ui (framework) | import | n/a | yes | outward | present |
| E605 | packages/ui/src/components/avatar.tsx | packages/ui/src/lib/cn | import | no | no | lateral | present |
| E606 | packages/ui/src/components/badge.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E607 | packages/ui/src/components/badge.tsx | external:class-variance-authority (framework) | import | n/a | yes | outward | present |
| E608 | packages/ui/src/components/badge.tsx | packages/ui/src/lib/cn | import | no | no | lateral | present |
| E609 | packages/ui/src/components/button.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E610 | packages/ui/src/components/button.tsx | external:class-variance-authority (framework) | import | n/a | yes | outward | present |
| E611 | packages/ui/src/components/button.tsx | packages/ui/src/lib/cn | import | no | no | lateral | present |
| E612 | packages/ui/src/components/card.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E613 | packages/ui/src/components/card.tsx | external:class-variance-authority (framework) | import | n/a | yes | outward | present |
| E614 | packages/ui/src/components/card.tsx | packages/ui/src/lib/cn | import | no | no | lateral | present |
| E615 | packages/ui/src/components/checkbox.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E616 | packages/ui/src/components/checkbox.tsx | external:radix-ui (framework) | import | n/a | yes | outward | present |
| E617 | packages/ui/src/components/checkbox.tsx | packages/ui/src/lib/cn | import | no | no | lateral | present |
| E618 | packages/ui/src/components/dialog.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E619 | packages/ui/src/components/dialog.tsx | external:radix-ui (framework) | import | n/a | yes | outward | present |
| E620 | packages/ui/src/components/dialog.tsx | packages/ui/src/lib/cn | import | no | no | lateral | present |
| E621 | packages/ui/src/components/filter-chip-group.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E622 | packages/ui/src/components/filter-chip-group.tsx | external:class-variance-authority (framework) | import | n/a | yes | outward | present |
| E623 | packages/ui/src/components/filter-chip-group.tsx | external:radix-ui (framework) | import | n/a | yes | outward | present |
| E624 | packages/ui/src/components/filter-chip-group.tsx | packages/ui/src/lib/cn | import | no | yes | outward | present |
| E625 | packages/ui/src/components/icon-button.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E626 | packages/ui/src/components/icon-button.tsx | external:class-variance-authority (framework) | import | n/a | yes | outward | present |
| E627 | packages/ui/src/components/icon-button.tsx | packages/ui/src/lib/cn | import | no | no | lateral | present |
| E628 | packages/ui/src/components/input.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E629 | packages/ui/src/components/input.tsx | external:class-variance-authority (framework) | import | n/a | yes | outward | present |
| E630 | packages/ui/src/components/input.tsx | packages/ui/src/lib/cn | import | no | no | lateral | present |
| E631 | packages/ui/src/components/link.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E632 | packages/ui/src/components/link.tsx | external:class-variance-authority (framework) | import | n/a | yes | outward | present |
| E633 | packages/ui/src/components/link.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E634 | packages/ui/src/components/link.tsx | packages/ui/src/lib/cn | import | no | no | lateral | present |
| E635 | packages/ui/src/components/phone-frame.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E636 | packages/ui/src/components/phone-frame.tsx | packages/ui/src/lib/cn | import | no | no | lateral | present |
| E637 | packages/ui/src/components/portal-shell.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E638 | packages/ui/src/components/portal-shell.tsx | external:react-router (framework) | import | n/a | yes | outward | present |
| E639 | packages/ui/src/components/portal-shell.tsx | packages/ui/src/constants | import | no | yes | outward | present |
| E640 | packages/ui/src/components/portal-shell.tsx | packages/ui/src/lib/cn | import | no | yes | outward | present |
| E641 | packages/ui/src/components/portal-shell.tsx | packages/ui/src/components/icon-button | import | no | yes | outward | present |
| E642 | packages/ui/src/components/section-eyebrow.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E643 | packages/ui/src/components/section-eyebrow.tsx | external:class-variance-authority (framework) | import | n/a | yes | outward | present |
| E644 | packages/ui/src/components/select.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E645 | packages/ui/src/components/select.tsx | external:class-variance-authority (framework) | import | n/a | yes | outward | present |
| E646 | packages/ui/src/components/select.tsx | external:radix-ui (framework) | import | n/a | yes | outward | present |
| E647 | packages/ui/src/components/select.tsx | packages/ui/src/lib/cn | import | no | no | lateral | present |
| E648 | packages/ui/src/components/sheet.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E649 | packages/ui/src/components/sheet.tsx | external:radix-ui (framework) | import | n/a | yes | outward | present |
| E650 | packages/ui/src/components/sheet.tsx | packages/ui/src/lib/cn | import | no | no | lateral | present |
| E651 | packages/ui/src/components/sheet.tsx | packages/ui/src/components/dialog | import | no | no | lateral | present |
| E652 | packages/ui/src/components/sidebar-surface-layout.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E653 | packages/ui/src/components/sidebar-surface-layout.tsx | packages/ui/src/constants | import | no | no | lateral | present |
| E654 | packages/ui/src/components/sidebar-surface-layout.tsx | packages/ui/src/components/link | import | no | no | lateral | present |
| E655 | packages/ui/src/components/text-area.tsx | external:react (framework) | import | n/a | yes | outward | present |
| E656 | packages/ui/src/components/text-area.tsx | external:class-variance-authority (framework) | import | n/a | yes | outward | present |
| E657 | packages/ui/src/components/text-area.tsx | packages/ui/src/lib/cn | import | no | no | lateral | present |
| E658 | packages/ui/src/index.ts | packages/ui/src/components/app-shell | import | no | no | lateral | present |
| E659 | packages/ui/src/index.ts | packages/ui/src/components/avatar | import | no | no | lateral | present |
| E660 | packages/ui/src/index.ts | packages/ui/src/components/badge | import | no | no | lateral | present |
| E661 | packages/ui/src/index.ts | packages/ui/src/components/button | import | no | no | lateral | present |
| E662 | packages/ui/src/index.ts | packages/ui/src/components/card | import | no | no | lateral | present |
| E663 | packages/ui/src/index.ts | packages/ui/src/components/checkbox | import | no | no | lateral | present |
| E664 | packages/ui/src/index.ts | packages/ui/src/components/filter-chip-group | import | no | yes | inward | present |
| E665 | packages/ui/src/index.ts | packages/ui/src/components/dialog | import | no | no | lateral | present |
| E666 | packages/ui/src/index.ts | packages/ui/src/components/icon-button | import | no | no | lateral | present |
| E667 | packages/ui/src/index.ts | packages/ui/src/components/input | import | no | no | lateral | present |
| E668 | packages/ui/src/index.ts | packages/ui/src/components/link | import | no | no | lateral | present |
| E669 | packages/ui/src/index.ts | packages/ui/src/components/phone-frame | import | no | no | lateral | present |
| E670 | packages/ui/src/index.ts | packages/ui/src/components/section-eyebrow | import | no | no | lateral | present |
| E671 | packages/ui/src/index.ts | packages/ui/src/components/portal-shell | import | no | yes | inward | present |
| E672 | packages/ui/src/index.ts | packages/ui/src/components/sidebar-surface-layout | import | no | no | lateral | present |
| E673 | packages/ui/src/index.ts | packages/ui/src/components/sheet | import | no | no | lateral | present |
| E674 | packages/ui/src/index.ts | packages/ui/src/lib/cn | import | no | no | lateral | present |
| E675 | packages/ui/src/index.ts | packages/ui/src/lib/use-search-params-writer | import | no | yes | inward | present |
| E676 | packages/ui/src/index.ts | packages/ui/src/lib/motion | import | no | no | lateral | present |
| E677 | packages/ui/src/index.ts | packages/ui/src/components/select | import | no | no | lateral | present |
| E678 | packages/ui/src/index.ts | packages/ui/src/components/text-area | import | no | no | lateral | present |
| E679 | packages/ui/src/lib/cn.ts | external:clsx (framework) | import | n/a | yes | outward | present |
| E680 | packages/ui/src/lib/cn.ts | external:tailwind-merge (framework) | import | n/a | yes | outward | present |
| E681 | packages/ui/src/lib/motion.ts | external:motion/react (framework) | import | n/a | yes | outward | present |
| E682 | packages/ui/src/lib/motion.ts | external:react (framework) | import | n/a | yes | outward | present |
| E683 | packages/ui/src/lib/use-search-params-writer.ts | external:react (framework) | import | n/a | yes | outward | present |
| E684 | packages/ui/src/lib/use-search-params-writer.ts | external:react-router (framework) | import | n/a | yes | outward | present |
| E685 | apps/platform/vite.config.ts | external:@react-router/dev/vite (framework) | import | n/a | yes | outward | present |
| E686 | apps/platform/vite.config.ts | external:@tailwindcss/vite (framework) | import | n/a | yes | outward | present |
| E687 | apps/platform/vite.config.ts | external:vite (framework) | import | n/a | yes | outward | present |
| E688 | apps/platform/vite.config.ts | external:node:url (runtime) | import | n/a | no | outward | present |
| E689 | apps/platform/vite.config.ts | external:node:path (runtime) | import | n/a | no | outward | present |
| E690 | apps/platform/react-router.config.ts | external:@react-router/dev/config (framework) | import | n/a | yes | outward | present |
| E691 | apps/platform/react-router.config.ts | external:node:fs (runtime) | import | n/a | no | outward | present |
| E692 | apps/platform/react-router.config.ts | external:node:path (runtime) | import | n/a | no | outward | present |
| E693 | apps/platform/react-router.config.ts | external:node:url (runtime) | import | n/a | no | outward | present |
