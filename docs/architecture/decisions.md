# Decisions

Header: date 2026-09-17, commit e8690f45, scope apps/platform/src, apps/platform/db, packages/{config,content,db,domain,infrastructure,test-support,ui}/src plus the enforcement layer (tools/dependency-cruiser.config.cjs, tools/dependency-cruiser.tsconfig.json, tools/boundaries.test.mjs, tools/boundary-fixtures/, tools/domain-layout.mjs, tools/domain-layout.test.mjs, tools/domain-layout-fixtures/, knip.json, eslint.config.mjs, workspace package.json export maps, tsconfigs, vite/react-router/vitest configs).

## Deferred decisions

| Decision | Waits behind port | Current implementation | What would force it |
|---|---|---|---|
| Payments provider (Stripe confirmed, no adapter exists) | none yet; the store acquisition flow has `ProductDelivery` (B197) and `StoreAcquisitions` (B196) but no payment port | free products only; `PublishedProduct` carries pricing display data, nothing charges | UC-3 (GEN-160, GEN-167, GEN-159, GEN-162): paid products and Stripe checkout |
| Scheduling provider (undecided) | none yet | no booking code exists; PRD rule 38 names coach availability slots | UC-2 (GEN-176): in-app assessment call booking |
| Video provider (undecided; PRD non-goal says check-ins meet on Google Meet) | none yet | none | UC-2 / check-ins under UC-4 and UC-5 |
| Push notification provider | none yet; `packages/infrastructure/pwa` holds only manifest definitions and service-worker registration | client-portal service worker is a static file served by `api/sw.ts` | UC-6 (GEN-106) |
| Transactional email provider | `WaitlistConfirmation` (B194) and `ProductDelivery` (B197) in C1; `ProductEmail` (B241) in C1 `/shared` | `ResendProductEmail` selected by `PRODUCT_EMAIL_PROVIDER` (`resend \| memory`, production refuses `memory`), with `InMemoryProductEmail` as the recording double | a second provider or a per-feature sender; UC-1 invitation email |
| Bot detection provider | `BotVerifier` (B240) in C1 `/shared` | Cloudflare Turnstile adapter plus a static test verifier, selected by `BOT_DETECTION_PROVIDER` (`turnstile \| static`); the `ENVIRONMENT === "local"` sniff is gone | a second provider |
| Management API principal (bearer secret is temporary) | `ManagementAuthenticator` (B242) in C1 `/shared`, built bearer-only by `createManagementAuthenticator` | `BearerSecretManagementAuthenticator`. The port has exactly one consumer today (the store management controller), so R5's "shared by several stable consumers" justification for `/shared` does not yet apply to it; it lives there because UC-4 adds a second, non-store consumer when the coach portal reaches these flows through a Clerk session | coach-portal product management under UC-4 (the contract already reserves forbidden/unavailable statuses) |
| Identity provider | none: Clerk is named directly in C9 (webhook controller, resolution middleware, nav actions, sign-in-failed page) and C15 (root.tsx, root.server.ts); the provisioning decision sits behind `Accounts` (B190) in C1 | Clerk (confirmed) | not deferred; recorded so UC-1 invitations know Clerk calls will land in C9 adapters |
| Persistence | fifteen published ports in C1's eight executable folders plus the five `/shared` ports, and the unpublished `DownloadTokenGenerator`; the C6 feature-flags repository implements the C1 `FeatureFlags` port | Postgres through Drizzle in feature `data/` folders and C6 feature-flags | not deferred (Postgres is the decision); the ports keep C1 testable without it |

## Cohesion position per component

