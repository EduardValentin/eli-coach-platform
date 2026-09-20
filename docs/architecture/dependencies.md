# Dependencies

Header: date 2026-09-19, commit ea81d98f merged with origin/main at e2d86a3a (branch point 843d8261), scope apps/platform/src, apps/platform/db, packages/{config,content,db,domain,infrastructure,test-support,ui}/src plus the enforcement layer (tools/dependency-cruiser.config.cjs, tools/dependency-cruiser.tsconfig.json, tools/boundaries.test.mjs, tools/boundary-fixtures/, tools/domain-layout.mjs, tools/domain-layout.test.mjs, tools/domain-layout-fixtures/, knip.json, eslint.config.mjs, workspace package.json export maps, tsconfigs, vite/react-router/vitest configs), mode record update merging two lines of history on top of change review run 8 at e8690f45: main's partial change review of 8ac6a613 (PR #229 head, squash-merged as 7d92dc22; base 79fa1e95; 46 changed implementation files in C1, C6, C7, C8 and C14 plus direct neighbors), the persisted waitlist-mode change (74950bd7), the Radix mobile navigation (1979b1cc) and the database-enforced waitlist capacity (e2d86a3a); and GEN-191 over `843d8261..ea81d98f` — the slices recorded at 422c7797, corrected after the two review fix rounds (`422c7797..186b77c4`), the remediation round (`186b77c4..6fc3157f`), the booking-card rebuild (`bcf6555e..dde3b960`), the second parity round (`7a61673f..d3513898`), the design-system fix round on top of bff79348, the coach-calendar refactor (`19169b9e..eb88ecb4`, carried onto this branch as 152ca98f and recorded at 47edb229), the fix round (`47edb229..59c019ec`) and the final fix round (`a4256c45..8a604aef`) — and the merge resolution, which moves the assessment-call slice onto main's contracts and database feature flags.

