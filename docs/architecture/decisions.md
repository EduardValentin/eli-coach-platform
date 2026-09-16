# Decisions

Header: date 2026-09-15, commit 148d594f, scope apps/platform/src, apps/platform/db, packages/{config,content,db,domain,infrastructure,ui}/src plus the enforcement layer (eslint.config.mjs, tools/lint-boundaries.test.mjs, workspace package.json export maps, tsconfigs, vite/react-router/vitest configs).

## Deferred decisions

| Decision | Waits behind port | Current implementation | What would force it |
|---|---|---|---|
| Payments provider (Stripe confirmed, no adapter exists) | none yet; the store acquisition flow has `StoreDeliveryService` (B197) and `StoreAcquisitionRepository` (B196) but no payment port | free products only; `PublishedStoreProduct` carries pricing display data, nothing charges | UC-3 (GEN-160, GEN-167, GEN-159, GEN-162): paid products and Stripe checkout |
| Scheduling provider (undecided) | none yet | no booking code exists; PRD rule 38 names coach availability slots | UC-2 (GEN-176): in-app assessment call booking |
| Video provider (undecided; PRD non-goal says check-ins meet on Google Meet) | none yet | none | UC-2 / check-ins under UC-4 and UC-5 |
| Push notification provider | none yet; `packages/infrastructure/pwa` holds only manifest definitions and service-worker registration | client-portal service worker is a static file served by `api/sw.ts` | UC-6 (GEN-106) |
| Transactional email provider | `WaitlistConfirmationService` (B194) and `StoreDeliveryService` (B197) in C1; `ProductEmailSender` (B241) declared in C6 | Resend adapter (`ResendProductEmailSender`) selected by `PRODUCT_EMAIL_PROVIDER`; `disabled` null objects per feature | a second provider or a per-feature sender; UC-1 invitation email |
| Bot detection provider | `BotVerifier` (B240) declared in C6 | Cloudflare Turnstile adapter plus a static test verifier | a second provider |
| Management API principal (bearer secret is temporary) | `ManagementAuthenticator` (B242) declared in C6 | `BearerSecretManagementAuthenticator` | coach-portal product management under UC-4 (contract already reserves forbidden/unavailable statuses) |
| Identity provider | none: Clerk is named directly in C9 (webhook controller, resolution middleware, nav actions, sign-in-failed page) and C15 (root.tsx, root.server.ts); only the provisioning decision sits behind `AccountRepository` (B190) in C1 | Clerk (confirmed) | not deferred; recorded so UC-1 invitations know Clerk calls will land in C9 adapters |
| Persistence | 17 gateway ports in C1 (B190-B206) | Postgres through Drizzle in feature `data/` folders and C6 feature-flags | not deferred (Postgres is the decision); the ports keep C1 testable without it |
| Single-coach or multi-coach platform | not represented; `AccountRole` is CLIENT or COACH with one bootstrap coach subject | one coach provisioned from `BOOTSTRAP_COACH_*` environment | owner answer pending; changes the actor model and every client-scoped table |

## Cohesion position per component

| Component | Position (grouped for maintenance / for reuse / split for releases) | Accepted cost |
|---|---|---|
| C1 packages/domain | split by domain slice into six executable subpaths (`accounts`, `coaching-bundles`, `email-address`, `feature-flags`, `store`, `waitlist`) plus the interface-only `/shared`, no root barrel | every slice still ships in one package; a slice import elsewhere in the package still rebuilds the whole package |
| C2 packages/db | grouped for reuse: pool, client, and the `app` namespace | tables live outside the package; the namespace is a shared shape |
| C3 packages/config | grouped for maintenance: one runtime schema for every concern | every new env var edits the same schema and its superRefine rules; ARCHITECTURE.md's "split by concern" is not what the code does |
| C4 packages/content | grouped for maintenance: legal and consent copy with versions | none material |
| C5 packages/ui | split by concern into six subpaths, no root barrel | each subpath still ships in one package; a consumer imports the subpath it needs rather than the whole design system |
| C6 packages/infrastructure | adapters and factories only, split by concern into subpaths, fully concrete and heavily depended on through `./http/server` | no rule between subpaths; an unscheduled follow-up if its instability climbs, since it is both widely depended on and holds three ports (`BotVerifier`, `ProductEmail`, `ManagementAuthenticator`) that would otherwise live in C1 |
| C7 features/store | grouped for maintenance: server and browser halves of one feature | the largest component (37 modules fan-out); the ui half holds rules (cart reconciliation, filters) with no policy home |
| C8 features/waitlist | grouped for maintenance | none material |
| C9 features/accounts | grouped for maintenance: Clerk adapters, guards, context, and UI; `server/guards/` is its surface-facing kernel | its `server/guards/` folder is consumed by three surfaces and the root, so it is effectively a shared kernel; everything else in `server/` stays private to the container |
| C10 features/coaching-bundles | single-file feature kept separate so pricing UI has a home outside the surface | trivially small; W6 records it |
| C11-C13 surfaces | grouped by product (assembly) | none material; portals are near-empty shells today |
| C14 apps/platform/src/server | grouped for maintenance: container, `feature-contexts.server.ts`, platform composition and routes in one folder, imported only through `server/guards/` | the folder is both "imported by every route module" (`server/guards/`, container getter) and "imports every feature" (container), which is the cycle recorded in metrics.md |
| C15 app root | framework-dictated | none |