| Component | Position (grouped for maintenance / for reuse / split for releases) | Accepted cost |
|---|---|---|
| C1 packages/domain | split by entity into eight executable subpaths (`account`, `acquisition`, `cart`, `download-grant`, `email-address`, `feature-flag`, `product`, `waitlist`) plus the interface-only `/shared`, no root barrel | every subpath still ships in one package; a change to one subpath rebuilds the package. `./email-address` has no consumer outside the package at e8690f45 |
| C2 packages/db | grouped for reuse: pool, client, and the `app` namespace | tables live outside the package; the namespace is a shared shape |
| C3 packages/config | split by concern into eight modules, each with its own schema and refinement; `.` publishes the concern types and `./runtime` the loader | a new variable still edits the composed schema in `runtime-environment.ts` |
| C4 packages/content | grouped for maintenance: legal and consent copy with versions | none material |
| C5 packages/ui | split by concern into six subpaths, no root barrel | each subpath still ships in one package; a consumer imports the subpath it needs rather than the whole design system |
| C6 packages/infrastructure | adapters and factories only, split by concern into seven subpaths, fully concrete and heavily depended on through `./http/server`; it owns no port | its instability climbed 0.59 → 0.72 as its three ports moved to C1; that is the correct inversion and stays a watched screen |
| C7 features/store | grouped for maintenance: server and browser halves of one feature | the largest component (37 modules fan-out) |
| C8 features/waitlist | grouped for maintenance | none material |
| C9 features/accounts | grouped for maintenance: Clerk adapters, guards, context and UI; `server/guards/` is its surface-facing kernel, four modules, with `sessionContext` and `accountsContext` as the accepted two keys | its `server/guards/` folder is consumed by three surfaces and the root, so it is effectively a shared kernel; everything else in `server/` stays private to the container |
| C11 surfaces/public-site | grouped by product (assembly), and since D5 it also owns the coaching-bundle literal and its presenter under `sections/pricing/` | a pricing change edits a surface; a second surface needing bundles would force the literal to move again |
| C12-C13 portal surfaces | grouped by product (assembly) | none material; portals are near-empty shells today |
| C14 apps/platform/src/server | grouped for maintenance: container, `feature-contexts.server.ts`, platform composition, logger and platform routes in one folder | fan-in 3 after the cycle was closed: the container and feature contexts import every feature, and nothing outside `root.server.ts`, the registry and `server/guards/runtime-config-context` imports back |
| C15 app root | framework-dictated | none |
| C16 packages/test-support | grouped for reuse as one dev-only fixture package | a package for a single constant, kept because a production import must fail |

## Domain model restructure decisions (2026-09-17)

| # | Decision | Alternative rejected | Reason | Accepted by | Date |
|---|---|---|---|---|---|
| D1 | Entities are rich models: classes with methods that hold their rules. Adapters reconstitute instances from rows; ports return and accept instances. | Plain types with colocated functions | Owner wants rules as methods on the domain object, the literal DDD reading. | Eduard | 2026-09-17 |
| D2 | Use cases stay in the domain package, inside the entity folder, named `<Verb><Noun>UseCase` with one public `execute`. | Application layer in each feature's `server/` folder or a new package | One folder answers "what can happen to this entity"; the domain package is framework-free by construction (no dependencies, no Node types) and the boundary tooling already guards it. | Eduard | 2026-09-17 |
| D3 | "Service" is reserved for a domain service: a stateless rule spanning entities that belongs to none. None exists today, so no class carries the word. Ports that carried it are renamed. | Keep "service" for use cases | Removes the ambiguity that caused issue 3. | Eduard | 2026-09-17 |
| D4 | A port method is the atomic unit; the adapter owns the database transaction. A use case that needs two aggregates changed atomically reshapes the port into one method instead of receiving a transaction. A unit-of-work port is the future escape hatch, not built now. | Unit-of-work port in `/shared` | No use case today needs cross-port atomicity; every multi-row write is already one port method (`prepareAcquisition`, `registerReducedPricingSignup`, `persistPublication`). | Eduard | 2026-09-17 |
| D5 | Coaching bundles left the domain and the feature folder. Bundles, benefits and waitlist prices are now one literal in the public-site pricing section; the presenter is now a map over that literal. The waitlist domain owns its own `WaitlistOfferPlan` literal type. | UI-only feature folder; `packages/content` | The literal answer to "simple hardcoded objects somewhere"; a feature with no data, server or domain is a UI section. | Eduard | 2026-09-17 |
| D6 | Port data shapes stay as they are (strings, dates, plain commands). Only entities that a port returns become class instances. `EmailAddress` is a value object used inside use cases; ports still receive the normalised string. | Ports take value objects everywhere | Keeps adapter churn proportional to the benefit; the invariant lives in one place either way. | Eduard | 2026-09-17 |
| D7 | Publication is a command on the `Product` aggregate, so it lives in `product/` rather than its own folder. | `product-publication/` subpath | One aggregate, one folder, even if it is the largest. | Eduard | 2026-09-17 |