Change review: date 2026-09-18, commit 8ac6a613 (PR #229 head, squash-merged to main as 7d92dc22; base 79fa1e95), scope 46 changed implementation files in C1, C6, C7, C8 and C14 plus direct neighbors, mode partial change review (run 8 baseline e8690f45).

Change review: date 2026-09-18, commit b3eb2653 (PR #232, base 299f237f); scope the waitlist capacity enforcement: the C8 waitlist repository, table, constraint-violation classifier and migration 0019, the C1 cap constant, the C3 waitlist config and the integration rig; partial scope. Rows it changed or added carry the commit.

Change review: date 2026-09-18, commit c2277ebb, baseline 7d92dc22, scope the persisted waitlist-mode change (`79fa1e95..f0eb1bf4`, merged with main in `242a0976`): the changed units and their direct graph neighborhood in apps/platform, packages/{config,content,db,domain,infrastructure,ui}, tests, migrations and package deployment; partial scope. Rows it changed or added carry the commit that changed them.

Change review: date 2026-09-18, commits 6c043f97, 63100724, eced8490 and 3836745e (PR #230, base 843d8261), merged with main at 74950bd7; scope the C5 mobile-navigation modules (`layout/navigation-dialog.tsx`, `layout/use-close-mobile-navigation-on-desktop.ts`, `layout/portal-shell.tsx`, the removed `lib/focus-trap.ts`) and their public-site and portal consumers; partial scope.

Change review: date 2026-09-20, commits `f46b6f41..HEAD` on `eduardvalentin1996/gen-193-coach-sees-her-assessment-calls-on-the-dashboard`; scope the GEN-193 coach assessment-calls slice — the C1 `ListAssessmentCallsUseCase` and `AssessmentCall.hasEnded`, the C17 coach controller, contracts, coach UI and `ui/shared/day-key.ts`, the C5 `./tabs` and `./appointments` subpaths with `Badge`, `Avatar`, `Pagination`, the `portal-panel` card variant and `useDisplayTimeZone`, and the C13 dashboard loader, route spread and sidebar link; partial scope. It adds E1490-E1566 and marks E377, E1292, E1315, E1316, E1319 and E1498 removed, E1498 being an edge this same review had recorded, whose ID stays out of use. Rows it changed or added carry that range.

## Component graph

Generated from a cold cruise of the working tree that merges main (e2d86a3a) into the GEN-191 branch at ea81d98f: 378 modules, 1016 dependencies, 0 violations, 0 circular, 0 unresolved, over 355 in-scope production modules; the per-module edge table is below. Count = distinct importing modules. Component IDs refer to `components.md`. Against the branch's last record (8a604aef: 374 modules, 984 dependencies) the merge moved three counts. C6 → C1 went 10 → 2: main moved `BotVerifier`, `ProductEmail` and `ManagementAuthenticator` into their C6 concerns, so eight C6 modules stopped importing `/shared` and only the feature-flags repository and `PostgresCoachCalendar` still import C1. C17 → C6 went 10 → 12: the notification factory and adapter now take `ProductEmail` from C6's `./email/server`. C8 → C1 reads 8, where main's record carried 7 after PR #232 (`e2d86a3a`) gave `data/schema.server.ts` an import of `/waitlist`. The assessment-call slice's other merge edges (the composition into `/feature-flag`, the console logger into `/assessment-call`) land in components that already imported the target. On main's side, the record read 287 in-scope production modules and 782 dependencies for PR #229, 785 dependencies after the persisted waitlist-mode change (PR #231), and 308 modules (288 in-scope production modules) and 793 dependencies after PR #230; rows E1200-E1212 record the PR #230 Radix mobile navigation. On the branch side, every count C17 did not appear in was unchanged from run 8 at e8690f45: `features/assessment-calls` is the only component the GEN-191 window added, and nothing else gained or lost a cross-component importer. The review fix round moved two C17 counts: C17 → C1 went 12 → 13 (`ui/public/book/call-facts.tsx` reads the duration off `ASSESSMENT_CALL_RULES`) and C17 → C5 went 5 → 6 (the join page took `Link` from `./primitives`, while `booking-details-form.tsx` dropped its `./lib` import). The remediation round took C17 → C5 back to 5: the join page no longer renders a page of its own, so it imports nothing from C5. The booking-card rebuild moved both again: C17 → C1 went 13 → 12 (`call-facts.tsx` was deleted and `slot-grouping.ts` lost its `ASSESSMENT_CALL_RULES` import, while `call-overview.tsx` took the duration) and C17 → C5 went 5 → 6 (`slot-picker.tsx` takes `cn` from `./lib`, which the page, the details form and the confirmation import again too). The second parity round moved no count: the three dead-end pages (`root-error-page.tsx`, `access-denied-page.tsx`, `sign-in-failed-page.tsx`) moved from `./primitives` to `./layout`, the waitlist email form from `./primitives` to `./motion`, `about.tsx` from `./motion` to `./primitives`, and `hero.tsx` dropped `./lib` and `./primitives` but keeps `./motion`, so every importing module still imports C5. The coach-calendar refactor (`19169b9e..eb88ecb4`) added eight modules and moved three counts outside C17's own rows: C6 → C1 went 9 → 10 (`PostgresCoachCalendar` implements `CoachCalendar`), C6 → C2 went 2 → 5 (the calendar, the reservation writers and the `coach_time_reservations` table name the client or the `app` schema), and C17 → C6 went 9 → 10 (the repository reserves through `./coach-calendar/server`). C17 → C1 held at 12: the modules that read `ASSESSMENT_CALL_RULES` now take it from `/assessment-call`, which each of them except `call-overview.tsx` and the wire contract already imported, and only `StaticCoachAvailability` still reads `/coach-availability`. The GEN-191 fix round (`47edb229..59c019ec`) moved no count: its three new modules are imported only inside their own components, `auth-nav-actions.tsx` (C9) and `catalog-view.tsx` (C7) added `./primitives` to the C5 subpaths they already imported, and `access-denied-page.tsx`, `booking-confirmation.tsx`, `root-error-page.tsx` and `pricing.tsx` dropped `./lib` while keeping another C5 subpath. The final fix round (`a4256c45..8a604aef`) moved one count: C17 → C5 went 6 → 7, because `call-overview.tsx` now builds its card from `cardVariants` and `cn`. The C11 modules that moved onto `Card` only changed which C5 subpaths they import: `pricing.tsx` and `legal-document-view.tsx` added `./lib`, `bundle-selector.tsx` added `./primitives`, and `footer-cta.tsx` dropped `./lib` while keeping `./primitives` and `./motion`.

| From | To | Modules | Notes |
|---|---|---|---|
| C6 infrastructure | C1 domain | 2 | the feature-flags repository implements the C1 `FeatureFlags` port and `PostgresCoachCalendar` implements `CoachCalendar` from `/coach-availability`; the adapter-facing contracts are C6's own |
| C6 infrastructure | C2 db | 5 | feature-flags repository and table; the coach calendar, the reservation writers and the `coach_time_reservations` table |
| C6 infrastructure | C3 config | 6 | concern types the factories read |
| C7 store | C1 domain | 18 | entities, ports, use cases, publication types across `/product`, `/acquisition`, `/download-grant`, `/cart`, `/shared` |
| C7 store | C2 db | 6 | DatabaseClient, appSchema |
| C7 store | C3 config | 5 | joinBasePath and concern types |
| C7 store | C4 content | 2 | consent copy |
| C7 store | C5 ui | 6 | primitives in ui/public |
| C7 store | C6 infrastructure | 17 | bot-detection (browser and server), email/server, management-auth/server, http/server; adapter-facing contracts now live in C6 |
| C8 waitlist | C1 domain | 8 | `/feature-flag`, `/waitlist` and `/shared`; `data/schema.server.ts` joined with PR #232 (`e2d86a3a`), its range check reading `WAITLIST_REDUCED_PRICING_CAP` |
| C8 waitlist | C2 db | 3 | |
| C8 waitlist | C3 config | 2 | |
| C8 waitlist | C4 content | 2 | |
| C8 waitlist | C5 ui | 2 | |
| C8 waitlist | C6 infrastructure | 8 | bot-detection, email/server, http/server; adapter-facing contracts now live in C6 |
| C9 accounts | C1 domain | 11 | `/account` |
| C9 accounts | C2 db | 3 | |
| C9 accounts | C3 config | 2 | |
| C9 accounts | C5 ui | 3 | |
| C9 accounts | C6 infrastructure | 3 | http/server |
| C9 accounts | C7 store | 2 | the store path literal from `contracts/paths.ts` |
| C11 public-site | C3 config | 3 | |
| C11 public-site | C4 content | 4 | legal documents; Eli's portrait paths (`about-content.ts`) |
| C11 public-site | C5 ui | 16 | |
| C11 public-site | C6 infrastructure | 4 | `BotDetectionConfig` type and the widget |
| C11 public-site | C7 store | 5 | cart drawer and provider, store paths |
| C11 public-site | C8 waitlist | 7 | contracts, `ui/shared` presentation, `ui/public` |
| C11 public-site | C9 accounts | 3 | contracts, guards, `ui/public/auth-nav-actions` |
| C11 public-site | C14 server | 1 | `shell/layout.server.ts` reads `runtimeConfigContext` |
| C11 public-site | C17 assessment-calls | 4 | `routes.ts` takes the route fragment; `pages/pricing.tsx`, `sections/hero/hero.tsx` and `sections/about/about.tsx` take `BOOK_PATH` from `contracts/paths.ts` and nothing else |
| C12 client-portal | C3 config | 1 | |
| C12 client-portal | C5 ui | 2 | |
| C12 client-portal | C6 infrastructure | 2 | pwa |
| C12 client-portal | C9 accounts | 4 | portal guard and paths |
| C13 coach-portal | C5 ui | 2 | the shell and its navigation links; `pages/home.tsx` stopped importing `./layout` with GEN-193 |
| C13 coach-portal | C17 assessment-calls | 3 | `pages/home.tsx` composes the coach greeting and the upcoming-calls widget from `ui/coach/` and reads the feature's request-context key; `routes.ts` spreads `assessmentCallsCoachRoutes`; `shell/navigation-links.tsx` takes `COACH_ASSESSMENT_CALLS_PATH` from `contracts/paths.ts` |
| C13 coach-portal | C9 accounts | 3 | portal guard and paths |
| C14 server | C1 domain | 4 | the container and platform composition name ports and use cases |
| C14 server | C2 db | 1 | `platform-composition.server.ts` no longer imports `DatabaseClient` |
| C14 server | C3 config | 5 | |
| C14 server | C4 content | 1 | privacy email |
| C14 server | C6 infrastructure | 5 | bot verifier, product email, management auth, feature-flags repository, http/server |
| C14 server | C7 store | 2 | the container calls `composeStoreFeature` |
| C14 server | C8 waitlist | 2 | the container calls `composeWaitlistFeature` |
| C14 server | C9 accounts | 2 | the container calls `composeAccountsFeature` |
| C14 server | C17 assessment-calls | 2 | the container calls `composeAssessmentCallsFeature`; `feature-contexts.server.ts` sets `assessmentCallsContext` |
| C17 assessment-calls | C1 domain | 12 | `/assessment-call`, `/coach-availability` (`StaticCoachAvailability` alone), `/feature-flag` (the composition's `FeatureFlagReader` type), `/shared`; the controller, the wire contract, the composition, the three `data/` adapters, the notification factory and adapter, the calendar-invite and the two content builders, and in the browser half `call-overview.tsx` alone, reading `ASSESSMENT_CALL_RULES` |
| C17 assessment-calls | C2 db | 3 | DatabaseClient, appSchema |
| C17 assessment-calls | C3 config | 4 | `joinBasePath` (the emails and the booking overview's portrait) and `AssessmentCallsConfig` |
| C17 assessment-calls | C4 content | 2 | the support address on the error state; Eli's portrait path on the booking overview |
| C17 assessment-calls | C5 ui | 12 | `./primitives` (the booking page, the details form, the confirmation, the unavailable state, `call-overview.tsx`, `slot-picker.tsx`, and the coach's section, pager, widget and join link), `./lib` (`call-overview.tsx`, `slot-picker.tsx`, `book-page.tsx`, the coach's section and widget, and `use-coach-clock.ts`), `./calendar` (`slot-calendar.tsx`), `./tabs` (the coach's section) and `./appointments` (the coach's section and widget) |
| C17 assessment-calls | C6 infrastructure | 12 | bot-detection (browser and server; the controller and the composition type `BotVerifier` from its contract), email/server (the notification factory, the adapter and the composition take `ProductEmail`, `ProductEmailCommand` and `EmailAttachment` from its contract), http/server, coach-calendar/server (the repository's reservation writers and the composition's `PostgresCoachCalendar`) |
| C15 app root | C3 config | 1 | |
| C15 app root | C5 ui | 1 | `root-error-page.tsx` renders the shared `DeadEndPage` from `./layout`; `app.css`'s `@import` of `styles.css` is not followed by the cruise |
| C15 app root | C7 store | 1 | the registry imports `storePublicRoutes`/`storeApiRoutes` |
| C15 app root | C8 waitlist | 1 | the registry imports `waitlistApiRoutes` |
| C15 app root | C17 assessment-calls | 1 | the registry imports `assessmentCallsApiRoutes` |
| C15 app root | C9 accounts | 3 | the registry, `root.tsx` (access-denied page) and `root.server.ts` (account resolution) |
| C15 app root | C11 public-site | 1 | the registry imports `publicSiteRoutes` |
| C15 app root | C12 client-portal | 1 | the registry imports `clientPortalRoutes` |
| C15 app root | C13 coach-portal | 1 | the registry imports `coachPortalRoutes` |
| C15 app root | C14 server | 2 | `root.server.ts` (container, feature contexts) and the registry (`server/api/routes.ts`) |

**C10 features/coaching-bundles is gone**, and with it the three edges `C11 → C10`, `C10 → C1` and `C10 → C5`. The bundle literal and its presenter are C11-private modules under `surfaces/public-site/sections/pricing/` (decision D5), so the pricing page reaches them without crossing a component boundary at all.

Cycles: none, at module, component, domain-folder and UI-subpath level, proven by the `no-circular` rule over 378 modules and by an independent depth-first walk of the cruise graph. Inside C1 the eleven folders form a directed acyclic graph: `acquisition → {product, email-address, shared}`, `assessment-call → {coach-availability, email-address, feature-flag, shared}`, `download-grant → {product, shared}`, `waitlist → {email-address, feature-flag, shared}`, and `product`, `account`, `cart`, `coach-availability`, `feature-flag`, `email-address` and `shared` import nothing outside themselves, so `product`, `coach-availability` and `feature-flag` are sinks and no loop can close. Every one of those twelve edges enters the sibling's `index.ts`, never a deep path. C1, C2, C3, C4, C5 depend on no in-scope component. C1 has no external dependency at all. C16 has no edge in or out of the production graph.

External dependencies per component: C1 none; C2 drizzle-orm, pg; C3 zod; C4 node:crypto; C5 react, react-router, motion, radix-ui, react-day-picker, class-variance-authority, clsx, tailwind-merge; C6 react, resend, drizzle-orm, zod, node:crypto, fetch; C7 react, react-dom, react-router, react-hook-form, @hookform/resolvers, zustand, lucide-react, zod, drizzle-orm, archiver, node:crypto, node:fs, node:path, node:stream; C8 react, react-dom, react-router, motion (the email form's success transition, since the second parity round), lucide-react, canvas-confetti, zod, drizzle-orm, pg, node:crypto; C9 @clerk/react-router, react, react-router, lucide-react, zod, drizzle-orm; C11 react, react-router, motion, lucide-react (it absorbed C10's motion and lucide-react use with the pricing section); C12 react-router; C13 react-router, lucide-react; C14 react-router, zod, pg; C17 react, react-dom, react-router, react-hook-form, @hookform/resolvers, lucide-react, motion (the booking card's step transitions, since the booking-card rebuild), zod, drizzle-orm, @date-fns/tz (named by `ui/public/book/slot-grouping.ts` alone; `date-fns` itself is declared nowhere in the workspace); C15 @clerk/react-router, react, react-router, motion, lucide-react, @react-router/dev, vite, @tailwindcss/vite, drizzle-kit; C16 none.

## Forbidden edges

Every row is a named rule in `tools/dependency-cruiser.config.cjs` that fails `pnpm check:boundaries` — inside `pnpm typecheck`, `pnpm build`, every vitest run and the Docker builder stage — except the two rows marked review-owned. 35 rules; 34 have a fixture in `tools/boundary-fixtures/` and `tools/boundaries.test.mjs` asserts the exact set each fixture fires; `stability` alone is unfixtured. (Run 7 recorded 36 and 35; `browser-half-loaders` was deleted at `2173cbfb` when page loaders moved into their route modules, and `browser-half` already covered everything it forbade.) `tools/domain-layout.mjs` is a separate tool in the same gate and is not one of the 35 rules.

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
| a feature; a surface | the app's own `server/guards/`; for a surface, anything in them but `runtime-config-context` | R5 refinement | `server-guards-consumers` |
| a feature's api/, data/, email/, contracts/, ui/, routes.ts | its own `server/` outside `guards/` | R5 refinement | `feature-server-private` |
| any module but the runtime-environment and database modules, the readyz controller, the migration config and the integration rig | `@eli-coach-platform/config/runtime` | R33 | `config-runtime-readers` |
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

ESLint residue: `js.recommended`, jsx-a11y strict, and the app-root-alias `no-restricted-imports`/`no-restricted-syntax` pair, switched off for `apps/platform/src/surfaces/*/routes.ts` because the `~` alias does not resolve inside React Router's route-config loader. The boundary regions R1–R7, `createContainerFencedConfigs`, `createFeatureBoundaryConfigs`, `createSurfaceBoundaryConfigs`, the fenced lists and `tools/lint-boundaries.test.mjs` are deleted.

## Cross-feature protocol

A feature depends on another feature only through a published interface; everything else (`data/`, `email/`, `api/`, composition) stays private, and runtime objects cross features only through the container and the request context.

| Need | Satisfied at | Mechanism | Enforced by | Exercised at HEAD |
|---|---|---|---|---|
| Use another entity's types, ports and rules in policy code | domain folder to domain folder | import through the folder entry (`@eli-coach-platform/domain/<entity>`, or `../<entity>` inside the package) | `domain-slices`, `no-circular` | twelve edges: `acquisition`→`/product`, `acquisition`→`/email-address`, `acquisition`→`/shared`, `assessment-call`→`/coach-availability`, `assessment-call`→`/email-address`, `assessment-call`→`/feature-flag`, `assessment-call`→`/shared`, `download-grant`→`/product`, `download-grant`→`/shared`, `waitlist`→`/email-address`, `waitlist`→`/feature-flag`, `waitlist`→`/shared` |
| Know the current account | request context | read the accounts feature's `server/guards/` key | `guards-construct-nothing`, `server-guards-consumers` | yes |
| Look another feature's data up | a port the consumer declares | the consuming slice declares the narrow interface; the composition satisfies it | `feature-internals`, `feature-api-to-data` | no exercising edge |
| Reference another feature's table | persistence | `data/schema.server.ts` may import the other feature's `data/schema.server.ts` for a foreign key | `feature-schema-foreign-key` | no exercising edge |
| Compose another feature's UI | `ui/shared/` | the owning feature publishes the component or presenter | `feature-internals`, the three `surface-<s>-to-feature` rules | yes |
| Exchange wire data | `contracts/` | zod schemas and path literals | `feature-internals`, the three `surface-<s>-to-feature` rules | yes |
| E1490 | apps/platform/src/features/assessment-calls/api/coach-assessment-calls-controller.server.ts | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | import | no | no | lateral | present |
| E1491 | apps/platform/src/features/assessment-calls/api/coach-assessment-calls-controller.server.ts | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | no | no | lateral | present |
| E1492 | apps/platform/src/features/assessment-calls/api/coach-assessment-calls-controller.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present |
| E1493 | apps/platform/src/features/assessment-calls/api/coach-assessment-calls-controller.server.ts | packages/domain/src/shared/index.ts | import | yes | no | lateral | present |
| E1494 | apps/platform/src/features/assessment-calls/contracts/paths.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E1495 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | apps/platform/src/features/assessment-calls/api/coach-assessment-calls-controller.server.ts | import | no | no | lateral | present |
| E1496 | apps/platform/src/features/assessment-calls/ui/coach/assessment-call-listing.ts | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | import | no | no | lateral | present |
| E1497 | apps/platform/src/features/assessment-calls/ui/coach/assessment-call-listing.ts | apps/platform/src/features/assessment-calls/ui/shared/day-key.ts | import | no | no | lateral | present |
| E1498 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-page.tsx | apps/platform/src/features/assessment-calls/contracts/call-moment.ts | import | no | no | lateral | removed (GEN-193: the header no longer names the active zone, so the page stops importing `call-moment`) |
| E1499 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-page.tsx | apps/platform/src/features/assessment-calls/server/guards/assessment-calls-context.server.ts | import | no | no | lateral | present |
| E1500 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-page.tsx | apps/platform/src/features/assessment-calls/ui/coach/assessment-call-listing.ts | import | no | no | lateral | present |
| E1501 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-page.tsx | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | import | no | no | lateral | present |
| E1502 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-page.tsx | apps/platform/src/features/assessment-calls/ui/coach/use-coach-clock.ts | import | no | no | lateral | present |
| E1503 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | import | no | no | lateral | present |
| E1504 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | apps/platform/src/features/assessment-calls/contracts/call-moment.ts | import | no | no | lateral | present |
| E1505 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | apps/platform/src/features/assessment-calls/ui/coach/assessment-call-listing.ts | import | no | no | lateral | present |
| E1506 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/call-list-pager.tsx | import | no | no | lateral | present |
| E1507 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | apps/platform/src/features/assessment-calls/ui/coach/join-call-link.tsx | import | no | no | lateral | present |
| E1508 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | packages/ui/src/appointments/index.ts | import | yes | no | lateral | present |
| E1509 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1510 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1511 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx | packages/ui/src/tabs/index.ts | import | yes | no | lateral | present |
| E1512 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/call-list-pager.tsx | apps/platform/src/features/assessment-calls/ui/coach/assessment-call-listing.ts | import | no | no | lateral | present |
| E1513 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls/call-list-pager.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1514 | apps/platform/src/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget.tsx | apps/platform/src/features/assessment-calls/contracts/call-moment.ts | import | no | no | lateral | present |
| E1515 | apps/platform/src/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget.tsx | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | no | no | lateral | present |
| E1516 | apps/platform/src/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget.tsx | apps/platform/src/features/assessment-calls/ui/coach/assessment-call-listing.ts | import | no | no | lateral | present |
| E1517 | apps/platform/src/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget.tsx | apps/platform/src/features/assessment-calls/ui/coach/join-call-link.tsx | import | no | no | lateral | present |
| E1518 | apps/platform/src/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1519 | apps/platform/src/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget.tsx | packages/ui/src/appointments/index.ts | import | yes | no | lateral | present |
| E1520 | apps/platform/src/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1521 | apps/platform/src/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1522 | apps/platform/src/features/assessment-calls/ui/coach/join-call-link.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1523 | apps/platform/src/features/assessment-calls/ui/coach/use-coach-clock.ts | external:react | import | n/a | no | lateral | present |
| E1524 | apps/platform/src/features/assessment-calls/ui/coach/use-coach-clock.ts | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1525 | apps/platform/src/features/assessment-calls/ui/public/book/book-page.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1526 | apps/platform/src/features/assessment-calls/ui/public/book/slot-calendar.tsx | apps/platform/src/features/assessment-calls/ui/shared/day-key.ts | import | no | no | lateral | present |
| E1527 | apps/platform/src/features/assessment-calls/ui/public/book/slot-grouping.ts | apps/platform/src/features/assessment-calls/ui/shared/day-key.ts | import | no | no | lateral | present |
| E1528 | apps/platform/src/features/assessment-calls/ui/shared/day-key.ts | external:@date-fns/tz | import | n/a | no | lateral | present |
| E1529 | apps/platform/src/surfaces/coach-portal/pages/home.tsx | apps/platform/src/features/assessment-calls/server/guards/assessment-calls-context.server.ts | import | yes | no | lateral | present |
| E1530 | apps/platform/src/surfaces/coach-portal/pages/home.tsx | apps/platform/src/features/assessment-calls/ui/coach/assessment-call-listing.ts | import | yes | no | lateral | present |
| E1531 | apps/platform/src/surfaces/coach-portal/pages/home.tsx | apps/platform/src/features/assessment-calls/ui/coach/dashboard/coach-greeting.tsx | import | yes | no | lateral | present |
| E1532 | apps/platform/src/surfaces/coach-portal/pages/home.tsx | apps/platform/src/features/assessment-calls/ui/coach/dashboard/upcoming-calls-widget.tsx | import | yes | no | lateral | present |
| E1533 | apps/platform/src/surfaces/coach-portal/pages/home.tsx | apps/platform/src/features/assessment-calls/ui/coach/use-coach-clock.ts | import | yes | no | lateral | present |
| E1534 | apps/platform/src/surfaces/coach-portal/routes.ts | apps/platform/src/features/assessment-calls/routes.ts | import | yes | no | lateral | present |
| E1535 | apps/platform/src/surfaces/coach-portal/shell/navigation-links.tsx | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | yes | no | lateral | present |
| E1536 | packages/domain/src/assessment-call/index.ts | packages/domain/src/assessment-call/list-assessment-calls-use-case.ts | import | no | no | lateral | present |
| E1537 | packages/domain/src/assessment-call/list-assessment-calls-use-case.ts | packages/domain/src/assessment-call/assessment-call-reservations.ts | import | no | no | lateral | present |
| E1538 | packages/domain/src/assessment-call/list-assessment-calls-use-case.ts | packages/domain/src/assessment-call/assessment-call.ts | import | no | no | lateral | present |
| E1539 | packages/domain/src/assessment-call/list-assessment-calls-use-case.ts | packages/domain/src/coach-availability/index.ts | import | no | no | lateral | present |
| E1540 | packages/ui/src/appointments/appointment-card.tsx | external:react | import | n/a | no | lateral | present |
| E1541 | packages/ui/src/appointments/appointment-card.tsx | packages/ui/src/appointments/appointment-glyphs.tsx | import | no | no | lateral | present |
| E1542 | packages/ui/src/appointments/appointment-card.tsx | packages/ui/src/appointments/appointment.ts | import | no | no | lateral | present |
| E1543 | packages/ui/src/appointments/appointment-card.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1544 | packages/ui/src/appointments/appointment-card.tsx | packages/ui/src/primitives/avatar.tsx | import | no | no | lateral | present |
| E1545 | packages/ui/src/appointments/appointment-glyphs.tsx | external:react | import | n/a | no | lateral | present |
| E1546 | packages/ui/src/appointments/dashboard-appointment-row.tsx | external:react | import | n/a | no | lateral | present |
| E1547 | packages/ui/src/appointments/dashboard-appointment-row.tsx | packages/ui/src/appointments/appointment.ts | import | no | no | lateral | present |
| E1548 | packages/ui/src/appointments/index.ts | packages/ui/src/appointments/appointment-card.tsx | import | no | no | lateral | present |
| E1549 | packages/ui/src/appointments/index.ts | packages/ui/src/appointments/dashboard-appointment-row.tsx | import | no | no | lateral | present |
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

Enforcement names what fails if a consumer imports an implementer directly.

| ID | Port | Owner (ring) | Implementers (ring) | Consumers | Crossing data | Humble side | Enforcement |
|---|---|---|---|---|---|---|---|
| B190 | Accounts (U901) | C1 use-cases | U406 PostgresAccountRepository (adapters, C9) | U902, U948 | `Account` instances out, `{authSubjectId, role}` in | implementer | dependency-absence keeps C1 from naming the adapter; `feature-api-to-data` forbids the controller or route from importing the repository; `feature-internals` forbids another feature from reaching it; the composition hands it in |
| B191 | FeatureFlags (U906) | C1 use-cases | U1027 PostgresFeatureFlagRepository (adapters, C6) | U909 | `FeatureFlag[]` instances | implementer | dependency-absence; exports |
| B192 | FeatureFlagReader (U907) | C1 use-cases | U909 GetFeatureFlagsUseCase, in the same module | U534 FeatureFlagController; U963 GetWaitlistUseCase; U1300 AssessmentCallBookingWindow | FeatureFlagSet (plain `Record<string, boolean>`, published through `./feature-flag`) | use case | dependency-absence, the `./feature-flag` entry and `domain-slices`; all three consumers use its one `execute` member |
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
| B269 | CoachAvailabilitySource (U1265) | C1 use-cases | U1223 StaticCoachAvailability (adapters, C17) | U1259, U1260 | a `CoachAvailability` instance out of `current()` | implementer | dependency-absence. `current()` is the only read: both use cases take the coach's zone off the instance it returns, per call, and the implementer has no other member |
| B270 | AssessmentCallNotifications (U1257) | C1 use-cases | U1226 EmailAssessmentCallNotifications (adapters, C17), built by `createAssessmentCallNotifications` | U1259 | `AssessmentCallSnapshot` in (plain data with the derived `endsAt`); a per-recipient `sent \| failed` record out | implementer | dependency-absence |
| B271 | MeetingRoomLink (U1258) | C1 use-cases | U1224 ConfiguredMeetingRoomLink (adapters, C17) | U1261 | `AssessmentCallSnapshot` in, a URL string out | implementer | dependency-absence. The deferred video-provider decision sits behind this port: today it ignores the call and returns the one configured room |
| B272 | CoachCalendar (U1291) | C1 use-cases | U1293 PostgresCoachCalendar (adapters, C6), reading the rows U1294 writes | U1260 | a `from` instant in; `TimeInterval[]` out, plain data with no kind or appointment | implementer | dependency-absence. An external calendar is a second adapter behind this port, merged in the composition; the write side is not a port but the transaction-scoped `reserveCoachTime` / `releaseCoachTime` pair, because each appointment kind's repository must reserve inside its own transaction (D4) |
| B273 | AssessmentCallIncidents (U1299) | C1 assessment-call (use-cases) | U519 createConsoleLogger | U1259 BookAssessmentCallUseCase, U1260 ListOpenSlotsUseCase, U1300 AssessmentCallBookingWindow | a recipient on `notificationFailed`; no payload otherwise | implementer | dependency-absence, `./assessment-call` export, composition injection |
| B100 | ZipDeliveryStream (structural type declared by its consumer, `downloads-controller.server.ts:12-14`) | C7 adapters | U114 ZipDeliveryStream | U107 | DownloadGrant in, ProductAssetOpenResult out. `planGrantEntries` walks `grant.items` rather than `GrantDelivery.bundle.assets` because it needs `item.productSlug` for the zip entry name | U114 | none (structural typing, which is where R5 puts it) |
| B120 | StoreCartState (U204, Zustand store shape) | C7 ui/public (adapters) | U205 createStoreCartStore | U210–U218, U237, U248, C11 shell/layout.tsx | object with functions and productSlugs | consumers | none |
| B121 | useStoreCatalogFetcher / useStoreAcquisitionFetcher (U202, U203) | C7 ui/public | same | U213, U218 | StoreCatalogResponse / parsed acquisition response | callers | none |
| B122 | usePrivateDownloadToken (U244) | C7 ui/public | same | U241 | string or null | download page | none |
| B123 | React Router loader contract | framework | U231, U247, U604, U415, U521 | routes.ts, page modules | loader data types; no domain instance crosses it (`conventions.md`) | page view | React Router strips `.server` modules from the client build; `browser-half` and `route-thinness-domain` |
| B140 | sessionContext RouterContext<ResolvedSession> (U408) | C9 server/guards (frameworks) | U410 sets it | U411, U412, U604 | `ResolvedSession` with `account: AccountSnapshot`; default `{ kind: "anonymous" }` | React Router context | `guards-construct-nothing`, `server-guards-consumers` |
| B143 | requirePortalAccess (U411) | C9 server/guards | portal layout middleware in C12, C13 | U705, U711 | `(args, { role })`, reading `accountsContext.portal`; returns `AccountSnapshot` | caller | `server-guards-consumers` |
| B144 | the six request-context keys | C7, C8, C9, C17 `server/guards/` and C14 `server/guards/` | `createFeatureContextMiddleware` (U517) sets all six from the container | `accountsContext` (accounts routes, the resolution middleware, the portal guards), `storeContext` (store routes and loaders), `waitlistContext` (the waitlist route and the public-site layout loader), `assessmentCallsContext` (the two assessment-call routes and the two booking pages), `platformContext` (`server/api/*` only), `runtimeConfigContext` (the public-site layout loader only) | the feature slice or `{ appBasePath, botDetection }` | the context key | each is created with `createContext<…>()` and constructs nothing (`guards-construct-nothing`); `server-guards-consumers` fences `platformContext` |
| B151 | PlatformDatabase.client deferred DatabaseClient proxy | C14 (frameworks) | private createDeferredDatabaseClient in U503 | every repository built by a feature composition | DatabaseClient (Drizzle type) | proxy | none |
| B152 | PlatformContainer (U502) composition output | C14 composition | U500 | `root.server.ts` only | a record of feature slices `{ accounts, assessmentCalls, closeDatabase, platform, store, waitlist }` | root.server.ts | `composition-root` |
| B180 | Radix wrapper boundary in C5 | C5 frameworks | checkbox, filter-chip-group, sheet, navigation-dialog (avatar, the general dialog and select are deleted) | apps through the concern subpaths | React props | C5 component | none |
| B181 | SearchParamsWriter (U805) | C5 lib (adapters) | C5 | U237 catalog-view | { searchParams, writeSearchParams } | consumer | none |
| B182 | packages/ui export map | C5 | seven concern `index.ts` entries plus `styles.css`; no root barrel | apps/platform/src, app.css | components, CSS | consumers | exports, `ui-subpaths`, `ui-primitives-import-only-lib`, `ui-lib-is-the-base` |
| B260 | DatabaseClient (U1151, Drizzle NodePgDatabase) | C2 adapters | drizzle() | U503; every repository in C7, C8, C9, C17, C6 | Drizzle ORM instance (detail type). `DatabaseTransaction`, the handle a `transaction` callback receives, is published beside it and named by U1294, U1221 and U125 | C2 | exports |
| B261 | appSchema (U1154, the `app` Postgres namespace) | C2 frameworks | tables attached by U126, U304, U407, U1028, U1295 | same five | drizzle PgSchema builder | consumers | convention; drizzle.config.ts globs discover the tables |
| B262 | RuntimeEnvironment (U1170) | C3 frameworks | the intersection of nine concern shapes with five refinements, composed in `runtime-environment.ts` and loaded from the `./runtime` entry by U1171; the `assessment-calls` shape is one of the four with no refinement | U510 (memoised) only; every other consumer imports the concern type it reads (`AppConfig`, `DatabaseConfig`, `WaitlistConfig`, `BotDetectionSettings`, `ProductEmailConfig`, `ManagementApiConfig`, `AssessmentCallsConfig`) from `.` | typed env object | C3 | exports, `config-runtime-readers` |
| B263 | DatabaseBootstrapEnvironment / DatabaseConnection / DatabaseUserCredentials | C3 | U1174 | U503 | plain credential structures | C3 | exports |
| B265 | packages/test-support (U1191) | C16 | fixture only | test files only | Clerk-shaped fixture | tests | exports plus `no-production-import-of-tests` and `not-to-dev-dep`; the Docker builder also asserts the package is absent after `pnpm --prod deploy` |

## Entry points and composition roots

| Kind | Path | Constructs |
|---|---|---|
| composition-root | apps/platform/src/server/container.server.ts (createPlatformContainer, memoised by getPlatformContainer) | the shared handles once — `createPlatformDatabase`, the `Clock` implementation, `createConsoleLogger()`, `createBotVerifier()`, `createManagementAuthConfig()` and `createManagementAuthenticator()`, `createProductEmail()`, one `PostgresFeatureFlagRepository` and one `GetFeatureFlagsUseCase` — then `composeAccountsFeature`, `composeAssessmentCallsFeature`, `composePlatformFeature`, `composeStoreFeature`, `composeWaitlistFeature`, passing the same feature-flag reader to the platform, waitlist and assessment-calls compositions. One console logger implements B266, B267 and B273 |
| composition-root (second) | apps/platform/src/root.server.ts | `clerkMiddleware()`, `createFeatureContextMiddleware(getPlatformContainer)`, `createAccountResolutionMiddleware()`; the container's only importer |
| composition-site | apps/platform/src/features/accounts/server/accounts-composition.server.ts | the account repository, `ProvisionAccountUseCase`, `DeleteAccountUseCase`, and the account and webhook controllers; `AccountsFeatureHandles` names only what the feature reads |
| composition-site | apps/platform/src/features/store/server/store-composition.server.ts | the store repositories, asset store and digests, token generators, zip stream, `EmailProductDelivery`, the eight `/product`, `/acquisition` and `/download-grant` use cases, and the five store controllers; `StoreFeatureHandles` names only what the feature reads |
| composition-site | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | `StaticCoachAvailability`, `PostgresAssessmentCallRepository`, `PostgresCoachCalendar` (C6, for `ListOpenSlotsUseCase`), `ConfiguredMeetingRoomLink`, `createAssessmentCallNotifications(...)`, the three `/assessment-call` use cases and `AssessmentCallsController`. Synchronous, and no use case receives a value read off an adapter at composition: `BookAssessmentCallUseCase` reads the coach's zone from `availability.current()` inside `execute()`. The two assessment-call variables arrive as the handle `assessmentCallsConfig` (the container passes the runtime environment, typed as `AssessmentCallsConfig`). The container's shared `FeatureFlagReader` and incidents handle arrive as `featureFlags` and `incidents`; the composition builds one `AssessmentCallBookingWindow` from them, held by the two use cases, not by the controller (CH-F) |
| composition-site | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | `Waitlist.configure(...)` from the offer config, the waitlist repository, `EmailWaitlistConfirmation`, `GetWaitlistUseCase` with the supplied `FeatureFlagReader`, `JoinWaitlistUseCase` and the waitlist controller; `WaitlistFeatureHandles` is module-private |
| composition-site | apps/platform/src/server/platform-composition.server.ts | readyz, metadata and feature-flag controllers plus the runtime config the public site reads; it receives `FeatureFlagReader`, no longer constructs its persistence, and keeps `PlatformFeatureHandles` module-private |
| construction-site | apps/platform/src/server/database.server.ts (openPool, lazy) | pg Pool via createManagedDatabasePool; Drizzle client via createDatabaseClient |
| construction-site | apps/platform/src/features/store/email/create-product-delivery.server.ts | EmailProductDelivery over the `ProductEmail` it is handed; no provider branch |
| construction-site | apps/platform/src/features/waitlist/email/create-waitlist-confirmation.server.ts | EmailWaitlistConfirmation over the `ProductEmail` it is handed; no provider branch |
| construction-site | packages/infrastructure/src/email/create-product-email.server.ts | InMemoryProductEmail or `new Resend()` + ResendProductEmail, selected on `PRODUCT_EMAIL_PROVIDER` (`memory \| resend`) |
| construction-site | packages/infrastructure/src/bot-detection/verifier/create-bot-verifier.server.ts | StaticTokenBotVerifier or TurnstileBotVerifier, selected on `BOT_DETECTION_PROVIDER`; no `ENVIRONMENT` sniff |
| construction-site | packages/infrastructure/src/management-auth/create-management-authenticator.server.ts | BearerSecretManagementAuthenticator (bearer only) |
| construction-site | apps/platform/src/features/store/api/downloads/zip-stream.server.ts (ZipDeliveryStream.create) | archiver ZipArchive at request time |
| construction-site | apps/platform/src/features/store/ui/public/cart/cart.ts, cart-provider.tsx | Zustand store with persist over localStorage (`cart-storage.ts`); one store per provider |
| route registry | apps/platform/src/routes.ts | a concatenation of eight fragments (`publicSiteRoutes`, `platformApiRoutes`, `accountsApiRoutes`, `waitlistApiRoutes`, `storeApiRoutes`, `assessmentCallsApiRoutes`, `clientPortalRoutes`, `coachPortalRoutes`), each built with `relative(import.meta.dirname)` in its own feature or surface, with no path literals of its own. The registered route table is identical to the baseline in paths and files, but React Router assigns different route ids to `relative()`-built routes; nothing in the app consumes a route id, so the difference is inert. `surfaces/public-site/routes.ts` imports `index` unscoped while destructuring `layout` and `route` from `relative(…)`, so the index child's file path is app-root-relative where its siblings are directory-relative |
| route (page) | surfaces/public-site/shell/layout.tsx (+ layout.server.ts loader), pages/{home,pricing,blog,privacy,terms}.tsx | the loader reads `waitlistContext`, `sessionContext` and `runtimeConfigContext` off `args.context` and returns `presentWaitlist(...)`. `pages/pricing.tsx` exports `handle.publicContentFrame = "full-bleed"`, as the booking page does, so the layout drops its padded frame for both |
| route (page) | features/store/ui/public/{catalog/catalog-page,product/product-page,download/download-page}.tsx (+ .server.ts loaders) | the loaders read `storeContext` |
| route (page) | features/accounts/ui/public/sign-in-failed-page.tsx (+ .server.ts) | reads `accountsContext`. Registered through `accountsDeadEndRoutes`, which `surfaces/public-site/routes.ts` spreads after the layout route rather than inside it, so the page renders as a dead end with no public shell |
| route (page) | features/assessment-calls/ui/public/book/book-page.tsx, ui/public/join/join-page.tsx | both loaders read `assessmentCallsContext` and nothing else. The booking loader returns an `unavailable` presentation rather than throwing when slots cannot be read (D21), and 404s while booking is closed because `ListOpenSlotsUseCase` answers `closed`. The join loader redirects 302 to the meeting room for a known id, and for any id that does not resolve, a malformed one included, throws a 404 `Response` that the root `ErrorBoundary` in `root.tsx` renders as the app's standard "Page not found" page, which echoes no id. The module keeps a default export that returns `null` only so it stays a page route: without a component React Router would register it as a resource route. The loader does not read the mode, so a join link keeps working if the site returns to waiting-list mode. The booking page module also exports `handle.publicContentFrame` as `"full-bleed"`, which the public-site layout reads through `useMatches` to drop its padded content frame |
| route (page) | surfaces/client-portal/shell/layout.tsx (+ middleware), pages/home.tsx; surfaces/coach-portal/shell/layout.tsx (+ middleware), pages/home.tsx | middleware calls `requirePortalAccess(args, { role })` |
| route (resource) | features/store/api/{acquisitions/acquisitions,catalog/catalog,covers/covers,downloads/downloads,management/management-product-validations,management/management-products,management/management-product,management/management-product-versions}.ts | read `storeContext` |
| route (resource) | features/waitlist/api/waitlist.ts; features/accounts/api/{account,clerk-webhooks}.ts; features/assessment-calls/api/{slots,bookings}.ts | read `waitlistContext` / `accountsContext` / `assessmentCallsContext` |
| route (resource) | server/api/{readyz/readyz,meta/meta,feature-flags/feature-flags}.ts | read `platformContext` |
| route (resource) | surfaces/client-portal/api/{manifest,sw,readyz}.ts; surfaces/coach-portal/api/readyz.ts | pwa definitions; static Response |
| middleware | root.server.ts (Clerk, feature contexts, account resolution); portal layout.server.ts (role guards) | see above |
| CLI/build | apps/platform/db/drizzle.config.ts (schema globs), vite.config.ts, react-router.config.ts | tooling entry points, not imported by app code |
| package deployment | package manifests and docker/Dockerfile.react-router | `apps/platform` emits only `build`; runtime config, content, domain, infrastructure, and UI packages retain production source/artifacts while excluding `src/**/*.test.*` and `src/**/*.spec.*`; the Docker builder requires `build/server/index.js`, rejects top-level `src` and `e2e`, recursively rejects test/spec files under `node_modules/@eli-coach-platform`, and rejects `@eli-coach-platform/test-support` |

## Shared data shapes

| Shape | Components reading or writing it | Owning component |
|---|---|---|
| Postgres namespace `app` (appSchema) and the migration journal apps/platform/db/drizzle | C2 declares the namespace; C7 (store tables), C8 (waitlist_entries), C9 (accounts, account_role enum), C6 (feature_flags) attach tables; C15 drizzle.config.ts discovers them by glob | C2 owns the namespace; each table is owned by the feature that declares it |
| `app.waitlist_entries.reduced_slot` and its constraints | C8 declares them in U304 and migration 0019 (U1212); U303 allocates slots; U1211 reads the constraint names | C8 owns the table; N is U911's `WAITLIST_REDUCED_PRICING_CAP`, and changing it is a migration in the same PR (b3eb2653) |
| `app.feature_flags`, including `WAITLIST_MODE` | C6 declares and reads it; C15 migration 0018 seeds `WAITLIST_MODE=true`; C14 constructs the generic reader; U1203 and integration tests write it only for test arrangement | C6 owns the table; U963 owns the waitlist-mode interpretation and U1300 the booking one, both through `WAITLIST_MODE_FEATURE_FLAG` |
| store zod contracts (contracts/store.ts, store-management.ts) | C7 server half and C7 ui half; C11 through `contracts/` | C7 |
| waitlist zod contracts (contracts/waitlist.ts) | C8; C11 | C8 |
| assessment-call zod contracts (contracts/assessment-calls.ts) | C17 server half and C17 ui half only; no other component reads them | C17 |
| The call-moment wording (contracts/call-moment.ts: `formatCallMoment`, `formatDayFirstDate`, `formatMonthFirstDate`, `formatMonthFirstDay`, `formatClockTime`, `nameTimeZone`) | C17 only: the two email content builders read `formatCallMoment`, which is built on `formatDayFirstDate` and `formatClockTime`; `slot-calendar.tsx` reads `formatDayFirstDate` for the days' accessible names; the booking confirmation, the call overview and the slot picker read the on-screen date (`formatMonthFirstDate`), day heading (`formatMonthFirstDay`), time (`formatClockTime`) and zone (`nameTimeZone`). One module words a call for the emails and the screen, each formatter is named for its wording and every wording names its locale, so the server and the browser render a call identically; every function takes `(instant, timeZone)`, and one `Intl.DateTimeFormat` per wording and zone is cached for the life of the process | C17 |
| The assessment-call rule literals (ASSESSMENT_CALL_RULES: duration, buffer, step, horizon, lead) | C1 `/assessment-call` owns them as a `SlotPolicy` since the coach-calendar refactor; `/coach-availability` defines the `SlotPolicy` shape and names no appointment kind. `stepMinutes` is not a literal: it is derived as duration plus buffer from two module constants. `AssessmentCall` reads the duration to derive `endsAt`; `CoachAvailability` reads the duration, step, horizon and lead time off whichever policy it is handed, the duration so that a start is offered only if the call ends inside the window; `SlotPolicy.of` rejects an invalid policy, so a wrong literal fails at module load; `SlotPolicy.coachTimeFrom` reads the duration and the buffer to size the coach's held interval, which the slot filter tests for overlap and the repository reserves. No adapter re-applies the duration to compute an end: C17 reads `durationMinutes` only as a label (the controller's response and the wire literal, the email copy and `.ics` description, `CallOverview` on the page) and no longer reads `horizonDays`: since the booking-card rebuild the calendar's months are unbounded and a day with no open slot is disabled | C1 |
| accounts contracts (PublicSessionState, accountResponseSchema, AccountRole) | C9; C11; AccountRole originates in C1 | C9 (wire) / C1 (role) |
| BotDetectionConfig (zod schema in C6) | C6; C7 ui; C8 ui; C11 loader data and props | C6 |
| FeatureFlagSnapshot (featureFlagSnapshotSchema) | C14 controller and route; integration tests | C14 (`server/api/feature-flags/feature-flags-contract.ts`) |
| RuntimeEnvironment | nine concern shapes, each owned by its `concerns/*.ts` module; consumers read the concern type, and only `apps/platform/src/server/runtime-environment.server.ts` loads the process environment | C3 |
| Route path literals | one owner each: `features/<feature>/contracts/paths.ts` and `surfaces/public-site/paths.ts`. The `client` and `coach` portal segments are owned by the accounts feature because `surface-import` forbids a feature importing a surface; `BOOK_PATH` is owned by the assessment-calls feature and read by three public-site modules | C7, C8, C9, C11, C17 |
| The offer-plan literal `"all-bundles"` | C1 `/waitlist` owns it (`waitlist.ts:WaitlistOfferPlan`); read by C8 `ui/shared` (`bundleOfferPlan` on `WaitlistPresentation`), and re-declared as a bare string in C8 `contracts/waitlist.ts`, C8 `email/waitlist-confirmation-email.server.ts` and C3 `concerns/waitlist.ts` | C1 |
| WaitlistPresentation (mode, isClosed, isUnavailable, showsAuthControls, availabilityStatus, bundleOfferPlan) | C11 shell, hero, about, footer CTA, pricing and the email form. The closed/unavailable/open **copy** branch is re-derived in `hero.tsx`, `footer-cta.tsx` and `pricing.tsx` rather than carried on the presentation (owner ruling: copy tables stay in views) | C8 `ui/shared` |
| CoachingBundleCard (+ the presenter's `benefits` and `showsWaitlistPricing`) | consumers `BundleSelector` and `pages/pricing.tsx`, both inside C11; no longer a cross-component shape | C11 `surfaces/public-site/sections/pricing` |
| localStorage cart (STORE_CART_STORAGE_KEY) | C7 ui only | C7 |
| Email HTML rendered from React primitives (Email*) | C6 owns the primitives; the content builders live in each feature's `email/` folder (accepted exception) | C6 |
| CLERK_TEST_ENVIRONMENT | read only by tests | C16 |

## Edges

An edge from A to B means A's source names B. Direction `inward` points toward policy (ring order: entities, use-cases, adapters, frameworks, composition). Generated from every `import`, `export … from`, dynamic `import()` and CSS `@import` in the 355 in-scope production modules of the working tree that merges main (e2d86a3a) into the GEN-191 branch at ea81d98f, one row per module pair (a module that imports the same target twice, once type-only, still has one row); kind is `import` for all rows (the `implements` and `constructs` relationships are recorded in the Boundaries and Entry points sections above). Crosses-ring compares the majority ring of the two modules from `units.md`; an edge into a `packages/domain` folder entry is recorded `lateral`, because a subpath barrel is a publication surface rather than a ring of its own. Externals are tagged framework, vendor or runtime. The cruise resolves every specifier (zero `couldNotResolve`), but `options.exclude.path` in `tools/dependency-cruiser.config.cjs` carries `"\\.d\\.ts$"`, and the cruiser applies it to resolved targets as well as to sources: an external whose resolution lands on a `.d.ts` file is dropped with its edges. That is why `react-router`, `@react-router/dev`, `@clerk/react-router`, `motion`, `react-day-picker`, `drizzle-orm`, `react-hook-form`, `@hookform/resolvers` and `tailwind-merge` are named in the per-component external list above but have no `external:` row here; packages that resolve to `.js`, `.mjs`, `.d.mts` or `.d.cts` (`zod`, `resend`, `radix-ui`, `clsx`, `@date-fns/tz` among them) keep theirs. The per-component list is read from each module's source, not from this table. Component membership is by path (see `components.md`). Edge IDs are stable across runs: 491 of these rows keep the ID run 6 gave them, E738-E1013 came in with run 8, E1216-E1367 came in with GEN-191's slices, and E1368-E1382 came in with its review fix round, which also deleted seven rows for edges the code no longer has and one duplicate `booking-details-form.tsx → react` row. E1383-E1385 came in with the remediation round (`book-page.tsx → step-heading-focus.ts`, `step-heading-focus.ts → react`, `booking-confirmation.tsx → react`), which deleted E1377 (`join-page.tsx → packages/ui` primitives) and E1379 (`textarea.tsx → class-variance-authority`, an edge the second fix round had already removed from the code). E1386-E1407 came in with the booking-card rebuild, which deleted twelve rows for edges the code no longer has: E1293, E1295 and E1370 (the page's imports of `slot-calendar.tsx`, `slot-list.tsx` and `call-facts.tsx`), E1371, E1372 and E1376 (the confirmation, the details form and the slot list into `contracts/call-moment.ts`), E1373 and E1374 (`call-facts.tsx`), E1320 (`slot-grouping.ts` into C1), E1364 and E1366 (`calendar.tsx` into `react` and `./primitives`), and E1382 (`textarea.tsx → input.tsx`). E1408-E1415 came in with the second parity round (`7a61673f..d3513898`): the three dead-end pages into `./layout` (E1408, E1409, E1411), the waitlist email form into `./motion` (E1410), `about.tsx` into `./primitives` (E1412), and the new `layout/dead-end-page.tsx` into `react` and `./primitives` and from the `./layout` entry (E1413-E1415). It deleted nine rows for edges the code no longer has: E45, E49 and E298 (the same three pages into `./primitives`), E286 (the email form into `./primitives`), E413 (`about.tsx` into `./motion`), E445 and E447 (`hero.tsx` into `./lib` and `./primitives`), E861 (`platform-content.ts → react`, whose icon type is now lucide's) and E1008 (`input.tsx → class-variance-authority`, gone with the input's variants). E1463-E1469 came in with the GEN-191 fix round (`47edb229..59c019ec`): `auth-nav-actions.tsx` and `catalog-view.tsx` into `./primitives` (E1463, E1465), `book-page.tsx` into its new `book-page.css` (E1464), `logo.tsx`, `public-layout.tsx` and `public-navigation.tsx` into the new `header-appearance.ts` (E1466-E1468), and the C2 entry into the new `database-error.ts` (E1469). It deleted four rows for edges the code no longer has: E1420, E1393, E1430 and E1436 (`access-denied-page.tsx`, `booking-confirmation.tsx`, `root-error-page.tsx` and `pricing.tsx` into `./lib`). E1448, E1450, E1451 and E1454 keep their IDs with their target renamed from `busy-interval.ts` to `time-interval.ts`. A row whose source module was only edited keeps its old ID. The generating command is `npx depcruise --config tools/dependency-cruiser.config.cjs --output-type json apps/platform/src packages/{config,content,db,domain,infrastructure,test-support,ui}/src`. On main's side, the PR #229 review allocated E1014-E1019 and E1021-E1038, and E333 retains its frozen-base identity; the persisted waitlist-mode change allocated E1039-E1043; E1200-E1212 record the PR #230 Radix mobile navigation, and E1213-E1215 the waitlist capacity enforcement (PR #232, `e2d86a3a`). Main marks a removed or retyped edge in place, in the Status column, instead of deleting its row, and the merge keeps those rows. The merge with main renumbered every GEN-191 edge ID by +202 (E1014-E1272 became E1216-E1474) so that main's E1014-E1043 and E1200-E1215 keep theirs; the GEN-191 ranges in this paragraph are the renumbered ones. The merge resolution added E1475-E1489: the assessment-call email factory, adapter and composition into C6's `./email/server`, the composition into `./bot-detection/server` and `/feature-flag`, the console logger into `/assessment-call`, and the booking window's and the incidents port's edges inside `/assessment-call` and into `/feature-flag`; it marks E1220, E1252 and E1259 (the assessment-call controller, notification factory and adapter into `domain/shared`) removed, because the contracts they named moved to C6.

No edge leaves a `packages/domain` unit for a detail or an external: C1's fan-out is zero, and the package declares no dependencies and sets `"types": []`. That still holds for `/assessment-call` and `/coach-availability`, whose zone arithmetic is `Intl` and `Date` only.

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
| E740 | apps/platform/src/features/accounts/contracts/account.ts | packages/domain/src/account/index.ts | import | yes | yes | inward | present |
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
| E36 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | apps/platform/src/features/accounts/contracts/paths.ts | import | no | no | lateral | present |
| E749 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | external:react | import | n/a | no | lateral | present |
| E750 | apps/platform/src/features/accounts/ui/public/auth-nav-actions.tsx | packages/domain/src/account/index.ts | import | yes | yes | inward | present |
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
| E1216 | apps/platform/src/features/assessment-calls/api/assessment-calls-controller.server.ts | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | import | no | no | lateral | present |
| E1218 | apps/platform/src/features/assessment-calls/api/assessment-calls-controller.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present |
| E1220 | apps/platform/src/features/assessment-calls/api/assessment-calls-controller.server.ts | packages/domain/src/shared/index.ts | import | yes | no | lateral | removed (main merge: the contract moved from C1 `/shared` to C6) |
| E1221 | apps/platform/src/features/assessment-calls/api/assessment-calls-controller.server.ts | packages/infrastructure/src/bot-detection/index.server.ts | import | yes | no | lateral | present |
| E1222 | apps/platform/src/features/assessment-calls/api/assessment-calls-controller.server.ts | packages/infrastructure/src/bot-detection/index.ts | import | yes | no | lateral | present |
| E1223 | apps/platform/src/features/assessment-calls/api/bookings.ts | apps/platform/src/features/assessment-calls/server/guards/assessment-calls-context.server.ts | import | no | no | lateral | present |
| E1224 | apps/platform/src/features/assessment-calls/api/bookings.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E1225 | apps/platform/src/features/assessment-calls/api/slots.ts | apps/platform/src/features/assessment-calls/server/guards/assessment-calls-context.server.ts | import | no | no | lateral | present |
| E1226 | apps/platform/src/features/assessment-calls/api/slots.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E1227 | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | external:zod | import | n/a | no | lateral | present |
| E1438 | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present |
| E1229 | apps/platform/src/features/assessment-calls/data/configured-meeting-room-link.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present |
| E1230 | apps/platform/src/features/assessment-calls/data/repository.server.ts | apps/platform/src/features/assessment-calls/data/schema.server.ts | import | no | no | lateral | present |
| E1439 | apps/platform/src/features/assessment-calls/data/repository.server.ts | external:crypto | import | n/a | yes | outward | present |
| E1231 | apps/platform/src/features/assessment-calls/data/repository.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E1232 | apps/platform/src/features/assessment-calls/data/repository.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present |
| E1440 | apps/platform/src/features/assessment-calls/data/repository.server.ts | packages/infrastructure/src/coach-calendar/index.server.ts | import | yes | no | lateral | present |
| E1233 | apps/platform/src/features/assessment-calls/data/schema.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E1234 | apps/platform/src/features/assessment-calls/data/static-coach-availability.server.ts | packages/domain/src/coach-availability/index.ts | import | yes | no | lateral | present |
| E1235 | apps/platform/src/features/assessment-calls/email/assessment-call-email-actions.server.tsx | apps/platform/src/features/assessment-calls/email/assessment-call-email-styles.server.ts | import | no | no | lateral | present |
| E1236 | apps/platform/src/features/assessment-calls/email/assessment-call-email-actions.server.tsx | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
| E1237 | apps/platform/src/features/assessment-calls/email/assessment-call-email-styles.server.ts | external:react | import | n/a | no | lateral | present |
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
| E1252 | apps/platform/src/features/assessment-calls/email/create-assessment-call-notifications.server.ts | packages/domain/src/shared/index.ts | import | yes | no | lateral | removed (main merge: the contract moved from C1 `/shared` to C6) |
| E1475 | apps/platform/src/features/assessment-calls/email/create-assessment-call-notifications.server.ts | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | added (main merge) |
| E1253 | apps/platform/src/features/assessment-calls/email/email-assessment-call-notifications.server.ts | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | no | no | lateral | present |
| E1254 | apps/platform/src/features/assessment-calls/email/email-assessment-call-notifications.server.ts | apps/platform/src/features/assessment-calls/email/calendar-invite.server.ts | import | no | no | lateral | present |
| E1255 | apps/platform/src/features/assessment-calls/email/email-assessment-call-notifications.server.ts | apps/platform/src/features/assessment-calls/email/coach-notification-email.server.ts | import | no | no | lateral | present |
| E1256 | apps/platform/src/features/assessment-calls/email/email-assessment-call-notifications.server.ts | apps/platform/src/features/assessment-calls/email/visitor-confirmation-email.server.ts | import | no | no | lateral | present |
| E1257 | apps/platform/src/features/assessment-calls/email/email-assessment-call-notifications.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E1258 | apps/platform/src/features/assessment-calls/email/email-assessment-call-notifications.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present |
| E1259 | apps/platform/src/features/assessment-calls/email/email-assessment-call-notifications.server.ts | packages/domain/src/shared/index.ts | import | yes | no | lateral | removed (main merge: the contract moved from C1 `/shared` to C6) |
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
| E1271 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | apps/platform/src/features/assessment-calls/api/assessment-calls-controller.server.ts | import | no | yes | inward | present |
| E1272 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | apps/platform/src/features/assessment-calls/data/configured-meeting-room-link.server.ts | import | no | yes | inward | present |
| E1273 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | apps/platform/src/features/assessment-calls/data/repository.server.ts | import | no | yes | inward | present |
| E1274 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | apps/platform/src/features/assessment-calls/data/static-coach-availability.server.ts | import | no | yes | inward | present |
| E1275 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | apps/platform/src/features/assessment-calls/email/create-assessment-call-notifications.server.ts | import | no | yes | inward | present |
| E1276 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/config/src/index.ts | import | yes | yes | inward | present |
| E1277 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/db/src/index.ts | import | yes | yes | inward | present |
| E1278 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | yes | lateral | present |
| E1477 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/domain/src/feature-flag/index.ts | import | yes | yes | inward | added (main merge) |
| E1279 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | lateral | present |
| E1478 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/infrastructure/src/bot-detection/index.server.ts | import | yes | yes | inward | added (main merge) |
| E1280 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | inward | present |
| E1441 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/infrastructure/src/coach-calendar/index.server.ts | import | yes | yes | inward | present |
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
| E1292 | apps/platform/src/features/assessment-calls/ui/public/book/book-page.tsx | apps/platform/src/features/assessment-calls/ui/public/book/display-time-zone.ts | import | no | no | lateral | removed (GEN-193: `useDisplayTimeZone` moved to C5 `./lib`) |
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
| E1315 | apps/platform/src/features/assessment-calls/ui/public/book/display-time-zone.ts | external:react | import | n/a | no | lateral | removed (GEN-193: the module moved to `packages/ui/src/lib/use-display-time-zone.ts`) |
| E1375 | apps/platform/src/features/assessment-calls/ui/public/book/slot-calendar.tsx | apps/platform/src/features/assessment-calls/contracts/call-moment.ts | import | no | no | lateral | present |
| E1316 | apps/platform/src/features/assessment-calls/ui/public/book/slot-calendar.tsx | apps/platform/src/features/assessment-calls/ui/public/book/slot-grouping.ts | import | no | no | lateral | removed (GEN-193: `dayKeyOf` moved to `ui/shared/day-key.ts`) |
| E1317 | apps/platform/src/features/assessment-calls/ui/public/book/slot-calendar.tsx | external:react | import | n/a | no | lateral | present |
| E1318 | apps/platform/src/features/assessment-calls/ui/public/book/slot-calendar.tsx | packages/ui/src/calendar/index.ts | import | yes | no | lateral | present |
| E1319 | apps/platform/src/features/assessment-calls/ui/public/book/slot-grouping.ts | external:@date-fns/tz | import | n/a | no | lateral | removed (GEN-193: `dayKeyOf` moved to `ui/shared/day-key.ts`) |
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
| E797 | apps/platform/src/features/store/email/store-delivery-email-template.server.tsx | external:react | import | n/a | yes | outward | present |
| E134 | apps/platform/src/features/store/email/store-delivery-email-template.server.tsx | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
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
| E824 | apps/platform/src/features/waitlist/data/repository.server.ts | external:pg | import | n/a | yes | outward | removed (b3eb2653; the repository no longer names `QueryResult`) |
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
| E831 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email-template.server.tsx | external:react | import | n/a | yes | outward | present |
| E253 | apps/platform/src/features/waitlist/email/waitlist-confirmation-email-template.server.tsx | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
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
| E300 | apps/platform/src/root.server.ts | apps/platform/src/server/container.server.ts | import | yes | yes | outward | present |
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
| E336 | apps/platform/src/server/container.server.ts | packages/config/src/index.ts | import | yes | yes | inward | present |
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
| E354 | apps/platform/src/server/logger.server.ts | packages/domain/src/shared/index.ts | import | yes | yes | inward | removed in a79f507d |
| E1019 | apps/platform/src/server/logger.server.ts | packages/domain/src/waitlist/index.ts | import | yes | yes | inward | present |
| E356 | apps/platform/src/server/platform-composition.server.ts | apps/platform/src/server/api/feature-flags/feature-flags-controller.server.ts | import | no | yes | inward | present |
| E355 | apps/platform/src/server/platform-composition.server.ts | apps/platform/src/server/api/meta/app-metadata-controller.server.ts | import | no | yes | inward | present |
| E357 | apps/platform/src/server/platform-composition.server.ts | apps/platform/src/server/api/readyz/readyz-controller.server.ts | import | no | yes | inward | present |
| E358 | apps/platform/src/server/platform-composition.server.ts | packages/config/src/index.ts | import | yes | yes | inward | present |
| E359 | apps/platform/src/server/platform-composition.server.ts | packages/db/src/index.ts | import | yes | yes | inward | removed (f5d1889c) |
| E846 | apps/platform/src/server/platform-composition.server.ts | packages/domain/src/feature-flag/index.ts | import | yes | yes | inward | present (type-only since f5d1889c) |
| E361 | apps/platform/src/server/platform-composition.server.ts | packages/infrastructure/src/bot-detection/index.ts | import | yes | yes | inward | present |
| E362 | apps/platform/src/server/platform-composition.server.ts | packages/infrastructure/src/feature-flags/index.server.ts | import | yes | yes | inward | removed (f5d1889c) |
| E363 | apps/platform/src/server/runtime-environment.server.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E364 | apps/platform/src/server/runtime-environment.server.ts | packages/config/src/runtime.ts | import | yes | no | lateral | present |
| E365 | apps/platform/src/surfaces/client-portal/api/manifest.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E366 | apps/platform/src/surfaces/client-portal/api/manifest.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E367 | apps/platform/src/surfaces/client-portal/api/manifest.ts | packages/infrastructure/src/pwa/index.ts | import | yes | yes | inward | present |
| E368 | apps/platform/src/surfaces/client-portal/api/sw.ts | apps/platform/src/surfaces/client-portal/api/service-worker.js | import | no | no | lateral | present |
| E369 | apps/platform/src/surfaces/client-portal/pages/home.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E370 | apps/platform/src/surfaces/client-portal/routes.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E371 | apps/platform/src/surfaces/client-portal/shell/layout.server.ts | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | import | yes | no | lateral | present |
| E372 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | apps/platform/src/surfaces/client-portal/shell/layout.server.ts | import | no | no | lateral | present |
| E373 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | apps/platform/src/surfaces/client-portal/shell/navigation-links.ts | import | no | no | lateral | present |
| E374 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | packages/infrastructure/src/pwa/index.ts | import | yes | yes | inward | present |
| E375 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E376 | apps/platform/src/surfaces/client-portal/shell/navigation-links.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E377 | apps/platform/src/surfaces/coach-portal/pages/home.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | removed (GEN-193: the dashboard renders the greeting and the calls widget, not `AppShell`) |
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
| E849 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/surfaces/public-site/sections/pricing/bundle-selector.tsx | import | no | no | lateral | present |
| E850 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/surfaces/public-site/sections/pricing/coaching-bundles.ts | import | no | no | lateral | present |
| E399 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | apps/platform/src/surfaces/public-site/shell/layout.tsx | import | no | no | lateral | present |
| E851 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1472 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1437 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E401 | apps/platform/src/surfaces/public-site/pages/privacy.tsx | apps/platform/src/surfaces/public-site/sections/legal/legal-document-view.tsx | import | no | no | lateral | present |
| E402 | apps/platform/src/surfaces/public-site/pages/privacy.tsx | packages/content/src/index.ts | import | yes | yes | inward | present |
| E403 | apps/platform/src/surfaces/public-site/pages/terms.tsx | apps/platform/src/surfaces/public-site/sections/legal/legal-document-view.tsx | import | no | no | lateral | present |
| E404 | apps/platform/src/surfaces/public-site/pages/terms.tsx | packages/content/src/index.ts | import | yes | yes | inward | present |
| E405 | apps/platform/src/surfaces/public-site/routes.ts | apps/platform/src/features/accounts/routes.ts | import | yes | no | lateral | present |
| E1331 | apps/platform/src/surfaces/public-site/routes.ts | apps/platform/src/features/assessment-calls/routes.ts | import | yes | no | lateral | present |
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
| E864 | apps/platform/src/surfaces/public-site/sections/pricing/bundle-selector.tsx | apps/platform/src/surfaces/public-site/sections/pricing/coaching-bundles.ts | import | no | no | lateral | present |
| E865 | apps/platform/src/surfaces/public-site/sections/pricing/bundle-selector.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E866 | apps/platform/src/surfaces/public-site/sections/pricing/bundle-selector.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E867 | apps/platform/src/surfaces/public-site/sections/pricing/bundle-selector.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E1474 | apps/platform/src/surfaces/public-site/sections/pricing/bundle-selector.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
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
| E518 | packages/config/src/index.ts | packages/config/src/base-path.ts | import | no | no | lateral | present |
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
| E1352 | packages/domain/src/assessment-call/index.ts | packages/domain/src/assessment-call/meeting-room-link.ts | import | no | yes | inward | present |
| E1353 | packages/domain/src/assessment-call/index.ts | packages/domain/src/assessment-call/resolve-join-link-use-case.ts | import | no | yes | inward | present |
| E1488 | packages/domain/src/assessment-call/list-open-slots-use-case.ts | packages/domain/src/assessment-call/assessment-call-booking-window.ts | import | no | no | lateral | added (main merge) |
| E1489 | packages/domain/src/assessment-call/list-open-slots-use-case.ts | packages/domain/src/assessment-call/assessment-call-incidents.ts | import | no | no | lateral | added (main merge) |
| E1447 | packages/domain/src/assessment-call/list-open-slots-use-case.ts | packages/domain/src/assessment-call/assessment-call-rules.ts | import | no | yes | inward | present |
| E1355 | packages/domain/src/assessment-call/list-open-slots-use-case.ts | packages/domain/src/coach-availability/index.ts | import | no | yes | lateral | present |
| E1356 | packages/domain/src/assessment-call/list-open-slots-use-case.ts | packages/domain/src/shared/index.ts | import | no | yes | lateral | present |
| E1357 | packages/domain/src/assessment-call/meeting-room-link.ts | packages/domain/src/assessment-call/assessment-call.ts | import | no | yes | inward | present |
| E1358 | packages/domain/src/assessment-call/resolve-join-link-use-case.ts | packages/domain/src/assessment-call/assessment-call-reservations.ts | import | no | no | lateral | present |
| E1359 | packages/domain/src/assessment-call/resolve-join-link-use-case.ts | packages/domain/src/assessment-call/meeting-room-link.ts | import | no | no | lateral | present |
| E907 | packages/domain/src/cart/index.ts | packages/domain/src/cart/cart.ts | import | no | yes | inward | present |
| E1360 | packages/domain/src/coach-availability/coach-availability-source.ts | packages/domain/src/coach-availability/coach-availability.ts | import | no | yes | inward | present |
| E1449 | packages/domain/src/coach-availability/coach-availability.ts | packages/domain/src/coach-availability/slot-policy.ts | import | no | no | lateral | present |
| E1448 | packages/domain/src/coach-availability/coach-availability.ts | packages/domain/src/coach-availability/time-interval.ts | import | no | no | lateral | present |
| E1361 | packages/domain/src/coach-availability/coach-availability.ts | packages/domain/src/coach-availability/zoned-time.ts | import | no | no | lateral | present |
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
| E1455 | packages/infrastructure/src/coach-calendar/coach-time-reservations.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E1456 | packages/infrastructure/src/coach-calendar/coach-time-reservations.server.ts | packages/infrastructure/src/coach-calendar/schema.server.ts | import | no | no | lateral | present |
| E1457 | packages/infrastructure/src/coach-calendar/index.server.ts | packages/infrastructure/src/coach-calendar/coach-time-reservations.server.ts | import | no | no | lateral | present |
| E1458 | packages/infrastructure/src/coach-calendar/index.server.ts | packages/infrastructure/src/coach-calendar/postgres-coach-calendar.server.ts | import | no | no | lateral | present |
| E1459 | packages/infrastructure/src/coach-calendar/postgres-coach-calendar.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E1460 | packages/infrastructure/src/coach-calendar/postgres-coach-calendar.server.ts | packages/domain/src/coach-availability/index.ts | import | yes | no | lateral | present |
| E1461 | packages/infrastructure/src/coach-calendar/postgres-coach-calendar.server.ts | packages/infrastructure/src/coach-calendar/schema.server.ts | import | no | no | lateral | present |
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
| E654 | packages/infrastructure/src/email/index.server.ts | packages/infrastructure/src/email/create-product-email.server.ts | import | no | no | lateral | present |
| E655 | packages/infrastructure/src/email/index.server.ts | packages/infrastructure/src/email/email-primitives.server.tsx | import | no | no | lateral | present |
| E656 | packages/infrastructure/src/email/index.server.ts | packages/infrastructure/src/email/in-memory-product-email.server.ts | import | no | no | lateral | present |
| E1025 | packages/infrastructure/src/email/index.server.ts | packages/infrastructure/src/email/product-email-contract.server.ts | import | no | no | lateral | present |
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
| E988 | packages/ui/src/filters/filter-chip-group.tsx | external:class-variance-authority | import | n/a | no | lateral | present |
| E989 | packages/ui/src/filters/filter-chip-group.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E990 | packages/ui/src/filters/filter-chip-group.tsx | external:react | import | n/a | no | lateral | present |
| E683 | packages/ui/src/filters/filter-chip-group.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E684 | packages/ui/src/filters/index.ts | packages/ui/src/filters/filter-chip-group.tsx | import | no | no | lateral | present |
| E991 | packages/ui/src/layout/app-shell.tsx | external:react | import | n/a | no | lateral | present |
| E1413 | packages/ui/src/layout/dead-end-page.tsx | external:react | import | n/a | no | lateral | present |
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
