# Dependencies

Header: audit 2026-09-15 at commit 148d594f, scope apps/platform, packages, tools, knip.json, eslint.config.mjs; last update 2026-09-28 at commit f9ecc1e5, change review.

## Component graph

| From | To | Modules | Notes |
|---|---|---|---|
| C6 infrastructure | C1 domain | 10 | the feature-flags repository implements `FeatureFlags`; `PostgresCoachCalendar`, `PostgresCoachAvailability` and `PostgresCoachMeetingRoom` implement the `/coach-availability` and `/coach-meeting-room` ports and take `/shared`'s `Clock`; the payments concern implements `/coaching-subscription`'s `PaymentCheckout` (Stripe and memory) and reads `/coaching-bundle`'s catalog; the identity concern implements `/client-invitation`'s `IdentityInvitations` (Clerk and memory); the adapter-facing contracts are C6's own |
| C6 infrastructure | C2 db | 10 | the feature-flags, coach-calendar, coach-meeting-room and payment-event tables and their adapters |
| C6 infrastructure | C3 config | 11 | concern types the factories read, including `PaymentsConfig` and `IdentityConfig` |
| C7 store | C1 domain | 18 | entities, ports, use cases, publication types across `/product`, `/acquisition`, `/download-grant`, `/cart`, `/shared` |
| C7 store | C2 db | 6 | DatabaseClient, appSchema |
| C7 store | C3 config | 5 | joinBasePath and concern types |
| C7 store | C4 content | 2 | consent copy |
| C7 store | C5 ui | 6 | primitives in ui/public |
| C7 store | C6 infrastructure | 17 | bot-detection (browser and server), email/server, management-auth/server, http/server; adapter-facing contracts now live in C6 |
| C8 waitlist | C1 domain | 8 | `/feature-flag`, `/waitlist`, `/shared`, and `/coaching-bundle`'s `PricingEligibility`, which the repository implements; `data/schema.server.ts`'s range check reads `WAITLIST_REDUCED_PRICING_CAP` |
| C8 waitlist | C2 db | 3 | |
| C8 waitlist | C3 config | 2 | |
| C8 waitlist | C4 content | 2 | |
| C8 waitlist | C5 ui | 2 | |
| C8 waitlist | C6 infrastructure | 8 | bot-detection, email/server, http/server; adapter-facing contracts now live in C6 |
| C9 accounts | C1 domain | 9 | `/account` (including the `InvitationAcceptance` the composition takes) |
| C9 accounts | C2 db | 3 | |
| C9 accounts | C3 config | 2 | |
| C9 accounts | C5 ui | 3 | |
| C9 accounts | C6 infrastructure | 3 | http/server |
| C9 accounts | C7 store | 2 | the store path literal from `contracts/paths.ts` |
| C11 public-site | C3 config | 4 | `buildRedirectPath` in the invitation page |
| C11 public-site | C4 content | 4 | legal documents; Eli's portrait paths (`about-content.ts`) |
| C11 public-site | C5 ui | 16 |  |
| C11 public-site | C6 infrastructure | 4 | `BotDetectionConfig` type and the widget |
| C11 public-site | C7 store | 5 | cart drawer and provider, store paths |
| C11 public-site | C8 waitlist | 7 | contracts, `ui/shared` presentation, `ui/public` |
| C11 public-site | C9 accounts | 5 | contracts (`PortalDestination`, the role paths), guards (the layout and the invitation page), `ui/public/auth-nav-actions`, `ui/shared/sign-out-control` |
| C11 public-site | C14 server | 1 | `shell/layout.server.ts` reads `runtimeConfigContext` |
| C11 public-site | C17 assessment-calls | 4 | `routes.ts` takes the public route fragment (`assessmentCallsBookingRoutes`, renamed from `assessmentCallsPublicRoutes` by the rebase-resolution round) and, since GEN-192, the join route fragment (`assessmentCallsJoinRoutes`), registered outside the layout beside `accountsDeadEndRoutes`; `pages/pricing.tsx`, `sections/hero/hero.tsx` and `sections/about/about.tsx` take `BOOK_PATH` from `contracts/paths.ts` and nothing else |
| C11 public-site | C18 coaching-sales | 5 | `routes.ts` spreads `coachingSalesPublicRoutes` inside the shell and registers the invitation page at `INVITATION_ROUTE_SEGMENT` outside it; `pages/pricing.tsx` reads `coachingSalesContext` and renders `ui/public/bundle-selector/bundle-selector.tsx`; `pages/invitation.tsx` renders `ui/public/invitation/invitation-states.tsx`; `shell/layout.server.ts` reads the `readClientJourneyStep` guard and `shell/portal-destination.ts` the journey label and path from `contracts/client-journey.ts` |
| C11 public-site | C1 domain | 1 | `shell/portal-destination.ts` names `AccountRole` and `ClientJourneyStep` (types) |
| C12 client-portal | C3 config | 1 | |
| C12 client-portal | C5 ui | 2 | |
| C12 client-portal | C6 infrastructure | 2 | pwa |
| C12 client-portal | C9 accounts | 4 | portal guard (from the access layout) and paths |
| C12 client-portal | C18 coaching-sales | 2 | `routes.ts` spreads `coachingSalesClientRoutes` inside the access layout; `shell/access-layout.server.ts` runs `requireClientJourneyStep` |
| C13 coach-portal | C5 ui | 4 | the shell and its navigation links; the dashboard and the assessment-calls page compose portal and appointment primitives |
| C13 coach-portal | C9 accounts | 3 | portal guard and paths |
| C13 coach-portal | C17 assessment-calls | 4 | `routes.ts` takes the settings fragment and the calls segment; `pages/home.tsx` composes the dashboard blocks; `pages/assessment-calls.tsx` composes the listing, section, clock and error boundary |
| C13 coach-portal | C18 coaching-sales | 1 | `pages/assessment-calls.tsx` reads `coachingSalesContext` and fills the section's slots from `ui/coach/` (sales filter, badge, payment-link action, pricing label) |
| C14 server | C1 domain | 8 | the container and platform composition name ports and use cases; the console logger implements the incident ports of `/acquisition`, `/waitlist`, `/assessment-call`, `/payment-link` and `/client-invitation` |
| C14 server | C2 db | 1 | `platform-composition.server.ts` no longer imports `DatabaseClient` |
| C14 server | C3 config | 6 | the container reads `resolveFeatureFlagOverridesMode` and the payments secrets; the runtime environment loader |
| C14 server | C4 content | 1 | privacy email |
| C14 server | C6 infrastructure | 8 | bot verifier, product email, management auth, feature-flag repository, the payments factories and contracts, the identity-invitations factory, http helpers for the webhook route |
| C14 server | C7 store | 2 | the container calls `composeStoreFeature` |
| C14 server | C8 waitlist | 2 | the container calls `composeWaitlistFeature` |
| C14 server | C9 accounts | 2 | the container calls `composeAccountsFeature`, handing it coaching sales' `invitationAcceptance`, and reads `CLIENT_PORTAL_PATH` for the identity provider's return URL |
| C14 server | C17 assessment-calls | 2 | the container calls `composeAssessmentCallsFeature`; `feature-contexts.server.ts` sets `assessmentCallsContext` |
| C14 server | C18 coaching-sales | 2 | the container calls `composeCoachingSalesFeature` with the identity invitations, hands its `invitationAcceptance` to accounts and its `paymentCompletionHandler` to the platform composition; the feature-context middleware sets `coachingSalesContext` |
| C17 assessment-calls | C1 domain | 15 | `/assessment-call`, `/coach-availability`, `/coach-meeting-room`, `/feature-flag`, `/shared`, and `/payment-link`'s `AssessmentCallReader`, which the composition satisfies |
| C17 assessment-calls | C2 db | 3 | DatabaseClient, appSchema |
| C17 assessment-calls | C3 config | 4 | `joinBasePath` (the emails and the booking overview's portrait) and `AssessmentCallsConfig` |
| C17 assessment-calls | C4 content | 2 | the support address on the error state; Eli's portrait path on the booking overview |
| C17 assessment-calls | C5 ui | 21 | `./primitives`, `./appointments`, `./calendar`, `./tabs`, `./filters`, `./lib`, `./layout`, `./portal`, `./toast` |
| C17 assessment-calls | C6 infrastructure | 14 | bot-detection (browser and server), email/server (the notification contract, the Email* primitives and the email theme), http/server, coach-calendar/server and coach-meeting-room/server (the composition's adapters and the repository's reservation writers) |
| C17 assessment-calls | C9 accounts | 2 | `api/settings/assessment-call-settings-controller.server.ts` takes `requireApiAccount` from `server/guards/`; `contracts/paths.ts` takes `COACH_PORTAL_PATH` from `contracts/paths.ts` |
| C18 coaching-sales | C1 domain | 27 | `/payment-link`, `/coaching-subscription`, `/coaching-bundle`, `/assessment-call` (visitor vocabularies for the clients table), `/feature-flag`, `/email-address`, `/client-invitation`, `/client-journey`, `/account` (`InvitationAcceptance`, type), `/shared` |
| C18 coaching-sales | C2 db | 8 | `DatabaseClient`, `DatabaseTransaction`, `appSchema`, `isCausedByDatabaseError` (through `data/unique-violation.server.ts`) |
| C18 coaching-sales | C3 config | 5 | `joinBasePath`, `buildRedirectPath` |
| C18 coaching-sales | C5 ui | 13 | `./primitives`, `./overlays` (`ConfirmDialog`), `./lib`, `./motion`, `./toast`, `./layout` (`DeadEndPage`) |
| C18 coaching-sales | C6 infrastructure | 16 | `./payments/server` (the completion-handler contract, `recordPaymentEvent`, `toCheckoutCompletion`), `./email/server` (the Email* primitives and the email theme), `./http/server` |
| C18 coaching-sales | C9 accounts | 4 | `contracts/paths.ts` (`CLIENT_PORTAL_PATH`); `server/guards/` (`requireApiAccount`, `requirePortalAccess`, `sessionContext`, `accountsContext`) from the payment-link and client-journey controllers and the journey guard |
| C18 coaching-sales | C17 assessment-calls | 4 | `contracts/paths.ts` (`BOOK_PATH`, `COACH_CALLS_PAGE_PARAM`), `contracts/visitor-profile.ts` (`possessivePronoun`), and `data/schema.server.ts` for foreign keys |
| C15 app root | C3 config | 1 | |
| C15 app root | C5 ui | 1 | `root-error-page.tsx` renders the shared `DeadEndPage` from `./layout`; `app.css`'s `@import` of `styles.css` is not followed by the cruise |
| C15 app root | C7 store | 1 | the registry imports `storePublicRoutes`/`storeApiRoutes` |
| C15 app root | C8 waitlist | 1 | the registry imports `waitlistApiRoutes` |
| C15 app root | C17 assessment-calls | 1 | the registry imports `assessmentCallsApiRoutes` |
| C15 app root | C18 coaching-sales | 1 | the registry imports `coachingSalesApiRoutes` |
| C15 app root | C9 accounts | 3 | the registry, `root.tsx` (access-denied page) and `root.server.ts` (account resolution) |
| C15 app root | C11 public-site | 1 | the registry imports `publicSiteRoutes` |
| C15 app root | C12 client-portal | 1 | the registry imports `clientPortalRoutes` |
| C15 app root | C13 coach-portal | 1 | the registry imports `coachPortalRoutes` |
| C15 app root | C14 server | 2 | `root.server.ts` (container, feature contexts) and the registry (`server/api/routes.ts`) |

## Forbidden edges

| From | To | Source of the rule | Enforced by |
|---|---|---|---|
| any module | a dependency cycle, including between domain slices | R30 | `no-circular` |
| features/A | features/B outside contracts/, ui/shared/, server/guards/ | R3 | `feature-internals` |
| any module outside C9 features/accounts, the C15 root modules, C6 `identity/` and C16 | `@clerk/*` | R23 (Clerk stays behind the accounts feature, the root and the identity adapter) | `clerk-confined` (fixture-covered) |
| features/assessment-calls | features/coaching-sales (any folder) | R30 (coaching sales is downstream of assessment calls; the reverse edge would close a component cycle `no-circular` cannot see at module level) | `assessment-calls-never-reach-coaching-sales` (fixture-covered) |
| features/A/data/schema.server.ts | anything private in features/B except its `data/schema.server.ts` (foreign keys) | R3 carve-out | `feature-schema-foreign-key` (still unexercised at HEAD) |
| surfaces/public-site | a feature outside ui/public/, ui/shared/, contracts/, server/guards/, routes.ts | R2 | `surface-public-site-to-feature` |
| surfaces/client-portal | a feature outside ui/client/, ui/shared/, contracts/, server/guards/, routes.ts | R2 | `surface-client-portal-to-feature` |
| surfaces/coach-portal | a feature outside ui/coach/, ui/shared/, contracts/, server/guards/, routes.ts | R2 | `surface-coach-portal-to-feature` |
| surfaces/A | surfaces/B | R4 | `surface-to-surface` |
| features/**, server/**, root | surfaces/** | R7 | `surface-import` |
| anything but root.server.ts, the registry fragment and guards consumers | apps/platform/src/server/** | R5 | `composition-root` |
| a feature; a surface | the app's own `server/guards/`; for a surface, anything in them but `runtime-config-context` | R5 refinement | `server-guards-consumers` |
| a feature's api/, data/, email/, contracts/, ui/, routes.ts | its own `server/` outside `guards/` | R5 refinement | `feature-server-private` |
| any module but the runtime-environment and database modules, the readyz controller, the migration config and the integration rig | `@eli-coach-platform/config/runtime` | R33 | `config-runtime-readers` |
| any app module but `server/container.server.ts` and the folder itself | `apps/platform/src/server/feature-flag-overrides/**` | R39: the override reader and middleware reach a request only through the composition root | `feature-flag-overrides-root-only` (fixture `tools/boundary-fixtures/apps/platform/src/server/api/meta/imports-feature-flag-overrides.server.ts`) |
| features/** | anything under the app's `server/` | cycle closure | `features-never-reach-server` (`composition-root` deliberately excludes `features/` so one rule owns the edge) |
| a `server/guards/` module | anything but the framework, its feature's contracts, domain slices, config types and sibling guards | R5 refinement | `guards-construct-nothing` (a guard takes its feature type from the composition as a type-only import — the recorded carve-out) |
| a controller or route module | its feature's `data/` or `email/` | R5 refinement | `feature-api-to-data` |
| the route registry | anything under `server/` but `server/api/routes.ts` | F78 | `root-registry-to-server` |
| anything but root.tsx and the registry | `routes.ts`, `root.tsx`, `root.server.ts`, `root-error-page.tsx` | F78 | `root-registry` |
| a feature's ui/**, including any `.server.ts` beside a page | its data/, api/ or email/, or its server/ outside guards/ | R6 | `browser-half`. It absorbed `browser-half-loaders` at `2173cbfb`: that rule's `from` was the narrower `features/*/ui/**.server.ts` over the identical `to`, and no such file exists any more now that a registered page carries its own loader |
| a registered route module or its .server half | data/, email/, a controller, the db package, `config/runtime`, infrastructure server internals or `server/` outside guards/ | route thinness | `route-thinness` (carries `dependencyTypesNot: ["type-only"]` on every one of the rule's `to.path` entries, so a route may also name `packages/db` or a `*-controller.server.ts` type, not only a config or bot-detection type — no route exploits this at c2277ebb) |
| a registered route module, and the surface shell's `layout.server.ts` | a domain subpath, including `import type` | route thinness | `route-thinness-domain` (no type-only carve-out). Feature page loaders moved into their page modules at `2173cbfb`, so the `.server` half the rule still matches is the public-site shell loader |
| a domain entity folder | another folder's internals | R3 (policy) | `domain-slices`, which matches `packages/domain/src/<folder>/` against any sibling path but the sibling's `index.ts`; all eight cross-folder edges at c2277ebb enter the sibling entry |
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
| production code | a test rig or fixture, including `packages/test-support` | R34 | `no-production-import-of-tests`; runtime package packlists and the Docker post-deploy assertion separately enforce the physical artifact |
| a package | a more unstable package | R31 | `stability`, scoped to cross-package edges only after the broader form fired on 45 intra-package barrel edges; the one rule with no fixture (`moreUnstable` needs dependent counts a fixture tree cannot express), proven only by the real-tree cruise |
| any module | nothing, and nothing imports it | hygiene | `no-orphans` (excludes `*.d.ts`, `*.css`, the client-portal service worker, `server/test-support/request-args.ts`, `packages/test-support/src/index.ts`, `apps/platform/src/routes.ts` and the two portal `readyz.ts` leaves) |
| any workspace consumer | a package's internal file (deep import) | package APIs | `package.json` export maps (resolution fails) plus `workspace-by-name-*` |
| any published surface | an unused export, file, dependency or undeclared dependency | published surfaces | `knip` through `pnpm check:surfaces` (`knip --no-config-hints`), at zero on all four counts; a fixture asserts one unused export is reported |
| controllers | request state on instance fields; a base controller hierarchy | review-owned rule (F88/F89 accepted) | review only; run 6 read all eleven controllers and found none |
| infrastructure failure | a business status (capacity, duplicate, availability) | review-owned rule (F88/F89 accepted) | review only, refined to "an adapter never swallows an infrastructure failure into a result-union member; a named expected condition may be classified, and every other error is rethrown". Three classifications at 6fc3157f, each recorded in `decisions.md`: ENOENT in `FilesystemProductAssetStore.openConfinedAssetFile`; `22P02` in `PostgresAssessmentCallRepository.findById`, where a malformed booking id is a visitor typing a bad URL; and, since the coach-calendar refactor replaced the `23505` classification on the dropped start-time unique index, `23P01` in C6's `reserveCoachTime` when the violated constraint is `COACH_TIME_RESERVATIONS_NO_OVERLAP` (exported by `coach-calendar/schema.server.ts`; the constraint itself is hand-written in migration `0022`), which answers `{ status: "taken" }` and reaches the visitor as `slot_unavailable`: the constraint is the only guard against two reservations of overlapping coach time under different email locks, and losing that race is exactly a taken slot. Both Postgres classifications read the error through C2's `isCausedByDatabaseError`, which walks the cause chain and hands the caller each link's `code` and `constraint`. Run 6 read all sixteen catch sites in the adapter ring. GEN-191 added the two Postgres classifications and three catches outside the adapter ring, none of which returns a business status for a failure it cannot name: `ListOpenSlotsUseCase` degrading a failed port read to `unavailable`, `BookAssessmentCallUseCase` logging a failed notification and still answering `booked`, and `AssessmentCallsController.book` wrapping `bookAssessmentCall.execute` in a blanket `catch` that logs `assessment_call_booking_failure` through `console.error` and answers 500 `server_error` — the shape the store acquisition and waitlist controllers already have |

## Cross-feature protocol

| Need | Satisfied at | Mechanism | Enforced by | Exercised at HEAD |
|---|---|---|---|---|
| Use another entity's types, ports and rules in policy code | domain folder to domain folder | import through the folder entry (`@eli-coach-platform/domain/<entity>`, or `../<entity>` inside the package) | `domain-slices`, `no-circular` | yes: `acquisition`→`product`, `email-address`, `shared`; `assessment-call`→`coach-availability`, `coach-meeting-room`, `email-address`, `feature-flag`, `shared`; `client`→`assessment-call`; `coaching-bundle`→`email-address`; `coaching-subscription`→`assessment-call`, `client`, `coaching-bundle`, `email-address`, `payment-link`, `shared`; `download-grant`→`product`, `shared`; `payment-link`→`assessment-call`, `coaching-bundle`, `email-address`, `feature-flag`, `shared`; `waitlist`→`email-address`, `feature-flag`, `shared` |
| Know the current account | request context | read the accounts feature's `server/guards/` key | `guards-construct-nothing`, `server-guards-consumers` | yes |
| Look another feature's data up | a port the consumer declares | the consuming slice declares the narrow interface; the producing feature's composition returns an implementation under `handles`, and the container hands it to the consumer's composition | `feature-internals`, `feature-api-to-data`, `composition-root` | yes: `AssessmentCallReader` (C1 `/payment-link`, satisfied by C17's composition), `PricingEligibility` (C1 `/coaching-bundle`, satisfied by C8's repository), both consumed by C18 |
| Reference another feature's table | persistence | `data/schema.server.ts` may import the other feature's `data/schema.server.ts` for a foreign key | `feature-schema-foreign-key` | yes: C18's `payment_links`, `clients` and `coaching_subscriptions` reference C17's `assessment_calls` |
| Compose another feature's UI | `ui/shared/` | the owning feature publishes the component or presenter | `feature-internals`, the three `surface-<s>-to-feature` rules | yes |
| Exchange wire data | `contracts/` | zod schemas and path literals | `feature-internals`, the three `surface-<s>-to-feature` rules | yes |
| E1490 | apps/platform/src/features/assessment-calls/api/coach/coach-assessment-calls-controller.server.ts | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | import | no | no | lateral | present |
| E1491 | apps/platform/src/features/assessment-calls/api/coach/coach-assessment-calls-controller.server.ts | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | no | no | lateral | present |
| E1492 | apps/platform/src/features/assessment-calls/api/coach/coach-assessment-calls-controller.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present |
| E1493 | apps/platform/src/features/assessment-calls/api/coach/coach-assessment-calls-controller.server.ts | packages/domain/src/shared/index.ts | import | yes | no | lateral | present |
| E1494 | apps/platform/src/features/assessment-calls/contracts/paths.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E1495 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | apps/platform/src/features/assessment-calls/api/coach/coach-assessment-calls-controller.server.ts | import | no | no | lateral | present |
| E1496 | apps/platform/src/features/assessment-calls/ui/coach/assessment-call-listing.ts | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | import | no | no | lateral | present |
| E1567 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls-error-boundary.tsx | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | import | no | no | lateral | added (coach follow-ups) |
| E1568 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls-error-boundary.tsx | apps/platform/src/features/assessment-calls/ui/coach/coach-calls-page-frame.ts | import | no | no | lateral | added (coach follow-ups) |
| E1569 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls-error-boundary.tsx | external:lucide-react | import | n/a | no | lateral | added (coach follow-ups) |
| E1570 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls-error-boundary.tsx | external:react-router | import | n/a | no | lateral | added (coach follow-ups) |
| E1571 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls-error-boundary.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | added (coach follow-ups) |
| E1572 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls-error-boundary.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | added (coach follow-ups) |
| E1573 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls-error-boundary.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | added (coach follow-ups) |
| E1503 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | import | no | no | lateral | present |
| E1504 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | apps/platform/src/features/assessment-calls/contracts/call-moment.ts | import | no | no | lateral | present |
| E1505 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | apps/platform/src/features/assessment-calls/ui/coach/assessment-call-listing.ts | import | no | no | lateral | present |
| E1506 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/call-list-pager.tsx | import | no | no | lateral | present |
| E1508 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | packages/ui/src/appointments/index.ts | import | yes | no | lateral | present |
| E1509 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1510 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1511 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | packages/ui/src/tabs/index.ts | import | yes | no | lateral | present |
| E1512 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/call-list-pager.tsx | apps/platform/src/features/assessment-calls/ui/coach/assessment-call-listing.ts | import | no | no | lateral | present |
| E1513 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/call-list-pager.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1579 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/use-call-listing-params.ts | apps/platform/src/features/assessment-calls/ui/coach/assessment-call-listing.ts | import | no | no | lateral | added (coach follow-ups; backfills a GEN-193 module the record never carried) |
| E1580 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/use-call-listing-params.ts | external:react-router | import | n/a | no | lateral | added (coach follow-ups; backfills a GEN-193 module the record never carried) |
| E1581 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/use-call-listing-params.ts | packages/ui/src/lib/index.ts | import | yes | no | lateral | added (coach follow-ups; backfills a GEN-193 module the record never carried) |
| E1514 | apps/platform/src/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget.tsx | apps/platform/src/features/assessment-calls/contracts/call-moment.ts | import | no | no | lateral | present |
| E1515 | apps/platform/src/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget.tsx | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | no | no | lateral | present |
| E1516 | apps/platform/src/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget.tsx | apps/platform/src/features/assessment-calls/ui/coach/assessment-call-listing.ts | import | no | no | lateral | present |
| E1517 | apps/platform/src/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget.tsx | apps/platform/src/features/assessment-calls/ui/coach/join-call-link.tsx | import | no | no | lateral | present |
| E1518 | apps/platform/src/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1519 | apps/platform/src/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget.tsx | packages/ui/src/appointments/index.ts | import | yes | no | lateral | present |
| E1520 | apps/platform/src/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1521 | apps/platform/src/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1523 | apps/platform/src/features/assessment-calls/ui/coach/use-coach-clock.ts | external:react | import | n/a | no | lateral | present |
| E1524 | apps/platform/src/features/assessment-calls/ui/coach/use-coach-clock.ts | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1525 | apps/platform/src/features/assessment-calls/ui/public/book/book-page.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1526 | apps/platform/src/features/assessment-calls/ui/public/book/slot-calendar.tsx | apps/platform/src/features/assessment-calls/ui/shared/day-key.ts | import | no | no | lateral | present |
| E1527 | apps/platform/src/features/assessment-calls/ui/public/book/slot-grouping.ts | apps/platform/src/features/assessment-calls/ui/shared/day-key.ts | import | no | no | lateral | present |
| E1528 | apps/platform/src/features/assessment-calls/ui/shared/day-key.ts | external:@date-fns/tz | import | n/a | no | lateral | present |
| E1529 | apps/platform/src/surfaces/coach-portal/pages/home.tsx | apps/platform/src/features/assessment-calls/server/guards/assessment-calls-context.server.ts | import | yes | no | lateral | present |
| E1530 | apps/platform/src/surfaces/coach-portal/pages/home.tsx | apps/platform/src/features/assessment-calls/ui/coach/assessment-call-listing.ts | import | yes | no | lateral | present |
| E1576 | apps/platform/src/surfaces/coach-portal/pages/home.tsx | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls-error-boundary.tsx | re-export | yes | no | lateral | added (coach follow-ups; the route's `ErrorBoundary` export) |
| E1531 | apps/platform/src/surfaces/coach-portal/pages/home.tsx | apps/platform/src/features/assessment-calls/ui/coach/dashboard/coach-greeting.tsx | import | yes | no | lateral | present |
| E1532 | apps/platform/src/surfaces/coach-portal/pages/home.tsx | apps/platform/src/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget.tsx | import | yes | no | lateral | present |
| E1533 | apps/platform/src/surfaces/coach-portal/pages/home.tsx | apps/platform/src/features/assessment-calls/ui/coach/use-coach-clock.ts | import | yes | no | lateral | present |
| E1534 | apps/platform/src/surfaces/coach-portal/routes.ts | apps/platform/src/features/assessment-calls/routes.ts | import | yes | no | lateral | present |
| E1535 | apps/platform/src/surfaces/coach-portal/shell/navigation-links.tsx | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | yes | no | lateral | present |
| E1536 | packages/domain/src/assessment-call/index.ts | packages/domain/src/assessment-call/list-assessment-calls-use-case.ts | import | no | no | lateral | present |
| E1577 | packages/domain/src/assessment-call/list-assessment-calls-use-case.ts | packages/domain/src/assessment-call/assessment-call-incidents.ts | import | no | no | lateral | added (coach follow-ups) |
| E1537 | packages/domain/src/assessment-call/list-assessment-calls-use-case.ts | packages/domain/src/assessment-call/assessment-call-reservations.ts | import | no | no | lateral | present |
| E1538 | packages/domain/src/assessment-call/list-assessment-calls-use-case.ts | packages/domain/src/assessment-call/assessment-call.ts | import | no | no | lateral | present |
| E1539 | packages/domain/src/assessment-call/list-assessment-calls-use-case.ts | packages/domain/src/coach-availability/index.ts | import | no | no | lateral | present |
| E1540 | packages/ui/src/appointments/appointment-card.tsx | external:react | import | n/a | no | lateral | present |
| E1542 | packages/ui/src/appointments/appointment-card.tsx | packages/ui/src/appointments/appointment.ts | import | no | no | lateral | present |
| E1543 | packages/ui/src/appointments/appointment-card.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1544 | packages/ui/src/appointments/appointment-card.tsx | packages/ui/src/primitives/avatar.tsx | import | no | no | lateral | present |
| E1546 | packages/ui/src/appointments/dashboard-appointment-row.tsx | external:react | import | n/a | no | lateral | present |
| E1547 | packages/ui/src/appointments/dashboard-appointment-row.tsx | packages/ui/src/appointments/appointment.ts | import | no | no | lateral | present |
| E1550 | packages/ui/src/lib/index.ts | packages/ui/src/lib/use-display-time-zone.ts | import | no | no | lateral | present |
| E1551 | packages/ui/src/lib/use-display-time-zone.ts | external:react | import | n/a | no | lateral | present |
| E1552 | packages/ui/src/primitives/avatar.tsx | external:class-variance-authority | import | n/a | no | lateral | present |
| E1553 | packages/ui/src/primitives/avatar.tsx | external:react | import | n/a | no | lateral | present |
| E1554 | packages/ui/src/primitives/avatar.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1555 | packages/ui/src/primitives/badge.tsx | external:class-variance-authority | import | n/a | no | lateral | present |
| E1556 | packages/ui/src/primitives/badge.tsx | external:react | import | n/a | no | lateral | present |
| E1557 | packages/ui/src/primitives/badge.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1558 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/badge.tsx | import | no | no | lateral | present |
| E1559 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/pagination.tsx | import | no | no | lateral | present |
| E1560 | packages/ui/src/primitives/pagination.tsx | external:class-variance-authority | import | n/a | no | lateral | present |
| E1561 | packages/ui/src/primitives/pagination.tsx | external:react | import | n/a | no | lateral | present |
| E1562 | packages/ui/src/primitives/pagination.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1563 | packages/ui/src/tabs/index.ts | packages/ui/src/tabs/tabs.tsx | import | no | no | lateral | present |
| E1564 | packages/ui/src/tabs/tabs.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E1565 | packages/ui/src/tabs/tabs.tsx | external:react | import | n/a | no | lateral | present |
| E1566 | packages/ui/src/tabs/tabs.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |

## Boundaries (ports)

| ID | Port | Owner (ring) | Implementers (ring) | Consumers | Crossing data | Humble side | Enforcement |
|---|---|---|---|---|---|---|---|
| B190 | Accounts (U901) | C1 use-cases | U406 PostgresAccountRepository (adapters, C9) | U902, U948 | `Account` instances out, `{authSubjectId, role}` in | implementer | dependency-absence keeps C1 from naming the adapter; `feature-api-to-data` forbids the controller or route from importing the repository; `feature-internals` forbids another feature from reaching it; the composition hands it in |
| B191 | FeatureFlags (U906) | C1 use-cases | U1027 PostgresFeatureFlagRepository (adapters, C6) | U909 | `FeatureFlag[]` instances | implementer | dependency-absence; exports |
| B192 | FeatureFlagReader (U907) | C1 use-cases | U909 GetFeatureFlagsUseCase, in the same module (production); U1353 the override reader (C14 adapters), a decorator over U909 the container constructs in `browser` mode only | U534 FeatureFlagController; U963 GetWaitlistUseCase; U1300 AssessmentCallBookingWindow, each handed the container's one selected reader | FeatureFlagSet (plain `Record<string, boolean>`, published through `./feature-flag`); nothing in | use case | dependency-absence, the `./feature-flag` entry and `domain-slices`; all three consumers use its one parameterless `execute` member; the decorator is reachable only through the container (`feature-flag-overrides-root-only`) |
| B193 | WaitlistEntries (U912) | C1 use-cases | U303 PostgresWaitlistRepository | U914, U963 | plain signup commands and results; the adapter allocates the lowest free reduced slot under the per-offer advisory lock and the U304 constraints enforce one entry per email and offer and at most `WAITLIST_REDUCED_PRICING_CAP` reduced slots (b3eb2653) | implementer | dependency-absence |
| B194 | WaitlistConfirmation (U913) | C1 use-cases | U307 EmailWaitlistConfirmation | U914 | SendWaitlistConfirmationCommand in; `WaitlistConfirmationResult` = sent \| failed out | implementer | dependency-absence |
| B195 | StoreCatalog (U919) | C1 use-cases | U120 PostgresStoreCatalogRepository | U967, U968, U969, U979 | `PublishedProduct` instances and the plain `PublishedProductCover` | implementer | dependency-absence. Three of the four consumers call one of its three methods |
| B196 | StoreAcquisitions (U922) | C1 use-cases | U117 PostgresStoreAcquisitionRepository | U979 | PrepareAcquisitionCommand / AcquisitionPreparation. The command's `products` field carries `PublishedProduct` instances into the adapter; the record's D6 wording covers only entities a port *returns*, and the ledger's run-8 F245 holds the reconciliation | implementer | dependency-absence |
| B197 | ProductDelivery (U923) | C1 use-cases | U129 EmailProductDelivery | U979 | a plain command carrying `{title, typeLabels}` resources the entity projected; `ProductDeliveryResult` = delivered(provider, providerMessageId) \| rejected(reason) \| unconfirmed out. The third member is a deliberate deviation from the spec's two-member union (owner ruling); a thrown `deliver()` stays a domain-audited retryable outcome through `recordRetryableDelivery`. Renamed from StoreDeliveryService by decision D3 | implementer | dependency-absence |
| B199 | PayloadDigestGenerator (U925) | C1 use-cases | U124 PayloadSha256Digest | U979 | string | implementer | dependency-absence |
| B208 | DownloadTokenGenerator (U978) | C1 use-cases | U122 RandomDownloadTokenGenerator, satisfying it structurally with no `implements` clause | U979 | CreateDownloadTokenResult (`{rawToken, sha256}`) | implementer | dependency-absence. Deliberately **not** in the `./acquisition` export map: the owner's rule is to publish only what a consumer outside the package imports, and an `implements` clause is cosmetic |
| B200 | Clock (U957) | C1 `/shared` | `{ now: () => new Date() }` at `container.server.ts:52` | U979 AcquireProductsUseCase, U981 ResolveDownloadGrantUseCase, U963 GetWaitlistUseCase, U1259 BookAssessmentCallUseCase, U1260 ListOpenSlotsUseCase | Date | implementer | dependency-absence |
| B201 | DownloadTokenHasher (U931) | C1 use-cases | U123 DownloadTokenSha256 | U981 | string | implementer | dependency-absence |
| B202 | DownloadGrants (U932) | C1 use-cases | U121 PostgresDownloadGrantRepository | U981 | a `DownloadGrant` instance | implementer | dependency-absence |
| B203 | ProductAssets (U935) | C1 use-cases | U119 FilesystemProductAssetStore | U104, U107, U114 (adapters, C7) | `ProductAssetOpenResult` = opened(bytes: `AsyncIterable<Uint8Array>`) \| unavailable | implementer | dependency-absence. Substitutability holds on all three consumer paths: the cover and download controllers and the zip stream all adapt with `Readable.from(...)` and none casts the port's iterable to a Node type. The filesystem store hands back an iterable whose `return()` destroys the read stream, so a consumer that opens a source and gives up releases the handle. Its `assertReady()` has no production caller — the composition calls the adapter's own `assertReadyAtStartup()` |
| B204 | ProductAssetWriter (U937) | C1 use-cases | U119 FilesystemProductAssetStore | U973, U974 | ProductAssetContent (Uint8Array) | implementer | dependency-absence |
| B205 | ProductAssetDigest (U938) | C1 use-cases | U118 ProductAssetSha256Digest | U971, U972, U973, U974, and U970 `ProductPublicationDraft#requestDigest`, which names the port type directly | Uint8Array / string | implementer | dependency-absence |
| B206 | StoreProductPublications (U943) | C1 use-cases | U125 PostgresStoreProductPublicationRepository | U971, U972, U973, U974, U975 | `Product` instances out; PersistPublicationCommand and the plain publication records otherwise. Each of the five consumers calls between one and five of its seven methods | implementer | dependency-absence |
| B207 | Logger (U958, removed) | C1 `/shared` | U519 `createConsoleLogger` (current symbol, former generic implementation) | former consumers U979 and U914 | a message and details record | implementer | historical generic boundary removed in a79f507d; replaced by B266, B267 and B273 |
| B240 | BotVerifier (U1195) | C6 bot-detection (adapters) | U1007 StaticTokenBotVerifier, U1012 TurnstileBotVerifier, behind `createBotVerifier` | U301 WaitlistController, U100 StoreAcquisitionController, U1218 AssessmentCallsController | BotVerificationRequest/Result (plain) | implementers | `./bot-detection/server` export; both implementations are package-private |
| B241 | ProductEmail (U1196) | C6 email (adapters) | U1023 ResendProductEmail, U1038 InMemoryProductEmail, behind `createProductEmail` | U129, U307, U1226 adapters | ProductEmailCommand / ProductEmailResult (plain). The command carries an optional `attachments` list of `EmailAttachment` (content as a `Uint8Array`) and an optional per-send `replyTo`; an implementer that sends honours it and otherwise falls back to its configured reply-to address. `ProductEmail.provider` is boundary data the use case records in its delivery audit, not a detail leak | implementers | `./email/server` export; the Resend implementation is package-private |
| B242 | ManagementAuthenticator (U1197) | C6 management-auth (adapters) | U1029 BearerSecretManagementAuthenticator, behind `createManagementAuthenticator` | U109 StoreProductManagementController; future coach-management consumer | `ManagementCredentials` in, `ManagementAuthenticationResult` out | implementer | `./management-auth/server` export; the bearer implementation is package-private |
| B266 | AcquisitionIncidents (U1193) | C1 acquisition (use-cases) | U519 createConsoleLogger | U979 AcquireProductsUseCase | plain request ID; rejected form adds a plain reason | implementer | dependency-absence, `./acquisition` export, composition injection |
| B267 | WaitlistIncidents (U1194) | C1 waitlist (use-cases) | U519 createConsoleLogger | U914 JoinWaitlistUseCase, U963 GetWaitlistUseCase | no payload | implementer | dependency-absence, `./waitlist` export, composition injection |
| B268 | AssessmentCallReservations (U1256) | C1 use-cases | U1221 PostgresAssessmentCallRepository (adapters, C17) | U1259, U1261 | `ReserveAssessmentCallCommand` in; `ReservationResult` out, where only `reserved` carries an `AssessmentCall` instance (the new booking) and `slot_taken` and `email_has_upcoming_call` carry nothing about the call that caused them; plus an `AssessmentCall \| null` from `findById` | implementer | dependency-absence keeps C1 from naming the adapter; `feature-api-to-data` forbids the controller or route from importing the repository; the composition hands one instance to both use cases that take it |
| B269 | CoachAvailabilitySource (U1265) | C1 use-cases | U1332 PostgresCoachAvailability (adapters, C6), reading the `coach_availability` singleton row | U1259, U1260, U1330, U1331 | a `CoachAvailability` instance out of `current()` | implementer | dependency-absence. `current()` is the only read: every consumer takes the coach's window off the instance it returns, per call, and the implementer has no other member; changed (GEN-192): the implementer moves from C17's `StaticCoachAvailability` (removed, U1223) to C6's `PostgresCoachAvailability`, which also implements the new `CoachAvailabilityChanges` (B274), so the coach's own window is a saved record instead of a code literal, and `GetAssessmentCallSettingsUseCase`/`UpdateAssessmentCallSettingsUseCase` join `BookAssessmentCallUseCase`/`ListOpenSlotsUseCase` as consumers |
| B270 | AssessmentCallNotifications (U1257) | C1 use-cases | U1226 EmailAssessmentCallNotifications (adapters, C17), built by `createAssessmentCallNotifications` | U1259 | `AssessmentCallSnapshot` in (plain data with the derived `endsAt`); a per-recipient `sent \| failed` record out | implementer | dependency-absence |
| B272 | CoachCalendar (U1291) | C1 use-cases | U1293 PostgresCoachCalendar (adapters, C6), reading the rows U1294 writes | U1260 | a `from` instant in; `TimeInterval[]` out, plain data with no kind or appointment | implementer | dependency-absence. An external calendar is a second adapter behind this port, merged in the composition; the write side is not a port but the transaction-scoped `reserveCoachTime` / `releaseCoachTime` pair, because each appointment kind's repository must reserve inside its own transaction (D4) |
| B274 | CoachAvailabilityChanges (U1324) | C1 use-cases | U1332 PostgresCoachAvailability (adapters, C6) | U1331 | a `CoachAvailability` instance in; nothing out | implementer | dependency-absence. `save` is the coach's only write to her own window; `UpdateAssessmentCallSettingsUseCase` is its one consumer |
| B275 | CoachMeetingRoomSource (U1326) | C1 use-cases | U1333 PostgresCoachMeetingRoom (adapters, C6) | U1261, U1330 | a `CoachMeetingRoom \| null` out of `current()` | implementer | dependency-absence. `current()` is call-independent: `ResolveJoinLinkUseCase` reads the coach's one saved room regardless of which call is being joined |
| B276 | CoachMeetingRoomChanges (U1327) | C1 use-cases | U1333 PostgresCoachMeetingRoom (adapters, C6) | U1331 | a `CoachMeetingRoom \| null` in; nothing out | implementer | dependency-absence. `save(null)` clears the room; `UpdateAssessmentCallSettingsUseCase` is its one consumer |
| B273 | AssessmentCallIncidents (U1299) | C1 assessment-call (use-cases) | U519 createConsoleLogger | U1259 BookAssessmentCallUseCase, U1260 ListOpenSlotsUseCase, U1300 AssessmentCallBookingWindow | a recipient on `notificationFailed`; no payload otherwise | implementer | dependency-absence, `./assessment-call` export, composition injection |
| B100 | ZipDeliveryStream (structural type declared by its consumer, `downloads-controller.server.ts:12-14`) | C7 adapters | U114 ZipDeliveryStream | U107 | DownloadGrant in, ProductAssetOpenResult out. `planGrantEntries` walks `grant.items` rather than `GrantDelivery.bundle.assets` because it needs `item.productSlug` for the zip entry name | U114 | none (structural typing, which is where R5 puts it) |
| B120 | StoreCartState (U204, Zustand store shape) | C7 ui/public (adapters) | U205 createStoreCartStore | U210–U218, U237, U248, C11 shell/layout.tsx | object with functions and productSlugs | consumers | none |
| B121 | useStoreCatalogFetcher / useStoreAcquisitionFetcher (U202, U203) | C7 ui/public | same | U213, U218 | StoreCatalogResponse / parsed acquisition response | callers | none |
| B122 | usePrivateDownloadToken (U244) | C7 ui/public | same | U241 | string or null | download page | none |
| B123 | React Router loader contract | framework | U231, U247, U604, U415, U521 | routes.ts, page modules | loader data types; no domain instance crosses it (`conventions.md`) | page view | React Router strips `.server` modules from the client build; `browser-half` and `route-thinness-domain` |
| B140 | sessionContext RouterContext<ResolvedSession> (U408) | C9 server/guards (frameworks) | U410 sets it | U411, U412, U604 | `ResolvedSession` with `account: AccountSnapshot`; default `{ kind: "anonymous" }` | React Router context | `guards-construct-nothing`, `server-guards-consumers` |
| B143 | requirePortalAccess (U411) | C9 server/guards | portal layout middleware in C12, C13 | U705, U711 | `(args, { role })`, reading `accountsContext.portal`; returns `AccountSnapshot` | caller | `server-guards-consumers` |
| B144 | the eight request-context keys | C7, C8, C9, C17, C18 `server/guards/` and C14 `server/guards/` | `createFeatureContextMiddleware` (U517) sets all eight from the container, publishing each composition's `feature` and never its `handles` | `accountsContext` and `sessionContext` (accounts routes, the resolution middleware, the portal guards), `storeContext` (store routes and loaders), `waitlistContext` (the waitlist route, the public-site layout loader and the pricing loader), `assessmentCallsContext` (the assessment-call routes and pages, and the coach portal's dashboard and calls page), `coachingSalesContext` (the coaching-sales routes and pages, the pricing loader and the coach calls page), `platformContext` (`server/api/*` only, including the Stripe webhook), `runtimeConfigContext` (the public-site layout loader only) | the feature's controllers or `{ appBasePath, botDetection }` | the context key | each is created with `createContext<…>()` and constructs nothing (`guards-construct-nothing`); `server-guards-consumers` fences `platformContext` |
| B151 | PlatformDatabase.client deferred DatabaseClient proxy | C14 (frameworks) | private createDeferredDatabaseClient in U503 | every repository built by a feature composition | DatabaseClient (Drizzle type) | proxy | none |
| B152 | PlatformContainer (U502) composition output | C14 composition | U500 | `root.server.ts` only | a record of feature slices `{ accounts, assessmentCalls, closeDatabase, coachingSales, featureFlagOverrides, platform, store, waitlist }`, with waitlist, assessment calls and coaching sales as `{ feature, handles }` | root.server.ts | `composition-root` |
| B180 | Radix wrapper boundary in C5 | C5 frameworks | checkbox, filter-chip-group, sheet, navigation-dialog, select, popover, tabs | apps through the concern subpaths | React props | C5 component | none |
| B181 | SearchParamsWriter (U805) | C5 lib (adapters) | C5 | U237 catalog-view | { searchParams, writeSearchParams } | consumer | none |
| B182 | packages/ui export map | C5 | seven concern `index.ts` entries plus `styles.css`; no root barrel | apps/platform/src, app.css | components, CSS | consumers | exports, `ui-subpaths`, `ui-primitives-import-only-lib`, `ui-lib-is-the-base` |
| B260 | DatabaseClient (U1151, Drizzle NodePgDatabase) | C2 adapters | drizzle() | U503; every repository in C7, C8, C9, C17, C6 | Drizzle ORM instance (detail type). `DatabaseTransaction`, the handle a `transaction` callback receives, is published beside it and named by U1294, U1221 and U125 | C2 | exports |
| B261 | appSchema (U1154, the `app` Postgres namespace) | C2 frameworks | tables attached by U126, U304, U407, U1028, U1295 (since GEN-192 also `coachAvailabilityTable`, in the same module), U1334 | same five, plus U1334 since GEN-192 | drizzle PgSchema builder | consumers | convention; drizzle.config.ts globs discover the tables |
| B262 | RuntimeEnvironment (U1170) | C3 frameworks | the intersection of ten concern shapes with six refinements, composed in `runtime-environment.ts` and loaded from the `./runtime` entry by U1171; the `assessment-calls` shape is one of the four with no refinement | U510 (memoised) only; every other consumer imports the concern type it reads (`AppConfig`, `DatabaseConfig`, `WaitlistConfig`, `BotDetectionSettings`, `ProductEmailConfig`, `ManagementApiConfig`, `AssessmentCallsConfig`) from `.` | typed env object | C3 | exports, `config-runtime-readers` |
| B263 | DatabaseBootstrapEnvironment / DatabaseConnection / DatabaseUserCredentials | C3 | U1174 | U503 | plain credential structures | C3 | exports |
| B265 | packages/test-support (U1191) | C16 | fixture only | test files only | Clerk-shaped fixture | tests | exports plus `no-production-import-of-tests` and `not-to-dev-dep`; the Docker builder also asserts the package is absent after `pnpm --prod deploy` |

| B277 | the request's feature-flag override set (U1352: `runWithFeatureFlagOverrides(overrides, run)`, `currentFeatureFlagOverrides()`; no interface, one `AsyncLocalStorage<Readonly<FeatureFlagSet>>`) | C14 adapters | node `AsyncLocalStorage` | writer U1355 around `next()`; reader U1353 | `Readonly<FeatureFlagSet>` (C1 boundary data) | the store module | `feature-flag-overrides-root-only` keeps every importer inside the folder or the container |
| B278 | FeatureFlagOverrides (U1354) composition output | C14 composition | composeBrowserFeatureFlagOverrides, composeWithoutFeatureFlagOverrides | U500, which hands `featureFlags` to the compositions and keeps the whole on `PlatformContainer`; `root.server.ts` calls `.middleware` off the container | `{ featureFlags: FeatureFlagReader; middleware: MiddlewareFunction<Response> }` | container.server.ts | `feature-flag-overrides-root-only`, `composition-root` |
| B279 | PricingEligibility (U1377) | C1 coaching-bundle (use-cases) | U303 PostgresWaitlistRepository (adapters, C8), handed out as the waitlist composition's `handles.pricingEligibility` | U1378, U1395, U1396, U1384 | an `EmailAddress` in; a `PriceTier` or a map of tiers out | implementer | dependency-absence; composition injection; `feature-internals` keeps C18 from importing C8's repository |
| B280 | CheckoutSessions (U1381) | C1 coaching-subscription (use-cases) | U1433 PostgresPaymentLinks (adapters, C18) | U1384 | plain `CheckoutSessionRecord`s; `{ id }` lists | implementer | dependency-absence |
| B281 | CoachingPurchases (U1382) | C1 coaching-subscription (use-cases) | U1434 PostgresCoachingPurchases (adapters, C18) | U1385 | a `CoachingPurchase` (event id, `Client` and `CoachingSubscription` instances, read by the adapter through `toSnapshot()`) in; `recorded \| duplicate_event` with the client id, or `call_already_paid`, out | implementer | dependency-absence; the write-port instance allowance in decisions.md |
| B282 | PaymentCheckout (U1383) | C1 coaching-subscription (use-cases) | U1412 InMemoryPaymentCheckout and U1416 StripePaymentCheckout (adapters, C6), selected by U1402 on `PAYMENTS_PROVIDER` | U1384, U1386 | a plain `CreateCheckoutSessionCommand` in; `{ id }`, `{ id, url }` and a plain `CheckoutCompletion` out; provider-neutral names | implementer | dependency-absence; `./payments/server` publishes only the factory |
| B283 | PaymentLinks (U1389) | C1 payment-link (use-cases) | U1433 PostgresPaymentLinks (adapters, C18) | U1384, U1395, U1396 | a plain `NewPaymentLink` in; `PaymentLink` instances out | implementer | dependency-absence |
| B284 | PaymentLinkTokenGenerator (U1389) | C1 payment-link (use-cases) | U1432 RandomLinkTokenGenerator (adapters, C18) | U1395 | `{ rawToken, sha256 }` | implementer | dependency-absence |
| B285 | PaymentLinkTokenHasher (U1389) | C1 payment-link (use-cases) | U1432 LinkTokenSha256 (adapters, C18) | U1384, U1396 | strings | implementer | dependency-absence |
| B286 | AssessmentCallReader (U1390) | C1 payment-link (use-cases) | an object over `PostgresAssessmentCallRepository.findById(...).toSnapshot()` in U1235 (composition, C17), handed out as `handles.assessmentCallReader` | U1384, U1385, U1395, U1396 | a call id in; an `AssessmentCallSnapshot` or `null` out | implementer | dependency-absence; composition injection |
| B287 | CallSalesStates (U1391) | C1 payment-link (use-cases) | U1434 PostgresCoachingPurchases (adapters, C18) | U1397, U1384, U1395, U1396 | call ids in; a map of recorded `CallSalesState`s out | implementer | dependency-absence |
| B288 | CoachingSalesIncidents (U1392) | C1 payment-link (use-cases) | U519 createConsoleLogger (C14) | U1394, U1395, U1385, U1428 | the failed read, a call id, or a rejection reason | implementer | dependency-absence, composition injection |
| B289 | CoachingSalesNotifications (U1393) | C1 payment-link (use-cases) | U1437 EmailCoachingSalesNotifications (adapters, C18), built by `createCoachingSalesNotifications` | U1395 | a `PaymentLinkMessage` (call snapshot, link id, raw token, tier) in; `sent \| failed` out | implementer | dependency-absence |
| B290 | PaymentCompletionHandler (U1404) | C6 payments (adapters; adapter-facing contract) | U1428 CoachingPurchaseCompletionHandler (adapters, C18), handed out as `handles.paymentCompletionHandler` | U518 (purpose-keyed map), U1458 | an event id and a `PaidCheckoutSession` in; `recorded \| duplicate \| ignored` out | implementer | composition injection; the platform composition throws at startup on a duplicate purpose |
| B291 | PaymentEvents (U1405) | C6 payments (adapters; adapter-facing contract) | U1415 StripePaymentEvents and U1413 InMemoryPaymentEvents (adapters, C6), both reading events through `readPaymentEvent`, selected by U1403 on `PAYMENTS_PROVIDER` | U1458 | the raw body and signature header in; `PaymentEventVerdict` out | implementer | `./payments/server` publishes the contract and the factory only |
| B292 | PaymentWebhookIncidents (U1406) | C6 payments (adapters; adapter-facing contract) | U519 createConsoleLogger (C14) | U1458 | `{ eventId, purpose }`; a handler failure adds the error class | implementer | composition injection |
| B293 | InvitationAcceptance (U1474) | C1 use-cases (`/account`) | an inline object in U1423 over U1483 (composition, C18) | U902 | `{ authSubjectId }` in; `accepted \| refused` out | implementer | dependency-absence; the `/account` slice imports no other slice; the container hands the handle from the coaching-sales to the accounts composition |
| B294 | PaidClientAdmission (U1491) | C1 use-cases (`/coaching-subscription`) | an inline object in U1423 over U1482 (composition, C18) | U1385 | `{ clientId }` in | implementer | dependency-absence; composition injection |
| B295 | ClientInvitations (U1476) | C1 use-cases (`/client-invitation`) | U1509 PostgresClientInvitations (adapters, C18) | U1482, U1483, U1484 | `ClientInvitation` instances out of the finders and into `insert` and `reissue`; plain bookkeeping writes; `accept` answers `accepted \| raced` | implementer | dependency-absence; `feature-api-to-data`; the composition hands it in |
| B296 | ClientInvitationIdGenerator (U1476) | C1 use-cases | U1508 (adapters, C18) | U1482 | string | implementer | dependency-absence |
| B297 | IdentityInvitations (U1477) | C1 use-cases | U1492 ClerkIdentityInvitations, U1493 InMemoryIdentityInvitations (adapters, C6), selected by U1494 | U1482, U1483 | plain: `{ email, invitationId }` in, `IdentityInvitation { id, url }` out; subject → invitation id | implementer | dependency-absence; C6 publishes only the factory; `clerk-confined` |
| B298 | InvitationTokenGenerator (U1478) | C1 use-cases | U1432 (adapters, C18) | U1482 | `{ rawToken, sha256 }` | implementer | dependency-absence |
| B299 | InvitationTokenHasher (U1478) | C1 use-cases | U1432 (adapters, C18) | U1484 | string | implementer | dependency-absence |
| B300 | InvitedClients (U1479) | C1 use-cases | U1510 (adapters, C18) | U1482 | plain `InvitedClient` | implementer | dependency-absence |
| B301 | ClientInvitationNotifications (U1480) | C1 use-cases | U1514 EmailClientInvitationNotifications (adapters, C18) over C6 `ProductEmail` | U1482 | plain `ClientInvitationMessage` in, `sent \| failed` out | implementer | dependency-absence |
| B302 | ClientInvitationIncidents (U1481) | C1 use-cases | U519 createConsoleLogger (adapters, C14) | U1482 | `{ invitationId }` | implementer | dependency-absence |
| B303 | ClientJourneys (U1487) | C1 use-cases (`/client-journey`) | U1507 PostgresClientJourneys (adapters, C18) | U1488, U1489 | `ClientJourney` instance out; `{ clientId, at }` in | implementer | dependency-absence |

## Entry points and composition roots

| Kind | Path | Constructs |
|---|---|---|
| composition-root | apps/platform/src/server/container.server.ts (createPlatformContainer, memoised by getPlatformContainer) | the shared handles once — `createPlatformDatabase`, the `Clock` implementation, `createConsoleLogger()`, `createBotVerifier()`, `createManagementAuthConfig()` and `createManagementAuthenticator()`, `createProductEmail()`, `createPaymentCheckout()` and `createPaymentEvents()`, one `PostgresFeatureFlagRepository` and one `GetFeatureFlagsUseCase`, and the override selection by `resolveFeatureFlagOverridesMode(environment)` — then, in order, `composeWaitlistFeature`, `composeAssessmentCallsFeature`, `composeCoachingSalesFeature` (given `assessmentCalls.handles.assessmentCallReader` and `waitlist.handles.pricingEligibility`), `composePlatformFeature` (given `[coachingSales.handles.paymentCompletionHandler]`, the payment events verifier and the webhook signing secret), `composeAccountsFeature`, `composeStoreFeature`; the selected feature-flag reader goes to the platform, waitlist, assessment-calls and coaching-sales compositions; `featureFlagOverrides` is a field of the container. One console logger implements B266, B267, B273, B288 and B292 |
| composition-root (second) | apps/platform/src/root.server.ts | `clerkMiddleware()`, the container's `featureFlagOverrides.middleware`, `createFeatureContextMiddleware(getPlatformContainer)`, `createAccountResolutionMiddleware()`, in that order; the container's only importer |
| composition-site | apps/platform/src/features/accounts/server/accounts-composition.server.ts | the account repository, `ProvisionAccountUseCase` (with the `InvitationAcceptance` it is handed), `DeleteAccountUseCase`, and the account and webhook controllers; `AccountsFeatureHandles` names only what the feature reads |
| composition-site | apps/platform/src/features/store/server/store-composition.server.ts | the store repositories, asset store and digests, token generators, zip stream, `EmailProductDelivery`, the eight `/product`, `/acquisition` and `/download-grant` use cases, and the five store controllers; `StoreFeatureHandles` names only what the feature reads |
| composition-site | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | `PostgresAssessmentCallRepository`, `PostgresCoachCalendar` (C6, for `ListOpenSlotsUseCase`), `createAssessmentCallNotifications(...)`, the five `/assessment-call` use cases and both controllers, `AssessmentCallsController` and `AssessmentCallSettingsController`. Synchronous, and no use case receives a value read off an adapter at composition: `BookAssessmentCallUseCase` reads the coach's zone from `availability.current()` inside `execute()`. The one remaining assessment-call variable arrives as the handle `assessmentCallsConfig` (the container passes the runtime environment, typed as `AssessmentCallsConfig`). The container's shared `FeatureFlagReader` and incidents handle arrive as `featureFlags` and `incidents`; the composition builds one `AssessmentCallBookingWindow` from them, held by the two booking use cases, not by the controller (CH-F). Changed (GEN-192): builds one `PostgresCoachAvailability` (C6) in place of the deleted `StaticCoachAvailability`, and one `PostgresCoachMeetingRoom` (C6) in place of the deleted `ConfiguredMeetingRoomLink`; both instances are shared across every use case that takes them (`BookAssessmentCallUseCase`, `ListOpenSlotsUseCase`, `ResolveJoinLinkUseCase`, `GetAssessmentCallSettingsUseCase`, `UpdateAssessmentCallSettingsUseCase`); returns `{ feature, handles: { assessmentCallReader } }` |
| composition-site | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | `PostgresPaymentLinks`, `PostgresCoachingPurchases`, `PostgresClientInvitations`, `PostgresInvitedClients`, `PostgresClientJourneys`, the invitation id generator, the token generator and hasher, `EmailClientInvitationNotifications`, the three `/client-invitation` and two `/client-journey` use cases, the inline `PaidClientAdmission` and `InvitationAcceptance`, the invitations and client-journey controllers, `CoachingSalesWindow`, the eight `/payment-link`, `/coaching-subscription` and `/coaching-bundle` use cases, `createCoachingSalesNotifications(...)`, the three controllers (`CheckoutsController`, `CoachSalesController`, `PaymentLinksController`) and `CoachingPurchaseCompletionHandler`; returns `{ feature, handles: { paymentCompletionHandler } }` |
| composition-site | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | `Waitlist.configure(...)` from the offer config, the waitlist repository, `EmailWaitlistConfirmation`, `GetWaitlistUseCase` with the supplied `FeatureFlagReader`, `JoinWaitlistUseCase` and the waitlist controller; returns `{ feature, handles: { pricingEligibility } }`; its input handles type is module-private |
| composition-site | apps/platform/src/server/platform-composition.server.ts | readyz, metadata, feature-flag and Stripe webhook controllers plus the runtime config the public site reads; it receives `FeatureFlagReader`, `PaymentEvents`, the signing secret and the completion handlers, builds a purpose-keyed map that throws at startup on a duplicate purpose, constructs no persistence, and keeps `PlatformFeatureHandles` module-private |
| composition-site | apps/platform/src/server/feature-flag-overrides/feature-flag-overrides-composition.server.ts | `createFeatureFlagOverrideReader(reader)` over the container's raw reader and `createFeatureFlagOverrideMiddleware({ appBasePath })` in `browser` mode; the raw reader and `(_args, next) => next()` in `none` mode; both branches return `{ featureFlags, middleware }`; reachable only from the container |
| construction-site | apps/platform/src/server/database.server.ts (openPool, lazy) | pg Pool via createManagedDatabasePool; Drizzle client via createDatabaseClient |
| construction-site | apps/platform/src/features/store/email/create-product-delivery.server.ts | EmailProductDelivery over the `ProductEmail` it is handed; no provider branch |
| construction-site | apps/platform/src/features/waitlist/email/create-waitlist-confirmation.server.ts | EmailWaitlistConfirmation over the `ProductEmail` it is handed; no provider branch |
| construction-site | packages/infrastructure/src/email/create-product-email.server.ts | InMemoryProductEmail or `new Resend()` + ResendProductEmail, selected on `PRODUCT_EMAIL_PROVIDER` (`memory \| resend`) |
| construction-site | packages/infrastructure/src/bot-detection/verifier/create-bot-verifier.server.ts | StaticTokenBotVerifier or TurnstileBotVerifier, selected on `BOT_DETECTION_PROVIDER`; no `ENVIRONMENT` sniff |
| construction-site | packages/infrastructure/src/management-auth/create-management-authenticator.server.ts | BearerSecretManagementAuthenticator (bearer only) |
| construction-site | apps/platform/src/features/coaching-sales/email/create-coaching-sales-notifications.server.ts | EmailCoachingSalesNotifications over the `ProductEmail` it is handed; no provider branch |
| construction-site | packages/infrastructure/src/payments/create-payment-checkout.server.ts, create-payment-events.server.ts | InMemoryPaymentCheckout / InMemoryPaymentEvents, or the Stripe client with StripePaymentCheckout / StripePaymentEvents, selected on `PAYMENTS_PROVIDER` (`memory \| stripe`); the Stripe SDK is constructed nowhere else |
| construction-site | packages/infrastructure/src/identity/create-identity-invitations.server.ts | InMemoryIdentityInvitations, or `createClerkClient` + ClerkIdentityInvitations, selected on `IDENTITY_PROVIDER` (`memory \| clerk`) |
| construction-site | apps/platform/src/features/store/api/downloads/zip-stream.server.ts (ZipDeliveryStream.create) | archiver ZipArchive at request time |
| construction-site | apps/platform/src/features/store/ui/public/cart/cart.ts, cart-provider.tsx | Zustand store with persist over localStorage (`cart-storage.ts`); one store per provider |
| route registry | apps/platform/src/routes.ts | a concatenation of nine fragments (`publicSiteRoutes`, `platformApiRoutes`, `accountsApiRoutes`, `waitlistApiRoutes`, `storeApiRoutes`, `assessmentCallsApiRoutes`, `coachingSalesApiRoutes`, `clientPortalRoutes`, `coachPortalRoutes`), each built with `relative(import.meta.dirname)` in its own feature or surface, with no path literals of its own |
| route (page) | surfaces/public-site/shell/layout.tsx (+ layout.server.ts loader), pages/{home,pricing,blog,privacy,terms}.tsx | the layout loader reads `waitlistContext`, `sessionContext` and `runtimeConfigContext` off `args.context` and returns `presentWaitlist(...)`. `pages/pricing.tsx`'s loader reads `waitlistContext` and `coachingSalesContext` (`checkouts.loadPricingCards`); it exports `handle.publicContentFrame = "full-bleed"`, as the booking page does |
| route (page) | features/store/ui/public/{catalog/catalog-page,product/product-page,download/download-page}.tsx (+ .server.ts loaders) | the loaders read `storeContext` |
| route (page) | surfaces/public-site/pages/invitation.tsx | the loader reads `accountsContext` and `sessionContext` and returns `{ signedIn, invitationPath }`; the browser resolves the fragment's token through C18's `api/public/invitation.ts`. Registered by `surfaces/public-site/routes.ts` after the layout route, outside the shell |
| route (page) | features/accounts/ui/public/sign-in-failed-page.tsx (+ .server.ts) | reads `accountsContext`. Registered through `accountsDeadEndRoutes`, which `surfaces/public-site/routes.ts` spreads after the layout route rather than inside it, so the page renders as a dead end with no public shell |
| route (page) | features/assessment-calls/ui/public/book/book-page.tsx, ui/public/join/join-page.tsx | both loaders read `assessmentCallsContext` and nothing else. The booking loader returns an `unavailable` presentation rather than throwing when slots cannot be read (D21), and 404s while booking is closed because `ListOpenSlotsUseCase` answers `closed`. The join loader redirects 302 to the meeting room for a known id, throws a 404 `Response` for any id that does not resolve (a malformed one included) that the root `ErrorBoundary` in `root.tsx` renders as the app's standard "Page not found" page, which echoes no id, and since GEN-192 returns `{ status: "link_not_set" }` instead of throwing when the coach has not yet saved a meeting room, which the page renders as its own "call link not ready" view built from C5's `DeadEndPage`. The module keeps a default export so it stays a page route: before GEN-192 that export always returned `null`, since the loader always threw; now it renders conditionally. The loader does not read the mode, so a join link keeps working if the site returns to waiting-list mode. The booking page module also exports `handle.publicContentFrame` as `"full-bleed"`, which the public-site layout reads through `useMatches` to drop its padded content frame |
| route (page) | features/assessment-calls/ui/coach/settings/settings-page.tsx | the loader reads `assessmentCallsContext` alone; a 401/403 `ErrorBoundary` recovers into the same page with a `toast.error` side effect. Registered through `assessmentCallsCoachRoutes`, which `surfaces/coach-portal/routes.ts` composes inside the coach layout |
| route (page) | surfaces/coach-portal/pages/assessment-calls.tsx | the loader reads `assessmentCallsContext` for the listing and `coachingSalesContext` for the ended calls' sales states and the callers' pricing tiers; re-exports C17's `AssessmentCallsErrorBoundary` |
| route (page) | features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx, ui/public/checkout-complete/checkout-complete-page.tsx | both loaders read `coachingSalesContext` alone and 404 while sales are closed: the select-bundle loader serves the page shell (`checkouts.loadBundlePageShell`) and the browser posts the fragment's payment-link token to `POST /api/coaching-sales/bundle-page` for the bundle page itself; the confirmation loader calls `checkouts.loadConfirmation`. Registered through `coachingSalesPublicRoutes` inside the public-site shell |
| route (page) | surfaces/client-portal/shell/access-layout.tsx (+ middleware), shell/layout.tsx, pages/home.tsx; surfaces/coach-portal/shell/layout.tsx (+ middleware), pages/home.tsx | middleware calls `requirePortalAccess(args, { role })`; the client portal's access layout then runs C18's `requireClientJourneyStep`, which redirects a client whose journey step does not open the requested path |
| route (page) | features/coaching-sales/ui/client/welcome/welcome-page.tsx | loader and action each make one call on `coachingSalesContext`'s `clientJourney` controller; registered through `coachingSalesClientRoutes` inside the client portal's access layout |
| route (resource) | features/store/api/{acquisitions/acquisitions,catalog/catalog,covers/covers,downloads/downloads,management/management-product-validations,management/management-products,management/management-product,management/management-product-versions}.ts | read `storeContext` |
| route (resource) | features/waitlist/api/waitlist.ts; features/accounts/api/{account,clerk-webhooks}.ts; features/assessment-calls/api/booking/{slots,bookings}.ts; features/assessment-calls/api/settings/settings.ts; features/coaching-sales/api/{coach/payment-links,public/checkouts,public/bundle-page}.ts | read `waitlistContext` / `accountsContext` / `assessmentCallsContext` / `coachingSalesContext` |
| route (resource) | server/api/{readyz/readyz,meta/meta,feature-flags/feature-flags,stripe-webhooks/stripe-webhooks}.ts | read `platformContext`; `api/stripe/webhooks` accepts POST only |
| route (resource) | surfaces/client-portal/api/{manifest,sw,readyz}.ts; surfaces/coach-portal/api/readyz.ts | pwa definitions; static Response |
| middleware | root.server.ts (Clerk, feature-flag overrides, feature contexts, account resolution); portal layout.server.ts and the client portal's access-layout.server.ts (role and journey guards) | see above; the override middleware runs `next()` inside the override store, so every loader, action and controller under it sees the request's overrides through the reader |
| CLI/build | apps/platform/db/drizzle.config.ts (schema globs), vite.config.ts, react-router.config.ts | tooling entry points, not imported by app code |
| package deployment | package manifests and docker/Dockerfile.react-router | `apps/platform` emits only `build`; runtime config, content, domain, infrastructure, and UI packages retain production source/artifacts while excluding `src/**/*.test.*` and `src/**/*.spec.*`; the Docker builder requires `build/server/index.js`, rejects top-level `src` and `e2e`, recursively rejects test/spec files under `node_modules/@eli-coach-platform`, and rejects `@eli-coach-platform/test-support` |

## Shared data shapes

| Shape | Components reading or writing it | Owning component |
|---|---|---|
| Postgres namespace `app` (appSchema) and the migration journal apps/platform/db/drizzle | C2 declares the namespace; C7 (store tables), C8 (waitlist_entries), C9 (accounts, account_role enum), C17 (assessment_calls), C18 (payment_links, checkout_sessions, clients, coaching_subscriptions), C6 (feature_flags, coach_time_reservations, coach_availability, coach_meeting_room, payment_events) attach tables; C15 drizzle.config.ts discovers them by glob | C2 owns the namespace; each table is owned by the component that declares it |
| `app.coach_availability` and `app.coach_meeting_room` (the two one-row singleton tables migration `0024_create_coach_availability_and_meeting_room.sql` creates) | C6 declares both (`coach-calendar/schema.server.ts`'s `availability/`-adjacent table and the new `coach-meeting-room/schema.server.ts`) and reads/writes them through `PostgresCoachAvailability`/`PostgresCoachMeetingRoom`; C1's `CoachAvailabilitySource`/`CoachAvailabilityChanges` and `CoachMeetingRoomSource`/`CoachMeetingRoomChanges` ports are the only way any other component reaches them; C17's composition constructs both adapters and its two settings use cases are the sole consumers | C6 owns the tables; C1 owns the ports and the validation |
| `app.waitlist_entries.reduced_slot` and its constraints | C8 declares them in U304 and migration 0019 (U1212); U303 allocates slots; U1211 reads the constraint names | C8 owns the table; N is U911's `WAITLIST_REDUCED_PRICING_CAP`, and changing it is a migration in the same PR (b3eb2653) |
| `app.feature_flags`, including `WAITLIST_MODE` | C6 declares and reads it; C15 migration 0018 seeds `WAITLIST_MODE=true`; C14 constructs the generic reader and, in `browser` mode, overlays the request's overrides on the read without writing the table; integration tests write it only for test arrangement; the Playwright suite reaches the flag only through the public `ff.WAITLIST_MODE` override | C6 owns the table; U963 owns the waitlist-mode interpretation and U1300 the booking one, both through `WAITLIST_MODE_FEATURE_FLAG` |
| store zod contracts (contracts/store.ts, store-management.ts) | C7 server half and C7 ui half; C11 through `contracts/` | C7 |
| waitlist zod contracts (contracts/waitlist.ts) | C8; C11 | C8 |
| assessment-call zod contracts (contracts/assessment-calls.ts, and since GEN-192 contracts/assessment-call-settings.ts) | C17 server half and C17 ui half only; no other component reads them | C17 |
| The call-moment wording (contracts/call-moment.ts: `formatCallMoment`, `formatDayFirstDate`, `formatMonthFirstDate`, `formatMonthFirstDay`, `formatClockTime`, `nameTimeZone`) | C17 only: the two email content builders read `formatCallMoment`, which is built on `formatDayFirstDate` and `formatClockTime`; `slot-calendar.tsx` reads `formatDayFirstDate` for the days' accessible names; the booking confirmation, the call overview and the slot picker read the on-screen date (`formatMonthFirstDate`), day heading (`formatMonthFirstDay`), time (`formatClockTime`) and zone (`nameTimeZone`). One module words a call for the emails and the screen, each formatter is named for its wording and every wording names its locale, so the server and the browser render a call identically; every function takes `(instant, timeZone)`, and one `Intl.DateTimeFormat` per wording and zone is cached for the life of the process | C17 |
| The assessment-call rule literals (ASSESSMENT_CALL_RULES: duration, buffer, step, horizon, lead) | C1 `/assessment-call` owns them as a `SlotPolicy` since the coach-calendar refactor; `/coach-availability` defines the `SlotPolicy` shape and names no appointment kind. `stepMinutes` is not a literal: it is derived as duration plus buffer from two module constants. `AssessmentCall` reads the duration to derive `endsAt`; `CoachAvailability` reads the duration, step, horizon and lead time off whichever policy it is handed, the duration so that a start is offered only if the call ends inside the window; `SlotPolicy.of` rejects an invalid policy, so a wrong literal fails at module load; `SlotPolicy.coachTimeFrom` reads the duration and the buffer to size the coach's held interval, which the slot filter tests for overlap and the repository reserves. No adapter re-applies the duration to compute an end: C17 reads `durationMinutes` only as a label (the controller's response and the wire literal, the email copy and `.ics` description, `CallOverview` on the page) and no longer reads `horizonDays`: since the booking-card rebuild the calendar's months are unbounded and a day with no open slot is disabled | C1 |
| accounts contracts (PublicSessionState, accountResponseSchema, AccountRole) | C9; C11; AccountRole originates in C1 | C9 (wire) / C1 (role) |
| BotDetectionConfig (zod schema in C6) | C6; C7 ui; C8 ui; C11 loader data and props | C6 |
| FeatureFlagSnapshot (featureFlagSnapshotSchema) | C14 controller and route; integration tests | C14 (`server/api/feature-flags/feature-flags-contract.ts`) |
| The request's feature-flag override set (`Readonly<FeatureFlagSet>` in an `AsyncLocalStorage`) and the `__eli_feature_flags` cookie | C14 only: the override middleware writes the store around `next()` and serialises the cookie (`Path=normalizeBasePath(APP_BASE_PATH)`, `HttpOnly`, `SameSite=Lax`); the decorator reader reads the store; the browser holds the cookie | C14 (`server/feature-flag-overrides/`) |
| RuntimeEnvironment | eleven concern shapes, each owned by its `concerns/*.ts` module; consumers read the concern type, and only `apps/platform/src/server/runtime-environment.server.ts` loads the process environment | C3 |
| Route path literals | one owner each: `features/<feature>/contracts/paths.ts`, `surfaces/public-site/paths.ts` and, for the endpoints no surface owns, `server/api/routes.ts` (`api/stripe/webhooks`). The `client` and `coach` portal segments are owned by the accounts feature because `surface-import` forbids a feature importing a surface; `BOOK_PATH` is owned by the assessment-calls feature and read by the public site and by coaching sales; the coach calls and settings paths and `COACH_CALLS_PAGE_PARAM` are owned by the assessment-calls feature (built from the accounts feature's `COACH_PORTAL_PATH`) and read by the coach portal and by coaching sales; the select-bundle, checkout-complete and coaching-sales API paths are owned by the coaching-sales feature | C7, C8, C9, C11, C13, C14, C17, C18 |
| The offer-plan literal `"all-bundles"` | C1 `/waitlist` owns it (`waitlist.ts:WaitlistOfferPlan`); read by C8 `ui/shared` (`bundleOfferPlan` on `WaitlistPresentation`), and re-declared as a bare string in C8 `contracts/waitlist.ts`, C8 `email/waitlist-confirmation-email.server.ts` and C3 `concerns/waitlist.ts` | C1 |
| WaitlistPresentation (mode, isClosed, isUnavailable, showsAuthControls, availabilityStatus, bundleOfferPlan) | C11 shell, hero, about, footer CTA, pricing and the email form. The closed/unavailable/open **copy** branch is re-derived in `hero.tsx`, `footer-cta.tsx` and `pricing.tsx` rather than carried on the presentation (owner ruling: copy tables stay in views) | C8 `ui/shared` |
| C18's tables (`app.payment_links`, `app.checkout_sessions`, `app.clients`, `app.client_invitations`, `app.coaching_subscriptions`) with foreign keys to C17's `app.assessment_calls`; migrations 0026, 0027 and 0028 | C18 declares and writes them; `clients_assessment_call_id_unique` and `clients_auth_subject_id_unique` are shared by the schema (`coachingSalesConstraints`) and the repositories' classified rejections; `client_invitations` keeps one invitation per client and one per token hash; `coaching_subscriptions_one_open_per_client` is a partial unique index | C18 (the referenced table stays C17's) |
| `app.payment_events` (the payment-event ledger: event id, received at) | C6 declares it and writes it through `recordPaymentEvent`, which a feature adapter calls inside its own transaction (C18's `PostgresCoachingPurchases.recordCompletion`); a repeated event id answers `duplicate` and the feature writes nothing else | C6 |
| Checkout metadata key `purpose` (`PAYMENT_PURPOSE_METADATA_KEY`) and its values | C1 owns each value (`COACHING_SUBSCRIPTION_PURPOSE`) and carries it on `CreateCheckoutSessionCommand.metadata`; C6 writes it into the provider's session metadata; C14's webhook controller routes a paid session to the handler registered for it; each handler (C18) declares the purpose it serves | key C6; values C1 |
| Coaching bundle value lists (`COACHING_BUNDLE_IDS`, `COACHING_BUNDLE_MONTHS`, `PRICE_TIERS`, and each bundle's `currency`) | C1 publishes them from `/coaching-bundle` (each tuple checked against the catalog by a test); C6's coaching checkout mapper, C18's contracts (zod enums) and C18's schema (column enums and checks) import them; the checkout use case reads the currency off the bundle | C1 |
| coaching-sales zod contracts (contracts/coaching-sales.ts, bundle-cards.ts, paths.ts) and loader data (`BundlePage`, `CheckoutConfirmation`, sales states, pricing tiers, bundle cards) | C18 server and ui halves; C13 (`CallSalesState`, loader data); C11 (bundle cards) | C18 |
| PaymentsConfig (`PAYMENTS_PROVIDER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SIGNING_SECRET`, `STRIPE_API_BASE_URL`) | C3 declares and refines; C6 factories read it; C14 passes the environment and the signing secret; the integration rig points the API base URL at WireMock | C3 |
| localStorage cart (STORE_CART_STORAGE_KEY) | C7 ui only | C7 |
| Email HTML rendered from React primitives (Email*) and the email theme (`EMAIL_COLORS`, `EMAIL_FONTS`) | C6 owns the primitives and the theme; the content builders and their style constants live in each feature's `email/` folder (C7, C8, C17, C18; accepted exception) and read the one theme | C6 |
| CLERK_TEST_ENVIRONMENT and the Stripe webhook signature scheme (`./stripe-webhook-signature`) | read only by tests (the integration rig and the e2e suite) | C16 |
| The auth subject id: `app.accounts.auth_subject_id` (C9) and `app.clients.auth_subject_id` (C18, unique, no foreign key) | C9 writes the account on provisioning; C18's `PostgresClientInvitations.accept` binds the client in the acceptance transaction; C1's `InvitationAcceptance` carries it between the two; account deletion leaves the client bound | C9 (the identity provider's user id) |
| The client journey step (`ClientJourneyStep`: `welcome \| onboarding`) and its paths | C1 `/client-journey` owns the steps; C18 `contracts/client-journey.ts` maps each to its destination and open paths; C11's portal destination and C12's access layout read them through C18 | C1 (steps) / C18 (paths) |
| Clerk invitation public metadata `invitationId` | C6's Clerk adapter writes it on the provider invitation and reads it back from the signed-up user | C6 |

## Edges

An edge from A to B means A's source names B. Direction `inward` points toward policy.

| ID | From | To | Kind | Crosses component | Crosses ring | Direction | Status |
|---|---|---|---|---|---|---|---|
| E1 | apps/platform/src/features/accounts/api/account-controller.server.ts | apps/platform/src/features/accounts/contracts/account.ts | import | no | yes | outward | present |
| E2 | apps/platform/src/features/accounts/api/account-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-account.server.ts | import | no | yes | outward | present |
| E3 | apps/platform/src/features/accounts/api/account.ts | apps/platform/src/features/accounts/server/guards/accounts-context.server.ts | import | no | no | lateral | present |
| E4 | apps/platform/src/features/accounts/api/account.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E5 | apps/platform/src/features/accounts/api/clerk-webhooks.ts | apps/platform/src/features/accounts/server/guards/accounts-context.server.ts | import | no | no | lateral | present |
| E6 | apps/platform/src/features/accounts/api/clerk-webhooks.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E738 | apps/platform/src/features/accounts/api/webhook-controller.server.ts | packages/domain/src/account/index.ts | import | yes | no | lateral | present |
| E8 | apps/platform/src/features/accounts/api/webhook-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E739 | apps/platform/src/features/accounts/contracts/account.ts | external:zod | import | n/a | no | lateral | present |
| E741 | apps/platform/src/features/accounts/contracts/paths.ts | packages/domain/src/account/index.ts | import | yes | yes | inward | present |
| E12 | apps/platform/src/features/accounts/data/account-repository.server.ts | apps/platform/src/features/accounts/data/schema.server.ts | import | no | no | lateral | present |
| E13 | apps/platform/src/features/accounts/data/account-repository.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E742 | apps/platform/src/features/accounts/data/account-repository.server.ts | packages/domain/src/account/index.ts | import | yes | no | lateral | present |
| E15 | apps/platform/src/features/accounts/data/schema.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E743 | apps/platform/src/features/accounts/data/schema.server.ts | packages/domain/src/account/index.ts | import | yes | no | lateral | present |
| E17 | apps/platform/src/features/accounts/routes.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | no | no | lateral | present |
| E18 | apps/platform/src/features/accounts/server/account-resolution-middleware.server.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | no | no | lateral | present |
| E19 | apps/platform/src/features/accounts/server/account-resolution-middleware.server.ts | apps/platform/src/features/accounts/server/guards/accounts-context.server.ts | import | no | no | lateral | present |
| E20 | apps/platform/src/features/accounts/server/account-resolution-middleware.server.ts | apps/platform/src/features/accounts/server/guards/session-context.server.ts | import | no | no | lateral | present |
| E21 | apps/platform/src/features/accounts/server/account-resolution-middleware.server.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E744 | apps/platform/src/features/accounts/server/account-resolution-middleware.server.ts | packages/domain/src/account/index.ts | import | yes | yes | inward | present |
| E23 | apps/platform/src/features/accounts/server/accounts-composition.server.ts | apps/platform/src/features/accounts/api/account-controller.server.ts | import | no | yes | inward | present |
| E24 | apps/platform/src/features/accounts/server/accounts-composition.server.ts | apps/platform/src/features/accounts/api/webhook-controller.server.ts | import | no | yes | inward | present |
| E25 | apps/platform/src/features/accounts/server/accounts-composition.server.ts | apps/platform/src/features/accounts/data/account-repository.server.ts | import | no | yes | inward | present |
| E26 | apps/platform/src/features/accounts/server/accounts-composition.server.ts | packages/db/src/index.ts | import | yes | yes | inward | present |
| E745 | apps/platform/src/features/accounts/server/accounts-composition.server.ts | packages/domain/src/account/index.ts | import | yes | yes | inward | present |
| E28 | apps/platform/src/features/accounts/server/guards/accounts-context.server.ts | apps/platform/src/features/accounts/server/accounts-composition.server.ts | import | no | yes | outward | present |
| E29 | apps/platform/src/features/accounts/server/guards/require-account.server.ts | apps/platform/src/features/accounts/server/guards/session-context.server.ts | import | no | no | lateral | present |
| E746 | apps/platform/src/features/accounts/server/guards/require-account.server.ts | packages/domain/src/account/index.ts | import | yes | yes | inward | present |
| E31 | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | apps/platform/src/features/accounts/server/guards/accounts-context.server.ts | import | no | no | lateral | present |
| E32 | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | apps/platform/src/features/accounts/server/guards/session-context.server.ts | import | no | no | lateral | present |
| E747 | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | packages/domain/src/account/index.ts | import | yes | yes | inward | present |
| E748 | apps/platform/src/features/accounts/server/guards/session-context.server.ts | packages/domain/src/account/index.ts | import | yes | yes | inward | present |
| E35 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | apps/platform/src/features/accounts/contracts/account.ts | import | no | no | lateral | present |
| E749 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | external:react | import | n/a | no | lateral | present |
| E39 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1463 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E40 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.tsx | apps/platform/src/features/accounts/server/guards/accounts-context.server.ts | import | no | no | lateral | present |
| E41 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.tsx | apps/platform/src/features/store/contracts/paths.ts | import | yes | no | lateral | present |
| E751 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E42 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.tsx | packages/config/src/index.ts | import | yes | no | lateral | present |
| E1408 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E1416 | apps/platform/src/features/accounts/ui/public/sign-in-failed-page.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E46 | apps/platform/src/features/accounts/ui/shared/access-denied-page.tsx | apps/platform/src/features/accounts/contracts/paths.ts | import | no | no | lateral | present |
| E47 | apps/platform/src/features/accounts/ui/shared/access-denied-page.tsx | apps/platform/src/features/store/contracts/paths.ts | import | yes | no | lateral | present |
| E752 | apps/platform/src/features/accounts/ui/shared/access-denied-page.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1409 | apps/platform/src/features/accounts/ui/shared/access-denied-page.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E1421 | apps/platform/src/features/accounts/ui/shared/access-denied-page.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1216 | apps/platform/src/features/assessment-calls/api/booking/assessment-calls-controller.server.ts | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | import | no | no | lateral | present; changed (GEN-192, path only): moved from `api/assessment-calls-controller.server.ts` into `api/booking/` |
| E1218 | apps/platform/src/features/assessment-calls/api/booking/assessment-calls-controller.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present; changed (GEN-192, path only) |
| E1221 | apps/platform/src/features/assessment-calls/api/booking/assessment-calls-controller.server.ts | packages/infrastructure/src/bot-detection/index.server.ts | import | yes | no | lateral | present; changed (GEN-192, path only) |
| E1222 | apps/platform/src/features/assessment-calls/api/booking/assessment-calls-controller.server.ts | packages/infrastructure/src/bot-detection/index.ts | import | yes | no | lateral | present; changed (GEN-192, path only) |
| E1223 | apps/platform/src/features/assessment-calls/api/booking/bookings.ts | apps/platform/src/features/assessment-calls/server/guards/assessment-calls-context.server.ts | import | no | no | lateral | present; changed (GEN-192, path only): moved from `api/bookings.ts` into `api/booking/` |
| E1224 | apps/platform/src/features/assessment-calls/api/booking/bookings.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present; changed (GEN-192, path only) |
| E1225 | apps/platform/src/features/assessment-calls/api/booking/slots.ts | apps/platform/src/features/assessment-calls/server/guards/assessment-calls-context.server.ts | import | no | no | lateral | present; changed (GEN-192, path only): moved from `api/slots.ts` into `api/booking/` |
| E1226 | apps/platform/src/features/assessment-calls/api/booking/slots.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present; changed (GEN-192, path only) |
| E1227 | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | external:zod | import | n/a | no | lateral | present |
| E1438 | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present |
| E1230 | apps/platform/src/features/assessment-calls/data/repository.server.ts | apps/platform/src/features/assessment-calls/data/schema.server.ts | import | no | no | lateral | present |
| E1439 | apps/platform/src/features/assessment-calls/data/repository.server.ts | external:crypto | import | n/a | yes | outward | present |
| E1231 | apps/platform/src/features/assessment-calls/data/repository.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E1232 | apps/platform/src/features/assessment-calls/data/repository.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present |
| E1440 | apps/platform/src/features/assessment-calls/data/repository.server.ts | packages/infrastructure/src/coach-calendar/index.server.ts | import | yes | no | lateral | present |
| E1233 | apps/platform/src/features/assessment-calls/data/schema.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E1235 | apps/platform/src/features/assessment-calls/email/assessment-call-email-actions.server.tsx | apps/platform/src/features/assessment-calls/email/assessment-call-email-styles.server.ts | import | no | no | lateral | present |
| E1236 | apps/platform/src/features/assessment-calls/email/assessment-call-email-actions.server.tsx | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
| E1238 | apps/platform/src/features/assessment-calls/email/calendar-invite.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present |
| E1240 | apps/platform/src/features/assessment-calls/email/coach-notification-email-template.server.tsx | apps/platform/src/features/assessment-calls/email/assessment-call-email-actions.server.tsx | import | no | no | lateral | present |
| E1241 | apps/platform/src/features/assessment-calls/email/coach-notification-email-template.server.tsx | apps/platform/src/features/assessment-calls/email/assessment-call-email-styles.server.ts | import | no | no | lateral | present |
| E1242 | apps/platform/src/features/assessment-calls/email/coach-notification-email-template.server.tsx | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
| E1368 | apps/platform/src/features/assessment-calls/email/coach-notification-email.server.ts | apps/platform/src/features/assessment-calls/contracts/call-moment.ts | import | no | no | lateral | present |
| E1243 | apps/platform/src/features/assessment-calls/email/coach-notification-email.server.ts | apps/platform/src/features/assessment-calls/email/assessment-call-email-actions.server.tsx | import | no | no | lateral | present |
| E1245 | apps/platform/src/features/assessment-calls/email/coach-notification-email.server.ts | apps/platform/src/features/assessment-calls/email/coach-notification-email-template.server.tsx | import | no | no | lateral | present |
| E1246 | apps/platform/src/features/assessment-calls/email/coach-notification-email.server.ts | external:react | import | n/a | no | lateral | present |
| E1247 | apps/platform/src/features/assessment-calls/email/coach-notification-email.server.ts | external:react-dom/server | import | n/a | no | lateral | present |
| E1248 | apps/platform/src/features/assessment-calls/email/coach-notification-email.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present |
| E1250 | apps/platform/src/features/assessment-calls/email/create-assessment-call-notifications.server.ts | apps/platform/src/features/assessment-calls/email/email-assessment-call-notifications.server.ts | import | no | no | lateral | present |
| E1251 | apps/platform/src/features/assessment-calls/email/create-assessment-call-notifications.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present |
| E1475 | apps/platform/src/features/assessment-calls/email/create-assessment-call-notifications.server.ts | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | added (main merge) |
| E1253 | apps/platform/src/features/assessment-calls/email/email-assessment-call-notifications.server.ts | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | no | no | lateral | present |
| E1254 | apps/platform/src/features/assessment-calls/email/email-assessment-call-notifications.server.ts | apps/platform/src/features/assessment-calls/email/calendar-invite.server.ts | import | no | no | lateral | present |
| E1255 | apps/platform/src/features/assessment-calls/email/email-assessment-call-notifications.server.ts | apps/platform/src/features/assessment-calls/email/coach-notification-email.server.ts | import | no | no | lateral | present |
| E1256 | apps/platform/src/features/assessment-calls/email/email-assessment-call-notifications.server.ts | apps/platform/src/features/assessment-calls/email/visitor-confirmation-email.server.ts | import | no | no | lateral | present |
| E1257 | apps/platform/src/features/assessment-calls/email/email-assessment-call-notifications.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E1258 | apps/platform/src/features/assessment-calls/email/email-assessment-call-notifications.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present |
| E1476 | apps/platform/src/features/assessment-calls/email/email-assessment-call-notifications.server.ts | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | added (main merge) |
| E1260 | apps/platform/src/features/assessment-calls/email/visitor-confirmation-email-template.server.tsx | apps/platform/src/features/assessment-calls/email/assessment-call-email-actions.server.tsx | import | no | no | lateral | present |
| E1261 | apps/platform/src/features/assessment-calls/email/visitor-confirmation-email-template.server.tsx | apps/platform/src/features/assessment-calls/email/assessment-call-email-styles.server.ts | import | no | no | lateral | present |
| E1262 | apps/platform/src/features/assessment-calls/email/visitor-confirmation-email-template.server.tsx | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
| E1369 | apps/platform/src/features/assessment-calls/email/visitor-confirmation-email.server.ts | apps/platform/src/features/assessment-calls/contracts/call-moment.ts | import | no | no | lateral | present |
| E1263 | apps/platform/src/features/assessment-calls/email/visitor-confirmation-email.server.ts | apps/platform/src/features/assessment-calls/email/assessment-call-email-actions.server.tsx | import | no | no | lateral | present |
| E1265 | apps/platform/src/features/assessment-calls/email/visitor-confirmation-email.server.ts | apps/platform/src/features/assessment-calls/email/visitor-confirmation-email-template.server.tsx | import | no | no | lateral | present |
| E1266 | apps/platform/src/features/assessment-calls/email/visitor-confirmation-email.server.ts | external:react | import | n/a | no | lateral | present |
| E1267 | apps/platform/src/features/assessment-calls/email/visitor-confirmation-email.server.ts | external:react-dom/server | import | n/a | no | lateral | present |
| E1268 | apps/platform/src/features/assessment-calls/email/visitor-confirmation-email.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present |
| E1270 | apps/platform/src/features/assessment-calls/routes.ts | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | no | yes | inward | present |
| E1271 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | apps/platform/src/features/assessment-calls/api/booking/assessment-calls-controller.server.ts | import | no | yes | inward | present; changed (GEN-192, path only) |
| E1273 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | apps/platform/src/features/assessment-calls/data/repository.server.ts | import | no | yes | inward | present |
| E1275 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | apps/platform/src/features/assessment-calls/email/create-assessment-call-notifications.server.ts | import | no | yes | inward | present |
| E1276 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/config/src/index.ts | import | yes | yes | inward | present |
| E1277 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/db/src/index.ts | import | yes | yes | inward | present |
| E1278 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | yes | lateral | present |
| E1477 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/domain/src/feature-flag/index.ts | import | yes | yes | inward | added (main merge) |
| E1279 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | lateral | present |
| E1478 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/infrastructure/src/bot-detection/index.server.ts | import | yes | yes | inward | added (main merge) |
| E1280 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | inward | present |
| E1441 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/infrastructure/src/coach-calendar/index.server.ts | import | yes | yes | inward | present; changed (GEN-192): also imports `PostgresCoachAvailability`, no new edge (same module pair) |
| E1479 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/infrastructure/src/email/index.server.ts | import | yes | yes | inward | added (main merge) |
| E1281 | apps/platform/src/features/assessment-calls/server/guards/assessment-calls-context.server.ts | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | import | no | yes | outward | present |
| E1282 | apps/platform/src/features/assessment-calls/ui/public/book/api-client.ts | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | import | no | no | lateral | present |
| E1283 | apps/platform/src/features/assessment-calls/ui/public/book/api-client.ts | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | no | no | lateral | present |
| E1284 | apps/platform/src/features/assessment-calls/ui/public/book/api-client.ts | external:react | import | n/a | no | lateral | present |
| E1285 | apps/platform/src/features/assessment-calls/ui/public/book/api-client.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E1286 | apps/platform/src/features/assessment-calls/ui/public/book/book-page.tsx | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | import | no | no | lateral | present |
| E1287 | apps/platform/src/features/assessment-calls/ui/public/book/book-page.tsx | apps/platform/src/features/assessment-calls/server/guards/assessment-calls-context.server.ts | import | no | no | lateral | present |
| E1288 | apps/platform/src/features/assessment-calls/ui/public/book/book-page.tsx | apps/platform/src/features/assessment-calls/ui/public/book/api-client.ts | import | no | no | lateral | present |
| E1464 | apps/platform/src/features/assessment-calls/ui/public/book/book-page.tsx | apps/platform/src/features/assessment-calls/ui/public/book/book-page.css | import | no | no | lateral | present |
| E1289 | apps/platform/src/features/assessment-calls/ui/public/book/book-page.tsx | apps/platform/src/features/assessment-calls/ui/public/book/booking-confirmation.tsx | import | no | no | lateral | present |
| E1290 | apps/platform/src/features/assessment-calls/ui/public/book/book-page.tsx | apps/platform/src/features/assessment-calls/ui/public/book/booking-details-form.tsx | import | no | no | lateral | present |
| E1291 | apps/platform/src/features/assessment-calls/ui/public/book/book-page.tsx | apps/platform/src/features/assessment-calls/ui/public/book/booking-flow.ts | import | no | no | lateral | present |
| E1387 | apps/platform/src/features/assessment-calls/ui/public/book/book-page.tsx | apps/platform/src/features/assessment-calls/ui/public/book/call-overview.tsx | import | no | no | lateral | present |
| E1294 | apps/platform/src/features/assessment-calls/ui/public/book/book-page.tsx | apps/platform/src/features/assessment-calls/ui/public/book/slot-grouping.ts | import | no | no | lateral | present |
| E1388 | apps/platform/src/features/assessment-calls/ui/public/book/book-page.tsx | apps/platform/src/features/assessment-calls/ui/public/book/slot-picker.tsx | import | no | no | lateral | present |
| E1383 | apps/platform/src/features/assessment-calls/ui/public/book/book-page.tsx | apps/platform/src/features/assessment-calls/ui/public/book/step-heading-focus.ts | import | no | no | lateral | present |
| E1296 | apps/platform/src/features/assessment-calls/ui/public/book/book-page.tsx | apps/platform/src/features/assessment-calls/ui/public/book/submission.ts | import | no | no | lateral | present |
| E1297 | apps/platform/src/features/assessment-calls/ui/public/book/book-page.tsx | apps/platform/src/features/assessment-calls/ui/public/book/unavailable-slots.tsx | import | no | no | lateral | present |
| E1299 | apps/platform/src/features/assessment-calls/ui/public/book/book-page.tsx | external:react | import | n/a | no | lateral | present |
| E1300 | apps/platform/src/features/assessment-calls/ui/public/book/book-page.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1301 | apps/platform/src/features/assessment-calls/ui/public/book/booking-confirmation.tsx | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | import | no | no | lateral | present |
| E1422 | apps/platform/src/features/assessment-calls/ui/public/book/booking-confirmation.tsx | apps/platform/src/features/assessment-calls/contracts/call-moment.ts | import | no | no | lateral | present |
| E1392 | apps/platform/src/features/assessment-calls/ui/public/book/booking-confirmation.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1385 | apps/platform/src/features/assessment-calls/ui/public/book/booking-confirmation.tsx | external:react | import | n/a | no | lateral | present |
| E1303 | apps/platform/src/features/assessment-calls/ui/public/book/booking-confirmation.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1304 | apps/platform/src/features/assessment-calls/ui/public/book/booking-details-form.tsx | apps/platform/src/features/assessment-calls/ui/public/book/booking-flow.ts | import | no | no | lateral | present |
| E1306 | apps/platform/src/features/assessment-calls/ui/public/book/booking-details-form.tsx | apps/platform/src/features/assessment-calls/ui/public/book/submission.ts | import | no | no | lateral | present |
| E1395 | apps/platform/src/features/assessment-calls/ui/public/book/booking-details-form.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1307 | apps/platform/src/features/assessment-calls/ui/public/book/booking-details-form.tsx | external:react | import | n/a | no | lateral | present |
| E1309 | apps/platform/src/features/assessment-calls/ui/public/book/booking-details-form.tsx | external:zod | import | n/a | no | lateral | present |
| E1310 | apps/platform/src/features/assessment-calls/ui/public/book/booking-details-form.tsx | packages/content/src/index.ts | import | yes | no | lateral | present |
| E1311 | apps/platform/src/features/assessment-calls/ui/public/book/booking-details-form.tsx | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | inward | present |
| E1313 | apps/platform/src/features/assessment-calls/ui/public/book/booking-details-form.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1314 | apps/platform/src/features/assessment-calls/ui/public/book/booking-flow.ts | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | import | no | no | lateral | present |
| E1425 | apps/platform/src/features/assessment-calls/ui/public/book/call-overview.tsx | apps/platform/src/features/assessment-calls/contracts/call-moment.ts | import | no | no | lateral | present |
| E1398 | apps/platform/src/features/assessment-calls/ui/public/book/call-overview.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1423 | apps/platform/src/features/assessment-calls/ui/public/book/call-overview.tsx | packages/config/src/index.ts | import | yes | yes | outward | present |
| E1424 | apps/platform/src/features/assessment-calls/ui/public/book/call-overview.tsx | packages/content/src/index.ts | import | yes | no | lateral | present |
| E1442 | apps/platform/src/features/assessment-calls/ui/public/book/call-overview.tsx | packages/domain/src/assessment-call/index.ts | import | yes | yes | lateral | present |
| E1470 | apps/platform/src/features/assessment-calls/ui/public/book/call-overview.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1471 | apps/platform/src/features/assessment-calls/ui/public/book/call-overview.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1375 | apps/platform/src/features/assessment-calls/ui/public/book/slot-calendar.tsx | apps/platform/src/features/assessment-calls/contracts/call-moment.ts | import | no | no | lateral | present |
| E1317 | apps/platform/src/features/assessment-calls/ui/public/book/slot-calendar.tsx | external:react | import | n/a | no | lateral | present |
| E1318 | apps/platform/src/features/assessment-calls/ui/public/book/slot-calendar.tsx | packages/ui/src/calendar/index.ts | import | yes | no | lateral | present |
| E1427 | apps/platform/src/features/assessment-calls/ui/public/book/slot-picker.tsx | apps/platform/src/features/assessment-calls/contracts/call-moment.ts | import | no | no | lateral | present |
| E1401 | apps/platform/src/features/assessment-calls/ui/public/book/slot-picker.tsx | apps/platform/src/features/assessment-calls/ui/public/book/slot-calendar.tsx | import | no | no | lateral | present |
| E1402 | apps/platform/src/features/assessment-calls/ui/public/book/slot-picker.tsx | external:react | import | n/a | no | lateral | present |
| E1403 | apps/platform/src/features/assessment-calls/ui/public/book/slot-picker.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1426 | apps/platform/src/features/assessment-calls/ui/public/book/slot-picker.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1384 | apps/platform/src/features/assessment-calls/ui/public/book/step-heading-focus.ts | external:react | import | n/a | no | lateral | present |
| E1322 | apps/platform/src/features/assessment-calls/ui/public/book/submission.ts | apps/platform/src/features/assessment-calls/ui/public/book/api-client.ts | import | no | no | lateral | present |
| E1323 | apps/platform/src/features/assessment-calls/ui/public/book/submission.ts | external:react | import | n/a | no | lateral | present |
| E1324 | apps/platform/src/features/assessment-calls/ui/public/book/submission.ts | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | inward | present |
| E1325 | apps/platform/src/features/assessment-calls/ui/public/book/unavailable-slots.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1326 | apps/platform/src/features/assessment-calls/ui/public/join/join-page.tsx | apps/platform/src/features/assessment-calls/server/guards/assessment-calls-context.server.ts | import | no | no | lateral | present |
| E1503 | apps/platform/src/features/assessment-calls/ui/public/join/join-page.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | new (GEN-192): `buttonVariants` |
| E1572 | apps/platform/src/features/assessment-calls/ui/public/join/join-page.tsx | external:lucide-react | import | n/a | no | lateral | new (GEN-192): `ArrowRight`, `VideoOff` |
| E1504 | apps/platform/src/features/assessment-calls/api/settings/assessment-call-settings-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-account.server.ts | import | no | no | lateral | new (GEN-192): `requireApiAccount` — this feature's first cross-feature consumer of that guard |
| E1505 | apps/platform/src/features/assessment-calls/api/settings/assessment-call-settings-controller.server.ts | apps/platform/src/features/assessment-calls/api/resolve-field-error-code.ts | import | no | no | lateral | new (GEN-192) |
| E1506 | apps/platform/src/features/assessment-calls/api/settings/assessment-call-settings-controller.server.ts | apps/platform/src/features/assessment-calls/contracts/assessment-call-settings.ts | import | no | no | lateral | new (GEN-192) |
| E1511 | apps/platform/src/features/assessment-calls/api/settings/assessment-call-settings-controller.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | new (GEN-192) |
| E1512 | apps/platform/src/features/assessment-calls/api/booking/assessment-calls-controller.server.ts | apps/platform/src/features/assessment-calls/api/resolve-field-error-code.ts | import | no | no | lateral | new (GEN-192) |
| E1513 | apps/platform/src/features/assessment-calls/api/settings/settings.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | new (GEN-192) |
| E1514 | apps/platform/src/features/assessment-calls/api/settings/settings.ts | apps/platform/src/features/assessment-calls/server/guards/assessment-calls-context.server.ts | import | no | no | lateral | new (GEN-192) |
| E1515 | apps/platform/src/features/assessment-calls/ui/coach/settings/api-client.ts | apps/platform/src/features/assessment-calls/contracts/assessment-call-settings.ts | import | no | no | lateral | new (GEN-192) |
| E1516 | apps/platform/src/features/assessment-calls/ui/coach/settings/api-client.ts | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | no | no | lateral | new (GEN-192) |
| E1517 | apps/platform/src/features/assessment-calls/ui/coach/settings/api-client.ts | external:react | import | n/a | no | lateral | new (GEN-192) |
| E1518 | apps/platform/src/features/assessment-calls/ui/coach/settings/assessment-call-settings-section.tsx | apps/platform/src/features/assessment-calls/ui/coach/settings/api-client.ts | import | no | no | lateral | new (GEN-192) |
| E1519 | apps/platform/src/features/assessment-calls/ui/coach/settings/assessment-call-settings-section.tsx | apps/platform/src/features/assessment-calls/contracts/assessment-call-settings.ts | import | no | no | lateral | new (GEN-192) |
| E1520 | apps/platform/src/features/assessment-calls/ui/coach/settings/assessment-call-settings-section.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | new (GEN-192) |
| E1521 | apps/platform/src/features/assessment-calls/ui/coach/settings/assessment-call-settings-section.tsx | packages/ui/src/toast/index.ts | import | yes | no | lateral | new (GEN-192): moved from `./overlays` to `./toast` in the remediation round |
| E1522 | apps/platform/src/features/assessment-calls/ui/coach/settings/assessment-call-settings-section.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | new (GEN-192) |
| E1523 | apps/platform/src/features/assessment-calls/ui/coach/settings/assessment-call-settings-section.tsx | external:react | import | n/a | no | lateral | new (GEN-192) |
| E1524 | apps/platform/src/features/assessment-calls/ui/coach/settings/settings-page.tsx | apps/platform/src/features/assessment-calls/ui/coach/settings/assessment-call-settings-section.tsx | import | no | no | lateral | new (GEN-192) |
| E1525 | apps/platform/src/features/assessment-calls/ui/coach/settings/settings-page.tsx | apps/platform/src/features/assessment-calls/contracts/assessment-call-settings.ts | import | no | no | lateral | new (GEN-192) |
| E1526 | apps/platform/src/features/assessment-calls/ui/coach/settings/settings-page.tsx | apps/platform/src/features/assessment-calls/server/guards/assessment-calls-context.server.ts | import | no | no | lateral | new (GEN-192) |
| E1527 | apps/platform/src/features/assessment-calls/ui/coach/settings/settings-page.tsx | packages/ui/src/toast/index.ts | import | yes | no | lateral | new (GEN-192): moved from `./overlays` to `./toast` in the remediation round |
| E1528 | apps/platform/src/features/assessment-calls/ui/coach/settings/settings-page.tsx | external:react | import | n/a | no | lateral | new (GEN-192) |
| E1529 | apps/platform/src/features/assessment-calls/contracts/assessment-call-settings.ts | external:zod | import | n/a | no | lateral | new (GEN-192) |
| E1508 | apps/platform/src/features/assessment-calls/contracts/assessment-call-settings.ts | packages/domain/src/coach-availability/index.ts | import | yes | no | lateral | new (GEN-192): `WEEKDAYS`, `Weekday` |
| E1509 | apps/platform/src/features/assessment-calls/contracts/assessment-call-settings.ts | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | import | no | no | lateral | new (GEN-192): `timeZoneSchema` |
| E55 | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | apps/platform/src/features/store/contracts/store.ts | import | no | yes | outward | present |
| E753 | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | external:crypto | import | n/a | yes | outward | present |
| E754 | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | packages/domain/src/acquisition/index.ts | import | yes | no | lateral | present |
| E57 | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | removed in a79f507d |
| E59 | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | packages/infrastructure/src/bot-detection/index.server.ts | import | yes | no | lateral | present |
| E60 | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | packages/infrastructure/src/bot-detection/index.ts | import | yes | no | lateral | present |
| E61 | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E62 | apps/platform/src/features/store/api/acquisitions/acquisitions.ts | apps/platform/src/features/store/server/guards/store-context.server.ts | import | no | no | lateral | present |
| E63 | apps/platform/src/features/store/api/acquisitions/acquisitions.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E64 | apps/platform/src/features/store/api/catalog/catalog-controller.server.ts | apps/platform/src/features/store/contracts/store.ts | import | no | yes | outward | present |
| E65 | apps/platform/src/features/store/api/catalog/catalog-controller.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E755 | apps/platform/src/features/store/api/catalog/catalog-controller.server.ts | packages/domain/src/product/index.ts | import | yes | no | lateral | present |
| E67 | apps/platform/src/features/store/api/catalog/catalog.ts | apps/platform/src/features/store/server/guards/store-context.server.ts | import | no | no | lateral | present |
| E68 | apps/platform/src/features/store/api/catalog/catalog.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E756 | apps/platform/src/features/store/api/covers/covers-controller.server.ts | external:stream | import | n/a | yes | outward | present |
| E757 | apps/platform/src/features/store/api/covers/covers-controller.server.ts | packages/domain/src/product/index.ts | import | yes | no | lateral | present |
| E72 | apps/platform/src/features/store/api/covers/covers.ts | apps/platform/src/features/store/server/guards/store-context.server.ts | import | no | no | lateral | present |
| E73 | apps/platform/src/features/store/api/covers/covers.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E74 | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | apps/platform/src/features/store/api/downloads/download-recovery.html | import | no | yes | outward | present |
| E75 | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | apps/platform/src/features/store/contracts/paths.ts | import | no | yes | outward | present |
| E76 | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | apps/platform/src/features/store/contracts/store.ts | import | no | yes | outward | present |
| E758 | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | external:path | import | n/a | yes | outward | present |
| E759 | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | external:stream | import | n/a | yes | outward | present |
| E77 | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E760 | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | packages/domain/src/download-grant/index.ts | import | yes | no | lateral | present |
| E761 | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | packages/domain/src/product/index.ts | import | yes | no | lateral | present |
| E79 | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E82 | apps/platform/src/features/store/api/downloads/downloads.ts | apps/platform/src/features/store/server/guards/store-context.server.ts | import | no | no | lateral | present |
| E83 | apps/platform/src/features/store/api/downloads/downloads.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E762 | apps/platform/src/features/store/api/downloads/zip-stream.server.ts | external:archiver | import | n/a | no | lateral | present |
| E763 | apps/platform/src/features/store/api/downloads/zip-stream.server.ts | external:stream | import | n/a | no | lateral | present |
| E764 | apps/platform/src/features/store/api/downloads/zip-stream.server.ts | external:stream/promises | import | n/a | no | lateral | present |
| E765 | apps/platform/src/features/store/api/downloads/zip-stream.server.ts | packages/domain/src/download-grant/index.ts | import | yes | yes | inward | present |
| E766 | apps/platform/src/features/store/api/downloads/zip-stream.server.ts | packages/domain/src/product/index.ts | import | yes | yes | inward | present |
| E84 | apps/platform/src/features/store/api/management/management-controller.server.ts | apps/platform/src/features/store/contracts/store-management.ts | import | no | yes | outward | present |
| E767 | apps/platform/src/features/store/api/management/management-controller.server.ts | packages/domain/src/product/index.ts | import | yes | no | lateral | present |
| E85 | apps/platform/src/features/store/api/management/management-controller.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | removed in a79f507d |
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
| E768 | apps/platform/src/features/store/contracts/store-management.ts | external:zod | import | n/a | no | lateral | present |
| E769 | apps/platform/src/features/store/contracts/store.ts | external:zod | import | n/a | no | lateral | present |
| E103 | apps/platform/src/features/store/data/acquisitions/acquisition-repository.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E770 | apps/platform/src/features/store/data/acquisitions/acquisition-repository.server.ts | packages/domain/src/acquisition/index.ts | import | yes | no | lateral | present |
| E771 | apps/platform/src/features/store/data/acquisitions/acquisition-repository.server.ts | packages/domain/src/product/index.ts | import | yes | no | lateral | present |
| E772 | apps/platform/src/features/store/data/assets/asset-confinement.server.ts | external:path | import | n/a | yes | outward | present |
| E773 | apps/platform/src/features/store/data/assets/asset-confinement.server.ts | packages/domain/src/product/index.ts | import | yes | no | lateral | present |
| E774 | apps/platform/src/features/store/data/assets/asset-digest.server.ts | external:crypto | import | n/a | yes | outward | present |
| E775 | apps/platform/src/features/store/data/assets/asset-digest.server.ts | packages/domain/src/product/index.ts | import | yes | no | lateral | present |
| E109 | apps/platform/src/features/store/data/assets/asset-store.server.ts | apps/platform/src/features/store/data/assets/asset-confinement.server.ts | import | no | no | lateral | present |
| E776 | apps/platform/src/features/store/data/assets/asset-store.server.ts | external:crypto | import | n/a | yes | outward | present |
| E777 | apps/platform/src/features/store/data/assets/asset-store.server.ts | external:fs | import | n/a | yes | outward | present |
| E778 | apps/platform/src/features/store/data/assets/asset-store.server.ts | external:fs/promises | import | n/a | yes | outward | present |
| E779 | apps/platform/src/features/store/data/assets/asset-store.server.ts | external:path | import | n/a | yes | outward | present |
| E780 | apps/platform/src/features/store/data/assets/asset-store.server.ts | external:stream | import | n/a | yes | outward | present |
| E781 | apps/platform/src/features/store/data/assets/asset-store.server.ts | packages/domain/src/product/index.ts | import | yes | no | lateral | present |
| E116 | apps/platform/src/features/store/data/catalog/catalog-repository.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E782 | apps/platform/src/features/store/data/catalog/catalog-repository.server.ts | packages/domain/src/product/index.ts | import | yes | no | lateral | present |
| E118 | apps/platform/src/features/store/data/download-grants/download-grant-repository.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E783 | apps/platform/src/features/store/data/download-grants/download-grant-repository.server.ts | packages/domain/src/download-grant/index.ts | import | yes | no | lateral | present |
| E784 | apps/platform/src/features/store/data/download-grants/download-grant-repository.server.ts | packages/domain/src/product/index.ts | import | yes | no | lateral | present |
| E785 | apps/platform/src/features/store/data/download-grants/download-token.server.ts | external:crypto | import | n/a | yes | outward | present |
| E786 | apps/platform/src/features/store/data/download-grants/download-token.server.ts | packages/domain/src/acquisition/index.ts | import | yes | no | lateral | present |
| E787 | apps/platform/src/features/store/data/download-grants/download-token.server.ts | packages/domain/src/download-grant/index.ts | import | yes | no | lateral | present |
| E122 | apps/platform/src/features/store/data/publications/publication-repository.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E788 | apps/platform/src/features/store/data/publications/publication-repository.server.ts | packages/domain/src/product/index.ts | import | yes | no | lateral | present |
| E124 | apps/platform/src/features/store/data/schema.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E789 | apps/platform/src/features/store/email/create-product-delivery.server.ts | apps/platform/src/features/store/email/email-product-delivery.server.ts | import | no | no | lateral | present |
| E790 | apps/platform/src/features/store/email/create-product-delivery.server.ts | packages/domain/src/acquisition/index.ts | import | yes | no | lateral | present |
| E791 | apps/platform/src/features/store/email/create-product-delivery.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | removed in a79f507d |
| E1031 | apps/platform/src/features/store/email/create-product-delivery.server.ts | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
| E792 | apps/platform/src/features/store/email/email-product-delivery.server.ts | apps/platform/src/features/store/contracts/paths.ts | import | no | yes | outward | present |
| E793 | apps/platform/src/features/store/email/email-product-delivery.server.ts | apps/platform/src/features/store/email/store-delivery-email.server.ts | import | no | no | lateral | present |
| E794 | apps/platform/src/features/store/email/email-product-delivery.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E795 | apps/platform/src/features/store/email/email-product-delivery.server.ts | packages/domain/src/acquisition/index.ts | import | yes | no | lateral | present |
| E796 | apps/platform/src/features/store/email/email-product-delivery.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | removed in a79f507d |
| E1032 | apps/platform/src/features/store/email/email-product-delivery.server.ts | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
| E135 | apps/platform/src/features/store/email/store-delivery-email.server.ts | apps/platform/src/features/store/email/store-delivery-email-template.server.tsx | import | no | no | lateral | present |
| E798 | apps/platform/src/features/store/email/store-delivery-email.server.ts | external:react | import | n/a | yes | outward | present |
| E799 | apps/platform/src/features/store/email/store-delivery-email.server.ts | external:react-dom/server | import | n/a | yes | outward | present |
| E138 | apps/platform/src/features/store/routes.ts | apps/platform/src/features/store/contracts/paths.ts | import | no | no | lateral | present |
| E139 | apps/platform/src/features/store/server/guards/store-context.server.ts | apps/platform/src/features/store/server/store-composition.server.ts | import | no | yes | outward | present |
| E140 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | import | no | yes | inward | present |
| E141 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/api/catalog/catalog-controller.server.ts | import | no | yes | inward | present |
| E142 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/api/covers/covers-controller.server.ts | import | no | yes | inward | present |
| E143 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/api/downloads/downloads-controller.server.ts | import | no | yes | inward | present |
| E145 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/api/downloads/zip-stream.server.ts | import | no | yes | inward | present |
| E144 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/api/management/management-controller.server.ts | import | no | yes | inward | present |
| E146 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/data/acquisitions/acquisition-repository.server.ts | import | no | yes | inward | present |
| E147 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/data/assets/asset-digest.server.ts | import | no | yes | inward | present |
| E148 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/data/assets/asset-store.server.ts | import | no | yes | inward | present |
| E149 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/data/catalog/catalog-repository.server.ts | import | no | yes | inward | present |
| E150 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/data/download-grants/download-grant-repository.server.ts | import | no | yes | inward | present |
| E151 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/data/download-grants/download-token.server.ts | import | no | yes | inward | present |
| E152 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/data/publications/publication-repository.server.ts | import | no | yes | inward | present |
| E800 | apps/platform/src/features/store/server/store-composition.server.ts | apps/platform/src/features/store/email/create-product-delivery.server.ts | import | no | yes | inward | present |
| E154 | apps/platform/src/features/store/server/store-composition.server.ts | packages/content/src/index.ts | import | yes | yes | inward | present |
| E155 | apps/platform/src/features/store/server/store-composition.server.ts | packages/db/src/index.ts | import | yes | yes | inward | present |
| E801 | apps/platform/src/features/store/server/store-composition.server.ts | packages/domain/src/acquisition/index.ts | import | yes | yes | inward | present |
| E802 | apps/platform/src/features/store/server/store-composition.server.ts | packages/domain/src/download-grant/index.ts | import | yes | yes | inward | present |
| E803 | apps/platform/src/features/store/server/store-composition.server.ts | packages/domain/src/product/index.ts | import | yes | yes | inward | present |
| E156 | apps/platform/src/features/store/server/store-composition.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E1033 | apps/platform/src/features/store/server/store-composition.server.ts | packages/infrastructure/src/bot-detection/index.server.ts | import | yes | yes | inward | present |
| E1034 | apps/platform/src/features/store/server/store-composition.server.ts | packages/infrastructure/src/email/index.server.ts | import | yes | yes | inward | present |
| E158 | apps/platform/src/features/store/server/store-composition.server.ts | packages/infrastructure/src/management-auth/index.server.ts | import | yes | yes | inward | present |
| E159 | apps/platform/src/features/store/ui/public/acquisition/acquisition-flow.ts | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E160 | apps/platform/src/features/store/ui/public/acquisition/acquisition-form.ts | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E161 | apps/platform/src/features/store/ui/public/acquisition/acquisition-form.ts | apps/platform/src/features/store/ui/public/acquisition/acquisition-flow.ts | import | no | no | lateral | present |
| E162 | apps/platform/src/features/store/ui/public/acquisition/acquisition-form.ts | apps/platform/src/features/store/ui/public/api-client.ts | import | no | no | lateral | present |
| E163 | apps/platform/src/features/store/ui/public/acquisition/acquisition-form.ts | apps/platform/src/features/store/ui/public/cart/cart.ts | import | no | no | lateral | present |
| E804 | apps/platform/src/features/store/ui/public/acquisition/acquisition-form.ts | external:react | import | n/a | no | lateral | present |
| E165 | apps/platform/src/features/store/ui/public/acquisition/acquisition-form.ts | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | inward | present |
| E166 | apps/platform/src/features/store/ui/public/api-client.ts | apps/platform/src/features/store/contracts/paths.ts | import | no | no | lateral | present |
| E167 | apps/platform/src/features/store/ui/public/api-client.ts | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E805 | apps/platform/src/features/store/ui/public/api-client.ts | external:react | import | n/a | no | lateral | present |
| E169 | apps/platform/src/features/store/ui/public/api-client.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E170 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E171 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | apps/platform/src/features/store/ui/public/acquisition/acquisition-form.ts | import | no | no | lateral | present |
| E172 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | apps/platform/src/features/store/ui/public/api-client.ts | import | no | no | lateral | present |
| E173 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | apps/platform/src/features/store/ui/public/cart/cart-provider.tsx | import | no | no | lateral | present |
| E174 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | apps/platform/src/features/store/ui/public/cart/cart.ts | import | no | no | lateral | present |
| E806 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E807 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | external:react | import | n/a | no | lateral | present |
| E177 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | packages/content/src/index.ts | import | yes | yes | inward | present |
| E178 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | inward | present |
| E179 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | packages/ui/src/overlays/index.ts | import | yes | no | lateral | present |
| E180 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E181 | apps/platform/src/features/store/ui/public/cart/cart-provider.tsx | apps/platform/src/features/store/ui/public/cart/cart.ts | import | no | no | lateral | present |
| E808 | apps/platform/src/features/store/ui/public/cart/cart-provider.tsx | external:react | import | n/a | no | lateral | present |
| E809 | apps/platform/src/features/store/ui/public/cart/cart-provider.tsx | external:zustand | import | n/a | no | lateral | present |
| E810 | apps/platform/src/features/store/ui/public/cart/cart-storage.ts | external:zustand/middleware | import | n/a | no | lateral | present |
| E185 | apps/platform/src/features/store/ui/public/cart/cart.ts | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E186 | apps/platform/src/features/store/ui/public/cart/cart.ts | apps/platform/src/features/store/ui/public/cart/cart-focus.ts | import | no | no | lateral | present |
| E188 | apps/platform/src/features/store/ui/public/cart/cart.ts | apps/platform/src/features/store/ui/public/cart/cart-storage.ts | import | no | no | lateral | present |
| E811 | apps/platform/src/features/store/ui/public/cart/cart.ts | external:react | import | n/a | no | lateral | present |
| E812 | apps/platform/src/features/store/ui/public/cart/cart.ts | external:zustand/middleware | import | n/a | no | lateral | present |
| E813 | apps/platform/src/features/store/ui/public/cart/cart.ts | external:zustand/vanilla | import | n/a | no | lateral | present |
| E814 | apps/platform/src/features/store/ui/public/cart/cart.ts | packages/domain/src/cart/index.ts | import | yes | yes | inward | present |
| E193 | apps/platform/src/features/store/ui/public/catalog/catalog-filter-controls.tsx | apps/platform/src/features/store/ui/public/catalog/catalog-filters.ts | import | no | no | lateral | present |
| E815 | apps/platform/src/features/store/ui/public/catalog/catalog-filter-controls.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E816 | apps/platform/src/features/store/ui/public/catalog/catalog-filter-controls.tsx | external:react | import | n/a | no | lateral | present |
| E196 | apps/platform/src/features/store/ui/public/catalog/catalog-filter-controls.tsx | packages/ui/src/filters/index.ts | import | yes | no | lateral | present |
| E197 | apps/platform/src/features/store/ui/public/catalog/catalog-filters.ts | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E198 | apps/platform/src/features/store/ui/public/catalog/catalog-filters.ts | packages/ui/src/filters/index.ts | import | yes | no | lateral | present |
| E199 | apps/platform/src/features/store/ui/public/catalog/catalog-page.tsx | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E200 | apps/platform/src/features/store/ui/public/catalog/catalog-page.tsx | apps/platform/src/features/store/server/guards/store-context.server.ts | import | no | no | lateral | present |
| E202 | apps/platform/src/features/store/ui/public/catalog/catalog-page.tsx | apps/platform/src/features/store/ui/public/catalog/catalog-filters.ts | import | no | no | lateral | present |
| E204 | apps/platform/src/features/store/ui/public/catalog/catalog-page.tsx | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | import | no | no | lateral | present |
| E205 | apps/platform/src/features/store/ui/public/catalog/catalog-presenter.ts | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E206 | apps/platform/src/features/store/ui/public/catalog/catalog-presenter.ts | apps/platform/src/features/store/ui/public/catalog/catalog-filters.ts | import | no | no | lateral | present |
| E207 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | apps/platform/src/features/store/contracts/paths.ts | import | no | no | lateral | present |
| E208 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E209 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | apps/platform/src/features/store/ui/public/cart/cart-provider.tsx | import | no | no | lateral | present |
| E210 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | apps/platform/src/features/store/ui/public/cart/cart.ts | import | no | no | lateral | present |
| E211 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | apps/platform/src/features/store/ui/public/catalog/catalog-filter-controls.tsx | import | no | no | lateral | present |
| E212 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | apps/platform/src/features/store/ui/public/catalog/catalog-filters.ts | import | no | no | lateral | present |
| E213 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | apps/platform/src/features/store/ui/public/catalog/catalog-presenter.ts | import | no | no | lateral | present |
| E817 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E818 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | external:react | import | n/a | no | lateral | present |
| E216 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1465 | apps/platform/src/features/store/ui/public/catalog/catalog-view.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E217 | apps/platform/src/features/store/ui/public/download/download-page.tsx | apps/platform/src/features/store/contracts/paths.ts | import | no | no | lateral | present |
| E218 | apps/platform/src/features/store/ui/public/download/download-page.tsx | apps/platform/src/features/store/ui/public/download/download-state.ts | import | no | no | lateral | present |
| E819 | apps/platform/src/features/store/ui/public/download/download-page.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1428 | apps/platform/src/features/store/ui/public/download/download-page.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E220 | apps/platform/src/features/store/ui/public/download/download-page.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E221 | apps/platform/src/features/store/ui/public/download/download-state.ts | apps/platform/src/features/store/contracts/paths.ts | import | no | no | lateral | present |
| E820 | apps/platform/src/features/store/ui/public/download/download-state.ts | external:react | import | n/a | no | lateral | present |
| E223 | apps/platform/src/features/store/ui/public/download/download-state.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E226 | apps/platform/src/features/store/ui/public/product/product-page.tsx | apps/platform/src/features/store/contracts/paths.ts | import | no | no | lateral | present |
| E224 | apps/platform/src/features/store/ui/public/product/product-page.tsx | apps/platform/src/features/store/contracts/store.ts | import | no | no | lateral | present |
| E225 | apps/platform/src/features/store/ui/public/product/product-page.tsx | apps/platform/src/features/store/server/guards/store-context.server.ts | import | no | no | lateral | present |
| E227 | apps/platform/src/features/store/ui/public/product/product-page.tsx | apps/platform/src/features/store/ui/public/cart/cart-provider.tsx | import | no | no | lateral | present |
| E821 | apps/platform/src/features/store/ui/public/product/product-page.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E230 | apps/platform/src/features/store/ui/public/product/product-page.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E231 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | apps/platform/src/features/waitlist/contracts/waitlist.ts | import | no | yes | outward | present |
| E822 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | external:crypto | import | n/a | yes | outward | present |
| E233 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | removed in a79f507d |
| E234 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | packages/domain/src/waitlist/index.ts | import | yes | no | lateral | present |
| E235 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | packages/infrastructure/src/bot-detection/index.server.ts | import | yes | no | lateral | present |
| E236 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | packages/infrastructure/src/bot-detection/index.ts | import | yes | no | lateral | present |
| E237 | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E238 | apps/platform/src/features/waitlist/api/waitlist.ts | apps/platform/src/features/waitlist/server/guards/waitlist-context.server.ts | import | no | no | lateral | present |
| E239 | apps/platform/src/features/waitlist/api/waitlist.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E823 | apps/platform/src/features/waitlist/contracts/waitlist.ts | external:zod | import | n/a | no | lateral | present |
| E241 | apps/platform/src/features/waitlist/data/repository.server.ts | apps/platform/src/features/waitlist/data/schema.server.ts | import | no | no | lateral | present |
| E1214 | apps/platform/src/features/waitlist/data/repository.server.ts | apps/platform/src/features/waitlist/data/signup-constraint-violations.server.ts | import | no | no | lateral | added (b3eb2653) |
| E243 | apps/platform/src/features/waitlist/data/repository.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E244 | apps/platform/src/features/waitlist/data/repository.server.ts | packages/domain/src/waitlist/index.ts | import | yes | no | lateral | present |
| E245 | apps/platform/src/features/waitlist/data/schema.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E1213 | apps/platform/src/features/waitlist/data/schema.server.ts | packages/domain/src/waitlist/index.ts | import | yes | no | lateral | added (b3eb2653; the range check reads `WAITLIST_REDUCED_PRICING_CAP`) |
| E1215 | apps/platform/src/features/waitlist/data/signup-constraint-violations.server.ts | apps/platform/src/features/waitlist/data/schema.server.ts | import | no | no | lateral | added (b3eb2653; constraint names) |
| E825 | apps/platform/src/features/waitlist/email/create-waitlist-confirmation.server.ts | apps/platform/src/features/waitlist/email/email-waitlist-confirmation.server.ts | import | no | no | lateral | present |
| E826 | apps/platform/src/features/waitlist/email/create-waitlist-confirmation.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | removed in a79f507d |
| E827 | apps/platform/src/features/waitlist/email/create-waitlist-confirmation.server.ts | packages/domain/src/waitlist/index.ts | import | yes | no | lateral | present |
| E1035 | apps/platform/src/features/waitlist/email/create-waitlist-confirmation.server.ts | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
| E828 | apps/platform/src/features/waitlist/email/email-waitlist-confirmation.server.ts | apps/platform/src/features/waitlist/email/waitlist-confirmation-email.server.ts | import | no | no | lateral | present |
| E829 | apps/platform/src/features/waitlist/email/email-waitlist-confirmation.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | removed in a79f507d |
| E830 | apps/platform/src/features/waitlist/email/email-waitlist-confirmation.server.ts | packages/domain/src/waitlist/index.ts | import | yes | no | lateral | present |
| E1036 | apps/platform/src/features/waitlist/email/email-waitlist-confirmation.server.ts | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
| E254 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email.server.ts | apps/platform/src/features/waitlist/email/waitlist-confirmation-email-template.server.tsx | import | no | no | lateral | present |
| E832 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email.server.ts | external:react | import | n/a | yes | outward | present |
| E833 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email.server.ts | external:react-dom/server | import | n/a | yes | outward | present |
| E257 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email.server.ts | packages/domain/src/waitlist/index.ts | import | yes | no | lateral | present |
| E258 | apps/platform/src/features/waitlist/routes.ts | apps/platform/src/features/waitlist/contracts/paths.ts | import | no | no | lateral | present |
| E259 | apps/platform/src/features/waitlist/server/guards/waitlist-context.server.ts | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | import | no | yes | outward | present |
| E260 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | apps/platform/src/features/waitlist/api/waitlist-controller.server.ts | import | no | yes | inward | present |
| E261 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | apps/platform/src/features/waitlist/data/repository.server.ts | import | no | yes | inward | present |
| E834 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | apps/platform/src/features/waitlist/email/create-waitlist-confirmation.server.ts | import | no | yes | inward | present |
| E263 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | packages/config/src/index.ts | import | yes | yes | inward | present |
| E264 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | packages/content/src/index.ts | import | yes | yes | inward | present |
| E265 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | packages/db/src/index.ts | import | yes | yes | inward | present |
| E1040 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | packages/domain/src/feature-flag/index.ts | import | yes | yes | inward | added (f5d1889c) |
| E266 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E267 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | packages/domain/src/waitlist/index.ts | import | yes | yes | inward | present |
| E1037 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | packages/infrastructure/src/bot-detection/index.server.ts | import | yes | yes | inward | present |
| E1038 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | packages/infrastructure/src/email/index.server.ts | import | yes | yes | inward | present |
| E268 | apps/platform/src/features/waitlist/ui/public/api-client.ts | apps/platform/src/features/waitlist/contracts/paths.ts | import | no | no | lateral | present |
| E269 | apps/platform/src/features/waitlist/ui/public/api-client.ts | apps/platform/src/features/waitlist/contracts/waitlist.ts | import | no | no | lateral | present |
| E270 | apps/platform/src/features/waitlist/ui/public/api-client.ts | apps/platform/src/features/waitlist/ui/public/errors.ts | import | no | no | lateral | present |
| E835 | apps/platform/src/features/waitlist/ui/public/api-client.ts | external:react | import | n/a | no | lateral | present |
| E272 | apps/platform/src/features/waitlist/ui/public/api-client.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E273 | apps/platform/src/features/waitlist/ui/public/availability-status.tsx | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | import | no | no | lateral | present |
| E274 | apps/platform/src/features/waitlist/ui/public/availability-status.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E836 | apps/platform/src/features/waitlist/ui/public/confetti.ts | external:canvas-confetti | import | n/a | no | lateral | present |
| E276 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | apps/platform/src/features/waitlist/ui/public/api-client.ts | import | no | no | lateral | present |
| E277 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | apps/platform/src/features/waitlist/ui/public/errors.ts | import | no | no | lateral | present |
| E278 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | apps/platform/src/features/waitlist/ui/public/submission.ts | import | no | no | lateral | present |
| E279 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | import | no | no | lateral | present |
| E837 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E838 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | external:react | import | n/a | no | lateral | present |
| E283 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | packages/content/src/index.ts | import | yes | yes | inward | present |
| E284 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | inward | present |
| E285 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1410 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E1429 | apps/platform/src/features/waitlist/ui/public/email-form.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E287 | apps/platform/src/features/waitlist/ui/public/errors.ts | apps/platform/src/features/waitlist/contracts/waitlist.ts | import | no | no | lateral | present |
| E288 | apps/platform/src/features/waitlist/ui/public/submission-flow.ts | apps/platform/src/features/waitlist/contracts/waitlist.ts | import | no | no | lateral | present |
| E289 | apps/platform/src/features/waitlist/ui/public/submission-flow.ts | apps/platform/src/features/waitlist/ui/public/errors.ts | import | no | no | lateral | present |
| E290 | apps/platform/src/features/waitlist/ui/public/submission.ts | apps/platform/src/features/waitlist/ui/public/api-client.ts | import | no | no | lateral | present |
| E291 | apps/platform/src/features/waitlist/ui/public/submission.ts | apps/platform/src/features/waitlist/ui/public/confetti.ts | import | no | no | lateral | present |
| E292 | apps/platform/src/features/waitlist/ui/public/submission.ts | apps/platform/src/features/waitlist/ui/public/submission-flow.ts | import | no | no | lateral | present |
| E839 | apps/platform/src/features/waitlist/ui/public/submission.ts | external:react | import | n/a | no | lateral | present |
| E294 | apps/platform/src/features/waitlist/ui/public/submission.ts | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | inward | present |
| E296 | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | packages/domain/src/waitlist/index.ts | import | yes | yes | inward | present |
| E840 | apps/platform/src/root-error-page.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1411 | apps/platform/src/root-error-page.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E1431 | apps/platform/src/root-error-page.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E299 | apps/platform/src/root.server.ts | apps/platform/src/features/accounts/server/account-resolution-middleware.server.ts | import | yes | no | lateral | present |
| E300 | apps/platform/src/root.server.ts | apps/platform/src/server/container.server.ts | import | yes | yes | outward | present (9747d171: also reads `featureFlagOverrides.middleware`) |
| E301 | apps/platform/src/root.server.ts | apps/platform/src/server/feature-contexts.server.ts | import | yes | no | lateral | present |
| E302 | apps/platform/src/root.tsx | apps/platform/src/app.css | import | no | no | lateral | present |
| E303 | apps/platform/src/root.tsx | apps/platform/src/features/accounts/ui/shared/access-denied-page.tsx | import | yes | no | lateral | present |
| E304 | apps/platform/src/root.tsx | apps/platform/src/root-error-page.tsx | import | no | no | lateral | present |
| E306 | apps/platform/src/root.tsx | apps/platform/src/root.server.ts | import | no | no | lateral | present |
| E841 | apps/platform/src/root.tsx | external:react | import | n/a | no | lateral | present |
| E308 | apps/platform/src/root.tsx | packages/config/src/index.ts | import | yes | no | lateral | present |
| E309 | apps/platform/src/routes.ts | apps/platform/src/features/accounts/routes.ts | import | yes | no | lateral | present |
| E1327 | apps/platform/src/routes.ts | apps/platform/src/features/assessment-calls/routes.ts | import | yes | no | lateral | present |
| E310 | apps/platform/src/routes.ts | apps/platform/src/features/store/routes.ts | import | yes | no | lateral | present |
| E311 | apps/platform/src/routes.ts | apps/platform/src/features/waitlist/routes.ts | import | yes | no | lateral | present |
| E312 | apps/platform/src/routes.ts | apps/platform/src/server/api/routes.ts | import | yes | no | lateral | present |
| E313 | apps/platform/src/routes.ts | apps/platform/src/surfaces/client-portal/routes.ts | import | yes | no | lateral | present |
| E314 | apps/platform/src/routes.ts | apps/platform/src/surfaces/coach-portal/routes.ts | import | yes | no | lateral | present |
| E315 | apps/platform/src/routes.ts | apps/platform/src/surfaces/public-site/routes.ts | import | yes | no | lateral | present |
| E842 | apps/platform/src/server/api/feature-flags/feature-flags-contract.ts | external:zod | import | n/a | no | lateral | present |
| E318 | apps/platform/src/server/api/feature-flags/feature-flags-controller.server.ts | apps/platform/src/server/api/feature-flags/feature-flags-contract.ts | import | no | yes | outward | present |
| E843 | apps/platform/src/server/api/feature-flags/feature-flags-controller.server.ts | packages/domain/src/feature-flag/index.ts | import | yes | no | lateral | present |
| E320 | apps/platform/src/server/api/feature-flags/feature-flags.ts | apps/platform/src/server/guards/platform-context.server.ts | import | no | no | lateral | present |
| E321 | apps/platform/src/server/api/feature-flags/feature-flags.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E316 | apps/platform/src/server/api/meta/app-metadata-controller.server.ts | apps/platform/src/server/api/meta/service-metadata.ts | import | no | yes | outward | present |
| E322 | apps/platform/src/server/api/meta/meta.ts | apps/platform/src/server/guards/platform-context.server.ts | import | no | no | lateral | present |
| E323 | apps/platform/src/server/api/meta/meta.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E844 | apps/platform/src/server/api/meta/service-metadata.ts | external:zod | import | n/a | no | lateral | present |
| E324 | apps/platform/src/server/api/readyz/readyz-controller.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E325 | apps/platform/src/server/api/readyz/readyz-controller.server.ts | packages/config/src/runtime.ts | import | yes | yes | outward | present |
| E326 | apps/platform/src/server/api/readyz/readyz.ts | apps/platform/src/server/guards/platform-context.server.ts | import | no | no | lateral | present |
| E327 | apps/platform/src/server/api/readyz/readyz.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E329 | apps/platform/src/server/container.server.ts | apps/platform/src/features/accounts/server/accounts-composition.server.ts | import | yes | no | lateral | present |
| E1328 | apps/platform/src/server/container.server.ts | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | import | yes | no | lateral | present |
| E330 | apps/platform/src/server/container.server.ts | apps/platform/src/features/store/server/store-composition.server.ts | import | yes | no | lateral | present |
| E331 | apps/platform/src/server/container.server.ts | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | import | yes | no | lateral | present |
| E332 | apps/platform/src/server/container.server.ts | apps/platform/src/server/database.server.ts | import | no | yes | inward | present |
| E333 | apps/platform/src/server/container.server.ts | apps/platform/src/server/logger.server.ts | import | no | yes | inward | present |
| E334 | apps/platform/src/server/container.server.ts | apps/platform/src/server/platform-composition.server.ts | import | no | no | lateral | present |
| E335 | apps/platform/src/server/container.server.ts | apps/platform/src/server/runtime-environment.server.ts | import | no | yes | inward | present |
| E336 | apps/platform/src/server/container.server.ts | packages/config/src/index.ts | import (`RuntimeEnvironment` type; `resolveFeatureFlagOverridesMode`) | yes | yes | inward | changed (9747d171) |
| E337 | apps/platform/src/server/container.server.ts | packages/content/src/index.ts | import | yes | yes | inward | present |
| E1041 | apps/platform/src/server/container.server.ts | packages/domain/src/feature-flag/index.ts | import | yes | yes | inward | added (f5d1889c) |
| E338 | apps/platform/src/server/container.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | present |
| E339 | apps/platform/src/server/container.server.ts | packages/infrastructure/src/bot-detection/index.server.ts | import | yes | yes | inward | present |
| E340 | apps/platform/src/server/container.server.ts | packages/infrastructure/src/email/index.server.ts | import | yes | yes | inward | present |
| E1042 | apps/platform/src/server/container.server.ts | packages/infrastructure/src/feature-flags/index.server.ts | import | yes | yes | inward | added (f5d1889c) |
| E341 | apps/platform/src/server/container.server.ts | packages/infrastructure/src/management-auth/index.server.ts | import | yes | yes | inward | present |
| E845 | apps/platform/src/server/database.server.ts | external:pg | import | n/a | no | lateral | present |
| E343 | apps/platform/src/server/database.server.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E344 | apps/platform/src/server/database.server.ts | packages/config/src/runtime.ts | import | yes | no | lateral | present |
| E345 | apps/platform/src/server/database.server.ts | packages/db/src/index.ts | import | yes | yes | inward | present |
| E346 | apps/platform/src/server/feature-contexts.server.ts | apps/platform/src/features/accounts/server/guards/accounts-context.server.ts | import | yes | no | lateral | present |
| E1329 | apps/platform/src/server/feature-contexts.server.ts | apps/platform/src/features/assessment-calls/server/guards/assessment-calls-context.server.ts | import | yes | yes | inward | present |
| E347 | apps/platform/src/server/feature-contexts.server.ts | apps/platform/src/features/store/server/guards/store-context.server.ts | import | yes | no | lateral | present |
| E348 | apps/platform/src/server/feature-contexts.server.ts | apps/platform/src/features/waitlist/server/guards/waitlist-context.server.ts | import | yes | no | lateral | present |
| E349 | apps/platform/src/server/feature-contexts.server.ts | apps/platform/src/server/container.server.ts | import | no | yes | outward | present |
| E350 | apps/platform/src/server/feature-contexts.server.ts | apps/platform/src/server/guards/platform-context.server.ts | import | no | no | lateral | present |
| E351 | apps/platform/src/server/feature-contexts.server.ts | apps/platform/src/server/guards/runtime-config-context.server.ts | import | no | no | lateral | present |
| E352 | apps/platform/src/server/guards/platform-context.server.ts | apps/platform/src/server/platform-composition.server.ts | import | no | yes | outward | present |
| E353 | apps/platform/src/server/guards/runtime-config-context.server.ts | apps/platform/src/server/platform-composition.server.ts | import | no | yes | outward | present |
| E1018 | apps/platform/src/server/logger.server.ts | packages/domain/src/acquisition/index.ts | import | yes | yes | inward | present |
| E1480 | apps/platform/src/server/logger.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | yes | inward | added (main merge) |
| E1019 | apps/platform/src/server/logger.server.ts | packages/domain/src/waitlist/index.ts | import | yes | yes | inward | present |
| E356 | apps/platform/src/server/platform-composition.server.ts | apps/platform/src/server/api/feature-flags/feature-flags-controller.server.ts | import | no | yes | inward | present |
| E355 | apps/platform/src/server/platform-composition.server.ts | apps/platform/src/server/api/meta/app-metadata-controller.server.ts | import | no | yes | inward | present |
| E357 | apps/platform/src/server/platform-composition.server.ts | apps/platform/src/server/api/readyz/readyz-controller.server.ts | import | no | yes | inward | present |
| E358 | apps/platform/src/server/platform-composition.server.ts | packages/config/src/index.ts | import | yes | yes | inward | present |
| E846 | apps/platform/src/server/platform-composition.server.ts | packages/domain/src/feature-flag/index.ts | import | yes | yes | inward | present (type-only since f5d1889c) |
| E361 | apps/platform/src/server/platform-composition.server.ts | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | inward | present |
| E363 | apps/platform/src/server/runtime-environment.server.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E364 | apps/platform/src/server/runtime-environment.server.ts | packages/config/src/runtime.ts | import | yes | no | lateral | present |
| E365 | apps/platform/src/surfaces/client-portal/api/manifest.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E366 | apps/platform/src/surfaces/client-portal/api/manifest.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E367 | apps/platform/src/surfaces/client-portal/api/manifest.ts | packages/infrastructure/src/pwa/index.ts | import | yes | yes | inward | present |
| E368 | apps/platform/src/surfaces/client-portal/api/sw.ts | apps/platform/src/surfaces/client-portal/api/service-worker.js | import | no | no | lateral | present |
| E369 | apps/platform/src/surfaces/client-portal/pages/home.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E370 | apps/platform/src/surfaces/client-portal/routes.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E371 | apps/platform/src/surfaces/client-portal/shell/access-layout.server.ts | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | import | yes | no | lateral | present |
| E373 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | apps/platform/src/surfaces/client-portal/shell/navigation-links.ts | import | no | no | lateral | present |
| E374 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | packages/infrastructure/src/pwa/index.ts | import | yes | yes | inward | present |
| E375 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E376 | apps/platform/src/surfaces/client-portal/shell/navigation-links.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E378 | apps/platform/src/surfaces/coach-portal/routes.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E379 | apps/platform/src/surfaces/coach-portal/shell/layout.server.ts | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | import | yes | no | lateral | present |
| E380 | apps/platform/src/surfaces/coach-portal/shell/layout.tsx | apps/platform/src/surfaces/coach-portal/shell/layout.server.ts | import | no | no | lateral | present |
| E381 | apps/platform/src/surfaces/coach-portal/shell/layout.tsx | apps/platform/src/surfaces/coach-portal/shell/navigation-links.tsx | import | no | no | lateral | present |
| E847 | apps/platform/src/surfaces/coach-portal/shell/layout.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E383 | apps/platform/src/surfaces/coach-portal/shell/layout.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E384 | apps/platform/src/surfaces/coach-portal/shell/navigation-links.tsx | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E848 | apps/platform/src/surfaces/coach-portal/shell/navigation-links.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E386 | apps/platform/src/surfaces/coach-portal/shell/navigation-links.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E387 | apps/platform/src/surfaces/public-site/pages/blog.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E388 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/sections/about/about.tsx | import | no | no | lateral | present |
| E389 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | import | no | no | lateral | present |
| E390 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | import | no | no | lateral | present |
| E391 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/sections/my-method/my-method.tsx | import | no | no | lateral | present |
| E392 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | import | no | no | lateral | present |
| E393 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/sections/workouts/workouts.tsx | import | no | no | lateral | present |
| E394 | apps/platform/src/surfaces/public-site/pages/home.tsx | apps/platform/src/surfaces/public-site/shell/layout.tsx | import | no | no | lateral | present |
| E1330 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | yes | yes | inward | present |
| E397 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/features/waitlist/ui/public/availability-status.tsx | import | yes | no | lateral | present |
| E398 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/features/waitlist/ui/public/email-form.tsx | import | yes | no | lateral | present |
| E399 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/surfaces/public-site/shell/layout.tsx | import | no | no | lateral | present |
| E851 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1472 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1437 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E401 | apps/platform/src/surfaces/public-site/pages/privacy.tsx | apps/platform/src/surfaces/public-site/sections/legal/legal-document-view.tsx | import | no | no | lateral | present |
| E402 | apps/platform/src/surfaces/public-site/pages/privacy.tsx | packages/content/src/index.ts | import | yes | yes | inward | present |
| E403 | apps/platform/src/surfaces/public-site/pages/terms.tsx | apps/platform/src/surfaces/public-site/sections/legal/legal-document-view.tsx | import | no | no | lateral | present |
| E404 | apps/platform/src/surfaces/public-site/pages/terms.tsx | packages/content/src/index.ts | import | yes | yes | inward | present |
| E405 | apps/platform/src/surfaces/public-site/routes.ts | apps/platform/src/features/accounts/routes.ts | import | yes | no | lateral | present |
| E1331 | apps/platform/src/surfaces/public-site/routes.ts | apps/platform/src/features/assessment-calls/routes.ts | import | yes | no | lateral | present; changed (GEN-192): also imports `assessmentCallsJoinRoutes`, no new edge (same module pair) |
| E406 | apps/platform/src/surfaces/public-site/routes.ts | apps/platform/src/features/store/routes.ts | import | yes | no | lateral | present |
| E407 | apps/platform/src/surfaces/public-site/routes.ts | apps/platform/src/surfaces/public-site/paths.ts | import | no | no | lateral | present |
| E408 | apps/platform/src/surfaces/public-site/sections/about/about-content.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E1432 | apps/platform/src/surfaces/public-site/sections/about/about-content.ts | packages/content/src/index.ts | import | yes | yes | inward | present |
| E1332 | apps/platform/src/surfaces/public-site/sections/about/about.tsx | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | yes | yes | inward | present |
| E409 | apps/platform/src/surfaces/public-site/sections/about/about.tsx | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | import | yes | no | lateral | present |
| E410 | apps/platform/src/surfaces/public-site/sections/about/about.tsx | apps/platform/src/surfaces/public-site/paths.ts | import | no | no | lateral | present |
| E411 | apps/platform/src/surfaces/public-site/sections/about/about.tsx | apps/platform/src/surfaces/public-site/sections/about/about-content.ts | import | no | no | lateral | present |
| E412 | apps/platform/src/surfaces/public-site/sections/about/about.tsx | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | import | no | no | lateral | present |
| E1412 | apps/platform/src/surfaces/public-site/sections/about/about.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E414 | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | apps/platform/src/surfaces/public-site/sections/about/about-content.ts | import | no | no | lateral | present |
| E852 | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E853 | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | external:react | import | n/a | no | lateral | present |
| E417 | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E418 | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E419 | apps/platform/src/surfaces/public-site/sections/about/instagram-story-widget.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E420 | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition-content.ts | import | no | no | lateral | present |
| E421 | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.css | import | no | no | lateral | present |
| E854 | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | external:react | import | n/a | no | lateral | present |
| E423 | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E424 | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E425 | apps/platform/src/surfaces/public-site/sections/cycle-nutrition/cycle-nutrition.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E426 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | apps/platform/src/features/store/contracts/paths.ts | import | yes | no | lateral | present |
| E427 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | apps/platform/src/features/waitlist/ui/public/availability-status.tsx | import | yes | no | lateral | present |
| E428 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | apps/platform/src/features/waitlist/ui/public/email-form.tsx | import | yes | no | lateral | present |
| E429 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | import | yes | no | lateral | present |
| E430 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | apps/platform/src/surfaces/public-site/paths.ts | import | no | no | lateral | present |
| E431 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | apps/platform/src/surfaces/public-site/sections/legal/legal-nav.tsx | import | no | no | lateral | present |
| E855 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | external:react | import | n/a | no | lateral | present |
| E433 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | inward | present |
| E435 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E1435 | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1333 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | yes | yes | inward | present |
| E436 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | apps/platform/src/features/waitlist/ui/public/availability-status.tsx | import | yes | no | lateral | present |
| E437 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | apps/platform/src/features/waitlist/ui/public/email-form.tsx | import | yes | no | lateral | present |
| E438 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | import | yes | no | lateral | present |
| E439 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | apps/platform/src/surfaces/public-site/paths.ts | import | no | no | lateral | present |
| E856 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E857 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | external:react | import | n/a | no | lateral | present |
| E443 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | packages/config/src/index.ts | import | yes | no | lateral | present |
| E444 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | inward | present |
| E1433 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E446 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E1434 | apps/platform/src/surfaces/public-site/sections/hero/hero.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E858 | apps/platform/src/surfaces/public-site/sections/legal/legal-document-view.tsx | external:react | import | n/a | no | lateral | present |
| E449 | apps/platform/src/surfaces/public-site/sections/legal/legal-document-view.tsx | packages/content/src/index.ts | import | yes | yes | inward | present |
| E1473 | apps/platform/src/surfaces/public-site/sections/legal/legal-document-view.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E450 | apps/platform/src/surfaces/public-site/sections/legal/legal-document-view.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E451 | apps/platform/src/surfaces/public-site/sections/legal/legal-nav.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E452 | apps/platform/src/surfaces/public-site/sections/legal/legal-nav.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E859 | apps/platform/src/surfaces/public-site/sections/my-method/my-method.tsx | external:react | import | n/a | no | lateral | present |
| E454 | apps/platform/src/surfaces/public-site/sections/my-method/my-method.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E455 | apps/platform/src/surfaces/public-site/sections/my-method/my-method.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E456 | apps/platform/src/surfaces/public-site/sections/my-method/my-method.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E860 | apps/platform/src/surfaces/public-site/sections/platform/platform-content.ts | external:lucide-react | import | n/a | no | lateral | present |
| E459 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | apps/platform/src/surfaces/public-site/sections/platform/platform-content.ts | import | no | no | lateral | present |
| E862 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E863 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | external:react | import | n/a | no | lateral | present |
| E463 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E464 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E465 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E466 | apps/platform/src/surfaces/public-site/sections/platform/platform.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E467 | apps/platform/src/surfaces/public-site/sections/workouts/workouts.tsx | apps/platform/src/surfaces/public-site/sections/workouts/swipe-intent.ts | import | no | no | lateral | present |
| E868 | apps/platform/src/surfaces/public-site/sections/workouts/workouts.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E869 | apps/platform/src/surfaces/public-site/sections/workouts/workouts.tsx | external:react | import | n/a | no | lateral | present |
| E470 | apps/platform/src/surfaces/public-site/sections/workouts/workouts.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E471 | apps/platform/src/surfaces/public-site/sections/workouts/workouts.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E472 | apps/platform/src/surfaces/public-site/sections/workouts/workouts.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E473 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/features/accounts/contracts/account.ts | import | yes | no | lateral | present |
| E474 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/features/accounts/server/guards/session-context.server.ts | import | yes | no | lateral | present |
| E475 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/features/store/contracts/paths.ts | import | yes | no | lateral | present |
| E476 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/features/waitlist/server/guards/waitlist-context.server.ts | import | yes | no | lateral | present |
| E477 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | import | yes | no | lateral | present |
| E478 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/server/guards/runtime-config-context.server.ts | import | yes | no | lateral | present |
| E479 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E480 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | inward | present |
| E481 | apps/platform/src/surfaces/public-site/shell/layout.tsx | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | import | yes | no | lateral | present |
| E482 | apps/platform/src/surfaces/public-site/shell/layout.tsx | apps/platform/src/features/store/ui/public/cart/cart-provider.tsx | import | yes | no | lateral | present |
| E483 | apps/platform/src/surfaces/public-site/shell/layout.tsx | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | import | yes | no | lateral | present |
| E484 | apps/platform/src/surfaces/public-site/shell/layout.tsx | apps/platform/src/surfaces/public-site/sections/footer-cta/footer-cta.tsx | import | no | no | lateral | present |
| E485 | apps/platform/src/surfaces/public-site/shell/layout.tsx | apps/platform/src/surfaces/public-site/shell/layout.server.ts | import | no | no | lateral | present |
| E486 | apps/platform/src/surfaces/public-site/shell/layout.tsx | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | import | no | no | lateral | present |
| E487 | apps/platform/src/surfaces/public-site/shell/layout.tsx | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | inward | present |
| E1466 | apps/platform/src/surfaces/public-site/shell/logo.tsx | apps/platform/src/surfaces/public-site/shell/header-appearance.ts | import | no | no | lateral | present |
| E488 | apps/platform/src/surfaces/public-site/shell/logo.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E489 | apps/platform/src/surfaces/public-site/shell/public-footer.tsx | apps/platform/src/surfaces/public-site/sections/legal/legal-nav.tsx | import | no | no | lateral | present |
| E870 | apps/platform/src/surfaces/public-site/shell/public-footer.tsx | external:react | import | n/a | no | lateral | present |
| E491 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/features/accounts/contracts/account.ts | import | yes | no | lateral | present |
| E492 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | import | yes | no | lateral | present |
| E493 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/features/store/contracts/paths.ts | import | yes | no | lateral | present |
| E494 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | import | yes | no | lateral | present |
| E495 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/surfaces/public-site/paths.ts | import | no | no | lateral | present |
| E1467 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/surfaces/public-site/shell/header-appearance.ts | import | no | no | lateral | present |
| E496 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/surfaces/public-site/shell/public-footer.tsx | import | no | no | lateral | present |
| E497 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | import | no | no | lateral | present |
| E871 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | external:react | import | n/a | no | lateral | present |
| E499 | apps/platform/src/surfaces/public-site/shell/public-layout.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1468 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | apps/platform/src/surfaces/public-site/shell/header-appearance.ts | import | no | no | lateral | present |
| E500 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | apps/platform/src/surfaces/public-site/shell/logo.tsx | import | no | no | lateral | present |
| E872 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E873 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | external:react | import | n/a | no | lateral | present |
| E1200 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E503 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1207 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E504 | apps/platform/src/surfaces/public-site/shell/public-navigation.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | removed |
| E874 | packages/config/src/concerns/app.ts | external:zod | import | n/a | no | lateral | present |
| E1334 | packages/config/src/concerns/assessment-calls.ts | external:zod | import | n/a | no | lateral | present |
| E875 | packages/config/src/concerns/bot-detection.ts | external:zod | import | n/a | no | lateral | present |
| E507 | packages/config/src/concerns/bot-detection.ts | packages/config/src/concerns/app.ts | import | no | no | lateral | present |
| E876 | packages/config/src/concerns/clerk.ts | external:zod | import | n/a | no | lateral | present |
| E509 | packages/config/src/concerns/clerk.ts | packages/config/src/concerns/app.ts | import | no | no | lateral | present |
| E877 | packages/config/src/concerns/database.ts | external:zod | import | n/a | no | lateral | present |
| E878 | packages/config/src/concerns/management-api.ts | external:zod | import | n/a | no | lateral | present |
| E512 | packages/config/src/concerns/management-api.ts | packages/config/src/concerns/app.ts | import | no | no | lateral | present |
| E879 | packages/config/src/concerns/product-email.ts | external:zod | import | n/a | no | lateral | present |
| E514 | packages/config/src/concerns/product-email.ts | packages/config/src/concerns/app.ts | import | no | no | lateral | present |
| E880 | packages/config/src/concerns/store-assets.ts | external:zod | import | n/a | no | lateral | present |
| E516 | packages/config/src/concerns/store-assets.ts | packages/config/src/concerns/app.ts | import | no | no | lateral | present |
| E881 | packages/config/src/concerns/waitlist.ts | external:zod | import | n/a | no | lateral | present |
| E518 | packages/config/src/index.ts | packages/config/src/base-path.ts | import (re-export, now also `normalizeBasePath`) | no | no | lateral | changed (9747d171) |
| E519 | packages/config/src/index.ts | packages/config/src/concerns/app.ts | import | no | no | lateral | present |
| E1336 | packages/config/src/index.ts | packages/config/src/concerns/assessment-calls.ts | import | no | no | lateral | present |
| E521 | packages/config/src/index.ts | packages/config/src/concerns/bot-detection.ts | import | no | no | lateral | present |
| E522 | packages/config/src/index.ts | packages/config/src/concerns/database.ts | import | no | no | lateral | present |
| E523 | packages/config/src/index.ts | packages/config/src/concerns/management-api.ts | import | no | no | lateral | present |
| E524 | packages/config/src/index.ts | packages/config/src/concerns/product-email.ts | import | no | no | lateral | present |
| E525 | packages/config/src/index.ts | packages/config/src/concerns/waitlist.ts | import | no | no | lateral | present |
| E526 | packages/config/src/index.ts | packages/config/src/runtime-environment.ts | import | no | no | lateral | present |
| E882 | packages/config/src/runtime-environment.ts | external:zod | import | n/a | no | lateral | present |
| E528 | packages/config/src/runtime-environment.ts | packages/config/src/concerns/app.ts | import | no | no | lateral | present |
| E1337 | packages/config/src/runtime-environment.ts | packages/config/src/concerns/assessment-calls.ts | import | no | no | lateral | present |
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
| E883 | packages/content/src/legal-document-hash.ts | external:crypto | import | n/a | yes | outward | present |
| E543 | packages/content/src/legal-document-hash.ts | packages/content/src/legal-document.ts | import | no | no | lateral | present |
| E544 | packages/content/src/privacy-policy.ts | packages/content/src/legal-document.ts | import | no | no | lateral | present |
| E545 | packages/content/src/website-and-store-terms/current.ts | packages/content/src/legal-document.ts | import | no | no | lateral | present |
| E546 | packages/content/src/website-and-store-terms/current.ts | packages/content/src/website-and-store-terms/types.ts | import | no | no | lateral | present |
| E547 | packages/content/src/website-and-store-terms/index.ts | packages/content/src/legal-document-hash.ts | import | no | no | lateral | present |
| E548 | packages/content/src/website-and-store-terms/index.ts | packages/content/src/website-and-store-terms/current.ts | import | no | no | lateral | present |
| E549 | packages/content/src/website-and-store-terms/index.ts | packages/content/src/website-and-store-terms/types.ts | import | no | no | lateral | present |
| E550 | packages/content/src/website-and-store-terms/types.ts | packages/content/src/legal-document.ts | import | no | no | lateral | present |
| E884 | packages/db/src/database-client.ts | external:pg | import | n/a | yes | outward | present |
| E552 | packages/db/src/database-client.ts | packages/db/src/schema/index.ts | import | no | no | lateral | present |
| E885 | packages/db/src/database-pool.ts | external:pg | import | n/a | yes | outward | present |
| E554 | packages/db/src/index.ts | packages/db/src/database-client.ts | import | no | no | lateral | present |
| E1469 | packages/db/src/index.ts | packages/db/src/database-error.ts | import | no | no | lateral | present |
| E555 | packages/db/src/index.ts | packages/db/src/database-pool.ts | import | no | no | lateral | present |
| E556 | packages/db/src/index.ts | packages/db/src/schema/index.ts | import | no | no | lateral | present |
| E557 | packages/db/src/schema/index.ts | packages/db/src/schema/app-schema.ts | import | no | no | lateral | present |
| E886 | packages/domain/src/account/accounts.ts | packages/domain/src/account/account.ts | import | no | yes | inward | present |
| E887 | packages/domain/src/account/delete-account-use-case.ts | packages/domain/src/account/accounts.ts | import | no | no | lateral | present |
| E888 | packages/domain/src/account/index.ts | packages/domain/src/account/account.ts | import | no | yes | inward | present |
| E889 | packages/domain/src/account/index.ts | packages/domain/src/account/accounts.ts | import | no | yes | inward | present |
| E890 | packages/domain/src/account/index.ts | packages/domain/src/account/delete-account-use-case.ts | import | no | yes | inward | present |
| E891 | packages/domain/src/account/index.ts | packages/domain/src/account/provision-account-use-case.ts | import | no | yes | inward | present |
| E892 | packages/domain/src/account/provision-account-use-case.ts | packages/domain/src/account/account.ts | import | no | yes | inward | present |
| E893 | packages/domain/src/account/provision-account-use-case.ts | packages/domain/src/account/accounts.ts | import | no | no | lateral | present |
| E1014 | packages/domain/src/acquisition/acquire-products-use-case.ts | packages/domain/src/acquisition/acquisition-incidents.ts | import | no | no | lateral | present |
| E894 | packages/domain/src/acquisition/acquire-products-use-case.ts | packages/domain/src/acquisition/acquisition.ts | import | no | yes | inward | present |
| E895 | packages/domain/src/acquisition/acquire-products-use-case.ts | packages/domain/src/acquisition/product-delivery.ts | import | no | no | lateral | present |
| E896 | packages/domain/src/acquisition/acquire-products-use-case.ts | packages/domain/src/acquisition/store-acquisitions.ts | import | no | no | lateral | present |
| E897 | packages/domain/src/acquisition/acquire-products-use-case.ts | packages/domain/src/product/index.ts | import | no | no | lateral | present |
| E898 | packages/domain/src/acquisition/acquire-products-use-case.ts | packages/domain/src/shared/index.ts | import | no | no | lateral | present |
| E899 | packages/domain/src/acquisition/acquisition.ts | packages/domain/src/email-address/index.ts | import | no | no | lateral | present |
| E900 | packages/domain/src/acquisition/acquisition.ts | packages/domain/src/product/index.ts | import | no | no | lateral | present |
| E901 | packages/domain/src/acquisition/index.ts | packages/domain/src/acquisition/acquire-products-use-case.ts | import | no | yes | inward | present |
| E1015 | packages/domain/src/acquisition/index.ts | packages/domain/src/acquisition/acquisition-incidents.ts | import | no | yes | inward | present |
| E902 | packages/domain/src/acquisition/index.ts | packages/domain/src/acquisition/acquisition.ts | import | no | yes | inward | present |
| E903 | packages/domain/src/acquisition/index.ts | packages/domain/src/acquisition/product-delivery.ts | import | no | yes | inward | present |
| E904 | packages/domain/src/acquisition/index.ts | packages/domain/src/acquisition/store-acquisitions.ts | import | no | yes | inward | present |
| E905 | packages/domain/src/acquisition/store-acquisitions.ts | packages/domain/src/acquisition/acquisition.ts | import | no | yes | inward | present |
| E906 | packages/domain/src/acquisition/store-acquisitions.ts | packages/domain/src/product/index.ts | import | no | no | lateral | present |
| E1481 | packages/domain/src/assessment-call/assessment-call-booking-window.ts | packages/domain/src/assessment-call/assessment-call-incidents.ts | import | no | no | lateral | added (main merge) |
| E1482 | packages/domain/src/assessment-call/assessment-call-booking-window.ts | packages/domain/src/feature-flag/index.ts | import | no | no | lateral | added (main merge) |
| E1483 | packages/domain/src/assessment-call/assessment-call-incidents.ts | packages/domain/src/assessment-call/assessment-call-notifications.ts | import | no | no | lateral | added (main merge) |
| E1338 | packages/domain/src/assessment-call/assessment-call-notifications.ts | packages/domain/src/assessment-call/assessment-call.ts | import | no | yes | inward | present |
| E1339 | packages/domain/src/assessment-call/assessment-call-reservations.ts | packages/domain/src/assessment-call/assessment-call.ts | import | no | yes | inward | present |
| E1443 | packages/domain/src/assessment-call/assessment-call-rules.ts | packages/domain/src/coach-availability/index.ts | import | no | yes | lateral | present |
| E1444 | packages/domain/src/assessment-call/assessment-call.ts | packages/domain/src/assessment-call/assessment-call-rules.ts | import | no | no | lateral | present |
| E1484 | packages/domain/src/assessment-call/book-assessment-call-use-case.ts | packages/domain/src/assessment-call/assessment-call-booking-window.ts | import | no | no | lateral | added (main merge) |
| E1485 | packages/domain/src/assessment-call/book-assessment-call-use-case.ts | packages/domain/src/assessment-call/assessment-call-incidents.ts | import | no | no | lateral | added (main merge) |
| E1341 | packages/domain/src/assessment-call/book-assessment-call-use-case.ts | packages/domain/src/assessment-call/assessment-call-notifications.ts | import | no | no | lateral | present |
| E1342 | packages/domain/src/assessment-call/book-assessment-call-use-case.ts | packages/domain/src/assessment-call/assessment-call-reservations.ts | import | no | no | lateral | present |
| E1445 | packages/domain/src/assessment-call/book-assessment-call-use-case.ts | packages/domain/src/assessment-call/assessment-call-rules.ts | import | no | yes | inward | present |
| E1343 | packages/domain/src/assessment-call/book-assessment-call-use-case.ts | packages/domain/src/assessment-call/assessment-call.ts | import | no | yes | inward | present |
| E1344 | packages/domain/src/assessment-call/book-assessment-call-use-case.ts | packages/domain/src/coach-availability/index.ts | import | no | yes | lateral | present |
| E1345 | packages/domain/src/assessment-call/book-assessment-call-use-case.ts | packages/domain/src/email-address/index.ts | import | no | yes | lateral | present |
| E1346 | packages/domain/src/assessment-call/book-assessment-call-use-case.ts | packages/domain/src/shared/index.ts | import | no | yes | lateral | present |
| E1486 | packages/domain/src/assessment-call/index.ts | packages/domain/src/assessment-call/assessment-call-booking-window.ts | import | no | yes | inward | added (main merge) |
| E1487 | packages/domain/src/assessment-call/index.ts | packages/domain/src/assessment-call/assessment-call-incidents.ts | import | no | yes | inward | added (main merge) |
| E1347 | packages/domain/src/assessment-call/index.ts | packages/domain/src/assessment-call/assessment-call-notifications.ts | import | no | yes | inward | present |
| E1348 | packages/domain/src/assessment-call/index.ts | packages/domain/src/assessment-call/assessment-call-reservations.ts | import | no | yes | inward | present |
| E1446 | packages/domain/src/assessment-call/index.ts | packages/domain/src/assessment-call/assessment-call-rules.ts | import | no | yes | inward | present |
| E1349 | packages/domain/src/assessment-call/index.ts | packages/domain/src/assessment-call/assessment-call.ts | import | no | yes | inward | present |
| E1350 | packages/domain/src/assessment-call/index.ts | packages/domain/src/assessment-call/book-assessment-call-use-case.ts | import | no | yes | inward | present |
| E1351 | packages/domain/src/assessment-call/index.ts | packages/domain/src/assessment-call/list-open-slots-use-case.ts | import | no | yes | inward | present |
| E1353 | packages/domain/src/assessment-call/index.ts | packages/domain/src/assessment-call/resolve-join-link-use-case.ts | import | no | yes | inward | present |
| E1530 | packages/domain/src/assessment-call/index.ts | packages/domain/src/assessment-call/assessment-call-settings.ts | import | no | yes | inward | new (GEN-192) |
| E1531 | packages/domain/src/assessment-call/index.ts | packages/domain/src/assessment-call/get-assessment-call-settings-use-case.ts | import | no | yes | inward | new (GEN-192) |
| E1532 | packages/domain/src/assessment-call/index.ts | packages/domain/src/assessment-call/update-assessment-call-settings-use-case.ts | import | no | yes | inward | new (GEN-192) |
| E1488 | packages/domain/src/assessment-call/list-open-slots-use-case.ts | packages/domain/src/assessment-call/assessment-call-booking-window.ts | import | no | no | lateral | added (main merge) |
| E1489 | packages/domain/src/assessment-call/list-open-slots-use-case.ts | packages/domain/src/assessment-call/assessment-call-incidents.ts | import | no | no | lateral | added (main merge) |
| E1447 | packages/domain/src/assessment-call/list-open-slots-use-case.ts | packages/domain/src/assessment-call/assessment-call-rules.ts | import | no | yes | inward | present |
| E1355 | packages/domain/src/assessment-call/list-open-slots-use-case.ts | packages/domain/src/coach-availability/index.ts | import | no | yes | lateral | present |
| E1356 | packages/domain/src/assessment-call/list-open-slots-use-case.ts | packages/domain/src/shared/index.ts | import | no | yes | lateral | present |
| E1358 | packages/domain/src/assessment-call/resolve-join-link-use-case.ts | packages/domain/src/assessment-call/assessment-call-reservations.ts | import | no | no | lateral | present |
| E1533 | packages/domain/src/assessment-call/resolve-join-link-use-case.ts | packages/domain/src/coach-meeting-room/index.ts | import | no | no | lateral | new (GEN-192) |
| E1534 | packages/domain/src/assessment-call/assessment-call-settings.ts | packages/domain/src/coach-availability/index.ts | import | no | no | lateral | new (GEN-192) |
| E1535 | packages/domain/src/assessment-call/assessment-call-settings.ts | packages/domain/src/coach-meeting-room/index.ts | import | no | no | lateral | new (GEN-192) |
| E1536 | packages/domain/src/assessment-call/get-assessment-call-settings-use-case.ts | packages/domain/src/coach-availability/index.ts | import | no | no | lateral | new (GEN-192) |
| E1537 | packages/domain/src/assessment-call/get-assessment-call-settings-use-case.ts | packages/domain/src/coach-meeting-room/index.ts | import | no | no | lateral | new (GEN-192) |
| E1538 | packages/domain/src/assessment-call/get-assessment-call-settings-use-case.ts | packages/domain/src/assessment-call/assessment-call-settings.ts | import | no | no | lateral | new (GEN-192) |
| E1539 | packages/domain/src/assessment-call/update-assessment-call-settings-use-case.ts | packages/domain/src/coach-availability/index.ts | import | no | no | lateral | new (GEN-192) |
| E1540 | packages/domain/src/assessment-call/update-assessment-call-settings-use-case.ts | packages/domain/src/coach-meeting-room/index.ts | import | no | no | lateral | new (GEN-192) |
| E1541 | packages/domain/src/assessment-call/update-assessment-call-settings-use-case.ts | packages/domain/src/assessment-call/assessment-call-settings.ts | import | no | no | lateral | new (GEN-192) |
| E907 | packages/domain/src/cart/index.ts | packages/domain/src/cart/cart.ts | import | no | yes | inward | present |
| E1360 | packages/domain/src/coach-availability/coach-availability-source.ts | packages/domain/src/coach-availability/coach-availability.ts | import | no | yes | inward | present |
| E1449 | packages/domain/src/coach-availability/coach-availability.ts | packages/domain/src/coach-availability/slot-policy.ts | import | no | no | lateral | present |
| E1448 | packages/domain/src/coach-availability/coach-availability.ts | packages/domain/src/coach-availability/time-interval.ts | import | no | no | lateral | present |
| E1361 | packages/domain/src/coach-availability/coach-availability.ts | packages/domain/src/coach-availability/zoned-time.ts | import | no | no | lateral | present |
| E1542 | packages/domain/src/coach-availability/coach-availability-changes.ts | packages/domain/src/coach-availability/coach-availability.ts | import | no | no | lateral | new (GEN-192) |
| E1543 | packages/domain/src/coach-availability/index.ts | packages/domain/src/coach-availability/coach-availability-changes.ts | import | no | yes | inward | new (GEN-192) |
| E1544 | packages/domain/src/coach-meeting-room/coach-meeting-room-source.ts | packages/domain/src/coach-meeting-room/coach-meeting-room.ts | import | no | no | lateral | new (GEN-192) |
| E1545 | packages/domain/src/coach-meeting-room/coach-meeting-room-changes.ts | packages/domain/src/coach-meeting-room/coach-meeting-room.ts | import | no | no | lateral | new (GEN-192) |
| E1546 | packages/domain/src/coach-meeting-room/index.ts | packages/domain/src/coach-meeting-room/coach-meeting-room.ts | import | no | yes | inward | new (GEN-192) |
| E1547 | packages/domain/src/coach-meeting-room/index.ts | packages/domain/src/coach-meeting-room/coach-meeting-room-changes.ts | import | no | yes | inward | new (GEN-192) |
| E1548 | packages/domain/src/coach-meeting-room/index.ts | packages/domain/src/coach-meeting-room/coach-meeting-room-source.ts | import | no | yes | inward | new (GEN-192) |
| E1450 | packages/domain/src/coach-availability/coach-calendar.ts | packages/domain/src/coach-availability/time-interval.ts | import | no | yes | inward | present |
| E1362 | packages/domain/src/coach-availability/index.ts | packages/domain/src/coach-availability/coach-availability-source.ts | import | no | yes | inward | present |
| E1363 | packages/domain/src/coach-availability/index.ts | packages/domain/src/coach-availability/coach-availability.ts | import | no | yes | inward | present |
| E1452 | packages/domain/src/coach-availability/index.ts | packages/domain/src/coach-availability/coach-calendar.ts | import | no | yes | inward | present |
| E1453 | packages/domain/src/coach-availability/index.ts | packages/domain/src/coach-availability/slot-policy.ts | import | no | yes | inward | present |
| E1451 | packages/domain/src/coach-availability/index.ts | packages/domain/src/coach-availability/time-interval.ts | import | no | yes | inward | present |
| E1454 | packages/domain/src/coach-availability/slot-policy.ts | packages/domain/src/coach-availability/time-interval.ts | import | no | no | lateral | present |
| E908 | packages/domain/src/download-grant/download-grant.ts | packages/domain/src/product/index.ts | import | no | no | lateral | present |
| E909 | packages/domain/src/download-grant/download-grants.ts | packages/domain/src/download-grant/download-grant.ts | import | no | yes | inward | present |
| E910 | packages/domain/src/download-grant/index.ts | packages/domain/src/download-grant/download-grant.ts | import | no | yes | inward | present |
| E911 | packages/domain/src/download-grant/index.ts | packages/domain/src/download-grant/download-grants.ts | import | no | yes | inward | present |
| E912 | packages/domain/src/download-grant/index.ts | packages/domain/src/download-grant/resolve-download-grant-use-case.ts | import | no | yes | inward | present |
| E913 | packages/domain/src/download-grant/resolve-download-grant-use-case.ts | packages/domain/src/download-grant/download-grant.ts | import | no | yes | inward | present |
| E914 | packages/domain/src/download-grant/resolve-download-grant-use-case.ts | packages/domain/src/download-grant/download-grants.ts | import | no | no | lateral | present |
| E915 | packages/domain/src/download-grant/resolve-download-grant-use-case.ts | packages/domain/src/shared/index.ts | import | no | no | lateral | present |
| E916 | packages/domain/src/email-address/index.ts | packages/domain/src/email-address/email-address.ts | import | no | yes | inward | present |
| E917 | packages/domain/src/feature-flag/feature-flags.ts | packages/domain/src/feature-flag/feature-flag.ts | import | no | yes | inward | present |
| E918 | packages/domain/src/feature-flag/get-feature-flags-use-case.ts | packages/domain/src/feature-flag/feature-flag.ts | import | no | yes | inward | present |
| E919 | packages/domain/src/feature-flag/get-feature-flags-use-case.ts | packages/domain/src/feature-flag/feature-flags.ts | import | no | no | lateral | present |
| E920 | packages/domain/src/feature-flag/index.ts | packages/domain/src/feature-flag/feature-flag.ts | import | no | yes | inward | present |
| E921 | packages/domain/src/feature-flag/index.ts | packages/domain/src/feature-flag/feature-flags.ts | import | no | yes | inward | present |
| E922 | packages/domain/src/feature-flag/index.ts | packages/domain/src/feature-flag/get-feature-flags-use-case.ts | import | no | yes | inward | present |
| E923 | packages/domain/src/product/find-published-cover-use-case.ts | packages/domain/src/product/product.ts | import | no | yes | inward | present |
| E924 | packages/domain/src/product/find-published-cover-use-case.ts | packages/domain/src/product/store-catalog.ts | import | no | no | lateral | present |
| E925 | packages/domain/src/product/find-published-product-use-case.ts | packages/domain/src/product/product.ts | import | no | yes | inward | present |
| E926 | packages/domain/src/product/find-published-product-use-case.ts | packages/domain/src/product/store-catalog.ts | import | no | no | lateral | present |
| E927 | packages/domain/src/product/index.ts | packages/domain/src/product/find-published-cover-use-case.ts | import | no | yes | inward | present |
| E928 | packages/domain/src/product/index.ts | packages/domain/src/product/find-published-product-use-case.ts | import | no | yes | inward | present |
| E929 | packages/domain/src/product/index.ts | packages/domain/src/product/list-published-products-use-case.ts | import | no | yes | inward | present |
| E930 | packages/domain/src/product/index.ts | packages/domain/src/product/plan-new-product-use-case.ts | import | no | yes | inward | present |
| E931 | packages/domain/src/product/index.ts | packages/domain/src/product/plan-product-revision-use-case.ts | import | no | yes | inward | present |
| E932 | packages/domain/src/product/index.ts | packages/domain/src/product/product-assets.ts | import | no | yes | inward | present |
| E933 | packages/domain/src/product/index.ts | packages/domain/src/product/product-publication.ts | import | no | yes | inward | present |
| E934 | packages/domain/src/product/index.ts | packages/domain/src/product/product.ts | import | no | yes | inward | present |
| E935 | packages/domain/src/product/index.ts | packages/domain/src/product/publish-new-product-use-case.ts | import | no | yes | inward | present |
| E936 | packages/domain/src/product/index.ts | packages/domain/src/product/publish-product-version-use-case.ts | import | no | yes | inward | present |
| E937 | packages/domain/src/product/index.ts | packages/domain/src/product/retire-product-use-case.ts | import | no | yes | inward | present |
| E938 | packages/domain/src/product/index.ts | packages/domain/src/product/store-catalog.ts | import | no | yes | inward | present |
| E939 | packages/domain/src/product/index.ts | packages/domain/src/product/store-product-publications.ts | import | no | yes | inward | present |
| E940 | packages/domain/src/product/list-published-products-use-case.ts | packages/domain/src/product/product.ts | import | no | yes | inward | present |
| E941 | packages/domain/src/product/list-published-products-use-case.ts | packages/domain/src/product/store-catalog.ts | import | no | no | lateral | present |
| E942 | packages/domain/src/product/plan-new-product-use-case.ts | packages/domain/src/product/product-assets.ts | import | no | no | lateral | present |
| E943 | packages/domain/src/product/plan-new-product-use-case.ts | packages/domain/src/product/product-publication.ts | import | no | no | lateral | present |
| E944 | packages/domain/src/product/plan-new-product-use-case.ts | packages/domain/src/product/store-product-publications.ts | import | no | no | lateral | present |
| E945 | packages/domain/src/product/plan-product-revision-use-case.ts | packages/domain/src/product/product-assets.ts | import | no | no | lateral | present |
| E946 | packages/domain/src/product/plan-product-revision-use-case.ts | packages/domain/src/product/product-publication.ts | import | no | no | lateral | present |
| E947 | packages/domain/src/product/plan-product-revision-use-case.ts | packages/domain/src/product/store-product-publications.ts | import | no | no | lateral | present |
| E948 | packages/domain/src/product/product-assets.ts | packages/domain/src/product/product.ts | import | no | yes | inward | present |
| E949 | packages/domain/src/product/product-publication.ts | packages/domain/src/product/product-asset-keys.ts | import | no | yes | inward | present |
| E950 | packages/domain/src/product/product-publication.ts | packages/domain/src/product/product-assets.ts | import | no | no | lateral | present |
| E951 | packages/domain/src/product/product-publication.ts | packages/domain/src/product/product-file-formats.ts | import | no | yes | inward | present |
| E952 | packages/domain/src/product/product-publication.ts | packages/domain/src/product/product.ts | import | no | yes | inward | present |
| E953 | packages/domain/src/product/publish-new-product-use-case.ts | packages/domain/src/product/product-assets.ts | import | no | no | lateral | present |
| E954 | packages/domain/src/product/publish-new-product-use-case.ts | packages/domain/src/product/product-publication.ts | import | no | no | lateral | present |
| E955 | packages/domain/src/product/publish-new-product-use-case.ts | packages/domain/src/product/store-product-publications.ts | import | no | no | lateral | present |
| E956 | packages/domain/src/product/publish-product-version-use-case.ts | packages/domain/src/product/product-assets.ts | import | no | no | lateral | present |
| E957 | packages/domain/src/product/publish-product-version-use-case.ts | packages/domain/src/product/product-publication.ts | import | no | no | lateral | present |
| E958 | packages/domain/src/product/publish-product-version-use-case.ts | packages/domain/src/product/store-product-publications.ts | import | no | no | lateral | present |
| E959 | packages/domain/src/product/retire-product-use-case.ts | packages/domain/src/product/product-publication.ts | import | no | no | lateral | present |
| E960 | packages/domain/src/product/retire-product-use-case.ts | packages/domain/src/product/store-product-publications.ts | import | no | no | lateral | present |
| E961 | packages/domain/src/product/store-catalog.ts | packages/domain/src/product/product.ts | import | no | yes | inward | present |
| E962 | packages/domain/src/product/store-product-publications.ts | packages/domain/src/product/product-publication.ts | import | no | no | lateral | present |
| E963 | packages/domain/src/product/store-product-publications.ts | packages/domain/src/product/product.ts | import | no | yes | inward | present |
| E573 | packages/domain/src/shared/index.ts | packages/domain/src/shared/bot-verifier.ts | import | no | no | lateral | removed in a79f507d |
| E574 | packages/domain/src/shared/index.ts | packages/domain/src/shared/clock.ts | import | no | no | lateral | present |
| E575 | packages/domain/src/shared/index.ts | packages/domain/src/shared/logger.ts | import | no | no | lateral | removed in a79f507d |
| E576 | packages/domain/src/shared/index.ts | packages/domain/src/shared/management-authenticator.ts | import | no | no | lateral | removed in a79f507d |
| E577 | packages/domain/src/shared/index.ts | packages/domain/src/shared/product-email.ts | import | no | no | lateral | removed in a79f507d |
| E1039 | packages/domain/src/waitlist/get-waitlist-use-case.ts | packages/domain/src/feature-flag/index.ts | import | no | no | lateral | added (63a570a7) |
| E964 | packages/domain/src/waitlist/get-waitlist-use-case.ts | packages/domain/src/shared/index.ts | import | no | no | lateral | present |
| E965 | packages/domain/src/waitlist/get-waitlist-use-case.ts | packages/domain/src/waitlist/waitlist-entries.ts | import | no | no | lateral | present |
| E1043 | packages/domain/src/waitlist/get-waitlist-use-case.ts | packages/domain/src/waitlist/waitlist-incidents.ts | import | no | no | lateral | added (242a0976) |
| E966 | packages/domain/src/waitlist/get-waitlist-use-case.ts | packages/domain/src/waitlist/waitlist.ts | import | no | yes | inward | present |
| E967 | packages/domain/src/waitlist/index.ts | packages/domain/src/waitlist/get-waitlist-use-case.ts | import | no | yes | inward | present |
| E968 | packages/domain/src/waitlist/index.ts | packages/domain/src/waitlist/join-waitlist-use-case.ts | import | no | yes | inward | present |
| E969 | packages/domain/src/waitlist/index.ts | packages/domain/src/waitlist/waitlist-confirmation.ts | import | no | yes | inward | present |
| E970 | packages/domain/src/waitlist/index.ts | packages/domain/src/waitlist/waitlist-entries.ts | import | no | yes | inward | present |
| E1017 | packages/domain/src/waitlist/index.ts | packages/domain/src/waitlist/waitlist-incidents.ts | import | no | yes | inward | present |
| E971 | packages/domain/src/waitlist/index.ts | packages/domain/src/waitlist/waitlist.ts | import | no | yes | inward | present |
| E972 | packages/domain/src/waitlist/join-waitlist-use-case.ts | packages/domain/src/email-address/index.ts | import | no | no | lateral | present |
| E973 | packages/domain/src/waitlist/join-waitlist-use-case.ts | packages/domain/src/shared/index.ts | import | no | no | lateral | removed in a79f507d |
| E974 | packages/domain/src/waitlist/join-waitlist-use-case.ts | packages/domain/src/waitlist/waitlist-confirmation.ts | import | no | no | lateral | present |
| E975 | packages/domain/src/waitlist/join-waitlist-use-case.ts | packages/domain/src/waitlist/waitlist-entries.ts | import | no | no | lateral | present |
| E1016 | packages/domain/src/waitlist/join-waitlist-use-case.ts | packages/domain/src/waitlist/waitlist-incidents.ts | import | no | no | lateral | present |
| E976 | packages/domain/src/waitlist/join-waitlist-use-case.ts | packages/domain/src/waitlist/waitlist.ts | import | no | yes | inward | present |
| E977 | packages/domain/src/waitlist/waitlist-confirmation.ts | packages/domain/src/waitlist/waitlist.ts | import | no | yes | inward | present |
| E978 | packages/domain/src/waitlist/waitlist-entries.ts | packages/domain/src/waitlist/waitlist.ts | import | no | yes | inward | present |
| E619 | packages/infrastructure/src/bot-detection/bot-detection-config.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E620 | packages/infrastructure/src/bot-detection/bot-detection-config.server.ts | packages/infrastructure/src/bot-detection/bot-detection-contract.ts | import | no | no | lateral | present |
| E979 | packages/infrastructure/src/bot-detection/bot-detection-contract.ts | external:zod | import | n/a | yes | outward | present |
| E631 | packages/infrastructure/src/bot-detection/index.server.ts | packages/infrastructure/src/bot-detection/bot-detection-config.server.ts | import | no | no | lateral | present |
| E1021 | packages/infrastructure/src/bot-detection/index.server.ts | packages/infrastructure/src/bot-detection/verifier/bot-verifier-contract.server.ts | import | no | no | lateral | present |
| E632 | packages/infrastructure/src/bot-detection/index.server.ts | packages/infrastructure/src/bot-detection/verifier/bot-verifier.server.ts | import | no | no | lateral | present |
| E633 | packages/infrastructure/src/bot-detection/index.server.ts | packages/infrastructure/src/bot-detection/verifier/create-bot-verifier.server.ts | import | no | no | lateral | present |
| E634 | packages/infrastructure/src/bot-detection/index.ts | packages/infrastructure/src/bot-detection/bot-detection-contract.ts | import | no | no | lateral | present |
| E635 | packages/infrastructure/src/bot-detection/index.ts | packages/infrastructure/src/bot-detection/submission/bot-detection-widget.tsx | import | no | no | lateral | present |
| E636 | packages/infrastructure/src/bot-detection/index.ts | packages/infrastructure/src/bot-detection/submission/use-bot-detection-submission.ts | import | no | no | lateral | present |
| E622 | packages/infrastructure/src/bot-detection/submission/bot-detection-flow.ts | packages/infrastructure/src/bot-detection/bot-detection-contract.ts | import | no | no | lateral | present |
| E980 | packages/infrastructure/src/bot-detection/submission/bot-detection-widget.tsx | external:react | import | n/a | yes | outward | present |
| E624 | packages/infrastructure/src/bot-detection/submission/bot-detection-widget.tsx | packages/infrastructure/src/bot-detection/bot-detection-contract.ts | import | no | no | lateral | present |
| E625 | packages/infrastructure/src/bot-detection/submission/bot-detection-widget.tsx | packages/infrastructure/src/bot-detection/turnstile/turnstile-widget.tsx | import | no | no | lateral | present |
| E981 | packages/infrastructure/src/bot-detection/submission/use-bot-detection-submission.ts | external:react | import | n/a | yes | outward | present |
| E644 | packages/infrastructure/src/bot-detection/submission/use-bot-detection-submission.ts | packages/infrastructure/src/bot-detection/bot-detection-contract.ts | import | no | no | lateral | present |
| E645 | packages/infrastructure/src/bot-detection/submission/use-bot-detection-submission.ts | packages/infrastructure/src/bot-detection/submission/bot-detection-flow.ts | import | no | no | lateral | present |
| E646 | packages/infrastructure/src/bot-detection/submission/use-bot-detection-submission.ts | packages/infrastructure/src/bot-detection/submission/bot-detection-widget.tsx | import | no | no | lateral | present |
| E637 | packages/infrastructure/src/bot-detection/turnstile/turnstile-bot-verifier.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | removed in a79f507d |
| E1023 | packages/infrastructure/src/bot-detection/turnstile/turnstile-bot-verifier.server.ts | packages/infrastructure/src/bot-detection/verifier/bot-verifier-contract.server.ts | import | no | no | lateral | present |
| E982 | packages/infrastructure/src/bot-detection/turnstile/turnstile-client.ts | external:react | import | n/a | yes | outward | present |
| E639 | packages/infrastructure/src/bot-detection/turnstile/turnstile-client.ts | packages/infrastructure/src/bot-detection/bot-detection-contract.ts | import | no | no | lateral | present |
| E640 | packages/infrastructure/src/bot-detection/turnstile/turnstile-widget.tsx | packages/infrastructure/src/bot-detection/bot-detection-contract.ts | import | no | no | lateral | present |
| E642 | packages/infrastructure/src/bot-detection/turnstile/turnstile-widget.tsx | packages/infrastructure/src/bot-detection/turnstile/turnstile-client.ts | import | no | no | lateral | present |
| E626 | packages/infrastructure/src/bot-detection/verifier/bot-verifier.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | removed in a79f507d |
| E1022 | packages/infrastructure/src/bot-detection/verifier/bot-verifier.server.ts | packages/infrastructure/src/bot-detection/verifier/bot-verifier-contract.server.ts | import | no | no | lateral | present |
| E627 | packages/infrastructure/src/bot-detection/verifier/create-bot-verifier.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E628 | packages/infrastructure/src/bot-detection/verifier/create-bot-verifier.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | removed in a79f507d |
| E630 | packages/infrastructure/src/bot-detection/verifier/create-bot-verifier.server.ts | packages/infrastructure/src/bot-detection/turnstile/turnstile-bot-verifier.server.ts | import | no | no | lateral | present |
| E1024 | packages/infrastructure/src/bot-detection/verifier/create-bot-verifier.server.ts | packages/infrastructure/src/bot-detection/verifier/bot-verifier-contract.server.ts | import | no | no | lateral | present |
| E629 | packages/infrastructure/src/bot-detection/verifier/create-bot-verifier.server.ts | packages/infrastructure/src/bot-detection/verifier/bot-verifier.server.ts | import | no | no | lateral | present |
| E1455 | packages/infrastructure/src/coach-calendar/reservations/coach-time-reservations.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present; changed (GEN-192, path only): moved from `coach-calendar/coach-time-reservations.server.ts` into `reservations/` |
| E1456 | packages/infrastructure/src/coach-calendar/reservations/coach-time-reservations.server.ts | packages/infrastructure/src/coach-calendar/schema.server.ts | import | no | no | lateral | present; changed (GEN-192, path only): the shared `schema.server.ts` stays at the `coach-calendar/` root |
| E1457 | packages/infrastructure/src/coach-calendar/index.server.ts | packages/infrastructure/src/coach-calendar/reservations/coach-time-reservations.server.ts | import | no | no | lateral | present; changed (GEN-192, path only) |
| E1458 | packages/infrastructure/src/coach-calendar/index.server.ts | packages/infrastructure/src/coach-calendar/reservations/postgres-coach-calendar.server.ts | import | no | no | lateral | present; changed (GEN-192, path only) |
| E1459 | packages/infrastructure/src/coach-calendar/reservations/postgres-coach-calendar.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present; changed (GEN-192, path only): moved from `coach-calendar/postgres-coach-calendar.server.ts` into `reservations/` |
| E1460 | packages/infrastructure/src/coach-calendar/reservations/postgres-coach-calendar.server.ts | packages/domain/src/coach-availability/index.ts | import | yes | no | lateral | present; changed (GEN-192, path only) |
| E1461 | packages/infrastructure/src/coach-calendar/reservations/postgres-coach-calendar.server.ts | packages/infrastructure/src/coach-calendar/schema.server.ts | import | no | no | lateral | present; changed (GEN-192, path only): the shared `schema.server.ts` stays at the `coach-calendar/` root |
| E1549 | packages/infrastructure/src/coach-calendar/availability/postgres-coach-availability.server.ts | packages/db/src/index.ts | import | yes | no | lateral | new (GEN-192) |
| E1550 | packages/infrastructure/src/coach-calendar/availability/postgres-coach-availability.server.ts | packages/domain/src/coach-availability/index.ts | import | yes | no | lateral | new (GEN-192) |
| E1551 | packages/infrastructure/src/coach-calendar/availability/postgres-coach-availability.server.ts | packages/domain/src/shared/index.ts | import | yes | no | lateral | new (GEN-192): the C1 `Clock` port (Q19) |
| E1552 | packages/infrastructure/src/coach-calendar/availability/postgres-coach-availability.server.ts | packages/infrastructure/src/coach-calendar/schema.server.ts | import | no | no | lateral | new (GEN-192) |
| E1553 | packages/infrastructure/src/coach-calendar/index.server.ts | packages/infrastructure/src/coach-calendar/availability/postgres-coach-availability.server.ts | import | no | no | lateral | new (GEN-192) |
| E1554 | packages/infrastructure/src/coach-meeting-room/postgres-coach-meeting-room.server.ts | packages/db/src/index.ts | import | yes | no | lateral | new (GEN-192) |
| E1555 | packages/infrastructure/src/coach-meeting-room/postgres-coach-meeting-room.server.ts | packages/domain/src/coach-meeting-room/index.ts | import | yes | no | lateral | new (GEN-192) |
| E1556 | packages/infrastructure/src/coach-meeting-room/postgres-coach-meeting-room.server.ts | packages/domain/src/shared/index.ts | import | yes | no | lateral | new (GEN-192): the C1 `Clock` port (Q19) |
| E1557 | packages/infrastructure/src/coach-meeting-room/postgres-coach-meeting-room.server.ts | packages/infrastructure/src/coach-meeting-room/schema.server.ts | import | no | no | lateral | new (GEN-192) |
| E1558 | packages/infrastructure/src/coach-meeting-room/index.server.ts | packages/infrastructure/src/coach-meeting-room/postgres-coach-meeting-room.server.ts | import | no | no | lateral | new (GEN-192) |
| E1559 | packages/infrastructure/src/coach-meeting-room/schema.server.ts | packages/db/src/index.ts | import | yes | no | lateral | new (GEN-192) |
| E1462 | packages/infrastructure/src/coach-calendar/schema.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E983 | packages/infrastructure/src/email/create-product-email.server.ts | external:resend | import | n/a | yes | outward | present |
| E648 | packages/infrastructure/src/email/create-product-email.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E649 | packages/infrastructure/src/email/create-product-email.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | removed in a79f507d |
| E650 | packages/infrastructure/src/email/create-product-email.server.ts | packages/infrastructure/src/email/in-memory-product-email.server.ts | import | no | no | lateral | present |
| E1026 | packages/infrastructure/src/email/create-product-email.server.ts | packages/infrastructure/src/email/product-email-contract.server.ts | import | no | no | lateral | present |
| E651 | packages/infrastructure/src/email/create-product-email.server.ts | packages/infrastructure/src/email/resend-product-email.server.ts | import | no | no | lateral | present |
| E984 | packages/infrastructure/src/email/email-primitives.server.tsx | external:react | import | n/a | yes | outward | present |
| E653 | packages/infrastructure/src/email/in-memory-product-email.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | removed in a79f507d |
| E1027 | packages/infrastructure/src/email/in-memory-product-email.server.ts | packages/infrastructure/src/email/product-email-contract.server.ts | import | no | no | lateral | present |
| E985 | packages/infrastructure/src/email/resend-product-email.server.ts | external:resend | import | n/a | yes | outward | present |
| E658 | packages/infrastructure/src/email/resend-product-email.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | removed in a79f507d |
| E1028 | packages/infrastructure/src/email/resend-product-email.server.ts | packages/infrastructure/src/email/product-email-contract.server.ts | import | no | no | lateral | present |
| E659 | packages/infrastructure/src/feature-flags/index.server.ts | packages/infrastructure/src/feature-flags/repository.server.ts | import | no | no | lateral | present |
| E660 | packages/infrastructure/src/feature-flags/repository.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E986 | packages/infrastructure/src/feature-flags/repository.server.ts | packages/domain/src/feature-flag/index.ts | import | yes | no | lateral | present |
| E662 | packages/infrastructure/src/feature-flags/repository.server.ts | packages/infrastructure/src/feature-flags/schema.server.ts | import | no | no | lateral | present |
| E663 | packages/infrastructure/src/feature-flags/schema.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E664 | packages/infrastructure/src/http/index.server.ts | packages/infrastructure/src/http/http.server.ts | import | no | no | lateral | present |
| E987 | packages/infrastructure/src/management-auth/bearer-secret-authenticator.server.ts | external:crypto | import | n/a | yes | outward | present |
| E666 | packages/infrastructure/src/management-auth/bearer-secret-authenticator.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | removed in a79f507d |
| E1029 | packages/infrastructure/src/management-auth/bearer-secret-authenticator.server.ts | packages/infrastructure/src/management-auth/management-authenticator-contract.server.ts | import | no | no | lateral | present |
| E667 | packages/infrastructure/src/management-auth/create-management-authenticator.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E668 | packages/infrastructure/src/management-auth/create-management-authenticator.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | removed in a79f507d |
| E669 | packages/infrastructure/src/management-auth/create-management-authenticator.server.ts | packages/infrastructure/src/management-auth/bearer-secret-authenticator.server.ts | import | no | no | lateral | present |
| E670 | packages/infrastructure/src/management-auth/create-management-authenticator.server.ts | packages/infrastructure/src/management-auth/management-auth-config.server.ts | import | no | no | lateral | present |
| E1030 | packages/infrastructure/src/management-auth/create-management-authenticator.server.ts | packages/infrastructure/src/management-auth/management-authenticator-contract.server.ts | import | no | no | lateral | present |
| E671 | packages/infrastructure/src/management-auth/index.server.ts | packages/infrastructure/src/management-auth/create-management-authenticator.server.ts | import | no | no | lateral | present |
| E672 | packages/infrastructure/src/management-auth/index.server.ts | packages/infrastructure/src/management-auth/management-auth-config.server.ts | import | no | no | lateral | present |
| E673 | packages/infrastructure/src/management-auth/index.server.ts | packages/infrastructure/src/management-auth/management-authenticator-contract.server.ts | import | no | no | lateral | present |
| E674 | packages/infrastructure/src/management-auth/management-auth-config.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E675 | packages/infrastructure/src/management-auth/management-auth-config.server.ts | packages/infrastructure/src/management-auth/management-authenticator-contract.server.ts | import | no | no | lateral | present |
| E676 | packages/infrastructure/src/pwa/index.ts | packages/infrastructure/src/pwa/pwa-registration.ts | import | no | no | lateral | present |
| E677 | packages/infrastructure/src/pwa/index.ts | packages/infrastructure/src/pwa/pwa-surfaces.ts | import | no | no | lateral | present |
| E678 | packages/infrastructure/src/pwa/pwa-registration.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E679 | packages/infrastructure/src/pwa/pwa-registration.ts | packages/infrastructure/src/pwa/pwa-surfaces.ts | import | no | no | lateral | present |
| E1365 | packages/ui/src/calendar/calendar.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1367 | packages/ui/src/calendar/index.ts | packages/ui/src/calendar/calendar.tsx | import | no | no | lateral | present |
| E989 | packages/ui/src/filters/filter-chip-group.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E990 | packages/ui/src/filters/filter-chip-group.tsx | external:react | import | n/a | no | lateral | present |
| E683 | packages/ui/src/filters/filter-chip-group.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1510 | packages/ui/src/filters/filter-chip-group.tsx | packages/ui/src/primitives/chip.tsx | import | no | no | lateral | new (GEN-192): `chipVariants` — a deep import of the package-private `chip.tsx`, not the published `primitives/index.ts` barrel (`chipVariants` is deliberately not re-exported from it), permitted since `primitives/` sits below every other concern subpath |
| E684 | packages/ui/src/filters/index.ts | packages/ui/src/filters/filter-chip-group.tsx | import | no | no | lateral | present |
| E991 | packages/ui/src/layout/app-shell.tsx | external:react | import | n/a | no | lateral | present |
| E1413 | packages/ui/src/layout/dead-end-page.tsx | external:react | import | n/a | no | lateral | present |
| E1578 | packages/ui/src/layout/dead-end-page.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | added (coach follow-ups) |
| E1414 | packages/ui/src/layout/dead-end-page.tsx | packages/ui/src/primitives/index.ts | import | no | no | lateral | present |
| E686 | packages/ui/src/layout/index.ts | packages/ui/src/layout/app-shell.tsx | import | no | no | lateral | present |
| E1415 | packages/ui/src/layout/index.ts | packages/ui/src/layout/dead-end-page.tsx | import | no | no | lateral | present |
| E1201 | packages/ui/src/layout/index.ts | packages/ui/src/layout/navigation-dialog.tsx | import | no | no | lateral | present |
| E687 | packages/ui/src/layout/index.ts | packages/ui/src/layout/phone-frame.tsx | import | no | no | lateral | present |
| E688 | packages/ui/src/layout/index.ts | packages/ui/src/layout/portal-shell.tsx | import | no | no | lateral | present |
| E689 | packages/ui/src/layout/index.ts | packages/ui/src/layout/sidebar-surface-layout.tsx | import | no | no | lateral | present |
| E1202 | packages/ui/src/layout/index.ts | packages/ui/src/layout/use-close-mobile-navigation-on-desktop.ts | import | no | no | lateral | removed |
| E1203 | packages/ui/src/layout/navigation-dialog.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E1212 | packages/ui/src/layout/navigation-dialog.tsx | external:react | import | n/a | no | lateral | present |
| E1211 | packages/ui/src/layout/navigation-dialog.tsx | packages/ui/src/layout/use-close-mobile-navigation-on-desktop.ts | import | no | no | lateral | present |
| E1208 | packages/ui/src/layout/navigation-dialog.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1209 | packages/ui/src/layout/navigation-dialog.tsx | packages/ui/src/lib/constants.ts | import | no | no | lateral | present |
| E1210 | packages/ui/src/layout/navigation-dialog.tsx | packages/ui/src/primitives/icon-button.tsx | import | no | no | lateral | present |
| E992 | packages/ui/src/layout/phone-frame.tsx | external:react | import | n/a | no | lateral | present |
| E691 | packages/ui/src/layout/phone-frame.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E993 | packages/ui/src/layout/portal-shell.tsx | external:react | import | n/a | no | lateral | present |
| E1205 | packages/ui/src/layout/portal-shell.tsx | packages/ui/src/layout/navigation-dialog.tsx | import | no | no | lateral | present |
| E1206 | packages/ui/src/layout/portal-shell.tsx | packages/ui/src/layout/use-close-mobile-navigation-on-desktop.ts | import | no | no | lateral | removed |
| E693 | packages/ui/src/layout/portal-shell.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E694 | packages/ui/src/layout/portal-shell.tsx | packages/ui/src/lib/constants.ts | import | no | no | lateral | present |
| E695 | packages/ui/src/layout/portal-shell.tsx | packages/ui/src/lib/focus-trap.ts | import | no | no | lateral | removed |
| E696 | packages/ui/src/layout/portal-shell.tsx | packages/ui/src/primitives/icon-button.tsx | import | no | no | lateral | removed |
| E994 | packages/ui/src/layout/sidebar-surface-layout.tsx | external:react | import | n/a | no | lateral | present |
| E698 | packages/ui/src/layout/sidebar-surface-layout.tsx | packages/ui/src/lib/constants.ts | import | no | no | lateral | present |
| E699 | packages/ui/src/layout/sidebar-surface-layout.tsx | packages/ui/src/primitives/link.tsx | import | no | no | lateral | present |
| E1204 | packages/ui/src/layout/use-close-mobile-navigation-on-desktop.ts | external:react | import | n/a | no | lateral | present |
| E995 | packages/ui/src/lib/cn.ts | external:clsx | import | n/a | no | lateral | present |
| E701 | packages/ui/src/lib/index.ts | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E702 | packages/ui/src/lib/index.ts | packages/ui/src/lib/constants.ts | import | no | no | lateral | present |
| E703 | packages/ui/src/lib/index.ts | packages/ui/src/lib/use-search-params-writer.ts | import | no | no | lateral | present |
| E996 | packages/ui/src/lib/use-search-params-writer.ts | external:react | import | n/a | no | lateral | present |
| E705 | packages/ui/src/motion/index.ts | packages/ui/src/motion/motion.ts | import | no | no | lateral | present |
| E997 | packages/ui/src/motion/motion.ts | external:react | import | n/a | no | lateral | present |
| E707 | packages/ui/src/overlays/index.ts | packages/ui/src/overlays/sheet.tsx | import | no | no | lateral | present |
| E1560 | packages/ui/src/toast/index.ts | packages/ui/src/toast/toaster.tsx | import | no | no | lateral | new (GEN-192): moved from `overlays/toaster.tsx` to `toast/toaster.tsx` in the remediation round |
| E1561 | packages/ui/src/toast/toaster.tsx | external:sonner | import | n/a | no | lateral | new (GEN-192): moved from `overlays/toaster.tsx` in the remediation round |
| E1562 | packages/ui/src/toast/toaster.tsx | external:react | import | n/a | no | lateral | new (GEN-192): moved from `overlays/toaster.tsx` in the remediation round |
| E998 | packages/ui/src/overlays/sheet.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E999 | packages/ui/src/overlays/sheet.tsx | external:react | import | n/a | no | lateral | present |
| E710 | packages/ui/src/overlays/sheet.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1419 | packages/ui/src/primitives/alert.tsx | external:react | import | n/a | no | lateral | present |
| E1418 | packages/ui/src/primitives/alert.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1000 | packages/ui/src/primitives/button.tsx | external:class-variance-authority | import | n/a | no | lateral | present |
| E1001 | packages/ui/src/primitives/button.tsx | external:react | import | n/a | no | lateral | present |
| E713 | packages/ui/src/primitives/button.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1002 | packages/ui/src/primitives/card.tsx | external:class-variance-authority | import | n/a | no | lateral | present |
| E1003 | packages/ui/src/primitives/card.tsx | external:react | import | n/a | no | lateral | present |
| E716 | packages/ui/src/primitives/card.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1004 | packages/ui/src/primitives/checkbox.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E1005 | packages/ui/src/primitives/checkbox.tsx | external:react | import | n/a | no | lateral | present |
| E719 | packages/ui/src/primitives/checkbox.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1006 | packages/ui/src/primitives/icon-button.tsx | external:class-variance-authority | import | n/a | no | lateral | present |
| E1007 | packages/ui/src/primitives/icon-button.tsx | external:react | import | n/a | no | lateral | present |
| E722 | packages/ui/src/primitives/icon-button.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1417 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/alert.tsx | import | no | no | lateral | present |
| E723 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/button.tsx | import | no | no | lateral | present |
| E724 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/card.tsx | import | no | no | lateral | present |
| E725 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/checkbox.tsx | import | no | no | lateral | present |
| E1563 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/checkbox-chip.tsx | import | no | no | lateral | new (GEN-192) |
| E1564 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/select.tsx | import | no | no | lateral | new (GEN-192) |
| E1565 | packages/ui/src/primitives/checkbox-chip.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | new (GEN-192) |
| E1566 | packages/ui/src/primitives/checkbox-chip.tsx | packages/ui/src/primitives/chip.tsx | import | no | no | lateral | new (GEN-192) |
| E1567 | packages/ui/src/primitives/checkbox-chip.tsx | external:react | import | n/a | no | lateral | new (GEN-192) |
| E1568 | packages/ui/src/primitives/select.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | new (GEN-192) |
| E1569 | packages/ui/src/primitives/select.tsx | external:radix-ui | import | n/a | no | lateral | new (GEN-192) |
| E1570 | packages/ui/src/primitives/select.tsx | external:react | import | n/a | no | lateral | new (GEN-192) |
| E1571 | packages/ui/src/primitives/chip.tsx | external:class-variance-authority | import | n/a | no | lateral | new (GEN-192) |
| E726 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/icon-button.tsx | import | no | no | lateral | present |
| E727 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/input.tsx | import | no | no | lateral | present |
| E1405 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/label.tsx | import | no | no | lateral | present |
| E728 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/link.tsx | import | no | no | lateral | present |
| E729 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/section-eyebrow.tsx | import | no | no | lateral | present |
| E1378 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/textarea.tsx | import | no | no | lateral | present |
| E1009 | packages/ui/src/primitives/input.tsx | external:react | import | n/a | no | lateral | present |
| E732 | packages/ui/src/primitives/input.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1406 | packages/ui/src/primitives/label.tsx | external:react | import | n/a | no | lateral | present |
| E1407 | packages/ui/src/primitives/label.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1010 | packages/ui/src/primitives/link.tsx | external:class-variance-authority | import | n/a | no | lateral | present |
| E1011 | packages/ui/src/primitives/link.tsx | external:react | import | n/a | no | lateral | present |
| E735 | packages/ui/src/primitives/link.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1012 | packages/ui/src/primitives/section-eyebrow.tsx | external:class-variance-authority | import | n/a | no | lateral | present |
| E1013 | packages/ui/src/primitives/section-eyebrow.tsx | external:react | import | n/a | no | lateral | present |
| E1380 | packages/ui/src/primitives/textarea.tsx | external:react | import | n/a | no | lateral | present |
| E1381 | packages/ui/src/primitives/textarea.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1582 | packages/ui/src/appointments/appointment-card.tsx | external:lucide-react | import | n/a | no | lateral | new (GEN-197) |
| E1583 | packages/ui/src/calendar/calendar.tsx | external:lucide-react | import | n/a | no | lateral | new (GEN-197) |
| E1584 | packages/ui/src/calendar/date-field-trigger.tsx | external:lucide-react | import | n/a | no | lateral | new (GEN-197) |
| E1585 | packages/ui/src/layout/portal-shell.tsx | external:lucide-react | import | n/a | no | lateral | new (GEN-197) |
| E1586 | packages/ui/src/primitives/checkbox.tsx | external:lucide-react | import | n/a | no | lateral | new (GEN-197) |
| E1587 | packages/ui/src/primitives/pagination.tsx | external:lucide-react | import | n/a | no | lateral | new (GEN-197) |
| E1588 | packages/ui/src/primitives/select.tsx | external:lucide-react | import | n/a | no | lateral | new (GEN-197) |
| E1590 | apps/platform/src/server/container.server.ts | apps/platform/src/server/feature-flag-overrides/feature-flag-overrides-composition.server.ts | import + constructs | no | no | lateral | new (9747d171) |
| E1592 | apps/platform/src/server/feature-flag-overrides/feature-flag-overrides-composition.server.ts | apps/platform/src/server/feature-flag-overrides/feature-flag-override-reader.server.ts | import + constructs | no | no | lateral | new (9747d171) |
| E1593 | apps/platform/src/server/feature-flag-overrides/feature-flag-overrides-composition.server.ts | apps/platform/src/server/feature-flag-overrides/feature-flag-overrides-http.server.ts | import + constructs | no | no | lateral | new (9747d171) |
| E1594 | apps/platform/src/server/feature-flag-overrides/feature-flag-overrides-composition.server.ts | packages/domain/src/feature-flag/index.ts | signature (type-only, `FeatureFlagReader`) | yes | yes | inward | new (9747d171) |
| E1595 | apps/platform/src/server/feature-flag-overrides/feature-flag-overrides-composition.server.ts | external:react-router | signature (type-only, `MiddlewareFunction`) | n/a | no | lateral | new (9747d171) |
| E1596 | apps/platform/src/server/feature-flag-overrides/feature-flag-override-reader.server.ts | packages/domain/src/feature-flag/index.ts | implements + signature (type-only) | yes | yes | inward | new (9747d171) |
| E1597 | apps/platform/src/server/feature-flag-overrides/feature-flag-override-reader.server.ts | apps/platform/src/server/feature-flag-overrides/feature-flag-override-store.server.ts | import | no | no | lateral | new (9747d171) |
| E1598 | apps/platform/src/server/feature-flag-overrides/feature-flag-overrides-http.server.ts | apps/platform/src/server/feature-flag-overrides/feature-flag-override-store.server.ts | import | no | no | lateral | new (9747d171) |
| E1599 | apps/platform/src/server/feature-flag-overrides/feature-flag-overrides-http.server.ts | packages/config/src/index.ts | import (`normalizeBasePath`) | yes | no | lateral | new (9747d171) |
| E1600 | apps/platform/src/server/feature-flag-overrides/feature-flag-overrides-http.server.ts | packages/domain/src/feature-flag/index.ts | import (`WAITLIST_MODE_FEATURE_FLAG`; `FeatureFlagSet` type) | yes | yes | inward | new (9747d171) |
| E1601 | apps/platform/src/server/feature-flag-overrides/feature-flag-overrides-http.server.ts | external:react-router | signature (type-only, `MiddlewareFunction`) | n/a | no | lateral | new (9747d171) |
| E1602 | apps/platform/src/server/feature-flag-overrides/feature-flag-override-store.server.ts | external:node:async_hooks | import (`AsyncLocalStorage`, runtime) | n/a | no | lateral | new (9747d171) |
| E1603 | apps/platform/src/server/feature-flag-overrides/feature-flag-override-store.server.ts | packages/domain/src/feature-flag/index.ts | signature (type-only, `FeatureFlagSet`) | yes | yes | inward | new (9747d171) |
| E1640 | packages/config/src/concerns/feature-flags.ts | packages/config/src/concerns/app.ts | signature (type-only, `AppConfig`) | no | no | lateral | new (9747d171) |
| E1641 | packages/config/src/runtime-environment.ts | packages/config/src/concerns/feature-flags.ts | import | no | no | lateral | new (9747d171) |
| E1642 | packages/config/src/index.ts | packages/config/src/concerns/feature-flags.ts | import (re-export `resolveFeatureFlagOverridesMode`) | no | no | lateral | new (9747d171) |
| E1643 | packages/config/src/concerns/feature-flags.ts | external:zod | import | n/a | no | lateral | new (9747d171) |
| E1644 | packages/config/src/index.ts | packages/config/src/concerns/payments.ts | type-only import | no | no | lateral | present |
| E1645 | packages/config/src/concerns/payments.ts | packages/config/src/concerns/app.ts | import | no | no | lateral | present |
| E1646 | packages/config/src/concerns/payments.ts | external:zod | import | n/a | no | lateral | present |
| E1647 | packages/config/src/runtime-environment.ts | packages/config/src/concerns/payments.ts | import | no | no | lateral | present |
| E1648 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/popover.tsx | re-export | no | no | lateral | present |
| E1649 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/radio-group.tsx | re-export | no | no | lateral | present |
| E1650 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/search-field.tsx | re-export | no | no | lateral | present |
| E1651 | packages/ui/src/primitives/radio-group.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1652 | packages/ui/src/primitives/radio-group.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1653 | packages/ui/src/primitives/radio-group.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E1654 | packages/ui/src/primitives/radio-group.tsx | external:react | import | n/a | no | lateral | present |
| E1655 | packages/ui/src/primitives/select.tsx | packages/ui/src/primitives/badge.tsx | import | no | no | lateral | present |
| E1656 | packages/ui/src/primitives/select.tsx | packages/ui/src/primitives/field-size.ts | import | no | no | lateral | present |
| E1657 | apps/platform/src/features/assessment-calls/contracts/visitor-profile.ts | apps/platform/src/features/assessment-calls/contracts/countries.ts | import | no | no | lateral | present |
| E1658 | apps/platform/src/features/assessment-calls/contracts/visitor-profile.ts | packages/domain/src/assessment-call/index.ts | type-only import | yes | yes | inward | present |
| E1659 | apps/platform/src/features/assessment-calls/contracts/visitor-profile.ts | external:zod | import | n/a | yes | outward | present |
| E1660 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/domain/src/payment-link/index.ts | type-only import | yes | yes | inward | present |
| E1661 | packages/domain/src/payment-link/index.ts | packages/domain/src/payment-link/assessment-call-reader.ts | type-only import | no | no | lateral | present |
| E1662 | packages/domain/src/payment-link/index.ts | packages/domain/src/payment-link/call-sales-states.ts | type-only import | no | no | lateral | present |
| E1663 | packages/domain/src/payment-link/index.ts | packages/domain/src/payment-link/coaching-sales-incidents.ts | type-only import | no | no | lateral | present |
| E1664 | packages/domain/src/payment-link/index.ts | packages/domain/src/payment-link/coaching-sales-notifications.ts | type-only import | no | no | lateral | present |
| E1665 | packages/domain/src/payment-link/index.ts | packages/domain/src/payment-link/coaching-sales-window.ts | re-export | no | no | lateral | present |
| E1666 | packages/domain/src/payment-link/index.ts | packages/domain/src/payment-link/payment-link.ts | re-export | no | no | lateral | present |
| E1667 | packages/domain/src/payment-link/index.ts | packages/domain/src/payment-link/payment-links.ts | type-only import | no | no | lateral | present |
| E1668 | packages/domain/src/payment-link/index.ts | packages/domain/src/payment-link/read-call-sales-states-use-case.ts | re-export | no | no | lateral | present |
| E1669 | packages/domain/src/payment-link/index.ts | packages/domain/src/payment-link/resolve-payment-link-use-case.ts | re-export | no | no | lateral | present |
| E1670 | packages/domain/src/payment-link/index.ts | packages/domain/src/payment-link/send-payment-link-use-case.ts | re-export | no | no | lateral | present |
| E2083 | packages/domain/src/payment-link/index.ts | packages/domain/src/payment-link/open-bundle-page-use-case.ts | re-export | no | no | lateral | present |
| E1671 | packages/domain/src/payment-link/assessment-call-reader.ts | packages/domain/src/assessment-call/index.ts | type-only import | no | no | lateral | present |
| E1672 | packages/domain/src/payment-link/coaching-sales-notifications.ts | packages/domain/src/assessment-call/index.ts | type-only import | no | no | lateral | present |
| E1673 | packages/domain/src/payment-link/coaching-sales-notifications.ts | packages/domain/src/coaching-bundle/index.ts | type-only import | no | no | lateral | present |
| E1677 | packages/domain/src/coaching-bundle/pricing-eligibility.ts | packages/domain/src/email-address/index.ts | type-only import | no | no | lateral | present |
| E1678 | packages/domain/src/coaching-bundle/pricing-eligibility.ts | packages/domain/src/coaching-bundle/coaching-bundle.ts | type-only import | no | no | lateral | present |
| E1679 | packages/domain/src/coaching-bundle/read-pricing-tiers-use-case.ts | packages/domain/src/email-address/index.ts | type-only import | no | no | lateral | present |
| E1680 | packages/domain/src/coaching-bundle/read-pricing-tiers-use-case.ts | packages/domain/src/coaching-bundle/coaching-bundle.ts | type-only import | no | no | lateral | present |
| E1681 | packages/domain/src/coaching-bundle/read-pricing-tiers-use-case.ts | packages/domain/src/coaching-bundle/pricing-eligibility.ts | type-only import | no | no | lateral | present |
| E1682 | packages/domain/src/payment-link/coaching-sales-window.ts | packages/domain/src/feature-flag/index.ts | import | no | no | lateral | present |
| E1683 | packages/domain/src/payment-link/coaching-sales-window.ts | packages/domain/src/payment-link/coaching-sales-incidents.ts | type-only import | no | no | lateral | present |
| E1684 | packages/domain/src/payment-link/payment-links.ts | packages/domain/src/payment-link/payment-link.ts | type-only import | no | no | lateral | present |
| E1685 | packages/domain/src/payment-link/read-call-sales-states-use-case.ts | packages/domain/src/payment-link/call-sales-states.ts | type-only import | no | no | lateral | present |
| E1686 | packages/domain/src/payment-link/resolve-payment-link-use-case.ts | packages/domain/src/assessment-call/index.ts | type-only import | no | no | lateral | present |
| E1687 | packages/domain/src/payment-link/resolve-payment-link-use-case.ts | packages/domain/src/coaching-bundle/index.ts | type-only import | no | no | lateral | present |
| E1688 | packages/domain/src/payment-link/resolve-payment-link-use-case.ts | packages/domain/src/email-address/index.ts | import | no | no | lateral | present |
| E1689 | packages/domain/src/payment-link/resolve-payment-link-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E1690 | packages/domain/src/payment-link/resolve-payment-link-use-case.ts | packages/domain/src/payment-link/assessment-call-reader.ts | type-only import | no | no | lateral | present |
| E1691 | packages/domain/src/payment-link/resolve-payment-link-use-case.ts | packages/domain/src/payment-link/call-sales-states.ts | type-only import | no | no | lateral | present |
| E1692 | packages/domain/src/payment-link/resolve-payment-link-use-case.ts | packages/domain/src/payment-link/coaching-sales-window.ts | type-only import | no | no | lateral | present |
| E1693 | packages/domain/src/payment-link/resolve-payment-link-use-case.ts | packages/domain/src/payment-link/payment-link.ts | import | no | no | lateral | present |
| E1694 | packages/domain/src/payment-link/resolve-payment-link-use-case.ts | packages/domain/src/payment-link/payment-links.ts | type-only import | no | no | lateral | present |
| E1695 | packages/domain/src/payment-link/send-payment-link-use-case.ts | packages/domain/src/assessment-call/index.ts | import | no | no | lateral | present |
| E1696 | packages/domain/src/payment-link/send-payment-link-use-case.ts | packages/domain/src/coaching-bundle/index.ts | type-only import | no | no | lateral | present |
| E1697 | packages/domain/src/payment-link/send-payment-link-use-case.ts | packages/domain/src/email-address/index.ts | import | no | no | lateral | present |
| E1698 | packages/domain/src/payment-link/send-payment-link-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E1699 | packages/domain/src/payment-link/send-payment-link-use-case.ts | packages/domain/src/payment-link/assessment-call-reader.ts | type-only import | no | no | lateral | present |
| E1700 | packages/domain/src/payment-link/send-payment-link-use-case.ts | packages/domain/src/payment-link/call-sales-states.ts | type-only import | no | no | lateral | present |
| E1701 | packages/domain/src/payment-link/send-payment-link-use-case.ts | packages/domain/src/payment-link/coaching-sales-incidents.ts | type-only import | no | no | lateral | present |
| E1702 | packages/domain/src/payment-link/send-payment-link-use-case.ts | packages/domain/src/payment-link/coaching-sales-notifications.ts | type-only import | no | no | lateral | present |
| E1703 | packages/domain/src/payment-link/send-payment-link-use-case.ts | packages/domain/src/payment-link/coaching-sales-window.ts | type-only import | no | no | lateral | present |
| E1704 | packages/domain/src/payment-link/send-payment-link-use-case.ts | packages/domain/src/payment-link/payment-link.ts | import | no | no | lateral | present |
| E1705 | packages/domain/src/payment-link/send-payment-link-use-case.ts | packages/domain/src/payment-link/payment-links.ts | type-only import | no | no | lateral | present |
| E2084 | packages/domain/src/payment-link/open-bundle-page-use-case.ts | packages/domain/src/payment-link/coaching-sales-window.ts | type-only import | no | no | lateral | present |
| E1706 | apps/platform/src/features/assessment-calls/ui/coach/assessment-call-listing.ts | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | no | yes | inward | present |
| E1707 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/sort-control.tsx | import | no | no | lateral | present |
| E1708 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/use-call-listing-params.ts | import | no | no | lateral | present |
| E1709 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E1710 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | apps/platform/src/features/assessment-calls/contracts/countries.ts | import | no | yes | inward | present |
| E1711 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | apps/platform/src/features/assessment-calls/contracts/visitor-profile.ts | import | no | yes | inward | present |
| E1712 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1713 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | external:react | type-only import | n/a | no | lateral | present |
| E1714 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/use-call-listing-params.ts | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | no | yes | inward | present |
| E1715 | apps/platform/src/features/coaching-sales/api/coach/coach-sales-controller.server.ts | packages/domain/src/coaching-bundle/index.ts | type-only import | yes | yes | inward | present |
| E1716 | apps/platform/src/features/coaching-sales/api/coach/coach-sales-controller.server.ts | packages/domain/src/email-address/index.ts | import | yes | yes | inward | present |
| E1717 | apps/platform/src/features/coaching-sales/api/coach/coach-sales-controller.server.ts | packages/domain/src/payment-link/index.ts | type-only import | yes | yes | inward | present |
| E1718 | apps/platform/src/features/coaching-sales/api/coach/coach-sales-controller.server.ts | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | import | no | no | lateral | present |
| E1725 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/checkout-sessions.ts | type-only import | no | no | lateral | present |
| E1726 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/coaching-purchases.ts | type-only import | no | no | lateral | present |
| E1727 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/coaching-subscription.ts | re-export | no | no | lateral | present |
| E1728 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/payment-checkout.ts | type-only import | no | no | lateral | present |
| E1729 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/read-checkout-confirmation-use-case.ts | re-export | no | no | lateral | present |
| E1730 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/record-checkout-completed-use-case.ts | re-export | no | no | lateral | present |
| E1731 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/start-checkout-use-case.ts | re-export | no | no | lateral | present |
| E1732 | packages/domain/src/coaching-subscription/checkout-sessions.ts | packages/domain/src/coaching-bundle/index.ts | type-only import | no | no | lateral | present |
| E1733 | packages/domain/src/coaching-subscription/checkout-sessions.ts | packages/domain/src/coaching-subscription/coaching-subscription.ts | type-only import | no | no | lateral | present |
| E1734 | packages/domain/src/coaching-subscription/coaching-subscription.ts | packages/domain/src/coaching-bundle/index.ts | import | no | no | lateral | present |
| E1735 | packages/domain/src/coaching-subscription/coaching-purchases.ts | packages/domain/src/client/index.ts | type-only import | no | no | lateral | present |
| E1736 | packages/domain/src/coaching-subscription/coaching-purchases.ts | packages/domain/src/coaching-subscription/coaching-subscription.ts | type-only import | no | no | lateral | present |
| E1737 | packages/domain/src/client/index.ts | packages/domain/src/client/client.ts | re-export | no | no | lateral | present |
| E1738 | packages/domain/src/client/client.ts | packages/domain/src/assessment-call/index.ts | type-only import | no | no | lateral | present |
| E1739 | packages/domain/src/coaching-subscription/payment-checkout.ts | packages/domain/src/coaching-bundle/index.ts | type-only import | no | no | lateral | present |
| E1740 | packages/domain/src/coaching-subscription/payment-checkout.ts | packages/domain/src/coaching-subscription/coaching-subscription.ts | type-only import | no | no | lateral | present |
| E1741 | packages/domain/src/coaching-subscription/read-checkout-confirmation-use-case.ts | packages/domain/src/coaching-bundle/index.ts | type-only import | no | no | lateral | present |
| E1742 | packages/domain/src/coaching-subscription/read-checkout-confirmation-use-case.ts | packages/domain/src/payment-link/index.ts | type-only import | no | no | lateral | present |
| E1743 | packages/domain/src/coaching-subscription/read-checkout-confirmation-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscription.ts | import | no | no | lateral | present |
| E1744 | packages/domain/src/coaching-subscription/read-checkout-confirmation-use-case.ts | packages/domain/src/coaching-subscription/payment-checkout.ts | type-only import | no | no | lateral | present |
| E1745 | packages/domain/src/coaching-subscription/record-checkout-completed-use-case.ts | packages/domain/src/client/index.ts | import | no | no | lateral | present |
| E1746 | packages/domain/src/coaching-subscription/record-checkout-completed-use-case.ts | packages/domain/src/payment-link/index.ts | type-only import | no | no | lateral | present |
| E1747 | packages/domain/src/coaching-subscription/record-checkout-completed-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E1748 | packages/domain/src/coaching-subscription/record-checkout-completed-use-case.ts | packages/domain/src/coaching-subscription/coaching-purchases.ts | type-only import | no | no | lateral | present |
| E1749 | packages/domain/src/coaching-subscription/record-checkout-completed-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscription.ts | import | no | no | lateral | present |
| E1758 | apps/platform/src/features/coaching-sales/api/coach/payment-links-controller.server.ts | packages/domain/src/payment-link/index.ts | type-only import | yes | yes | inward | present |
| E1759 | apps/platform/src/features/coaching-sales/api/coach/payment-links-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-account.server.ts | import | yes | yes | outward | present |
| E1760 | apps/platform/src/features/coaching-sales/api/coach/payment-links-controller.server.ts | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | import | no | no | lateral | present |
| E1761 | apps/platform/src/features/coaching-sales/api/coach/payment-links.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E1762 | apps/platform/src/features/coaching-sales/api/coach/payment-links.ts | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E1763 | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | type-only import | no | yes | inward | present |
| E1780 | packages/infrastructure/src/payments/index.server.ts | packages/infrastructure/src/payments/checkout-session-completion.server.ts | type-only import | no | no | lateral | present |
| E1781 | packages/infrastructure/src/payments/index.server.ts | packages/infrastructure/src/payments/coaching-checkout-completion.server.ts | re-export | no | no | lateral | present |
| E1782 | packages/infrastructure/src/payments/index.server.ts | packages/infrastructure/src/payments/create-payment-checkout.server.ts | re-export | no | no | lateral | present |
| E1783 | packages/infrastructure/src/payments/index.server.ts | packages/infrastructure/src/payments/create-payment-events.server.ts | re-export | no | no | lateral | present |
| E1784 | packages/infrastructure/src/payments/index.server.ts | packages/infrastructure/src/payments/payment-completion-handler.server.ts | re-export | no | no | lateral | present |
| E1785 | packages/infrastructure/src/payments/index.server.ts | packages/infrastructure/src/payments/payment-event-ledger.server.ts | re-export | no | no | lateral | present |
| E1786 | packages/infrastructure/src/payments/index.server.ts | packages/infrastructure/src/payments/payment-events.server.ts | type-only import | no | no | lateral | present |
| E1787 | packages/infrastructure/src/payments/index.server.ts | packages/infrastructure/src/payments/payment-webhook-incidents.server.ts | type-only import | no | no | lateral | present |
| E1788 | packages/infrastructure/src/payments/checkout-session-completion.server.ts | external:zod | import | n/a | yes | outward | present |
| E1794 | packages/infrastructure/src/payments/payment-completion-handler.server.ts | packages/infrastructure/src/payments/checkout-session-completion.server.ts | type-only import | no | no | lateral | present |
| E1795 | packages/infrastructure/src/payments/create-payment-checkout.server.ts | packages/infrastructure/src/payments/memory/in-memory-payment-checkout.server.ts | import | no | no | lateral | present |
| E1796 | packages/infrastructure/src/payments/create-payment-checkout.server.ts | packages/infrastructure/src/payments/stripe/stripe-client.server.ts | import | no | no | lateral | present |
| E1797 | packages/infrastructure/src/payments/create-payment-checkout.server.ts | packages/infrastructure/src/payments/stripe/stripe-payment-checkout.server.ts | import | no | no | lateral | present |
| E1798 | packages/infrastructure/src/payments/create-payment-checkout.server.ts | packages/config/src/index.ts | type-only import | yes | yes | outward | present |
| E1799 | packages/infrastructure/src/payments/create-payment-checkout.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | yes | inward | present |
| E1800 | packages/infrastructure/src/payments/memory/in-memory-payment-checkout.server.ts | packages/infrastructure/src/payments/coaching-checkout-completion.server.ts | import | no | no | lateral | present |
| E1801 | packages/infrastructure/src/payments/memory/in-memory-payment-checkout.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | yes | inward | present |
| E1802 | packages/infrastructure/src/payments/memory/in-memory-payment-checkout.server.ts | external:node:crypto | import | n/a | yes | outward | present |
| E1803 | packages/infrastructure/src/payments/stripe/stripe-client.server.ts | packages/config/src/index.ts | type-only import | yes | yes | outward | present |
| E1804 | packages/infrastructure/src/payments/stripe/stripe-client.server.ts | external:stripe | import | n/a | yes | outward | present |
| E1805 | packages/infrastructure/src/payments/stripe/stripe-payment-checkout.server.ts | packages/infrastructure/src/payments/checkout-session-completion.server.ts | import | no | no | lateral | present |
| E1806 | packages/infrastructure/src/payments/stripe/stripe-payment-checkout.server.ts | packages/infrastructure/src/payments/coaching-checkout-completion.server.ts | import | no | no | lateral | present |
| E1807 | packages/infrastructure/src/payments/stripe/stripe-payment-checkout.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | yes | inward | present |
| E1808 | packages/infrastructure/src/payments/stripe/stripe-payment-checkout.server.ts | external:stripe | import | n/a | yes | outward | present |
| E1809 | packages/infrastructure/src/payments/stripe/stripe-payment-checkout.server.ts | external:zod | import | n/a | yes | outward | present |
| E1810 | packages/infrastructure/src/payments/create-payment-events.server.ts | packages/infrastructure/src/payments/memory/in-memory-payment-events.server.ts | import | no | no | lateral | present |
| E1811 | packages/infrastructure/src/payments/create-payment-events.server.ts | packages/infrastructure/src/payments/payment-events.server.ts | type-only import | no | no | lateral | present |
| E1812 | packages/infrastructure/src/payments/create-payment-events.server.ts | packages/infrastructure/src/payments/stripe/stripe-payment-events.server.ts | import | no | no | lateral | present |
| E1813 | packages/infrastructure/src/payments/create-payment-events.server.ts | packages/config/src/index.ts | type-only import | yes | yes | outward | present |
| E1816 | packages/infrastructure/src/payments/payment-events.server.ts | packages/infrastructure/src/payments/payment-event-verdict.server.ts | type-only import | no | no | lateral | present |
| E1817 | packages/infrastructure/src/payments/payment-event-verdict.server.ts | packages/infrastructure/src/payments/checkout-session-completion.server.ts | import | no | no | lateral | present |
| E1818 | packages/infrastructure/src/payments/payment-event-verdict.server.ts | external:zod | import | n/a | yes | outward | present |
| E1819 | packages/infrastructure/src/payments/stripe/stripe-payment-events.server.ts | packages/infrastructure/src/payments/payment-event-verdict.server.ts | import | no | no | lateral | present |
| E1820 | packages/infrastructure/src/payments/stripe/stripe-payment-events.server.ts | packages/infrastructure/src/payments/payment-events.server.ts | type-only import | no | no | lateral | present |
| E1821 | packages/infrastructure/src/payments/stripe/stripe-payment-events.server.ts | packages/config/src/index.ts | type-only import | yes | yes | outward | present |
| E1822 | packages/infrastructure/src/payments/stripe/stripe-payment-events.server.ts | external:stripe | import | n/a | yes | outward | present |
| E1823 | packages/infrastructure/src/payments/payment-event-ledger.server.ts | packages/infrastructure/src/payments/payment-events-schema.server.ts | import | no | yes | outward | present |
| E1824 | packages/infrastructure/src/payments/payment-event-ledger.server.ts | packages/db/src/index.ts | type-only import | yes | yes | outward | present |
| E1825 | packages/infrastructure/src/payments/payment-events-schema.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E1826 | apps/platform/src/features/coaching-sales/api/payments/coaching-purchase-completion-handler.server.ts | packages/domain/src/coaching-subscription/index.ts | import | yes | yes | inward | present |
| E1827 | apps/platform/src/features/coaching-sales/api/payments/coaching-purchase-completion-handler.server.ts | packages/domain/src/payment-link/index.ts | type-only import | yes | yes | inward | present |
| E1828 | apps/platform/src/features/coaching-sales/api/payments/coaching-purchase-completion-handler.server.ts | packages/infrastructure/src/payments/index.server.ts | import | yes | no | lateral | present |
| E1838 | apps/platform/src/features/coaching-sales/data/link-tokens/link-token.server.ts | packages/domain/src/payment-link/index.ts | type-only import | yes | yes | inward | present |
| E1839 | apps/platform/src/features/coaching-sales/data/link-tokens/link-token.server.ts | external:node:crypto | import | n/a | yes | outward | present |
| E1840 | apps/platform/src/features/coaching-sales/data/payment-links/payment-links-repository.server.ts | packages/db/src/index.ts | type-only import | yes | yes | outward | present |
| E1841 | apps/platform/src/features/coaching-sales/data/payment-links/payment-links-repository.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | yes | inward | present |
| E1842 | apps/platform/src/features/coaching-sales/data/payment-links/payment-links-repository.server.ts | packages/domain/src/payment-link/index.ts | import | yes | yes | inward | present |
| E1843 | apps/platform/src/features/coaching-sales/data/payment-links/payment-links-repository.server.ts | packages/domain/src/shared/index.ts | type-only import | yes | yes | inward | present |
| E1844 | apps/platform/src/features/coaching-sales/data/payment-links/payment-links-repository.server.ts | apps/platform/src/features/coaching-sales/data/schema.server.ts | import | no | yes | outward | present |
| E1851 | apps/platform/src/features/coaching-sales/data/purchases/purchases-repository.server.ts | packages/db/src/index.ts | import | yes | yes | outward | present |
| E1852 | apps/platform/src/features/coaching-sales/data/purchases/purchases-repository.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | yes | inward | present |
| E1853 | apps/platform/src/features/coaching-sales/data/purchases/purchases-repository.server.ts | packages/domain/src/payment-link/index.ts | type-only import | yes | yes | inward | present |
| E1854 | apps/platform/src/features/coaching-sales/data/purchases/purchases-repository.server.ts | packages/domain/src/shared/index.ts | type-only import | yes | yes | inward | present |
| E1855 | apps/platform/src/features/coaching-sales/data/purchases/purchases-repository.server.ts | packages/infrastructure/src/payments/index.server.ts | import | yes | no | lateral | present |
| E1856 | apps/platform/src/features/coaching-sales/data/purchases/purchases-repository.server.ts | apps/platform/src/features/coaching-sales/data/schema.server.ts | import | no | yes | outward | present |
| E1857 | apps/platform/src/features/coaching-sales/email/create-coaching-sales-notifications.server.ts | apps/platform/src/features/coaching-sales/email/email-coaching-sales-notifications.server.ts | import | no | no | lateral | present |
| E1858 | apps/platform/src/features/coaching-sales/email/create-coaching-sales-notifications.server.ts | packages/domain/src/payment-link/index.ts | type-only import | yes | yes | inward | present |
| E1859 | apps/platform/src/features/coaching-sales/email/create-coaching-sales-notifications.server.ts | packages/infrastructure/src/email/index.server.ts | type-only import | yes | no | lateral | present |
| E1860 | apps/platform/src/features/coaching-sales/email/email-coaching-sales-notifications.server.ts | apps/platform/src/features/coaching-sales/email/payment-link-email.server.ts | import | no | no | lateral | present |
| E1861 | apps/platform/src/features/coaching-sales/email/email-coaching-sales-notifications.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E1862 | apps/platform/src/features/coaching-sales/email/email-coaching-sales-notifications.server.ts | packages/domain/src/payment-link/index.ts | type-only import | yes | yes | inward | present |
| E1863 | apps/platform/src/features/coaching-sales/email/email-coaching-sales-notifications.server.ts | packages/domain/src/shared/index.ts | type-only import | yes | yes | inward | present |
| E1864 | apps/platform/src/features/coaching-sales/email/email-coaching-sales-notifications.server.ts | packages/infrastructure/src/email/index.server.ts | type-only import | yes | no | lateral | present |
| E1865 | apps/platform/src/features/coaching-sales/email/email-coaching-sales-notifications.server.ts | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | no | lateral | present |
| E1874 | apps/platform/src/features/coaching-sales/api/public/checkouts.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E1875 | apps/platform/src/features/coaching-sales/api/public/checkouts.ts | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E1877 | apps/platform/src/features/coaching-sales/ui/coach/call-sales-state-badge.tsx | apps/platform/src/features/coaching-sales/ui/coach/call-sales-state-labels.ts | import | no | no | lateral | present |
| E1878 | apps/platform/src/features/coaching-sales/ui/coach/call-sales-state-badge.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1879 | apps/platform/src/features/coaching-sales/ui/coach/call-sales-state-badge.tsx | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | type-only import | no | yes | inward | present |
| E1880 | apps/platform/src/features/coaching-sales/ui/coach/call-sales-state-labels.ts | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | type-only import | no | yes | inward | present |
| E1890 | packages/ui/src/overlays/index.ts | packages/ui/src/overlays/confirm-dialog.tsx | re-export | no | no | lateral | present |
| E1891 | packages/ui/src/overlays/confirm-dialog.tsx | packages/ui/src/primitives/button.tsx | import | no | no | lateral | present |
| E1892 | packages/ui/src/overlays/confirm-dialog.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1893 | packages/ui/src/overlays/confirm-dialog.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E1894 | packages/ui/src/overlays/confirm-dialog.tsx | external:react | import | n/a | no | lateral | present |
| E1895 | apps/platform/src/features/coaching-sales/ui/coach/pricing-tier-label.ts | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | type-only import | no | yes | inward | present |
| E1896 | apps/platform/src/features/coaching-sales/ui/coach/sales-status-filter.tsx | apps/platform/src/features/coaching-sales/ui/coach/call-sales-state-labels.ts | import | no | no | lateral | present |
| E1897 | apps/platform/src/features/coaching-sales/ui/coach/sales-status-filter.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1898 | apps/platform/src/features/coaching-sales/ui/coach/sales-status-filter.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1899 | apps/platform/src/features/coaching-sales/ui/coach/sales-status-filter.tsx | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | yes | yes | inward | present |
| E1900 | apps/platform/src/features/coaching-sales/ui/coach/sales-status-filter.tsx | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | import | no | yes | inward | present |
| E1901 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-benefits.tsx | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/benefits.ts | import | no | no | lateral | present |
| E1902 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-benefits.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1903 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-benefits.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E1904 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-benefits.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1905 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-benefits.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1906 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-card.tsx | packages/domain/src/coaching-bundle/index.ts | type-only import | yes | yes | inward | present |
| E1907 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-card.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1908 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-card.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E1909 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-card.tsx | apps/platform/src/features/coaching-sales/contracts/bundle-cards.ts | import | no | yes | inward | present |
| E1910 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-card.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1911 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-card.tsx | external:react | import | n/a | no | lateral | present |
| E1912 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-selector.tsx | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-benefits.tsx | import | no | no | lateral | present |
| E1913 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-selector.tsx | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-card.tsx | import | no | no | lateral | present |
| E1914 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-selector.tsx | packages/domain/src/coaching-bundle/index.ts | type-only import | yes | yes | inward | present |
| E1915 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-selector.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1916 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-selector.tsx | apps/platform/src/features/coaching-sales/contracts/bundle-cards.ts | type-only import | no | yes | inward | present |
| E1917 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-selector.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1918 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-selector.tsx | external:react | import | n/a | no | lateral | present |
| E1919 | apps/platform/src/features/coaching-sales/ui/public/calendar-day-format.ts | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1920 | apps/platform/src/features/coaching-sales/ui/public/call-first-banner.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1921 | apps/platform/src/features/coaching-sales/ui/public/call-first-banner.tsx | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | yes | yes | inward | present |
| E1922 | apps/platform/src/features/coaching-sales/ui/public/call-first-banner.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1923 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/checkout-complete-page.tsx | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/confirmation-copy.ts | import | no | no | lateral | present |
| E1924 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/checkout-complete-page.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1925 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/checkout-complete-page.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1926 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/checkout-complete-page.tsx | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | type-only import | no | yes | inward | present |
| E1927 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/checkout-complete-page.tsx | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E1928 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/checkout-complete-page.tsx | apps/platform/src/features/coaching-sales/ui/public/calendar-day-format.ts | import | no | no | lateral | present |
| E1929 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/checkout-complete-page.tsx | apps/platform/src/features/coaching-sales/ui/public/call-first-banner.tsx | import | no | no | lateral | present |
| E1930 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/checkout-complete-page.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1931 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/confirmation-copy.ts | apps/platform/src/features/coaching-sales/ui/public/calendar-day-format.ts | import | no | no | lateral | present |
| E1945 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice.tsx | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice-copy.ts | import | no | no | lateral | present |
| E1946 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1947 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice.tsx | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | import | no | yes | inward | present |
| E1948 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice.tsx | apps/platform/src/features/coaching-sales/ui/public/calendar-day-format.ts | import | no | no | lateral | present |
| E1949 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1950 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice.tsx | external:react | import | n/a | no | lateral | present |
| E1951 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | packages/domain/src/coaching-bundle/index.ts | type-only import | yes | yes | inward | present |
| E1952 | apps/platform/src/features/waitlist/data/repository.server.ts | packages/domain/src/coaching-bundle/index.ts | type-only import | yes | yes | inward | present |
| E1953 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email.server.ts | external:react-dom | import | n/a | yes | outward | present |
| E1954 | apps/platform/src/server/container.server.ts | packages/infrastructure/src/payments/index.server.ts | import | yes | no | lateral | present |
| E1955 | apps/platform/src/server/container.server.ts | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | import | yes | no | lateral | present |
| E1956 | apps/platform/src/server/logger.server.ts | packages/domain/src/payment-link/index.ts | type-only import | yes | yes | inward | present |
| E1957 | apps/platform/src/server/logger.server.ts | packages/infrastructure/src/payments/index.server.ts | type-only import | yes | no | lateral | present |
| E1958 | apps/platform/src/server/platform-composition.server.ts | packages/infrastructure/src/payments/index.server.ts | type-only import | yes | no | lateral | present |
| E1959 | apps/platform/src/server/platform-composition.server.ts | apps/platform/src/server/api/stripe-webhooks/stripe-webhook-controller.server.ts | import | no | no | lateral | present |
| E1960 | apps/platform/src/server/api/stripe-webhooks/stripe-webhook-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E1961 | apps/platform/src/server/api/stripe-webhooks/stripe-webhook-controller.server.ts | packages/infrastructure/src/payments/index.server.ts | import | yes | no | lateral | present |
| E1962 | apps/platform/src/server/feature-contexts.server.ts | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | yes | yes | outward | present |
| E1963 | apps/platform/src/routes.ts | apps/platform/src/features/coaching-sales/routes.ts | import | yes | no | lateral | present |
| E1964 | apps/platform/src/surfaces/coach-portal/routes.ts | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | yes | yes | inward | present |
| E1965 | apps/platform/src/surfaces/public-site/routes.ts | apps/platform/src/features/coaching-sales/routes.ts | import | yes | no | lateral | present |
| E1966 | apps/platform/src/server/api/stripe-webhooks/stripe-webhooks.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E1967 | apps/platform/src/server/api/stripe-webhooks/stripe-webhooks.ts | apps/platform/src/server/guards/platform-context.server.ts | import | no | no | lateral | present |
| E1981 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | yes | no | lateral | present |
| E1982 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-selector.tsx | import | yes | no | lateral | present |
| E1983 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/features/waitlist/server/guards/waitlist-context.server.ts | import | yes | no | lateral | present |
| E1984 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/features/waitlist/ui/shared/waitlist-presentation.ts | import | yes | no | lateral | present |
| E1985 | apps/platform/src/features/assessment-calls/contracts/visitor-profile.ts | external:zod | import | n/a | no | lateral | present |
| E1986 | apps/platform/src/features/assessment-calls/routes.ts | external:@react-router/dev | import | n/a | no | lateral | present |
| E1987 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1988 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | external:react | type-only import | n/a | no | lateral | present |
| E1989 | apps/platform/src/features/coaching-sales/api/coach/payment-links-controller.server.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E1990 | apps/platform/src/features/coaching-sales/api/coach/payment-links.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E1992 | apps/platform/src/features/coaching-sales/api/public/checkouts.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E1996 | apps/platform/src/features/coaching-sales/data/payment-links/payment-links-repository.server.ts | external:drizzle-orm | import | n/a | no | lateral | present |
| E1997 | apps/platform/src/features/coaching-sales/data/purchases/purchases-repository.server.ts | external:drizzle-orm | import | n/a | no | lateral | present |
| E2004 | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | external:react-router | import | n/a | no | lateral | present |
| E2008 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-benefits.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2009 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-benefits.tsx | external:motion/react | import | n/a | no | lateral | present |
| E2010 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-card.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2011 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-card.tsx | external:motion/react | import | n/a | no | lateral | present |
| E2012 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-card.tsx | external:react | import | n/a | no | lateral | present |
| E2013 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-selector.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2014 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-selector.tsx | external:motion/react | import | n/a | no | lateral | present |
| E2015 | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-selector.tsx | external:react | import | n/a | no | lateral | present |
| E2016 | apps/platform/src/features/coaching-sales/ui/public/call-first-banner.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2017 | apps/platform/src/features/coaching-sales/ui/public/call-first-banner.tsx | external:react-router | import | n/a | no | lateral | present |
| E2018 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/checkout-complete-page.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2019 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/checkout-complete-page.tsx | external:react-router | import | n/a | no | lateral | present |
| E2023 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2024 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice.tsx | external:react | import | n/a | no | lateral | present |
| E2025 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice.tsx | external:react-router | import | n/a | no | lateral | present |
| E2026 | apps/platform/src/features/waitlist/data/repository.server.ts | external:drizzle-orm | import | n/a | no | lateral | present |
| E2027 | apps/platform/src/routes.ts | external:@react-router/dev | type-only import | n/a | no | lateral | present |
| E2028 | apps/platform/src/server/api/routes.ts | external:@react-router/dev | import | n/a | no | lateral | present |
| E2029 | apps/platform/src/server/api/stripe-webhooks/stripe-webhooks.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2030 | apps/platform/src/server/feature-contexts.server.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2032 | apps/platform/src/surfaces/coach-portal/routes.ts | external:@react-router/dev | import | n/a | no | lateral | present |
| E2033 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | external:react-router | import | n/a | no | lateral | present |
| E2034 | apps/platform/src/surfaces/public-site/routes.ts | external:@react-router/dev | import | n/a | no | lateral | present |
| E2035 | packages/config/src/concerns/payments.ts | external:zod | import | n/a | no | lateral | present |
| E2036 | packages/infrastructure/src/payments/checkout-session-completion.server.ts | external:zod | import | n/a | no | lateral | present |
| E2038 | packages/infrastructure/src/payments/memory/in-memory-payment-checkout.server.ts | external:node:crypto | import | n/a | no | lateral | present |
| E2039 | packages/infrastructure/src/payments/payment-event-verdict.server.ts | external:zod | import | n/a | no | lateral | present |
| E2040 | packages/infrastructure/src/payments/payment-events-schema.server.ts | external:drizzle-orm/pg-core | import | n/a | no | lateral | present |
| E2041 | packages/infrastructure/src/payments/stripe/stripe-client.server.ts | external:stripe | import | n/a | no | lateral | present |
| E2042 | packages/infrastructure/src/payments/stripe/stripe-payment-checkout.server.ts | external:stripe | import | n/a | no | lateral | present |
| E2043 | packages/infrastructure/src/payments/stripe/stripe-payment-checkout.server.ts | external:zod | import | n/a | no | lateral | present |
| E2044 | packages/infrastructure/src/payments/stripe/stripe-payment-events.server.ts | external:stripe | import | n/a | no | lateral | present |
| E2045 | packages/ui/src/overlays/confirm-dialog.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2046 | packages/ui/src/overlays/confirm-dialog.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E2047 | packages/ui/src/overlays/confirm-dialog.tsx | external:react | import | n/a | no | lateral | present |
| E2048 | packages/ui/src/primitives/radio-group.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2049 | packages/ui/src/primitives/radio-group.tsx | external:react | import | n/a | no | lateral | present |
| E2050 | packages/ui/src/primitives/radio-group.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E134 | apps/platform/src/features/store/email/store-delivery-email-template.server.tsx | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
| E253 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email-template.server.tsx | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
| E654 | packages/infrastructure/src/email/index.server.ts | packages/infrastructure/src/email/create-product-email.server.ts | re-export | no | no | lateral | present |
| E655 | packages/infrastructure/src/email/index.server.ts | packages/infrastructure/src/email/email-primitives.server.tsx | re-export | no | no | lateral | present |
| E656 | packages/infrastructure/src/email/index.server.ts | packages/infrastructure/src/email/in-memory-product-email.server.ts | re-export | no | no | lateral | present |
| E797 | apps/platform/src/features/store/email/store-delivery-email-template.server.tsx | external:react | type-only import | n/a | yes | outward | present |
| E831 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email-template.server.tsx | external:react | type-only import | n/a | yes | outward | present |
| E1025 | packages/infrastructure/src/email/index.server.ts | packages/infrastructure/src/email/product-email-contract.server.ts | type-only import | no | no | lateral | present |
| E1237 | apps/platform/src/features/assessment-calls/email/assessment-call-email-styles.server.ts | external:react | type-only import | n/a | yes | outward | present |
| E1548 | packages/ui/src/appointments/index.ts | packages/ui/src/appointments/appointment-card.tsx | re-export | no | no | lateral | present |
| E1549 | packages/ui/src/appointments/index.ts | packages/ui/src/appointments/dashboard-appointment-row.tsx | re-export | no | no | lateral | present |
| E1674 | packages/domain/src/coaching-bundle/index.ts | packages/domain/src/coaching-bundle/coaching-bundle.ts | re-export | no | no | lateral | present |
| E1675 | packages/domain/src/coaching-bundle/index.ts | packages/domain/src/coaching-bundle/pricing-eligibility.ts | type-only import | no | no | lateral | present |
| E1676 | packages/domain/src/coaching-bundle/index.ts | packages/domain/src/coaching-bundle/read-pricing-tiers-use-case.ts | re-export | no | no | lateral | present |
| E1719 | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | apps/platform/src/features/coaching-sales/contracts/bundle-cards.ts | import | no | no | lateral | present |
| E1720 | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | packages/domain/src/coaching-subscription/index.ts | import | yes | yes | inward | present |
| E1721 | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | packages/domain/src/payment-link/index.ts | type-only import | yes | yes | inward | present |
| E1723 | apps/platform/src/features/coaching-sales/contracts/bundle-cards.ts | packages/domain/src/coaching-bundle/index.ts | import | yes | yes | inward | present |
| E1750 | packages/domain/src/coaching-subscription/start-checkout-use-case.ts | packages/domain/src/assessment-call/index.ts | type-only import | no | no | lateral | present |
| E1751 | packages/domain/src/coaching-subscription/start-checkout-use-case.ts | packages/domain/src/coaching-bundle/index.ts | import | no | no | lateral | present |
| E1752 | packages/domain/src/coaching-subscription/start-checkout-use-case.ts | packages/domain/src/email-address/index.ts | import | no | no | lateral | present |
| E1753 | packages/domain/src/coaching-subscription/start-checkout-use-case.ts | packages/domain/src/payment-link/index.ts | import | no | no | lateral | present |
| E1754 | packages/domain/src/coaching-subscription/start-checkout-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E1755 | packages/domain/src/coaching-subscription/start-checkout-use-case.ts | packages/domain/src/coaching-subscription/checkout-sessions.ts | type-only import | no | no | lateral | present |
| E1756 | packages/domain/src/coaching-subscription/start-checkout-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscription.ts | import | no | no | lateral | present |
| E1757 | packages/domain/src/coaching-subscription/start-checkout-use-case.ts | packages/domain/src/coaching-subscription/payment-checkout.ts | type-only import | no | no | lateral | present |
| E1764 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | packages/db/src/index.ts | type-only import | yes | yes | outward | present |
| E1765 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | packages/domain/src/coaching-bundle/index.ts | import | yes | yes | inward | present |
| E1766 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | packages/domain/src/coaching-subscription/index.ts | import | yes | yes | inward | present |
| E1767 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | packages/domain/src/feature-flag/index.ts | type-only import | yes | yes | inward | present |
| E1768 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | packages/domain/src/payment-link/index.ts | import | yes | yes | inward | present |
| E1769 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | packages/domain/src/shared/index.ts | type-only import | yes | yes | inward | present |
| E1770 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | packages/infrastructure/src/email/index.server.ts | type-only import | yes | no | lateral | present |
| E1771 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | packages/infrastructure/src/payments/index.server.ts | type-only import | yes | no | lateral | present |
| E1772 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/api/coach/coach-sales-controller.server.ts | import | no | no | lateral | present |
| E1773 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/api/coach/payment-links-controller.server.ts | import | no | no | lateral | present |
| E1774 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/api/payments/coaching-purchase-completion-handler.server.ts | import | no | no | lateral | present |
| E1775 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/api/public/checkouts-controller.server.ts | import | no | no | lateral | present |
| E1776 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/data/link-tokens/link-token.server.ts | import | no | no | lateral | present |
| E1777 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/data/payment-links/payment-links-repository.server.ts | import | no | no | lateral | present |
| E1778 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/data/purchases/purchases-repository.server.ts | import | no | no | lateral | present |
| E1779 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/email/create-coaching-sales-notifications.server.ts | import | no | no | lateral | present |
| E1789 | packages/infrastructure/src/payments/coaching-checkout-completion.server.ts | packages/infrastructure/src/payments/checkout-session-completion.server.ts | type-only import | no | no | lateral | present |
| E1790 | packages/infrastructure/src/payments/coaching-checkout-completion.server.ts | packages/infrastructure/src/payments/payment-completion-handler.server.ts | import | no | no | lateral | present |
| E1791 | packages/infrastructure/src/payments/coaching-checkout-completion.server.ts | packages/domain/src/coaching-bundle/index.ts | import | yes | yes | inward | present |
| E1792 | packages/infrastructure/src/payments/coaching-checkout-completion.server.ts | packages/domain/src/coaching-subscription/index.ts | import | yes | yes | inward | present |
| E1814 | packages/infrastructure/src/payments/memory/in-memory-payment-events.server.ts | packages/infrastructure/src/payments/payment-events.server.ts | type-only import | no | no | lateral | present |
| E1829 | apps/platform/src/features/coaching-sales/api/public/checkouts-controller.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E1830 | apps/platform/src/features/coaching-sales/api/public/checkouts-controller.server.ts | packages/domain/src/coaching-bundle/index.ts | import | yes | yes | inward | present |
| E1831 | apps/platform/src/features/coaching-sales/api/public/checkouts-controller.server.ts | packages/domain/src/coaching-subscription/index.ts | import | yes | yes | inward | present |
| E1832 | apps/platform/src/features/coaching-sales/api/public/checkouts-controller.server.ts | packages/domain/src/payment-link/index.ts | type-only import | yes | yes | inward | present |
| E1833 | apps/platform/src/features/coaching-sales/api/public/checkouts-controller.server.ts | packages/domain/src/shared/index.ts | type-only import | yes | yes | inward | present |
| E1834 | apps/platform/src/features/coaching-sales/api/public/checkouts-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E1835 | apps/platform/src/features/coaching-sales/api/public/checkouts-controller.server.ts | apps/platform/src/features/coaching-sales/contracts/bundle-cards.ts | import | no | no | lateral | present |
| E1836 | apps/platform/src/features/coaching-sales/api/public/checkouts-controller.server.ts | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | import | no | no | lateral | present |
| E1837 | apps/platform/src/features/coaching-sales/api/public/checkouts-controller.server.ts | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | no | lateral | present |
| E1845 | apps/platform/src/features/coaching-sales/data/schema.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E1846 | apps/platform/src/features/coaching-sales/data/schema.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | yes | inward | present |
| E1847 | apps/platform/src/features/coaching-sales/data/schema.server.ts | packages/domain/src/coaching-subscription/index.ts | import | yes | yes | inward | present |
| E1848 | apps/platform/src/features/coaching-sales/data/schema.server.ts | packages/domain/src/payment-link/index.ts | type-only import | yes | yes | inward | present |
| E1849 | apps/platform/src/features/coaching-sales/data/schema.server.ts | apps/platform/src/features/assessment-calls/data/schema.server.ts | import | yes | no | lateral | present |
| E1866 | apps/platform/src/features/coaching-sales/email/payment-link-email.server.ts | apps/platform/src/features/coaching-sales/email/payment-link-email-template.server.tsx | import | no | no | lateral | present |
| E1867 | apps/platform/src/features/coaching-sales/email/payment-link-email.server.ts | packages/domain/src/coaching-bundle/index.ts | import | yes | yes | inward | present |
| E1868 | apps/platform/src/features/coaching-sales/email/payment-link-email.server.ts | apps/platform/src/features/coaching-sales/contracts/bundle-cards.ts | import | no | no | lateral | present |
| E1870 | apps/platform/src/features/coaching-sales/email/payment-link-email.server.ts | external:react-dom | import | n/a | yes | outward | present |
| E1871 | apps/platform/src/features/coaching-sales/email/payment-link-email-template.server.tsx | apps/platform/src/features/coaching-sales/email/coaching-sales-email-styles.server.ts | import | no | no | lateral | present |
| E1872 | apps/platform/src/features/coaching-sales/email/payment-link-email-template.server.tsx | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
| E1876 | apps/platform/src/features/coaching-sales/routes.ts | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | yes | inward | present |
| E1881 | apps/platform/src/features/coaching-sales/ui/coach/payment-link-action.tsx | packages/domain/src/assessment-call/index.ts | type-only import | yes | yes | inward | present |
| E1882 | apps/platform/src/features/coaching-sales/ui/coach/payment-link-action.tsx | packages/ui/src/overlays/index.ts | import | yes | no | lateral | present |
| E1884 | apps/platform/src/features/coaching-sales/ui/coach/payment-link-action.tsx | packages/ui/src/toast/index.ts | import | yes | no | lateral | present |
| E1885 | apps/platform/src/features/coaching-sales/ui/coach/payment-link-action.tsx | apps/platform/src/features/assessment-calls/contracts/visitor-profile.ts | import | yes | yes | inward | present |
| E1886 | apps/platform/src/features/coaching-sales/ui/coach/payment-link-action.tsx | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | import | no | yes | inward | present |
| E1887 | apps/platform/src/features/coaching-sales/ui/coach/payment-link-action.tsx | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | yes | inward | present |
| E1932 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice.tsx | import | no | no | lateral | present |
| E1933 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice-copy.ts | import | no | no | lateral | present |
| E1934 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx | packages/config/src/index.ts | import | yes | no | lateral | present |
| E1935 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1936 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1937 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx | apps/platform/src/features/coaching-sales/contracts/bundle-cards.ts | import | no | yes | inward | present |
| E1938 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | import | no | yes | inward | present |
| E1939 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | yes | inward | present |
| E1940 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E1941 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx | apps/platform/src/features/coaching-sales/ui/public/bundle-selector/bundle-selector.tsx | import | no | no | lateral | present |
| E1942 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx | apps/platform/src/features/coaching-sales/ui/public/call-first-banner.tsx | import | no | no | lateral | present |
| E1968 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | packages/ui/src/appointments/index.ts | type-only import | yes | no | lateral | present |
| E1969 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E1970 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | apps/platform/src/features/assessment-calls/server/guards/assessment-calls-context.server.ts | import | yes | no | lateral | present |
| E1971 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | apps/platform/src/features/assessment-calls/ui/coach/assessment-call-listing.ts | import | yes | no | lateral | present |
| E1972 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls-error-boundary.tsx | re-export | yes | no | lateral | present |
| E1973 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | import | yes | no | lateral | present |
| E1974 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | apps/platform/src/features/assessment-calls/ui/coach/use-coach-clock.ts | import | yes | no | lateral | present |
| E1975 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | type-only import | yes | yes | inward | present |
| E1976 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | yes | no | lateral | present |
| E1977 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | apps/platform/src/features/coaching-sales/ui/coach/call-sales-state-badge.tsx | import | yes | no | lateral | present |
| E1978 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | apps/platform/src/features/coaching-sales/ui/coach/payment-link-action.tsx | import | yes | no | lateral | present |
| E1979 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | apps/platform/src/features/coaching-sales/ui/coach/pricing-tier-label.ts | import | yes | no | lateral | present |
| E1980 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | apps/platform/src/features/coaching-sales/ui/coach/sales-status-filter.tsx | import | yes | no | lateral | present |
| E1991 | apps/platform/src/features/coaching-sales/api/public/checkouts-controller.server.ts | external:react-router | import | n/a | no | lateral | present |
| E1993 | apps/platform/src/features/coaching-sales/contracts/bundle-cards.ts | external:zod | import | n/a | yes | outward | present |
| E1994 | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | external:zod | import | n/a | yes | outward | present |
| E1998 | apps/platform/src/features/coaching-sales/data/schema.server.ts | external:drizzle-orm | import | n/a | no | lateral | present |
| E1999 | apps/platform/src/features/coaching-sales/data/schema.server.ts | external:drizzle-orm/pg-core | import | n/a | no | lateral | present |
| E2000 | apps/platform/src/features/coaching-sales/email/coaching-sales-email-styles.server.ts | external:react | type-only import | n/a | yes | outward | present |
| E2001 | apps/platform/src/features/coaching-sales/email/payment-link-email.server.ts | external:react | import | n/a | yes | outward | present |
| E2002 | apps/platform/src/features/coaching-sales/email/payment-link-email.server.ts | external:react-dom/server | import | n/a | no | lateral | present |
| E2003 | apps/platform/src/features/coaching-sales/routes.ts | external:@react-router/dev | import | n/a | no | lateral | present |
| E2005 | apps/platform/src/features/coaching-sales/ui/coach/payment-link-action.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2006 | apps/platform/src/features/coaching-sales/ui/coach/payment-link-action.tsx | external:react | import | n/a | no | lateral | present |
| E2007 | apps/platform/src/features/coaching-sales/ui/coach/payment-link-action.tsx | external:react-router | import | n/a | no | lateral | present |
| E2020 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2021 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx | external:react | import | n/a | no | lateral | present |
| E2022 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx | external:react-router | import | n/a | no | lateral | present |
| E2031 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | external:react-router | import | n/a | no | lateral | present |
| E2037 | packages/infrastructure/src/payments/coaching-checkout-completion.server.ts | external:zod | import | n/a | yes | outward | present |
| E2051 | packages/infrastructure/src/email/index.server.ts | packages/infrastructure/src/email/email-theme.server.ts | re-export | no | no | lateral | present |
| E2052 | apps/platform/src/features/assessment-calls/email/assessment-call-email-styles.server.ts | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
| E2053 | packages/ui/src/appointments/index.ts | packages/ui/src/appointments/appointment.ts | type-only import | no | no | lateral | present |
| E2054 | packages/ui/src/appointments/index.ts | packages/ui/src/appointments/row-action.tsx | re-export | no | no | lateral | present |
| E2055 | packages/ui/src/appointments/row-action.tsx | packages/ui/src/primitives/button.tsx | import | no | no | lateral | present |
| E2056 | packages/ui/src/appointments/row-action.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2057 | packages/ui/src/appointments/row-action.tsx | external:react | type-only import | n/a | no | lateral | present |
| E2058 | apps/platform/src/features/assessment-calls/ui/coach/join-call-link.tsx | packages/ui/src/appointments/index.ts | import | yes | no | lateral | present |
| E2059 | apps/platform/src/features/assessment-calls/ui/coach/join-call-link.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2060 | packages/infrastructure/src/payments/memory/in-memory-payment-events.server.ts | packages/infrastructure/src/payments/payment-event-verdict.server.ts | import | no | no | lateral | present |
| E2061 | apps/platform/src/features/coaching-sales/api/public/checkouts-controller.server.ts | apps/platform/src/features/coaching-sales/contracts/checkout-confirmation.ts | import | no | no | lateral | present |
| E2062 | apps/platform/src/features/coaching-sales/contracts/checkout-confirmation.ts | apps/platform/src/features/coaching-sales/contracts/bundle-cards.ts | import | no | no | lateral | present |
| E2063 | apps/platform/src/features/coaching-sales/contracts/checkout-confirmation.ts | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | type-only import | no | no | lateral | present |
| E2064 | apps/platform/src/features/coaching-sales/contracts/checkout-confirmation.ts | packages/domain/src/coaching-bundle/index.ts | import | yes | yes | inward | present |
| E2065 | apps/platform/src/features/coaching-sales/contracts/checkout-confirmation.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | yes | inward | present |
| E2066 | apps/platform/src/features/coaching-sales/data/schema.server.ts | packages/domain/src/coaching-bundle/index.ts | import | yes | yes | inward | present |
| E2067 | apps/platform/src/features/coaching-sales/email/payment-link-email.server.ts | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | import | no | no | lateral | present |
| E2068 | apps/platform/src/features/coaching-sales/email/payment-link-email-template.server.tsx | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | import | no | no | lateral | present |
| E2069 | apps/platform/src/features/coaching-sales/email/coaching-sales-email-styles.server.ts | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
| E2070 | apps/platform/src/features/coaching-sales/api/public/bundle-page.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E2071 | apps/platform/src/features/coaching-sales/api/public/bundle-page.ts | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E2072 | apps/platform/src/features/coaching-sales/ui/coach/payment-link-action.tsx | packages/ui/src/appointments/index.ts | import | yes | no | lateral | present |
| E2073 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/bundle-page-resolution.ts | apps/platform/src/features/coaching-sales/ui/public/select-bundle/payment-link-token.ts | import | no | no | lateral | present |
| E2074 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/bundle-page-resolution.ts | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | import | no | yes | inward | present |
| E2075 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/bundle-page-resolution.ts | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | yes | inward | present |
| E2076 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/bundle-page-resolution.ts | external:react | import | n/a | no | lateral | present |
| E2078 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx | apps/platform/src/features/coaching-sales/ui/public/select-bundle/bundle-page-resolution.ts | import | no | no | lateral | present |
| E2079 | apps/platform/src/features/coaching-sales/api/public/bundle-page.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2080 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/bundle-page-resolution.ts | external:react-router | import | n/a | no | lateral | present |
| E2082 | packages/ui/src/appointments/row-action.tsx | external:react-router | import | n/a | no | lateral | present |
| E2085 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | apps/platform/src/features/accounts/ui/shared/sign-out-control.tsx | import | no | no | lateral | present |
| E2086 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | external:@clerk/react-router | import | n/a | no | lateral | present |
| E2087 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | external:react-router | import | n/a | no | lateral | present |
| E2088 | apps/platform/src/features/accounts/ui/shared/sign-out-control.tsx | external:@clerk/react-router | import | n/a | no | lateral | present |
| E2089 | apps/platform/src/features/accounts/ui/shared/sign-out-control.tsx | external:react | type-only import | n/a | no | lateral | present |
| E2090 | apps/platform/src/features/coaching-sales/api/client/client-journey-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | import | yes | no | lateral | present |
| E2091 | apps/platform/src/features/coaching-sales/api/client/client-journey-controller.server.ts | apps/platform/src/features/coaching-sales/contracts/client-journey.ts | import | no | no | lateral | present |
| E2092 | apps/platform/src/features/coaching-sales/api/client/client-journey-controller.server.ts | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | no | lateral | present |
| E2093 | apps/platform/src/features/coaching-sales/api/client/client-journey-controller.server.ts | external:react-router | import | n/a | no | lateral | present |
| E2094 | apps/platform/src/features/coaching-sales/api/client/client-journey-controller.server.ts | packages/domain/src/client-journey/index.ts | type-only import | yes | yes | inward | present |
| E2095 | apps/platform/src/features/coaching-sales/api/public/checkouts-controller.server.ts | apps/platform/src/features/coaching-sales/api/public/read-json-request-body.server.ts | import | no | no | lateral | present |
| E2096 | apps/platform/src/features/coaching-sales/api/public/invitation.ts | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E2097 | apps/platform/src/features/coaching-sales/api/public/invitation.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2098 | apps/platform/src/features/coaching-sales/api/public/invitation.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E2099 | apps/platform/src/features/coaching-sales/api/public/invitations-controller.server.ts | apps/platform/src/features/coaching-sales/api/public/read-json-request-body.server.ts | import | no | no | lateral | present |
| E2101 | apps/platform/src/features/coaching-sales/api/public/invitations-controller.server.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2102 | apps/platform/src/features/coaching-sales/api/public/invitations-controller.server.ts | packages/domain/src/client-invitation/index.ts | type-only import | yes | yes | inward | present |
| E2103 | apps/platform/src/features/coaching-sales/api/public/invitations-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E2104 | apps/platform/src/features/coaching-sales/api/public/read-json-request-body.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E2105 | apps/platform/src/features/coaching-sales/contracts/client-journey.ts | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | no | lateral | present |
| E2106 | apps/platform/src/features/coaching-sales/contracts/client-journey.ts | external:zod | import | n/a | no | lateral | present |
| E2107 | apps/platform/src/features/coaching-sales/contracts/client-journey.ts | packages/domain/src/client-journey/index.ts | type-only import | yes | yes | inward | present |
| E2108 | apps/platform/src/features/coaching-sales/contracts/paths.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E2109 | apps/platform/src/features/coaching-sales/data/client-journeys/client-journeys-repository.server.ts | apps/platform/src/features/coaching-sales/data/schema.server.ts | import | no | no | lateral | present |
| E2110 | apps/platform/src/features/coaching-sales/data/client-journeys/client-journeys-repository.server.ts | external:drizzle-orm | import | n/a | no | lateral | present |
| E2111 | apps/platform/src/features/coaching-sales/data/client-journeys/client-journeys-repository.server.ts | packages/db/src/index.ts | type-only import | yes | yes | outward | present |
| E2112 | apps/platform/src/features/coaching-sales/data/client-journeys/client-journeys-repository.server.ts | packages/domain/src/client-journey/index.ts | import | yes | yes | inward | present |
| E2113 | apps/platform/src/features/coaching-sales/data/invitations/client-invitation-ids.server.ts | external:crypto | import | n/a | no | lateral | present |
| E2114 | apps/platform/src/features/coaching-sales/data/invitations/client-invitation-ids.server.ts | packages/domain/src/client-invitation/index.ts | type-only import | yes | yes | inward | present |
| E2115 | apps/platform/src/features/coaching-sales/data/invitations/invitations-repository.server.ts | apps/platform/src/features/coaching-sales/data/schema.server.ts | import | no | no | lateral | present |
| E2116 | apps/platform/src/features/coaching-sales/data/invitations/invitations-repository.server.ts | apps/platform/src/features/coaching-sales/data/unique-violation.server.ts | import | no | no | lateral | present |
| E2117 | apps/platform/src/features/coaching-sales/data/invitations/invitations-repository.server.ts | external:drizzle-orm | import | n/a | no | lateral | present |
| E2118 | apps/platform/src/features/coaching-sales/data/invitations/invitations-repository.server.ts | packages/db/src/index.ts | type-only import | yes | yes | outward | present |
| E2119 | apps/platform/src/features/coaching-sales/data/invitations/invitations-repository.server.ts | packages/domain/src/client-invitation/index.ts | import | yes | yes | inward | present |
| E2120 | apps/platform/src/features/coaching-sales/data/invitations/invited-clients-repository.server.ts | apps/platform/src/features/coaching-sales/data/schema.server.ts | import | no | no | lateral | present |
| E2121 | apps/platform/src/features/coaching-sales/data/invitations/invited-clients-repository.server.ts | external:drizzle-orm | import | n/a | no | lateral | present |
| E2122 | apps/platform/src/features/coaching-sales/data/invitations/invited-clients-repository.server.ts | packages/db/src/index.ts | type-only import | yes | yes | outward | present |
| E2123 | apps/platform/src/features/coaching-sales/data/invitations/invited-clients-repository.server.ts | packages/domain/src/client-invitation/index.ts | type-only import | yes | yes | inward | present |
| E2124 | apps/platform/src/features/coaching-sales/data/link-tokens/link-token.server.ts | external:crypto | import | n/a | no | lateral | present |
| E2125 | apps/platform/src/features/coaching-sales/data/link-tokens/link-token.server.ts | packages/domain/src/client-invitation/index.ts | type-only import | yes | yes | inward | present |
| E2126 | apps/platform/src/features/coaching-sales/data/purchases/purchases-repository.server.ts | apps/platform/src/features/coaching-sales/data/unique-violation.server.ts | import | no | no | lateral | present |
| E2127 | apps/platform/src/features/coaching-sales/data/unique-violation.server.ts | packages/db/src/index.ts | import | yes | yes | outward | present |
| E2128 | apps/platform/src/features/coaching-sales/email/client-invitation-email-template.server.tsx | apps/platform/src/features/coaching-sales/email/coaching-sales-email-styles.server.ts | import | no | no | lateral | present |
| E2129 | apps/platform/src/features/coaching-sales/email/client-invitation-email-template.server.tsx | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
| E2130 | apps/platform/src/features/coaching-sales/email/client-invitation-email.server.ts | apps/platform/src/features/coaching-sales/email/client-invitation-email-template.server.tsx | import | no | no | lateral | present |
| E2131 | apps/platform/src/features/coaching-sales/email/client-invitation-email.server.ts | external:react | import | n/a | no | lateral | present |
| E2132 | apps/platform/src/features/coaching-sales/email/client-invitation-email.server.ts | external:react-dom | import | n/a | no | lateral | present |
| E2133 | apps/platform/src/features/coaching-sales/email/email-client-invitation-notifications.server.ts | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | no | lateral | present |
| E2134 | apps/platform/src/features/coaching-sales/email/email-client-invitation-notifications.server.ts | apps/platform/src/features/coaching-sales/email/client-invitation-email.server.ts | import | no | no | lateral | present |
| E2135 | apps/platform/src/features/coaching-sales/email/email-client-invitation-notifications.server.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E2136 | apps/platform/src/features/coaching-sales/email/email-client-invitation-notifications.server.ts | packages/domain/src/client-invitation/index.ts | type-only import | yes | yes | inward | present |
| E2137 | apps/platform/src/features/coaching-sales/email/email-client-invitation-notifications.server.ts | packages/domain/src/shared/index.ts | type-only import | yes | yes | inward | present |
| E2138 | apps/platform/src/features/coaching-sales/email/email-client-invitation-notifications.server.ts | packages/infrastructure/src/email/index.server.ts | type-only import | yes | no | lateral | present |
| E2139 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/api/client/client-journey-controller.server.ts | import | no | no | lateral | present |
| E2140 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/api/public/invitations-controller.server.ts | import | no | no | lateral | present |
| E2141 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/data/client-journeys/client-journeys-repository.server.ts | import | no | no | lateral | present |
| E2142 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/data/invitations/client-invitation-ids.server.ts | import | no | no | lateral | present |
| E2143 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/data/invitations/invitations-repository.server.ts | import | no | no | lateral | present |
| E2144 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/data/invitations/invited-clients-repository.server.ts | import | no | no | lateral | present |
| E2145 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/email/email-client-invitation-notifications.server.ts | import | no | no | lateral | present |
| E2146 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | packages/domain/src/account/index.ts | type-only import | yes | yes | inward | present |
| E2147 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | packages/domain/src/client-invitation/index.ts | import | yes | yes | inward | present |
| E2148 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | packages/domain/src/client-journey/index.ts | import | yes | yes | inward | present |
| E2149 | apps/platform/src/features/coaching-sales/server/guards/require-client-journey-step.server.ts | apps/platform/src/features/accounts/server/guards/accounts-context.server.ts | import | yes | no | lateral | present |
| E2150 | apps/platform/src/features/coaching-sales/server/guards/require-client-journey-step.server.ts | apps/platform/src/features/accounts/server/guards/session-context.server.ts | import | yes | no | lateral | present |
| E2151 | apps/platform/src/features/coaching-sales/server/guards/require-client-journey-step.server.ts | apps/platform/src/features/coaching-sales/contracts/client-journey.ts | import | no | no | lateral | present |
| E2152 | apps/platform/src/features/coaching-sales/server/guards/require-client-journey-step.server.ts | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E2153 | apps/platform/src/features/coaching-sales/server/guards/require-client-journey-step.server.ts | external:react-router | import | n/a | no | lateral | present |
| E2154 | apps/platform/src/features/coaching-sales/server/guards/require-client-journey-step.server.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E2155 | apps/platform/src/features/coaching-sales/server/guards/require-client-journey-step.server.ts | packages/domain/src/client-journey/index.ts | type-only import | yes | yes | inward | present |
| E2156 | apps/platform/src/features/coaching-sales/ui/client/welcome/welcome-copy.ts | apps/platform/src/features/coaching-sales/contracts/client-journey.ts | type-only import | no | no | lateral | present |
| E2157 | apps/platform/src/features/coaching-sales/ui/client/welcome/welcome-page.tsx | apps/platform/src/features/coaching-sales/contracts/client-journey.ts | type-only import | no | no | lateral | present |
| E2158 | apps/platform/src/features/coaching-sales/ui/client/welcome/welcome-page.tsx | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E2159 | apps/platform/src/features/coaching-sales/ui/client/welcome/welcome-page.tsx | apps/platform/src/features/coaching-sales/ui/client/welcome/welcome-copy.ts | import | no | no | lateral | present |
| E2160 | apps/platform/src/features/coaching-sales/ui/client/welcome/welcome-page.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2161 | apps/platform/src/features/coaching-sales/ui/client/welcome/welcome-page.tsx | external:react-router | import | n/a | no | lateral | present |
| E2162 | apps/platform/src/features/coaching-sales/ui/client/welcome/welcome-page.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E2163 | apps/platform/src/features/coaching-sales/ui/client/welcome/welcome-page.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2164 | apps/platform/src/features/coaching-sales/ui/public/fragment-token.ts | external:react | import | n/a | no | lateral | present |
| E2165 | apps/platform/src/features/coaching-sales/ui/public/fragment-token.ts | external:react-router | import | n/a | no | lateral | present |
| E2178 | apps/platform/src/features/coaching-sales/ui/public/invitation/invitation-resolution.ts | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | no | lateral | present |
| E2179 | apps/platform/src/features/coaching-sales/ui/public/invitation/invitation-resolution.ts | apps/platform/src/features/coaching-sales/ui/public/fragment-token.ts | import | no | no | lateral | present |
| E2180 | apps/platform/src/features/coaching-sales/ui/public/invitation/invitation-resolution.ts | external:react | import | n/a | no | lateral | present |
| E2181 | apps/platform/src/features/coaching-sales/ui/public/invitation/invitation-resolution.ts | external:react-router | import | n/a | no | lateral | present |
| E2182 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/payment-link-token.ts | apps/platform/src/features/coaching-sales/ui/public/fragment-token.ts | import | no | no | lateral | present |
| E2183 | apps/platform/src/server/container.server.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E2184 | apps/platform/src/server/container.server.ts | packages/infrastructure/src/identity/index.server.ts | import | yes | no | lateral | present |
| E2185 | apps/platform/src/server/logger.server.ts | packages/domain/src/client-invitation/index.ts | type-only import | yes | yes | inward | present |
| E2186 | apps/platform/src/surfaces/client-portal/routes.ts | apps/platform/src/features/coaching-sales/routes.ts | import | yes | no | lateral | present |
| E2187 | apps/platform/src/surfaces/client-portal/routes.ts | external:@react-router/dev | import | n/a | no | lateral | present |
| E2188 | apps/platform/src/surfaces/client-portal/shell/access-layout.server.ts | apps/platform/src/features/coaching-sales/server/guards/require-client-journey-step.server.ts | import | yes | no | lateral | present |
| E2189 | apps/platform/src/surfaces/client-portal/shell/access-layout.server.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2190 | apps/platform/src/surfaces/client-portal/shell/access-layout.tsx | apps/platform/src/surfaces/client-portal/shell/access-layout.server.ts | import | no | no | lateral | present |
| E2191 | apps/platform/src/surfaces/client-portal/shell/access-layout.tsx | external:react-router | import | n/a | no | lateral | present |
| E2192 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | external:react-router | import | n/a | no | lateral | present |
| E2193 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/features/coaching-sales/server/guards/require-client-journey-step.server.ts | import | yes | no | lateral | present |
| E2194 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/surfaces/public-site/shell/portal-destination.ts | import | no | no | lateral | present |
| E2195 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2196 | apps/platform/src/surfaces/public-site/shell/portal-destination.ts | apps/platform/src/features/accounts/contracts/account.ts | type-only import | yes | no | lateral | present |
| E2197 | apps/platform/src/surfaces/public-site/shell/portal-destination.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E2198 | apps/platform/src/surfaces/public-site/shell/portal-destination.ts | apps/platform/src/features/coaching-sales/contracts/client-journey.ts | import | yes | no | lateral | present |
| E2199 | apps/platform/src/surfaces/public-site/shell/portal-destination.ts | packages/domain/src/account/index.ts | type-only import | yes | yes | inward | present |
| E2200 | apps/platform/src/surfaces/public-site/shell/portal-destination.ts | packages/domain/src/client-journey/index.ts | type-only import | yes | yes | inward | present |
| E2201 | packages/config/src/index.ts | packages/config/src/concerns/clerk.ts | type-only import | no | no | lateral | present |
| E2202 | packages/domain/src/account/index.ts | packages/domain/src/account/invitation-acceptance.ts | type-only import | no | no | lateral | present |
| E2203 | packages/domain/src/account/provision-account-use-case.ts | packages/domain/src/account/invitation-acceptance.ts | type-only import | no | no | lateral | present |
| E2204 | packages/domain/src/client-invitation/accept-invitation-use-case.ts | packages/domain/src/client-invitation/client-invitation.ts | type-only import | no | no | lateral | present |
| E2205 | packages/domain/src/client-invitation/accept-invitation-use-case.ts | packages/domain/src/client-invitation/client-invitations.ts | type-only import | no | no | lateral | present |
| E2206 | packages/domain/src/client-invitation/accept-invitation-use-case.ts | packages/domain/src/client-invitation/identity-invitations.ts | type-only import | no | no | lateral | present |
| E2207 | packages/domain/src/client-invitation/accept-invitation-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E2208 | packages/domain/src/client-invitation/admit-paid-client-use-case.ts | packages/domain/src/client-invitation/client-invitation-incidents.ts | type-only import | no | no | lateral | present |
| E2209 | packages/domain/src/client-invitation/admit-paid-client-use-case.ts | packages/domain/src/client-invitation/client-invitation-notifications.ts | type-only import | no | no | lateral | present |
| E2210 | packages/domain/src/client-invitation/admit-paid-client-use-case.ts | packages/domain/src/client-invitation/client-invitation.ts | import | no | no | lateral | present |
| E2211 | packages/domain/src/client-invitation/admit-paid-client-use-case.ts | packages/domain/src/client-invitation/client-invitations.ts | type-only import | no | no | lateral | present |
| E2212 | packages/domain/src/client-invitation/admit-paid-client-use-case.ts | packages/domain/src/client-invitation/identity-invitations.ts | type-only import | no | no | lateral | present |
| E2213 | packages/domain/src/client-invitation/admit-paid-client-use-case.ts | packages/domain/src/client-invitation/invitation-token.ts | type-only import | no | no | lateral | present |
| E2214 | packages/domain/src/client-invitation/admit-paid-client-use-case.ts | packages/domain/src/client-invitation/invited-client.ts | type-only import | no | no | lateral | present |
| E2215 | packages/domain/src/client-invitation/admit-paid-client-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E2216 | packages/domain/src/client-invitation/client-invitations.ts | packages/domain/src/client-invitation/client-invitation.ts | type-only import | no | no | lateral | present |
| E2217 | packages/domain/src/client-invitation/identity-invitations.ts | packages/domain/src/client-invitation/client-invitation.ts | type-only import | no | no | lateral | present |
| E2218 | packages/domain/src/client-invitation/index.ts | packages/domain/src/client-invitation/accept-invitation-use-case.ts | import | no | no | lateral | present |
| E2219 | packages/domain/src/client-invitation/index.ts | packages/domain/src/client-invitation/admit-paid-client-use-case.ts | import | no | no | lateral | present |
| E2220 | packages/domain/src/client-invitation/index.ts | packages/domain/src/client-invitation/client-invitation-incidents.ts | type-only import | no | no | lateral | present |
| E2221 | packages/domain/src/client-invitation/index.ts | packages/domain/src/client-invitation/client-invitation-notifications.ts | type-only import | no | no | lateral | present |
| E2222 | packages/domain/src/client-invitation/index.ts | packages/domain/src/client-invitation/client-invitation.ts | import | no | no | lateral | present |
| E2223 | packages/domain/src/client-invitation/index.ts | packages/domain/src/client-invitation/client-invitations.ts | type-only import | no | no | lateral | present |
| E2224 | packages/domain/src/client-invitation/index.ts | packages/domain/src/client-invitation/identity-invitations.ts | type-only import | no | no | lateral | present |
| E2225 | packages/domain/src/client-invitation/index.ts | packages/domain/src/client-invitation/invitation-token.ts | type-only import | no | no | lateral | present |
| E2226 | packages/domain/src/client-invitation/index.ts | packages/domain/src/client-invitation/invited-client.ts | type-only import | no | no | lateral | present |
| E2227 | packages/domain/src/client-invitation/index.ts | packages/domain/src/client-invitation/resolve-invitation-use-case.ts | import | no | no | lateral | present |
| E2228 | packages/domain/src/client-invitation/resolve-invitation-use-case.ts | packages/domain/src/client-invitation/client-invitations.ts | type-only import | no | no | lateral | present |
| E2229 | packages/domain/src/client-invitation/resolve-invitation-use-case.ts | packages/domain/src/client-invitation/invitation-token.ts | type-only import | no | no | lateral | present |
| E2230 | packages/domain/src/client-invitation/resolve-invitation-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E2231 | packages/domain/src/client-journey/client-journey.ts | packages/domain/src/assessment-call/index.ts | type-only import | no | no | lateral | present |
| E2232 | packages/domain/src/client-journey/client-journeys.ts | packages/domain/src/client-journey/client-journey.ts | type-only import | no | no | lateral | present |
| E2233 | packages/domain/src/client-journey/index.ts | packages/domain/src/client-journey/client-journey.ts | import | no | no | lateral | present |
| E2234 | packages/domain/src/client-journey/index.ts | packages/domain/src/client-journey/client-journeys.ts | type-only import | no | no | lateral | present |
| E2235 | packages/domain/src/client-journey/index.ts | packages/domain/src/client-journey/mark-welcome-seen-use-case.ts | import | no | no | lateral | present |
| E2236 | packages/domain/src/client-journey/index.ts | packages/domain/src/client-journey/read-client-journey-use-case.ts | import | no | no | lateral | present |
| E2237 | packages/domain/src/client-journey/mark-welcome-seen-use-case.ts | packages/domain/src/client-journey/client-journeys.ts | type-only import | no | no | lateral | present |
| E2238 | packages/domain/src/client-journey/mark-welcome-seen-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E2239 | packages/domain/src/client-journey/read-client-journey-use-case.ts | packages/domain/src/client-journey/client-journey.ts | type-only import | no | no | lateral | present |
| E2240 | packages/domain/src/client-journey/read-client-journey-use-case.ts | packages/domain/src/client-journey/client-journeys.ts | type-only import | no | no | lateral | present |
| E2241 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/paid-client-admission.ts | type-only import | no | no | lateral | present |
| E2242 | packages/domain/src/coaching-subscription/record-checkout-completed-use-case.ts | packages/domain/src/coaching-subscription/paid-client-admission.ts | type-only import | no | no | lateral | present |
| E2243 | packages/infrastructure/src/identity/clerk-identity-invitations.server.ts | packages/domain/src/client-invitation/index.ts | import | yes | yes | inward | present |
| E2244 | packages/infrastructure/src/identity/clerk-identity-invitations.server.ts | packages/infrastructure/src/identity/identity-invitation-urls.server.ts | type-only import | no | no | lateral | present |
| E2245 | packages/infrastructure/src/identity/create-identity-invitations.server.ts | external:@clerk/backend | import | n/a | no | lateral | present |
| E2246 | packages/infrastructure/src/identity/create-identity-invitations.server.ts | packages/config/src/index.ts | type-only import | yes | no | lateral | present |
| E2247 | packages/infrastructure/src/identity/create-identity-invitations.server.ts | packages/domain/src/client-invitation/index.ts | type-only import | yes | yes | inward | present |
| E2248 | packages/infrastructure/src/identity/create-identity-invitations.server.ts | packages/infrastructure/src/identity/clerk-identity-invitations.server.ts | import | no | no | lateral | present |
| E2249 | packages/infrastructure/src/identity/create-identity-invitations.server.ts | packages/infrastructure/src/identity/identity-invitation-urls.server.ts | type-only import | no | no | lateral | present |
| E2250 | packages/infrastructure/src/identity/create-identity-invitations.server.ts | packages/infrastructure/src/identity/in-memory-identity-invitations.server.ts | import | no | no | lateral | present |
| E2251 | packages/infrastructure/src/identity/index.server.ts | packages/infrastructure/src/identity/create-identity-invitations.server.ts | import | no | no | lateral | present |
| E2252 | packages/test-support/src/stripe-webhook-signature.ts | external:crypto | import | n/a | no | lateral | present |
| E2166 | apps/platform/src/features/coaching-sales/api/public/invitations-controller.server.ts | apps/platform/src/features/coaching-sales/contracts/invitation.ts | import | no | no | lateral | present |
| E2167 | apps/platform/src/features/coaching-sales/contracts/invitation.ts | external:zod | import | n/a | no | lateral | present |
| E2168 | apps/platform/src/features/coaching-sales/ui/public/invitation/invitation-resolution.ts | apps/platform/src/features/coaching-sales/contracts/invitation.ts | import | no | no | lateral | present |
| E2169 | apps/platform/src/features/coaching-sales/ui/public/invitation/invitation-states.tsx | apps/platform/src/features/coaching-sales/ui/public/invitation/invitation-resolution.ts | import | no | no | lateral | present |
| E2170 | apps/platform/src/features/coaching-sales/ui/public/invitation/invitation-states.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2171 | apps/platform/src/features/coaching-sales/ui/public/invitation/invitation-states.tsx | external:react | type-only import | n/a | no | lateral | present |
| E2172 | apps/platform/src/features/coaching-sales/ui/public/invitation/invitation-states.tsx | external:react-router | import | n/a | no | lateral | present |
| E2173 | apps/platform/src/features/coaching-sales/ui/public/invitation/invitation-states.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E2174 | apps/platform/src/features/coaching-sales/ui/public/invitation/invitation-states.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E2175 | apps/platform/src/features/coaching-sales/ui/public/invitation/invitation-states.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2176 | apps/platform/src/surfaces/public-site/pages/invitation.tsx | apps/platform/src/features/accounts/server/guards/accounts-context.server.ts | import | yes | no | lateral | present |
| E2253 | apps/platform/src/surfaces/public-site/pages/invitation.tsx | apps/platform/src/features/accounts/server/guards/session-context.server.ts | import | yes | no | lateral | present |
| E2254 | apps/platform/src/surfaces/public-site/pages/invitation.tsx | apps/platform/src/features/accounts/ui/shared/sign-out-control.tsx | import | yes | no | lateral | present |
| E2255 | apps/platform/src/surfaces/public-site/pages/invitation.tsx | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | yes | no | lateral | present |
| E2256 | apps/platform/src/surfaces/public-site/pages/invitation.tsx | apps/platform/src/features/coaching-sales/ui/public/invitation/invitation-states.tsx | import | yes | no | lateral | present |
| E2257 | apps/platform/src/surfaces/public-site/pages/invitation.tsx | external:react-router | import | n/a | no | lateral | present |
| E2258 | apps/platform/src/surfaces/public-site/pages/invitation.tsx | packages/config/src/index.ts | import | yes | no | lateral | present |
| E2259 | apps/platform/src/surfaces/public-site/pages/invitation.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2260 | apps/platform/src/surfaces/public-site/routes.ts | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | yes | no | lateral | present |