## Intended exceptions

| Exception (layer skip, direct edge, shared shape) | Reason | Risk accepted | Accepted by | Date |
|---|---|---|---|---|
| Route modules and `.server.ts` loaders import `~/server/container.server` (service-locator style) instead of receiving controllers | React Router route modules are framework entry points with no constructor injection; R5 fences the import to delivery files | the composition root is imported by 16 modules, forming a component cycle C14 <-> C7/C8/C9 (see ledger) | documented in ARCHITECTURE.md ("resolves its controller through the container"); not yet accepted as a finding | 2026-08-09 (restructure PRs) |
| `data/schema.server.ts` may import another feature's `data/schema.server.ts` for foreign keys | Drizzle needs the referenced table object | cross-feature coupling at the table level; unexercised today | ARCHITECTURE.md / eslint.config.mjs | 2026-08-09 |
| `root.tsx` imports `~/features/accounts/ui/shared/access-denied-page` | the root error boundary renders the 403 page; the app root is not a surface so R2 does not cover it | none stated | implicit (c42d8ecc) | 2026-08-30 |
| `packages/infrastructure` has no root barrel | keeps server-only halves out of browser bundles | subpaths are unfenced from each other | ARCHITECTURE.md | 2026-08-09 |
| `packages/config/test-support` is a declared subpath importable from production paths | shared Clerk test fixture must not sit on the production barrel | convention only | eslint.config.mjs comment | 2026-08-30 |
| Email templates render React on the server (`email-primitives.server.tsx`) | React as an HTML templating engine, never hydrated | framework in an adapter package; accepted by design | implicit | 2026-08-09 |
| `packages/domain/src/shared` is interface-only (R5): `Clock` (implemented in `apps/platform/src/server/container.server.ts` as the system clock; consumed by `WaitlistService`, `StoreAcquisitionService` and `DownloadGrantService` through `waitlist-composition.server.ts` and `store-composition.server.ts`), `Logger` (implemented by `createConsoleLogger` in `apps/platform/src/server/logger.server.ts`; consumed by `WaitlistService` and `StoreAcquisitionService`), `BotVerifier` (implemented by `StaticTokenBotVerifier` and `TurnstileBotVerifier` in `packages/infrastructure/src/bot-detection`, selected by `createBotVerifier`; consumed by the waitlist and store acquisitions controllers), `ProductEmail` (implemented by `ResendProductEmail` and `InMemoryProductEmail` in `packages/infrastructure/src/email`, selected by `createProductEmail`; consumed by the waitlist and store email services), `ManagementAuthenticator` (implemented by `BearerSecretManagementAuthenticator` in `packages/infrastructure/src/management-auth`; consumed by the store management controller) | a slice that needs a cross-cutting concern imports a stable interface rather than another slice's implementation | none: `/shared` has no executable rules, so nothing but the port shapes cross the boundary | Eduard | 2026-09-17 |
| The `stability` rule (R31) judges only edges that cross from one workspace package into another | An intra-package barrel edge (an `index.ts` re-exporting its own package's implementation modules) is structurally "unstable-ward" by construction, so it is not what R31 targets | none: cross-package instability remains fully enforced | Eduard | 2026-09-17 |

## Accepted findings

| Ledger finding | Rule | Reason accepted | Accepted by | Date |
|---|---|---|---|---|
| F7 | R6 (CH-C) | Single-implementation use cases in a pre-launch MVP; controllers depend on the service class type, which TypeScript treats structurally, so tests already substitute doubles | Eduard | 2026-09-16 |
| F52, F53 | R21 (CH-R) | The "React as email templating" exception extends to the content builders in a feature's `email/` folder; rendering is their job as adapters | Eduard | 2026-09-16 |
| F88, F89 | R39 | Controller shape (no base controller, no request state on instance fields) and infrastructure-failure mapping stay review-owned; ports return result unions (CH-I) so an adapter returning a union member from a catch block is the concrete thing a reviewer checks | Eduard | 2026-09-16 |
| F150, F151 | R13 | One request-context key per feature (plan review run 2): a feature's controllers belong to one actor, a route names the single member it uses, and a test sets one key with one fake; the cost that a key's type lists siblings a route does not use is accepted. The platform key is split instead (controllers for the app's routes, runtime config for surfaces) because its consumers span components. | Eduard | 2026-09-16 |
| F76 | R36 | Resolved at 148d594f: no test in `apps/platform/src` mocks a hook or the fetch mechanism; the churn the row cites was the one-time React Query removal | Eduard | 2026-09-16 |

## Open questions

Raised by run 1 of the ledger (2026-09-15):

- Should controllers depend on per-use-case input-boundary interfaces (ledger F7, CH-C), or is a single-implementation interactor class an acceptable dependency for this MVP? Owner decision; acceptance would move F7 to the table above.
- The three human-review-only rules (route thinness, controller shape, infrastructure-failure mapping) are recorded as unenforced forbidden edges (F85, F88, F89). Decide whether to enforce them with lint or accept review ownership explicitly.
- The `ENVIRONMENT === "local"` static bot-verifier path inside the production composition (F22): accepted pre-launch convenience or moved to a test composition root?
- `AccountProvisioningResult` hands the `Account` entity to the resolution middleware (F13); decide whether the middleware is the one composition-adjacent consumer allowed to see it.

- Single-coach platform or multiple coaches later: unanswered by the owner. It changes the actor model (`AccountRole`, bootstrap coach subject) and every client-scoped shape UC-1, UC-4, and UC-5 will add.
- Scheduling provider and video provider are undecided; both must sit behind ports declared in C1 before UC-2 code lands.
- Payments: Stripe confirmed, no port or adapter exists; auth: Clerk confirmed and named directly in C9/C15; email: Resend in use behind B241.
- Should `BotVerifier`, `ProductEmailSender`, and `ManagementAuthenticator` move from C6 to C1 so every port the policy calls is owned by the policy? Today C6 is both the owner and the implementer.
- Is the store cart reconciliation rule (PRD 16) meant to live in the browser store only, or should C1 own it once paid products arrive (UC-3)?
- The `./website-and-store-terms/publication` subpath of C4 has no consumer in scope; reserved for UC-3 or dead surface.
- Where should a use-case-shaped browser hook (`useStoreAcquisition`, `useWaitlistSubmission`, `useBotDetectionSubmission`) live once the portals add flows: a feature `ui/shared` presenter layer, or C1 request/response models consumed by thin hooks?
- Wider observation outside scope: `designs/react-reference-app` duplicates domain vocabulary (bundles, cycle phases) that C1 also declares; no shared source exists by design.

## Owner decisions (2026-09-16)

- Single-coach platform for its lifetime. The model stays single-tenant; no owning-coach references are introduced.
- Fix rather than accept: CH-M (explicit `BOT_DETECTION_PROVIDER`), F79 (dependency-cruiser and knip as typecheck and build gates), CH-S (domain-owned ports carry domain names; "repository" names an adapter), CH-K (six unused UI primitives removed, UI barrel split by concern).
- No TypeScript project references: pnpm's per-package resolution already fails an undeclared package edge at typecheck and build.
- knip joins dependency-cruiser for published-surface hygiene (unused exports, files, dependencies).
- R3 widens by one entry: `server/guards/` is a feature's surface-facing entry (context key and access guards). The cross-feature protocol is recorded in `dependencies.md`.
- Route thinness (F85) is enforced by the `route-thinness` dependency rule instead of review.
- `PUBLIC_APP_URL` is required in every runtime (previously required only with the Resend provider) because surfaces and Clerk session checks read it unconditionally.
- The allow-all management authenticator double is not kept in `@eli-coach-platform/test-support` until a test needs it (CH-K precedent).