## Intended exceptions

| Exception (layer skip, direct edge, shared shape) | Reason | Risk accepted | Accepted by | Date |
|---|---|---|---|---|
| `data/schema.server.ts` may import another feature's `data/schema.server.ts` for foreign keys | Drizzle needs the referenced table object | cross-feature coupling at the table level; unexercised today, and `feature-schema-foreign-key` keeps it to that one edge | docs/architecture + tools/dependency-cruiser.config.cjs | 2026-08-09 |
| `root.tsx` imports `~/features/accounts/ui/shared/access-denied-page` | the root error boundary renders the 403 page; the app root is not a surface | none stated; `route-thinness`'s page pattern and `surface-<s>-to-feature` admit `ui/shared/` | implicit (c42d8ecc) | 2026-08-30 |
| `packages/infrastructure` has no root barrel | keeps server-only halves out of browser bundles | fenced by `infrastructure-subpaths` and `infrastructure-browser-entries` | docs/architecture | 2026-08-09 |
| `packages/test-support` is a dev-only workspace package no production package declares | the shared Clerk fixture must not sit on a production barrel | fenced by `no-production-import-of-tests` and `not-to-dev-dep`, and stripped by `pnpm --prod deploy` | Eduard | 2026-09-17 |
| Email templates render React on the server (`email-primitives.server.tsx`) and in each feature's `email/` content builders | React as an HTML templating engine, never hydrated | framework in an adapter package; accepted by design (F52, F53) | implicit | 2026-08-09 |
| `packages/domain/src/shared` is interface-only (R5): `Clock` (implemented in `apps/platform/src/server/container.server.ts` as the system clock; consumed by `GetWaitlistUseCase`, `AcquireProductsUseCase` and `ResolveDownloadGrantUseCase`), `Logger` (implemented by `createConsoleLogger` in `apps/platform/src/server/logger.server.ts`), `BotVerifier` (implemented by `StaticTokenBotVerifier` and `TurnstileBotVerifier`, selected by `createBotVerifier`), `ProductEmail` (implemented by `ResendProductEmail` and `InMemoryProductEmail`, selected by `createProductEmail`), `ManagementAuthenticator` (implemented by `BearerSecretManagementAuthenticator`) | a slice that needs a cross-cutting concern imports a stable interface rather than another slice's implementation | none: `/shared` has no executable rules, so nothing but the port shapes cross the boundary | Eduard | 2026-09-17 |
| The `stability` rule (R31) judges only edges that cross from one workspace package into another, and is the one rule with no fixture | an intra-package barrel edge is structurally "unstable-ward" by construction, so it is not what R31 targets; `moreUnstable` needs dependent counts a synthetic fixture tree cannot express, so the real-tree cruise is its only proof (a spec §3.6 deviation) | none: cross-package instability remains fully enforced | Eduard | 2026-09-17 |
| `apps/platform/src/surfaces/*/routes.ts` is exempt from the app-root-alias ESLint rules | the `~` alias does not resolve inside React Router's route-config loader | none: the structural rules that matter for those files (`surface-<s>-to-feature`, `root-registry-to-server`, `feature-server-private`) still apply | Eduard | 2026-09-17 |
| `packages/domain/tsconfig.json` sets `"types": []` | an ambient global needs no import and produces no dependency edge, so no rule of any shape can see `@types/node`'s `NodeJS.*` and `Buffer` inside the domain; run 1's blocker F5 (`openVerified(): Promise<NodeJS.ReadableStream>`) is exactly that class. Closing the type scope makes the domain typecheck fail on a Node global, and the package uses only web-standard types (`AsyncIterable<Uint8Array>`) | the domain cannot use Node APIs even in a test file inside `src`; that is the intent | Eduard | 2026-09-17 |
| `packages/config` is in the frameworks ring, so every adapter that names a concern type (`ReadyzController`, the four C6 factories, three of the four `*FeatureHandles`) is a nominally outward edge | the spec chose it deliberately (§3.1, §3.5: consumers import the concern type they read) rather than duplicating the shapes | recorded once here rather than as a standing crop of outward rows in `dependencies.md` | Eduard | 2026-09-17 |
| `pnpm check:surfaces` runs `knip --no-config-hints` | the flag hides 48 advisory configuration hints produced by the shared `packages/*` glob and changes no exit code | running `knip` bare shows them | Eduard | 2026-09-17 |
| `pnpm check:boundaries` must run from the repository root | `tools/dependency-cruiser.tsconfig.json`'s alias paths resolve against the working directory | a resolver change fails loud through `not-to-unresolvable`, not silently; every invocation (pnpm scripts, Dockerfile) runs from the root | Eduard | 2026-09-17 |
| The `unconfirmed` third member of `StoreDeliveryResult` and `ProductEmailResult` | a provider that neither confirmed nor refused delivery is audited as retryable rather than reported as rejected | a deliberate addition to the spec's two-member unions | Eduard | 2026-09-17 |
| The review-owned failure-mapping rule is refined to "an adapter never swallows an infrastructure failure into a result-union member; exactly one named expected condition may be classified" | classifying ENOENT is how the filesystem asset store answers "this asset is not there"; every other error is rethrown so it reaches the logs and the 503 path | the one sanctioned instance is ENOENT in `FilesystemProductAssetStore.openConfinedAssetFile`. Consequence recorded: non-ENOENT asset failures on the download path now reach the 503 recovery page rather than the previous 303 `unavailable` redirect, and the cover-asset controller keeps its 503 mapping | Eduard | 2026-09-17 |
| The management transport policy is derived from the app's public URL scheme (`new URL(PUBLIC_APP_URL).protocol === "https:" ? "https_required" : "any"`) | `createManagementAuthConfig` must not read a deployment-environment name (spec §3.5: the infrastructure package reads no `ENVIRONMENT`), and the scheme of the origin the app is actually published on is the fact the policy is about | a runtime published over http accepts plaintext management traffic: true for local development, and a deployed runtime states its https origin (the integration runtime models a TLS-terminated proxy the same way) | Eduard | 2026-09-17 |
| The `AllowAllManagementAuthenticator` double the spec §3.5 places in `packages/test-support` was deleted for want of a consumer | the CH-K precedent: no code exists only to be available | tests construct their own fake; re-add it when a test needs it | Eduard | 2026-09-17 |
| The closed/unavailable/open copy branch stays in the views (`hero.tsx`, `footer-cta.tsx`, `pricing.tsx`) rather than on `WaitlistPresentation` | copy tables belong to views; the presentation carries `mode`, the flags and the status label | three views re-derive the same branch | Eduard | 2026-09-17 |
| Most consumers of `packages/ui`'s `./primitives` import one of its ten exports, and two consumers of `./motion` import one of five | run 4's precedent: a module surface inside one component is not a release unit a consumer is rebuilt for. The concern split is the remedy CH-K prescribed, and splitting atomic primitives further would fragment genuinely independent atoms | revisit if C5 ever becomes a release unit | Eduard | 2026-09-17 |
| `route-thinness` keeps `dependencyTypesNot: ["type-only"]`, so a route module may name a config or bot-detection *type* | the recorded design that an adapter or route names the concern type it reads (see the `packages/config` row); `guards-construct-nothing` carries the same carve-out for the same reason | the domain is carved out of that allowance: `route-thinness-domain` forbids a route naming a domain subpath even as a type; the carve-out applies to every `to.path` entry the rule names, so `packages/db` and a `*-controller.server.ts` type are also exempt for type-only edges, not only config or bot-detection types (no route exploits this at e8690f45) | Eduard | 2026-09-17 |
| `domain-no-externals` keeps `dependencyTypesNot: ["local", "type-only"]` | the carve-out predates the tsconfig fix and is now inert, because `packages/domain/tsconfig.json`'s `"types": []` and the package's empty dependency list make both an ambient Node global and an explicit `import type` from `node:stream` or a workspace package fail `tsc` | the rule alone would not catch a type-only external if the type scope were ever reopened | Eduard | 2026-09-17 |

## Accepted findings

| Ledger finding | Rule | Reason accepted | Accepted by | Date |
|---|---|---|---|---|
| F7 | R6 (CH-C) | Single-implementation use cases in a pre-launch MVP; controllers depend on the service class type, which TypeScript treats structurally, so tests already substitute doubles | Eduard | 2026-09-16 |
| F52, F53 | R21 (CH-R) | The "React as email templating" exception extends to the content builders in a feature's `email/` folder; rendering is their job as adapters | Eduard | 2026-09-16 |
| F88, F89 | R39 | Controller shape (no base controller, no request state on instance fields) and infrastructure-failure mapping stay review-owned. The mapping rule now reads "an adapter never swallows an infrastructure failure into a result-union member; exactly one named expected condition may be classified"; run 6 read all sixteen catch sites in the adapter ring and found one residue (a bare catch in `TurnstileBotVerifier`) | Eduard | 2026-09-16 |
| F150, F151 | R13 | One request-context key per feature (plan review run 2): a feature's controllers belong to one actor, a route names the single member it uses, and a test sets one key with one fake. The platform key is split instead (controllers for the app's routes, runtime config for surfaces) because its consumers span components | Eduard | 2026-09-16 |
| F76 | R36 | Resolved at 148d594f: no test in `apps/platform/src` mocks a hook or the fetch mechanism | Eduard | 2026-09-16 |

## Open questions

- Should `primitives` split further, given most consumers import one of its ten exports?
- Should the closed/unavailable/open copy branch move onto `WaitlistPresentation` if a fourth mode or a fourth consumer arrives?
- Scheduling provider and video provider are undecided; both must sit behind ports declared in C1 before UC-2 code lands.
- Payments: Stripe confirmed, no port or adapter exists; auth: Clerk confirmed and named directly in C9/C15; email: Resend in use behind B241.
- Wider observation outside scope: `designs/react-reference-app` duplicates domain vocabulary (bundles, cycle phases) that C1 also declares; no shared source exists by design.

## Owner decisions (2026-09-16)

Every item in this block landed in `148d594f..871196af`.

- Single-coach platform for its lifetime. The model stays single-tenant; no owning-coach references are introduced. (This answers the run-1 "single-coach or multi-coach" question, which is removed from the deferred table.)
- Fix rather than accept: CH-M (explicit `BOT_DETECTION_PROVIDER`), F79 (dependency-cruiser and knip as typecheck and build gates), CH-S (domain-owned ports carry domain names; "repository" names an adapter), CH-K (six unused UI primitives removed, UI barrel split by concern).
- No TypeScript project references: pnpm's per-package resolution already fails an undeclared package edge at typecheck and build.
- knip joins dependency-cruiser for published-surface hygiene (unused exports, files, dependencies).
- R3 widens by one entry: `server/guards/` is a feature's surface-facing entry (context key and access guards). The cross-feature protocol is recorded in `dependencies.md`.
- Route thinness (F85) is enforced by the `route-thinness` dependency rule instead of review.
- `PUBLIC_APP_URL` is required in every runtime (previously required only with the Resend provider) because surfaces and Clerk session checks read it unconditionally.
- The allow-all management authenticator double is not kept in `@eli-coach-platform/test-support` until a test needs it (CH-K precedent).
- **Deploy contract change.** Three runtime settings changed shape in this branch: `BOT_DETECTION_PROVIDER` is new (`turnstile | static`, and a production runtime refuses `static`), `PRODUCT_EMAIL_PROVIDER`'s values are now `memory | resend` (the old `disabled` no longer parses), and `PUBLIC_APP_URL` is required everywhere. The TEST and PROD env files are owned by `terraform-infra`, outside this repository, so an operator must set `BOT_DETECTION_PROVIDER=turnstile`, `PRODUCT_EMAIL_PROVIDER=resend` and `PUBLIC_APP_URL=<public https origin>` there before the next deploy or the container will fail config validation at startup. `docs/SECRET_MANAGEMENT.md` carries the operator-facing version of this list.

## Owner decisions (2026-09-17)

- `stability` is judged only across package boundaries, and has no fixture.
- The allow-all management authenticator double is deleted rather than kept unused.
- `pnpm check:surfaces` runs `knip --no-config-hints`.
- The domain's ambient type scope is closed with `"types": []`; the domain names only web-standard types.
- The management transport policy is derived from `PUBLIC_APP_URL`'s scheme, not from `ENVIRONMENT`.
- The purchasability decision (published, current published version, pinned version still current) is a domain rule, `Product.evaluatePurchasability`, that the acquisition repository calls inside its `for update` transaction, as it already does for `evaluateDeliveryLimit`.
- A route module may not name a domain subpath even as a type: `route-thinness-domain` owns that edge, and `route-thinness` keeps its type-only carve-out for config and infrastructure types.
