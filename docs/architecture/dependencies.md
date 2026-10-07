# Dependencies

Header: audit 2026-09-15 at commit 148d594f, scope apps/platform, packages, tools, knip.json, eslint.config.mjs; last update 2026-10-07 at commit e34f8e38, change review.

## Component graph

| From | To | Modules | Notes |
|---|---|---|---|
| C6 infrastructure | C1 domain | 22 | the feature-flags repository implements `FeatureFlags`; `PostgresCoachCalendar`, `PostgresCoachAvailability` and `PostgresCoachMeetingRoom` implement the `/coach-availability` and `/coach-meeting-room` ports and take `/shared`'s `Clock`; the payments concern implements `/coaching-subscription`'s `PaymentCheckout`, `PaymentSubscriptions` and `PaymentCustomerCards` (Stripe and memory), reads `/coaching-bundle`'s catalog and maps a subscription change or refund to `/coaching-subscription`'s `SubscriptionEvent`; the identity concern implements `/client-invitation`'s `IdentityInvitations` (Clerk and memory); the client-media concern implements `/client-profile`'s `ProgressPhotoStore` (encrypted filesystem and memory) and the images concern its `ProgressPhotoRenditions`; the adapter-facing contracts are C6's own |
| C6 infrastructure | C2 db | 10 | the feature-flags, coach-calendar, coach-meeting-room and payment-event tables and their adapters |
| C6 infrastructure | C3 config | 10 | concern types the factories read, including `PaymentsConfig`, `IdentityConfig` and `ClientMediaConfig` |
| C7 store | C1 domain | 18 | entities, ports, use cases, publication types across `/product`, `/acquisition`, `/download-grant`, `/cart`, `/email-address` (the composition's `EmailSubaddressPolicy`), `/shared` |
| C7 store | C2 db | 6 | DatabaseClient, appSchema |
| C7 store | C3 config | 5 | joinBasePath and concern types |
| C7 store | C4 content | 3 | consent copy; the subaddress refusal copy in the acquisition flow |
| C7 store | C5 ui | 6 | primitives in ui/public |
| C7 store | C6 infrastructure | 17 | bot-detection (browser and server), email/server, management-auth/server, http/server, http (`fetcherOutcomeOf`, the acquisition route's `clientAction`); adapter-facing contracts now live in C6 |
| C8 waitlist | C1 domain | 8 | `/feature-flag`, `/waitlist`, `/email-address` (the composition's `EmailSubaddressPolicy`), `/shared`, and `/coaching-bundle`'s `PricingEligibility`, which the repository implements; `data/schema.server.ts`'s range check reads `WAITLIST_REDUCED_PRICING_CAP` |
| C8 waitlist | C2 db | 3 |  |
| C8 waitlist | C3 config | 2 |  |
| C8 waitlist | C4 content | 3 | consent versions and copy; the subaddress refusal copy in `ui/public/errors.ts` |
| C8 waitlist | C5 ui | 2 |  |
| C8 waitlist | C6 infrastructure | 8 | bot-detection, email/server, http/server, http (`fetcherOutcomeOf`, the waitlist route's `clientAction`); adapter-facing contracts now live in C6 |
| C9 accounts | C1 domain | 9 | `/account` (including the `InvitationAcceptance` the composition takes) |
| C9 accounts | C2 db | 3 |  |
| C9 accounts | C3 config | 2 |  |
| C9 accounts | C5 ui | 3 |  |
| C9 accounts | C6 infrastructure | 3 | http/server |
| C9 accounts | C7 store | 2 | the store path literal from `contracts/paths.ts` |
| C11 public-site | C1 domain | 1 | `shell/portal-destination.ts` names `AccountRole` (type) |
| C11 public-site | C3 config | 4 | `buildRedirectPath` in the invitation page |
| C11 public-site | C4 content | 4 | legal documents; Eli's portrait paths (`about-content.ts`) |
| C11 public-site | C5 ui | 16 |  |
| C11 public-site | C6 infrastructure | 4 | `BotDetectionConfig` type and the widget |
| C11 public-site | C7 store | 5 | cart drawer and provider, store paths |
| C11 public-site | C8 waitlist | 7 | contracts, `ui/shared` presentation, `ui/public` |
| C11 public-site | C9 accounts | 5 | contracts (`PortalDestination`, the role paths), guards (the layout and the invitation page), `ui/public/auth-nav-actions`, `ui/shared/sign-out-control` |
| C11 public-site | C14 server | 1 | `shell/layout.server.ts` reads `runtimeConfigContext` |
| C11 public-site | C17 assessment-calls | 4 | `routes.ts` takes the public route fragment (`assessmentCallsBookingRoutes`, renamed from `assessmentCallsPublicRoutes` by the rebase-resolution round) and, since GEN-192, the join route fragment (`assessmentCallsJoinRoutes`), registered outside the layout beside `accountsDeadEndRoutes`; `pages/pricing.tsx`, `sections/hero/hero.tsx` and `sections/about/about.tsx` take `BOOK_PATH` from `contracts/paths.ts` and nothing else |
| C11 public-site | C18 coaching-sales | 5 | `routes.ts` spreads `coachingSalesPublicRoutes` inside the shell and registers the invitation page at `INVITATION_ROUTE_SEGMENT` outside it; `pages/pricing.tsx` reads `coachingSalesContext` and renders `ui/public/bundle-selector/bundle-selector.tsx`; `pages/invitation.tsx` renders `ui/public/invitation/invitation-states.tsx`; `shell/layout.server.ts` reads the `readClientPortalStanding` guard and `shell/portal-destination.ts` takes `ClientPortalStanding` and the portal link from `contracts/client-journey.ts` |
| C12 client-portal | C3 config | 1 | `buildRedirectPath` (`api/manifest.ts`) |
| C12 client-portal | C5 ui | 4 | `./layout` (`PortalShell`, `PortalNavigationLink`), `./primitives`, `./portal` (`PortalPageHeader`), `./lib` |
| C12 client-portal | C6 infrastructure | 3 | pwa |
| C12 client-portal | C9 accounts | 5 | portal guard (from the access layout), paths and `SignOutControl` |
| C12 client-portal | C18 coaching-sales | 6 | `routes.ts` spreads `coachingSalesClientShellRoutes` inside the sidebar layout and `coachingSalesClientRoutes` inside the access layout outside it; `shell/navigation-links.ts` takes `CLIENT_SETTINGS_PATH`; `shell/access-layout.server.ts` runs `requireClientPortalStanding`; the shell loader reads the client's identity and `pages/home.tsx` the program status through `coachingSalesContext` and renders `ui/client/status/program-status-card.tsx` |
| C12 client-portal | C19 client-onboarding | 2 | `routes.ts` spreads `clientOnboardingClientRoutes` inside the access layout, outside the sidebar shell; `pages/home.tsx` reads `clientOnboardingContext` for the open detail request |
| C12 client-portal | C20 client-profile | 4 | `routes.ts` spreads `clientProfileClientRoutes` inside the shell; the shell links the client's name to `CLIENT_PROFILE_PATH`; `pages/home.tsx` reads `clientProfileContext` and renders `ui/client/nudge/measurements-nudge.tsx` |
| C12 client-portal | C21 client-resources | 3 | `routes.ts` spreads `clientResourcesClientRoutes` inside the sidebar shell; the shell layout's loader reads `clientResourcesContext` for the unopened count; `navigation-links.ts` reads `CLIENT_RESOURCES_PATH` |
| C13 coach-portal | C5 ui | 7 | the shell and its navigation links; the dashboard, the assessment-calls page and the client page compose portal, appointment, layout and primitive modules |
| C13 coach-portal | C9 accounts | 3 | portal guard and paths |
| C13 coach-portal | C17 assessment-calls | 4 | `routes.ts` takes the settings fragment and the calls segment; `pages/home.tsx` composes the dashboard blocks; `pages/assessment-calls.tsx` composes the listing, section, clock and error boundary |
| C13 coach-portal | C18 coaching-sales | 5 | `routes.ts` spreads `coachingSalesCoachRoutes` (the clients page) and takes the clients path; `pages/assessment-calls.tsx` reads `coachingSalesContext` and fills the section's slots from `ui/coach/call-sales/`; `pages/client.tsx` reads the client record and composes `ui/coach/clients/` blocks, the needs-refund badge among them |
| C13 coach-portal | C19 client-onboarding | 1 | `pages/client.tsx` reads `clientOnboardingContext` and renders `ui/coach/onboarding/onboarding-panel.tsx` |
| C13 coach-portal | C20 client-profile | 1 | `pages/client.tsx` reads `clientProfileContext` and renders `ui/coach/profile/client-profile-block.tsx`, `ui/shared/measurements/measurements-table.tsx` and `ui/shared/photos/photo-view-dialog.tsx` |
| C14 server | C1 domain | 9 | the container and platform composition name ports and use cases; `email-subaddress-policy.server.ts` returns `/email-address`'s `EmailSubaddressPolicy`; the console logger implements the incident ports of `/acquisition`, `/waitlist`, `/assessment-call`, `/payment-link`, `/coaching-subscription`, `/client-invitation`, `/client-onboarding`, `/client-profile` and `/client-roster` |
| C14 server | C2 db | 1 | `database.server.ts` (`DatabaseClient` types) |
| C14 server | C3 config | 7 | the container reads `resolveFeatureFlagOverridesMode` and the payments secrets; the subaddress policy reads `AppConfig`'s `ENVIRONMENT`; the runtime environment loader |
| C14 server | C4 content | 1 | privacy email |
| C14 server | C6 infrastructure | 8 | bot verifier, product email, management auth, feature-flag repository, the payments factories and contracts (the completion, subscription-change, refund and card handler contracts), the identity-invitations factory, the progress-photo store and renditions factories, http helpers for the webhook route |
| C14 server | C7 store | 2 | the container calls `composeStoreFeature` |
| C14 server | C8 waitlist | 2 | the container calls `composeWaitlistFeature` |
| C14 server | C9 accounts | 2 | the container calls `composeAccountsFeature`, handing it coaching sales' `invitationAcceptance`, and reads `CLIENT_PORTAL_PATH` for the identity provider's return URL |
| C14 server | C17 assessment-calls | 2 | the container calls `composeAssessmentCallsFeature`; `feature-contexts.server.ts` sets `assessmentCallsContext` |
| C14 server | C18 coaching-sales | 2 | the container calls `composeCoachingSalesFeature` with the identity invitations, the payment subscriptions, the payment customer cards and the coach address and hands its handles on: `invitationAcceptance` to accounts, `paymentCompletionHandler`, `subscriptionChangeHandler`, `refundHandler` and `paymentCardHandler` to the platform composition, `clientIdentities`, `unitPreferenceClients` and `measurementClients` to client profile, `onboardingClients`, `onboardingSubmissionStamps`, `onboardingReviewStamps` and `reviewStampWriter` to client onboarding; the feature-context middleware sets `coachingSalesContext` |
| C14 server | C19 client-onboarding | 2 | the container calls `composeClientOnboardingFeature`; the feature-context middleware sets `clientOnboardingContext` |
| C14 server | C20 client-profile | 2 | the container calls `composeClientProfileFeature` with the progress-photo store and renditions and hands its handles to client onboarding; the feature-context middleware sets `clientProfileContext` |
| C17 assessment-calls | C1 domain | 15 | `/assessment-call`, `/coach-availability`, `/coach-meeting-room`, `/email-address` (the composition's `EmailSubaddressPolicy`), `/feature-flag`, `/shared`, and `/payment-link`'s `AssessmentCallReader`, which the composition satisfies |
| C17 assessment-calls | C2 db | 3 | DatabaseClient, appSchema |
| C17 assessment-calls | C3 config | 4 | `joinBasePath` (the emails and the booking overview's portrait) and `AssessmentCallsConfig` |
| C17 assessment-calls | C4 content | 3 | the support address on the error state; Eli's portrait path on the booking overview; the subaddress refusal copy in the booking controller's messages |
| C17 assessment-calls | C5 ui | 21 | `./primitives` (incl. `FieldError`), `./appointments`, `./calendar`, `./tabs`, `./filters`, `./lib`, `./layout` (`DeadEndPanel`), `./portal`, `./toast` |
| C17 assessment-calls | C6 infrastructure | 14 | bot-detection (browser and server), email/server (the notification contract, the Email* primitives and the email theme), http/server, http (`fetcherOutcomeOf`, the booking and settings routes' `clientAction`), coach-calendar/server and coach-meeting-room/server (the composition's adapters and the repository's reservation writers) |
| C17 assessment-calls | C9 accounts | 2 | `api/settings/assessment-call-settings-controller.server.ts` takes `requireApiAccount` from `server/guards/`; `contracts/paths.ts` takes `COACH_PORTAL_PATH` from `contracts/paths.ts` |
| C18 coaching-sales | C1 domain | 46 | `/payment-link`, `/coaching-subscription` (the lifecycle use cases, `CoachingSubscriptions`, `RefundNotifications`, `PaymentCards`, `PaymentCard` and the card mirror and refresh use cases, `CoachingSubscription.isCancelledOrEnded`, `RefundDueSnapshot`, `OFFERED_CANCELLATION_RULES`, `START_NOW_REFUSALS`, `WITHDRAWAL_WINDOW_DAYS`), `/coaching-bundle`, `/assessment-call` (visitor vocabularies for the clients table), `/feature-flag`, `/email-address`, `/client`, `/client-invitation`, `/client-journey`, `/client-roster`, `/account` (`InvitationAcceptance`, type), the port types its adapters implement from `/client-onboarding`, `/client-profile` and `/unit-preference`, `/shared` |
| C18 coaching-sales | C2 db | 15 | `DatabaseClient`, `DatabaseTransaction`, `appSchema`, `isCausedByDatabaseError` (through `data/unique-violation.server.ts`) |
| C18 coaching-sales | C3 config | 8 | `joinBasePath`, `buildRedirectPath`, `normalizeBasePath` |
| C18 coaching-sales | C5 ui | 36 | `./primitives` (incl. `InlineProblem`, `CardBrandMark`), `./overlays` (`ConfirmDialog`), `./lib` (incl. the calendar-day format and `PhoneLink`), `./motion`, `./toast`, `./portal` (incl. `SettingsSection`, `SettingsRow`, `Reading`), `./appointments` (`RowActionButton`, `RowActionLink`), `./layout` (`DeadEndPage`, `DeadEndPanel`) |
| C18 coaching-sales | C6 infrastructure | 27 | `./payments/server` (the completion, subscription-change, refund and card handler contracts, `recordPaymentEvent`, `recordEventOnce`, `toSubscriptionEvent`), `./email/server` (the Email* primitives and the email theme), `./http/server`, `./http` (`fetcherOutcomeOf`, the payment-link and invitation re-send routes' `clientAction`) |
| C18 coaching-sales | C9 accounts | 7 | `contracts/paths.ts` (`CLIENT_PORTAL_PATH`, `COACH_PORTAL_PATH`); `server/guards/` (`requireApiAccount`, `requirePortalAccess`, `sessionContext`, `accountsContext`) from the payment-link, client-journey, coach-clients and subscription controllers and the journey guard |
| C18 coaching-sales | C17 assessment-calls | 7 | `contracts/paths.ts` (`BOOK_PATH`, `COACH_CALLS_PAGE_PARAM`), `contracts/visitor-profile.ts` (`possessivePronoun`), `contracts/countries.ts` (`findCountry`), `contracts/call-moment.ts`, and `data/schema.server.ts` for foreign keys |
| C19 client-onboarding | C1 domain | 29 | `/client-onboarding` (use cases, ports, `ClientOnboarding`, `DetailRequest`, the form definitions and field rules, read by both halves), `/client-profile` (`ClientProfile` and `AttachProgressPhotosUseCase`, types), `/measurement` (`MeasurementEntry`, `ClientMeasurementsSource`, `waistToHeightRatio`), `/unit-preference` (`UnitPreference`, `ClientUnitPreferencesSource`, the measure-unit conversions), `/assessment-call` (`VISITOR_GENDERS`, `VisitorGender`), `/shared` (`Clock`, type) |
| C19 client-onboarding | C2 db | 5 | `DatabaseClient`, `DatabaseTransaction`, `appSchema`, `isCausedByDatabaseError` |
| C19 client-onboarding | C3 config | 2 | `joinBasePath`, from the details-request email adapter and the draft-autosave requests |
| C19 client-onboarding | C5 ui | 15 | `./primitives` (incl. `FieldLayout`), `./lib` (incl. `describedByOf` and the calendar-day format), `./calendar` (`DateField`), `./motion`, `./portal`, `./overlays`, `./toast` |
| C19 client-onboarding | C6 infrastructure | 13 | `./http/server`; `./http` (`fetcherOutcomeOf`, the five resource routes' `clientAction`); `./email/server` (`ProductEmail`, the Email* primitives and the email theme) |
| C19 client-onboarding | C9 accounts | 5 | `contracts/paths.ts` (`CLIENT_PORTAL_PATH`); `server/guards/` (`requireApiAccount`, `requirePortalAccess`) from both controllers |
| C19 client-onboarding | C17 assessment-calls | 1 | `contracts/visitor-profile.ts` (`possessivePronoun`, `objectPronoun`) |
| C19 client-onboarding | C18 coaching-sales | 5 | `contracts/paths.ts` (`CLIENT_ONBOARDING_ROUTE_SEGMENT`); `data/schema.server.ts` (`clientsTable`) for foreign keys; `server/guards/` (`requireOpenClientPortal`) from the draft, submission and detail-answers routes |
| C19 client-onboarding | C20 client-profile | 8 | `contracts/{unit-preference,canonical-measure,paths,progress-photo-consent,progress-photo-parts,measurements}.ts` (`measurements` for the refused-photo toast wording); `ui/shared/measure-field/measure-field.tsx` (`MeasureField`) and `ui/shared/photos/` (`ProgressPhotoBlock`, the picks) |
| C20 client-profile | C1 domain | 26 | `/client-profile` (use cases, ports, `ClientProfile`, `ProgressPhoto`, the photo views and the accept rule), `/measurement` (`ClientMeasurementsSource`, `MeasurementEntry`, `MEASUREMENT_FIELDS`, `measurementProblem`, `waistToHeightRatio`), `/unit-preference` (`SaveUnitPreferenceUseCase`, its ports and the measure-unit conversions), `/client` (`ClientIdentities`, type), `/assessment-call` (`VisitorGender`, `VISITOR_GENDERS`), `/shared` (`Clock`) |
| C20 client-profile | C2 db | 7 | `DatabaseClient`, `DatabaseTransaction` (the two transaction-scoped writers), `appSchema` |
| C20 client-profile | C3 config | 1 | `joinBasePath` (the photo URL) |
| C20 client-profile | C5 ui | 12 | `./primitives` (incl. `FieldLayout`), `./portal`, `./layout` (`ResponsiveSheetDialog`), `./overlays` (`Dialog`, `ConfirmDialog`, `Lightbox`), `./lib` (incl. the calendar-day format and `PhoneLink`), `./toast` |
| C20 client-profile | C6 infrastructure | 7 | `./http/server`; `./http` (`fetcherOutcomeOf`, the measurements and photo routes' `clientAction`); `./pwa` (the profile page's meta) |
| C20 client-profile | C9 accounts | 5 | `contracts/paths.ts` (`CLIENT_PORTAL_PATH`), `server/guards/` (`requireApiAccount`, `requirePortalAccess`) |
| C20 client-profile | C17 assessment-calls | 2 | `contracts/visitor-profile.ts` (pronouns, gender labels, the age on the card), `contracts/countries.ts` (`findCountry`) |
| C20 client-profile | C18 coaching-sales | 3 | `data/schema.server.ts` (`clientsTable`) for foreign keys; `server/guards/` (`requireOpenClientPortal`) from the measurements and unit-preference routes |
| C15 app root | C3 config | 1 |  |
| C15 app root | C5 ui | 2 | `root-error-page.tsx` renders the shared `DeadEndPage` from `./layout`; `root.tsx`'s `Layout` mounts the one `Toaster` from `./toast`; `app.css`'s `@import` of `styles.css` is not followed by the cruise |
| C15 app root | C7 store | 1 | the registry imports `storePublicRoutes`/`storeApiRoutes` |
| C15 app root | C8 waitlist | 1 | the registry imports `waitlistApiRoutes` |
| C15 app root | C9 accounts | 3 | the registry, `root.tsx` (access-denied page, and the client portal segment for its viewport) and `root.server.ts` (account resolution) |
| C15 app root | C11 public-site | 1 | the registry imports `publicSiteRoutes` |
| C15 app root | C12 client-portal | 1 | the registry imports `clientPortalRoutes` |
| C15 app root | C13 coach-portal | 1 | the registry imports `coachPortalRoutes` |
| C15 app root | C14 server | 2 | `root.server.ts` (container, feature contexts) and the registry (`server/api/routes.ts`) |
| C15 app root | C17 assessment-calls | 1 | the registry imports `assessmentCallsApiRoutes` |
| C15 app root | C18 coaching-sales | 1 | the registry imports `coachingSalesApiRoutes` |
| C15 app root | C19 client-onboarding | 1 | the registry imports `clientOnboardingApiRoutes` |
| C15 app root | C20 client-profile | 1 | the registry imports `clientProfileApiRoutes` |
| C13 coach-portal | C21 client-resources | 3 | `routes.ts` registers `pages/client-resources.tsx`; that page reads `clientResourcesContext` and renders the `ui/coach/` library and a `ui/shared/` copy helper; `pages/client.tsx` links to the resources path |
| C14 server | C21 client-resources | 2 | the container calls `composeClientResourcesFeature`; the feature-context middleware sets `clientResourcesContext` |
| C15 app root | C21 client-resources | 1 | the root registry spreads `clientResourcesApiRoutes` |
| C21 client-resources | C1 domain | 12 | the controllers, composition and schema name `/client-resources`' use cases, ports, limits and kinds; `ui/` reads `MAX_RESOURCE_FILE_BYTES` and the kind type |
| C21 client-resources | C2 db | 3 | schema, repository and composition (`appSchema`, `DatabaseClient`) |
| C21 client-resources | C3 config | 1 | `joinBasePath` for the served-file URLs |
| C21 client-resources | C5 ui | 6 | the library, dialog, card, grid, viewer and dead-end panels over `./primitives`, `./layout`, `./overlays`, `./portal`, `./lib`, `./motion`, `./toast` |
| C21 client-resources | C6 infrastructure | 7 | `./http` (`uploadOutcomeOf`, `createUploadProgress`, `fetcherOutcomeOf`), `./http/server` (error handling, multipart read, private-file responses) |
| C21 client-resources | C9 accounts | 2 | the two controllers' `requireApiAccount` and `requirePortalAccess` guards |
| C21 client-resources | C18 coaching-sales | 2 | `data/schema.server.ts` references `clients` (foreign key only); `contracts/paths.ts` extends the coach client path |

## Forbidden edges

| From | To | Source of the rule | Enforced by |
|---|---|---|---|
| any module | a dependency cycle, including between domain slices | R30 | `no-circular` |
| features/A | features/B outside contracts/, ui/shared/, server/guards/ | R3 | `feature-internals` |
| any module outside C9 features/accounts, the C15 root modules, C6 `identity/` and C16 | `@clerk/*` | R23 (Clerk stays behind the accounts feature, the root and the identity adapter) | `clerk-confined` (fixture-covered) |
| any module outside C6 `packages/infrastructure/src/images/` | `sharp` | R23 (the image-processing library stays behind C1's `ProgressPhotoRenditions` and the C6 images concern) | `sharp-confined` (fixture-covered: `tools/boundary-fixtures/packages/infrastructure/src/email/sharp-confined.server.ts`, which the record also expects to trip `not-to-unresolvable`) |
| any module outside C6 `packages/infrastructure/src/documents/` | `pdfjs-dist`, `@napi-rs/canvas` | R23 (PDF rendering stays behind C1's `ResourceDocumentPages` and the C6 documents concern) | `pdf-rendering-confined` (fixture-covered) |
| a feature's `api/` | any feature's `ui/` | R4 (a route module's `clientAction` shares browser values with the browser half only through `contracts/` or a package's browser entry) | `feature-api-never-imports-ui` (fixture-covered) |
| a feature's `ui/shared/` | the same feature's `ui/public/`, `ui/client/` or `ui/coach/` | R10 (shared UI serves every actor UI of its feature; an actor's controls reach it only as render slots) | `feature-shared-ui-never-imports-actor-ui` (fixture-covered) |
| C18 features/coaching-sales | C21 features/client-resources, including its public folders | R30 (client-resources builds on coaching-sales) | `coaching-sales-never-reaches-client-resources` (fixture-covered) |
| features/assessment-calls | features/coaching-sales (any folder) | R30 (coaching sales is downstream of assessment calls; the reverse edge would close a component cycle `no-circular` cannot see at module level) | `assessment-calls-never-reach-coaching-sales` (fixture-covered) |
| features/coaching-sales | features/client-onboarding (any folder) | R30 (client onboarding is downstream of coaching sales; the reverse edge would close a component cycle `no-circular` cannot see at module level) | `coaching-sales-never-reaches-client-onboarding` (fixture-covered) |
| features/coaching-sales | features/client-profile (any folder) | R30 (client profile is downstream of coaching sales; the reverse edge would close a component cycle `no-circular` cannot see at module level) | `coaching-sales-never-reaches-client-profile` (fixture-covered) |
| features/client-profile | features/client-onboarding (any folder) | R30 (client onboarding is downstream of client profile; the reverse edge would close a component cycle `no-circular` cannot see at module level) | `client-profile-never-reaches-client-onboarding` (fixture-covered) |
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
| Use another entity's types, ports and rules in policy code | domain folder to domain folder | import through the folder entry (`@eli-coach-platform/domain/<entity>`, or `../<entity>` inside the package) | `domain-slices`, `no-circular` | yes: `acquisition`→`email-address`, `product`, `shared`; `assessment-call`→`coach-availability`, `coach-meeting-room`, `email-address`, `feature-flag`, `shared`; `client`→`assessment-call`; `client-invitation`→`shared`; `client-journey`→`assessment-call`, `client-onboarding`, `coaching-subscription`, `shared`; `client-onboarding`→`assessment-call`, `client-profile`, `measurement`, `shared`, `unit-preference`; `client-profile`→`account`, `client`, `measurement`, `shared`; `client-roster`→`assessment-call`, `client-journey`, `coaching-subscription`, `payment-link`, `shared`; `coaching-bundle`→`email-address`; `coaching-subscription`→`assessment-call`, `client`, `coaching-bundle`, `email-address`, `payment-link`, `shared`; `download-grant`→`product`, `shared`; `measurement`→`unit-preference`; `payment-link`→`assessment-call`, `coaching-bundle`, `email-address`, `feature-flag`, `shared`; `unit-preference`→`shared`; `waitlist`→`email-address`, `feature-flag`, `shared` |
| Know the current account | request context | read the accounts feature's `server/guards/` key | `guards-construct-nothing`, `server-guards-consumers` | yes |
| Look another feature's data up | a port the consumer declares | the consuming slice declares the narrow interface; the producing feature's composition returns an implementation under `handles`, and the container hands it to the consumer's composition; a write that must join the consumer's transaction is handed as a transaction-scoped writer function instead | `feature-internals`, `feature-api-to-data`, `composition-root`, `coaching-sales-never-reaches-client-onboarding`, `coaching-sales-never-reaches-client-profile`, `client-profile-never-reaches-client-onboarding` | yes: C8 waitlist → C18 `PricingEligibility` (C1 `/coaching-bundle`); C17 assessment calls → C18 `AssessmentCallReader` (`/payment-link`); C18 coaching sales → C9 accounts `InvitationAcceptance` (`/account`); C18 → C14 platform `PaymentCompletionHandler` (C6 `./payments/server`); C18 → C20 client profile `ClientIdentities` (`/client`), `MeasurementClients` (`/client-profile`), `UnitPreferenceClients` (`/unit-preference`); C18 → C19 client onboarding `OnboardingClients`, `OnboardingReviewStamps`, `OnboardingSubmissionStamps` (`/client-onboarding`) and the transaction-scoped `reviewStampWriter` (C19's structural `ReviewStampWriter`); C18 → C21 `ResourceClients` (`/client-resources`); C20 → C19 `ClientMeasurementsSource` (`/measurement`), `ClientUnitPreferencesSource` (`/unit-preference`), the use case `attachProgressPhotos` (`/client-profile`'s `AttachProgressPhotosUseCase`) and the transaction-scoped `recordMeasurementEntry` and `saveClientProfile` |
| Reference another feature's table | persistence | `data/schema.server.ts` may import the other feature's `data/schema.server.ts` for a foreign key | `feature-schema-foreign-key` | yes: C18's `payment_links`, `clients` and `coaching_subscriptions` reference C17's `assessment_calls`; C19's `client_onboarding_drafts`, `client_onboarding_submissions`, `client_onboarding_reviews` and `client_onboarding_detail_requests` and C20's `client_measurements`, `client_profiles`, `client_progress_photos` and `client_unit_preferences`, and C21's `client_resources`, reference C18's `clients` |
| Compose another feature's UI | `ui/shared/` | the owning feature publishes the component or presenter | `feature-internals`, the three `surface-<s>-to-feature` rules | yes: C19 renders C20's `MeasureField`; the surfaces compose C20's measurements table and photo view dialog |
| Exchange wire data | `contracts/` | zod schemas and path literals | `feature-internals`, the three `surface-<s>-to-feature` rules | yes |

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
| B144 | the eleven request-context keys | C7, C8, C9, C17, C18, C19, C20 `server/guards/` and C14 `server/guards/` | `createFeatureContextMiddleware` (U517) sets nine from the container, publishing each composition's `feature` and never its `handles`; the accounts account-resolution middleware sets `sessionContext` and C18's journey guard sets `clientJourneyContext` per request | `accountsContext` and `sessionContext` (accounts routes, the resolution middleware, the portal guards), `storeContext` (store routes and loaders), `waitlistContext` (the waitlist route, the public-site layout loader and the pricing loader), `assessmentCallsContext` (the assessment-call routes and pages, and the coach portal's dashboard and calls page), `coachingSalesContext` (the coaching-sales routes and pages, the pricing loader, the coach calls page, the coach clients page, the client page and the client portal's shell and home loaders), `clientJourneyContext` (C18's client-journey controller only), `clientOnboardingContext` (the client-onboarding routes and page, the client portal's home page and the coach portal's client page), `clientProfileContext` (the client-profile routes and page, the client portal's home page and the coach portal's client page), `platformContext` (`server/api/*` only, including the Stripe webhook), `runtimeConfigContext` (the public-site layout loader only) | the feature's controllers, the signed-in client's journey snapshot, or `{ appBasePath, botDetection }` | the context key | each is created with `createContext<…>()` and constructs nothing (`guards-construct-nothing`); `server-guards-consumers` fences `platformContext` |
| B151 | PlatformDatabase.client deferred DatabaseClient proxy | C14 (frameworks) | private createDeferredDatabaseClient in U503 | every repository built by a feature composition | DatabaseClient (Drizzle type) | proxy | none |
| B152 | PlatformContainer (U502) composition output | C14 composition | U500 | `root.server.ts` only | a record of feature slices `{ accounts, assessmentCalls, closeDatabase, coachingSales, featureFlagOverrides, platform, store, waitlist }`, with waitlist, assessment calls and coaching sales as `{ feature, handles }` | root.server.ts | `composition-root` |
| B180 | Radix wrapper boundary in C5 | C5 frameworks | checkbox, filter-chip-group, sheet, navigation-dialog, select, popover, tabs | apps through the concern subpaths | React props | C5 component | none |
| B181 | SearchParamsWriter (U805) | C5 lib (adapters) | C5 | U237 catalog-view | { searchParams, writeSearchParams } | consumer | none |
| B182 | packages/ui export map | C5 | seven concern `index.ts` entries plus `styles.css`; no root barrel | apps/platform/src, app.css | components, CSS | consumers | exports, `ui-subpaths`, `ui-primitives-import-only-lib`, `ui-lib-is-the-base` |
| B260 | DatabaseClient (U1151, Drizzle NodePgDatabase) | C2 adapters | drizzle() | U503; every repository in C7, C8, C9, C17, C6 | Drizzle ORM instance (detail type). `DatabaseTransaction`, the handle a `transaction` callback receives, is published beside it and named by U1294, U1221 and U125 | C2 | exports |
| B261 | appSchema (U1154, the `app` Postgres namespace) | C2 frameworks | tables attached by U126, U304, U407, U1028, U1295 (with `coachAvailabilityTable` in the same module), U1334, U1431, U2818, U2917 | same modules | drizzle PgSchema builder | consumers | convention; drizzle.config.ts globs discover the tables |
| B262 | RuntimeEnvironment (U1170) | C3 frameworks | the intersection of ten concern shapes with six refinements, composed in `runtime-environment.ts` and loaded from the `./runtime` entry by U1171; the `assessment-calls` shape is one of the four with no refinement | U510 (memoised) only; every other consumer imports the concern type it reads (`AppConfig`, `DatabaseConfig`, `WaitlistConfig`, `BotDetectionSettings`, `ProductEmailConfig`, `ManagementApiConfig`, `AssessmentCallsConfig`) from `.` | typed env object | C3 | exports, `config-runtime-readers` |
| B263 | DatabaseBootstrapEnvironment / DatabaseConnection / DatabaseUserCredentials | C3 | U1174 | U503 | plain credential structures | C3 | exports |
| B265 | packages/test-support (U1191) | C16 | fixture only | test files only | Clerk-shaped fixture | tests | exports plus `no-production-import-of-tests` and `not-to-dev-dep`; the Docker builder also asserts the package is absent after `pnpm --prod deploy` |

| B277 | the request's feature-flag override set (U1352: `runWithFeatureFlagOverrides(overrides, run)`, `currentFeatureFlagOverrides()`; no interface, one `AsyncLocalStorage<Readonly<FeatureFlagSet>>`) | C14 adapters | node `AsyncLocalStorage` | writer U1355 around `next()`; reader U1353 | `Readonly<FeatureFlagSet>` (C1 boundary data) | the store module | `feature-flag-overrides-root-only` keeps every importer inside the folder or the container |
| B278 | FeatureFlagOverrides (U1354) composition output | C14 composition | composeBrowserFeatureFlagOverrides, composeWithoutFeatureFlagOverrides | U500, which hands `featureFlags` to the compositions and keeps the whole on `PlatformContainer`; `root.server.ts` calls `.middleware` off the container | `{ featureFlags: FeatureFlagReader; middleware: MiddlewareFunction<Response> }` | container.server.ts | `feature-flag-overrides-root-only`, `composition-root` |
| B279 | PricingEligibility (U1377) | C1 coaching-bundle (use-cases) | U303 PostgresWaitlistRepository (adapters, C8), handed out as the waitlist composition's `handles.pricingEligibility` | U1378, U1395, U1396, U1384 | an `EmailAddress` in; a `PriceTier` or a map of tiers out | implementer | dependency-absence; composition injection; `feature-internals` keeps C18 from importing C8's repository |
| B280 | CheckoutSessions (U1381) | C1 coaching-subscription (use-cases) | U1433 PostgresPaymentLinks (adapters, C18) | U1384 | plain `CheckoutSessionRecord`s; `{ id }` lists | implementer | dependency-absence |
| B281 | CoachingPurchases (U1382) | C1 coaching-subscription (use-cases) | U1434 PostgresCoachingPurchases (adapters, C18) | U1385 | a `CoachingPurchase` (event id, `Client` and `PurchasedSubscription` instances, read by the adapter through `toSnapshot()`) in; `recorded \| duplicate_event` with the client id, or `call_already_paid`, out | implementer | dependency-absence; the write-port instance allowance in decisions.md |
| B282 | PaymentCheckout (U1383) | C1 coaching-subscription (use-cases) | U1412 InMemoryPaymentCheckout and U1416 StripePaymentCheckout (adapters, C6), built by U1402 on `PAYMENTS_PROVIDER` | U1384, U1386 | a plain `CreateCheckoutSessionCommand` in; `{ id }`, `{ id, url }` and a plain `CheckoutCompletion` out; provider-neutral names | implementer | dependency-absence; `./payments/server` publishes only the factory |
| B283 | PaymentLinks (U1389) | C1 payment-link (use-cases) | U1433 PostgresPaymentLinks (adapters, C18) | U1384, U1395, U1396 | a plain `NewPaymentLink` in; `PaymentLink` instances out | implementer | dependency-absence |
| B284 | PaymentLinkTokenGenerator (U1389) | C1 payment-link (use-cases) | U1432 RandomLinkTokenGenerator (adapters, C18) | U1395 | `{ rawToken, sha256 }` | implementer | dependency-absence |
| B285 | PaymentLinkTokenHasher (U1389) | C1 payment-link (use-cases) | U1432 LinkTokenSha256 (adapters, C18) | U1384, U1396 | strings | implementer | dependency-absence |
| B286 | AssessmentCallReader (U1390) | C1 payment-link (use-cases) | an object over `PostgresAssessmentCallRepository.findById(...).toSnapshot()` in U1235 (composition, C17), handed out as `handles.assessmentCallReader` | U1384, U1385, U1395, U1396 | a call id in; an `AssessmentCallSnapshot` or `null` out | implementer | dependency-absence; composition injection |
| B287 | CallSalesStates (U1391) | C1 payment-link (use-cases) | U1434 PostgresCoachingPurchases (adapters, C18) | U1397, U1384, U1395, U1396 | call ids in; a map of plain `CallSale`s (`{ state, clientId }`, the client id only on a paid call) out | implementer | dependency-absence |
| B288 | CoachingSalesIncidents (U1392) | C1 payment-link (use-cases) | U519 createConsoleLogger (C14) | U1394, U1395 | the failed read, a call id | implementer | dependency-absence, composition injection |
| B289 | CoachingSalesNotifications (U1393) | C1 payment-link (use-cases) | U1437 EmailCoachingSalesNotifications (adapters, C18), built by `createCoachingSalesNotifications` | U1395 | a `PaymentLinkMessage` (call snapshot, link id, raw token, tier) in; `sent \| failed` out | implementer | dependency-absence |
| B290 | PaymentCompletionHandler (U1404) | C6 payments (adapters; adapter-facing contract) | U1428 CoachingPurchaseCompletionHandler (adapters, C18), handed out as `handles.paymentCompletionHandler` | U518 (purpose-keyed map), U1458 | an event id and a `PaidCheckoutSession` in; `recorded \| duplicate \| ignored` out | implementer | composition injection; the platform composition throws at startup on a duplicate purpose |
| B291 | PaymentEvents (U1405) | C6 payments (adapters; adapter-facing contract) | U1415 StripePaymentEvents and U1413 InMemoryPaymentEvents (adapters, C6), both reading events through `PaymentEventReader` (U1407) with the Stripe vocabulary (`STRIPE_VOCABULARY`, U3409), built by U1402 on `PAYMENTS_PROVIDER` | U1458 | the raw body and signature header in; `PaymentEventVerdict` out: a paid session, a subscription change with its purpose, a refund, a card change, `ignored` or `invalid` | implementer | `./payments/server` publishes the contract and the factory only |
| B292 | PaymentWebhookIncidents (U1406) | C6 payments (adapters; adapter-facing contract) | U519 createConsoleLogger (C14) | U1458 | `{ eventId, purpose }` for an unrouted delivery; a handler failure reports `{ eventId, handler, errorClass }`, the handler a purpose or `charge-refunds` | implementer | composition injection |
| B293 | InvitationAcceptance (U1474) | C1 use-cases (`/account`) | an inline object in U1423 over U1483 (composition, C18) | U902 | `{ authSubjectId }` in; `accepted \| refused` out | implementer | dependency-absence; the `/account` slice imports no other slice; the container hands the handle from the coaching-sales to the accounts composition |
| B294 | PaidClientAdmission (U1491) | C1 use-cases (`/coaching-subscription`) | an inline object in U1423 over U1482 (composition, C18) | U1385 | `{ clientId }` in | implementer | dependency-absence; composition injection |
| B295 | ClientInvitations (U1476) | C1 use-cases (`/client-invitation`) | U1509 PostgresClientInvitations (adapters, C18) | U1482, U1483, U1484, U2601, U2602 | `ClientInvitation` instances out of the finders and into `insert` and `reissue`; plain bookkeeping writes (provider, email sent, email failed); `accept` answers `accepted \| raced` | implementer | dependency-absence; `feature-api-to-data`; the composition hands it in |
| B296 | ClientInvitationIdGenerator (U1476) | C1 use-cases | U1508 (adapters, C18) | U1482 | string | implementer | dependency-absence |
| B297 | IdentityInvitations (U1477) | C1 use-cases | U1492 ClerkIdentityInvitations, U1493 InMemoryIdentityInvitations (adapters, C6), selected by U1494 | U1482, U1483, U2602 | plain: `{ email, invitationId }` in for `create`, plus the `previous` `IdentityInvitation` for `replace`; `IdentityInvitation { id, url }` out; subject → invitation id | implementer | dependency-absence; C6 publishes only the factory; `clerk-confined` |
| B298 | InvitationTokenGenerator (U1478) | C1 use-cases | U1432 (adapters, C18) | U1482, U2602 | `{ rawToken, sha256 }` | implementer | dependency-absence |
| B299 | InvitationTokenHasher (U1478) | C1 use-cases | U1432 (adapters, C18) | U1484 | string | implementer | dependency-absence |
| B300 | InvitedClients (U1479) | C1 use-cases | U1510 (adapters, C18) | U1482, U2602 | plain `InvitedClient` (with `subscriptionCancelledOrEnded`) | implementer | dependency-absence |
| B301 | ClientInvitationNotifications (U1480) | C1 use-cases | U1514 EmailClientInvitationNotifications (adapters, C18) over C6 `ProductEmail` | U1482, U2602 | plain `ClientInvitationMessage` in, `sent \| failed` out | implementer | dependency-absence |
| B302 | ClientInvitationIncidents (U1481) | C1 use-cases | U519 createConsoleLogger (adapters, C14) | U1482, U2602 | `{ invitationId }`; `{ invitationId, step: provider \| email }` | implementer | dependency-absence |
| B303 | ClientJourneys (U1487) | C1 use-cases (`/client-journey`) | U1507 PostgresClientJourneys (adapters, C18) | U1488, U1489, U2604, U3161 | `ClientJourney` instance out (the journey stamps and the four review stamps); `{ clientId, at }` in for `recordWelcomeSeen` and `recordOnboardingSubmitted` | implementer | dependency-absence |
| B2600 | ClientIdentities (U2600) | C1 use-cases (`/client`) | U3005 PostgresClientIdentities (adapters, C18), handed out as `handles.clientIdentities` | U2631, U3156 | client id in; plain `ClientIdentity` out | implementer | dependency-absence; composition injection; `feature-internals` keeps C20 from importing C18's reader |
| B2602 | OnboardingClients (U2646) | C1 use-cases (`/client-onboarding`) | U3007 PostgresOnboardingClients (adapters, C18), handed out as `handles.onboardingClients` | U2659, U2660, U2661, U2662, U2663, U2664, U2665, U2666, U2667 | auth subject id or client id in; plain `OnboardingClient` (with `subscriptionCancelledOrEnded`) out | implementer | dependency-absence; composition injection; `feature-internals` |
| B2603 | ClientOnboardingSource (U2642) | C1 use-cases (`/client-onboarding`) | U2820 PostgresClientOnboardings (adapters, C19) | U2659, U2660, U2661, U2662, U2663, U2664, U2665, U2666, U2667 | client id in; plain `{ draft, submission }` out | implementer | dependency-absence |
| B2604 | ClientOnboardingChanges (U2641) | C1 use-cases (`/client-onboarding`) | U2820 PostgresClientOnboardings (adapters, C19) | U2666, U2667 | plain `OnboardingDraft`, `OnboardingSubmission`, `MeasurementEntry` and a `ClientProfile` instance in; `saved \| already-submitted`, or `recorded` with the first entry's id, out | implementer | dependency-absence; the write-port instance allowance in decisions.md |
| B2605 | OnboardingReviews (U2654) | C1 use-cases (`/client-onboarding`) | U2821 PostgresOnboardingReviews (adapters, C19) | U2659, U2660, U2661, U2663, U2664, U2665 | `DetailRequest` instances out and in; `ReviewStamps`, merged answers and a `ClientProfile` instance in; `recorded \| already-open` out | implementer | dependency-absence; the write-port instance allowance |
| B2606 | DetailRequestIdGenerator (U2654) | C1 use-cases (`/client-onboarding`) | U2822 RandomDetailRequestIds (adapters, C19) | U2665 | string | implementer | dependency-absence |
| B2607 | OnboardingReviewStamps (U2653) | C1 use-cases (`/client-onboarding`) | U1507 PostgresClientJourneys (adapters, C18), handed out as `handles.onboardingReviewStamps` | U2663, U2664 | plain `{ clientId, stamps: ReviewStamps }` | implementer | dependency-absence; composition injection |
| B2608 | OnboardingSubmissionStamps (U2657) | C1 use-cases (`/client-onboarding`) | U1507 PostgresClientJourneys (adapters, C18; satisfies it structurally through `recordOnboardingSubmitted`), handed out as `handles.onboardingSubmissionStamps` | U2667 | plain `{ clientId, at }` | implementer | dependency-absence; composition injection |
| B2609 | OnboardingDetailsNotifications (U2648) | C1 use-cases (`/client-onboarding`) | U2826 EmailOnboardingDetailsNotifications (adapters, C19) over C6 `ProductEmail` | U2665 | plain `{ requestId, clientId, email, firstName }` in; `sent \| failed` out | implementer | dependency-absence |
| B2610 | ClientOnboardingIncidents (U2643) | C1 use-cases (`/client-onboarding`) | U519 createConsoleLogger (adapters, C14) | U2659, U2660, U2661, U2663, U2664, U2665, U2666, U2667 | ids, the form id, the refusal reason, the question count, the screening outcome | implementer | dependency-absence |
| B2611 | ClientMeasurementsSource (U2615) | C1 use-cases (`/measurement`: the shared entry read, imported from there by both consuming slices, `/client-profile` and `/client-onboarding`) | U2918 PostgresClientMeasurements (adapters, C20), handed to C19 as the client-profile composition's `handles.measurements` | U2631, U2663 | client id in; plain `MeasurementEntry[]` out | implementer | dependency-absence; composition injection; `feature-internals` keeps C19 from importing C20's repository |
| B2612 | ClientMeasurementRecords (U2619) | C1 use-cases (`/client-profile`) | U2919 PostgresClientMeasurementRecords (adapters, C20) | U2628, U2629, U2630, U3136 | client id and a plain `MeasurementEntry` in, entry id out; plain `MeasurementRecord[]` (entries with ids and `ProgressPhotoSnapshot`s) out | implementer | dependency-absence |
| B2613 | ClientProfiles (U2618) | C1 use-cases (`/client-profile`) | U2922 PostgresClientProfiles (adapters, C20) | U2628, U2629, U2631, U3136 | `ClientProfile` instance out; `(clientId, at)` in | implementer | dependency-absence |
| B2614 | MeasurementClients (U2620) | C1 use-cases (`/client-profile`) | U3007 (adapters, C18), handed out as `handles.measurementClients` | U2628, U2629, U2632, U2633 | auth subject id in; `{ clientId }` out | implementer | dependency-absence; composition injection |
| B2615 | ProgressPhotos (U2627) | C1 use-cases (`/client-profile`) | U2920 PostgresProgressPhotos (adapters, C20) | U3135 (for U2628 and U3136), U2632, U2633 | `ProgressPhoto` instances in and out, read by the adapter through `toSnapshot()`; photo id in | implementer | dependency-absence; the write-port instance allowance |
| B2616 | ProgressPhotoIdGenerator (U2627) | C1 use-cases (`/client-profile`) | U2921 RandomProgressPhotoIds (adapters, C20) | U3135 (for U2628 and U3136) | string | implementer | dependency-absence |
| B2617 | ProgressPhotoStore (U2626) | C1 use-cases (`/client-profile`) | U3103 EncryptedFilesystemProgressPhotoStore and U3106 InMemoryProgressPhotoStore (adapters, C6), selected by U3102 on `CLIENT_MEDIA_PROVIDER` | U3135 (for U2628 and U3136), U2632, U2633 | plain `ProgressPhotoOwner` and bytes (`Uint8Array`) in, plain `ProgressPhotoReference` out; reference in, bytes or `null` out | implementer | dependency-absence; C6 publishes only the factory |
| B2618 | ProgressPhotoRenditions (U2625) | C1 use-cases (`/client-profile`) | U3109 SharpProgressPhotoRenditions (adapters, C6, module-private), built by `createProgressPhotoRenditions` | U3135 (for U2628 and U3136) | bytes in; rendered JPEG bytes or `refused` out | implementer | dependency-absence; C6 publishes only the factory |
| B2619 | MeasurementIncidents (U2622) | C1 use-cases (`/client-profile`) | U519 createConsoleLogger (adapters, C14) | U2628, U3135, U3136, U2632, U2633 | ids, the photo view, received and stored byte counts, the refusal reason, the requester's role | implementer | dependency-absence |
| B2620 | ClientRoster (U2635) | C1 use-cases (`/client-roster`) | U3006 PostgresClientRoster (adapters, C18) | U2637, U2638 | plain `ClientRosterEntry` (with a `ClientJourneySnapshot` and the current `CoachingSubscriptionSnapshot` with its `RefundDueSnapshot`, or `null`) out | implementer | dependency-absence |
| B2621 | ClientRosterIncidents (U2636) | C1 use-cases (`/client-roster`) | U519 createConsoleLogger (adapters, C14) | U2637 | the caught error | implementer | dependency-absence |
| B2622 | ClientUnitPreferencesSource (U2607) | C1 use-cases (`/unit-preference`) | U2923 PostgresClientUnitPreferences (adapters, C20, through `ClientUnitPreferences`), handed out as the client-profile composition's `handles.unitPreferences` (read-only) | U2629, U2659, U2662, U2667 | client id in; `UnitPreference` instance or `null` out | implementer | dependency-absence; composition injection |
| B2623 | ClientUnitPreferences (U2608) | C1 use-cases (`/unit-preference`) | U2923 PostgresClientUnitPreferences (adapters, C20) | U2610 | `{ clientId, preference: UnitPreference, at }` in, read by the adapter through `toSnapshot()` | implementer | dependency-absence; the write-port instance allowance |
| B2624 | UnitPreferenceClients (U2609) | C1 use-cases (`/unit-preference`) | U3007 (adapters, C18), handed out as `handles.unitPreferenceClients` | U2610 | auth subject id in; `{ clientId }` out | implementer | dependency-absence; composition injection |
| B2665 | ClientProfileWriter (U2819) | C19 adapters (`data/`; a consumer-declared transaction-scoped writer) | U2922 `saveClientProfile` (adapters, C20), handed as `handles.saveClientProfile` | U2820 (`recordSubmission`), U2821 (`recordAnswer`) | a C2 `DatabaseTransaction` and a `ClientProfile` instance | implementer | composition injection; the container matches the function shape structurally; `client-profile-never-reaches-client-onboarding` keeps C20 from naming the type |
| B2666 | MeasurementEntryWriter (U2819) | C19 adapters (`data/`; a consumer-declared transaction-scoped writer) | U2918 `recordMeasurementEntry` (adapters, C20), handed as `handles.recordMeasurementEntry` | U2820 (`recordSubmission`) | a C2 `DatabaseTransaction` and `{ clientId, entry: MeasurementEntry }` in, the entry id out | implementer | composition injection; `client-profile-never-reaches-client-onboarding` |
| B2667 | ReviewStampWriter (a transaction-scoped writer function type, declared structurally twice: C19 `data/reviews/onboarding-reviews-repository.server.ts:ReviewStampWriter` and C18 U3004) | C19 data (adapters) | U3004 writeReviewStamps (adapters, C18), handed out as `handles.reviewStampWriter` | C19's `PostgresOnboardingReviews`, inside its review transaction | C2's `DatabaseTransaction` and `{ clientId, stamps: ReviewStamps }` in | implementer | composition injection; `coaching-sales-never-reaches-client-onboarding` holds in both directions only by the structural type (C19 names no C18 module) |
| B2668 | attachProgressPhotos (C20 composition handle: U3136 `AttachProgressPhotosUseCase`, typed by the C1 class) | C1 use-cases (`/client-profile`) | U3136, constructed by U2908 over C20's photo adapters and the container's store and renditions | U2808 `ClientOnboardingController.submit`, after the submission is recorded | `{ clientId, entryId, photos: ReceivedProgressPhoto[] }` in; a `stored \| refused` outcome per view out | use case | composition injection; `client-profile-never-reaches-client-onboarding` keeps the direction onboarding → profile |
| B2669 | CoachingSubscriptions (U3150) | C1 coaching-subscription (use-cases) | U3250 PostgresCoachingSubscriptions (adapters, C18) | U3156, U3157, U3158, U3159, U3160, U3161, U2604 | client id, auth subject id, payment subscription id or payment customer id in; a `CoachingSubscription` instance or `null` out; `{ subscription, previous }` instances (with `eventId` for an event) in; `saved \| stale` or `recorded \| duplicate \| stale` out | implementer | dependency-absence; the write-port instance allowance in decisions.md |
| B2670 | PaymentSubscriptions (U3151) | C1 coaching-subscription (use-cases) | U3204 InMemoryPaymentSubscriptions and U3205 StripePaymentSubscriptions (adapters, C6), built by U1402 on `PAYMENTS_PROVIDER` | U1385, U3156, U3158 | payment subscription and customer ids, an instant and a return URL in; `{ url }` out; provider-neutral names | implementer | dependency-absence; `./payments/server` publishes only the factory |
| B2671 | RefundNotifications (U3153) | C1 coaching-subscription (use-cases) | U3260 EmailRefundNotifications (adapters, C18) over C6's `ProductEmail`, built by `createRefundNotifications` | U3156 | a plain `RefundDueNotice` (with a `RefundDueSnapshot`) in; `sent \| failed` out | implementer | dependency-absence |
| B2672 | CoachingSubscriptionIncidents (U3149) | C1 coaching-subscription (use-cases) | U519 createConsoleLogger (adapters, C14) | U1385, U3156, U3157, U3158, U3160, U3413, U3414, U1428 | ids, start choice, rule, cent amounts, event kind and outcome; an error | implementer | dependency-absence; composition injection |
| B2690 | PaymentSubscriptionChangeHandler (U3201) | C6 payments (adapters; adapter-facing contract) | U3257 CoachingSubscriptionEventHandler (adapters, C18), handed out as `handles.subscriptionChangeHandler` | U518 (purpose-keyed map), U1458 | an event id and a provider-neutral `PaymentSubscriptionChange` in; `recorded \| duplicate \| ignored` out | implementer | composition injection; the platform composition throws at startup on a duplicate purpose |
| B2691 | PaymentRefundHandler (U3201) | C6 payments (adapters; adapter-facing contract) | U3257 CoachingSubscriptionEventHandler (the same instance), handed out as `handles.refundHandler` | U518, U1458 | an event id and a provider-neutral `PaymentRefund` (customer id, charge and refunded cents, currency, instant) in; `recorded \| duplicate \| ignored` out | implementer | composition injection |
| B2673 | PaymentCards (U3411) | C1 coaching-subscription (use-cases) | U3420 PostgresPaymentCards (adapters, C18) | U3413, U3414, U3159 | payment customer id in; a `PaymentCard` or `null` out; `{ paymentCustomerId, card, previous }` (with `eventId` for an event) in; `saved \| stale` or `recorded \| duplicate \| stale` out | implementer | dependency-absence; the write-port instance allowance in decisions.md |
| B2674 | PaymentCustomerCards (U3412) | C1 coaching-subscription (use-cases) | U3417 InMemoryPaymentCustomerCards and U3418 StripePaymentCustomerCards (adapters, C6), built by U1402 on `PAYMENTS_PROVIDER` | U3414 | payment customer id in; a `PaymentCard` or `null` out | implementer | dependency-absence; `./payments/server` publishes only the factory |
| B2692 | PaymentCardHandler (U3201) | C6 payments (adapters; adapter-facing contract) | U3419 CoachingPaymentCardHandler (adapters, C18), handed out as `handles.paymentCardHandler` | U518, U1458 (one handler, reported as `payment-cards`) | an event id and a provider-neutral `PaymentCardChange` in; `recorded \| duplicate \| ignored` out | implementer | composition injection |
| B2693 | ClientResources (U3461) | C1 use-cases | U3436 PostgresClientResources (adapters, C21) | U3455, U3456, U3464, U3506, U3507, U3508, U3519, U3520 | `ClientResource` instances in and out | implementer | dependency-absence; `feature-api-to-data` |
| B2694 | ClientResourceStore (U3459) | C1 use-cases | U3476 FilesystemClientResourceStore through U3475 `createClientResourceStore` (adapters, C6 `./client-media/server`) | U3455, U3462, U3465, U3520 | `{ clientId, resourceId }` owner, bytes, page images, original as `AsyncIterable<Uint8Array>` with size | implementer | dependency-absence; exports |
| B2695 | ResourceDocumentPages (U3468) | C1 use-cases | the C6 `./documents/server` factory `createResourceDocumentPages` over a worker thread (U3483, U3484) | U3455 | PDF bytes in; `unreadable`, or a page count and pages pulled one at a time | implementer | dependency-absence; exports; `pdf-rendering-confined` |
| B2696 | ResourceImagePages (U3472) | C1 use-cases | the C6 `./images/server` factory `createResourceImagePages` | U3455 | image bytes in; a page and a thumbnail, or `refused` | implementer | dependency-absence; exports; `sharp-confined` |
| B2697 | ResourceClients (U3466) | C1 use-cases | the inline `ResourceClients` in U1423 (composition, C18; `exists` over U3007, `findByAuthSubjectId` over U3161), handed out as `handles.resourceClients` | U3456, U3506, U3507, U3508 | `exists(clientId)` → boolean; auth subject id in, `{ clientId, portal: "reachable" \| "unreachable" }` or null out | implementer | dependency-absence; handed by the container |
| B2698 | ClientResourceIds (U3457) | C1 use-cases | U3437 RandomClientResourceIds (adapters, C21) | U3455 | string ids | implementer | dependency-absence |
| B2699 | ClientResourceIncidents (U3458) | C1 use-cases | U519 createConsoleLogger (adapters, C14) | U3455, U3456, U3506, U3507, U3508, U3519, U3520 | ids, reasons, sizes; no file contents | implementer | dependency-absence |

## Entry points and composition roots

| Kind | Path | Constructs |
|---|---|---|
| composition-root | apps/platform/src/server/container.server.ts (createPlatformContainer, memoised by getPlatformContainer) | the shared handles once — the `EmailSubaddressPolicy` from `resolveEmailSubaddressPolicy(environment)`, handed to the waitlist, assessment-calls and store compositions, `createPlatformDatabase`, the `Clock` implementation, `createConsoleLogger()`, `createBotDetectionConfig()`, `createBotVerifier()`, `createManagementAuthConfig()` and `createManagementAuthenticator()`, `createProductEmail()`, `createPayments()` (checkout, events, subscriptions, customer cards), `createIdentityInvitations()` (with the hosted sign-up URL and the client-portal URL), `createProgressPhotoStore()` and `createProgressPhotoRenditions()`, one `PostgresFeatureFlagRepository` and one `GetFeatureFlagsUseCase`, and the override selection by `resolveFeatureFlagOverridesMode(environment)` — then, in order, `composeWaitlistFeature`, `composeAssessmentCallsFeature`, `composeCoachingSalesFeature` (given `assessmentCalls.handles.assessmentCallReader`, `waitlist.handles.pricingEligibility`, the payment subscriptions, the payment customer cards and `coachEmail`, the `ASSESSMENT_CALL_COACH_EMAIL` address), `composeClientProfileFeature` (given coaching sales' `clientIdentities`, `measurementClients` and `unitPreferenceClients`, the progress-photo store and renditions), `composeClientOnboardingFeature` (given coaching sales' `onboardingClients`, `onboardingReviewStamps`, `onboardingSubmissionStamps` and `reviewStampWriter`, and client profile's `attachProgressPhotos`, `measurements`, `recordMeasurementEntry`, `saveClientProfile` and `unitPreferences`), `composePlatformFeature` (given `[coachingSales.handles.paymentCompletionHandler]`, `[coachingSales.handles.subscriptionChangeHandler]`, `coachingSales.handles.refundHandler`, `coachingSales.handles.paymentCardHandler`, the payment events verifier and the webhook signing secret), `composeAccountsFeature` (given `coachingSales.handles.invitationAcceptance`), `composeStoreFeature`; the selected feature-flag reader goes to the platform, waitlist, assessment-calls and coaching-sales compositions; `featureFlagOverrides` is a field of the container. One console logger implements B266, B267, B273, B288, B292, B302, B2610, B2619, B2621 and B2672 |
| composition-root (second) | apps/platform/src/root.server.ts | `clerkMiddleware()`, the container's `featureFlagOverrides.middleware`, `createFeatureContextMiddleware(getPlatformContainer)`, `createAccountResolutionMiddleware()`, in that order; the container's only importer |
| composition-site | apps/platform/src/features/accounts/server/accounts-composition.server.ts | the account repository, `ProvisionAccountUseCase` (with the `InvitationAcceptance` it is handed), `DeleteAccountUseCase`, and the account and webhook controllers; `AccountsFeatureHandles` names only what the feature reads |
| composition-site | apps/platform/src/features/store/server/store-composition.server.ts | the store repositories, asset store and digests, token generators, zip stream, `EmailProductDelivery`, the eight `/product`, `/acquisition` and `/download-grant` use cases, and the five store controllers; `StoreFeatureHandles` names only what the feature reads |
| composition-site | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | `PostgresAssessmentCallRepository`, `PostgresCoachCalendar` (C6, for `ListOpenSlotsUseCase`), `createAssessmentCallNotifications(...)`, the five `/assessment-call` use cases and both controllers, `AssessmentCallsController` and `AssessmentCallSettingsController`. Synchronous, and no use case receives a value read off an adapter at composition: `BookAssessmentCallUseCase` reads the coach's zone from `availability.current()` inside `execute()`. The one remaining assessment-call variable arrives as the handle `assessmentCallsConfig` (the container passes the runtime environment, typed as `AssessmentCallsConfig`). The container's shared `FeatureFlagReader` and incidents handle arrive as `featureFlags` and `incidents`; the composition builds one `AssessmentCallBookingWindow` from them, held by the two booking use cases, not by the controller (CH-F). Changed (GEN-192): builds one `PostgresCoachAvailability` (C6) in place of the deleted `StaticCoachAvailability`, and one `PostgresCoachMeetingRoom` (C6) in place of the deleted `ConfiguredMeetingRoomLink`; both instances are shared across every use case that takes them (`BookAssessmentCallUseCase`, `ListOpenSlotsUseCase`, `ResolveJoinLinkUseCase`, `GetAssessmentCallSettingsUseCase`, `UpdateAssessmentCallSettingsUseCase`); returns `{ feature, handles: { assessmentCallReader } }` |
| composition-site | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | `PostgresPaymentLinks`, `PostgresCoachingPurchases`, `PostgresCoachingSubscriptions`, `PostgresPaymentCards`, `PostgresClientInvitations`, `PostgresInvitedClients`, `PostgresClientJourneys`, `PostgresOnboardingClients`, `PostgresClientRoster`, `PostgresClientIdentities` (one instance for `handles.clientIdentities` and `CancelSubscriptionUseCase`), the invitation id generator, the token generator and hasher, `EmailClientInvitationNotifications`, the five `/client-invitation` use cases (admit, accept, read, resend, resolve), the four `/client-journey` use cases (mark welcome seen, read journey, read portal standing, read program status — the last two over `PostgresCoachingSubscriptions`), the five subscription lifecycle use cases (cancel, with `createRefundNotifications(...)` given the coach address; start now; open the payment-method session; read the client's subscription; reconcile a subscription event) over the payment subscriptions and `PostgresCoachingSubscriptions`, the card mirror use case (behind `CoachingPaymentCardHandler`) and the card refresh use case (run by the completion handler) over `PostgresPaymentCards` and the payment customer cards, the two `/client-roster` use cases (list clients, read client record), the inline `PaidClientAdmission` and `InvitationAcceptance`, `CoachingSalesWindow`, the eight `/payment-link`, `/coaching-subscription` and `/coaching-bundle` use cases (`RecordCheckoutCompletedUseCase` also given the payment checkout, to read the paid session back, and the payment subscriptions), `createCoachingSalesNotifications(...)`, the seven controllers (`CheckoutsController`, `ClientJourneyController`, `CoachClientsController`, `CoachSalesController`, `InvitationsController`, `PaymentLinksController`, `SubscriptionController`), `CoachingPurchaseCompletionHandler`, one `CoachingSubscriptionEventHandler` and `CoachingPaymentCardHandler`; returns `{ feature, handles: { clientIdentities, invitationAcceptance, measurementClients, onboardingClients, onboardingReviewStamps, onboardingSubmissionStamps, paymentCardHandler, paymentCompletionHandler, refundHandler, reviewStampWriter, subscriptionChangeHandler, unitPreferenceClients } }`, `refundHandler` and `subscriptionChangeHandler` being the one change handler |
| composition-site | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | `PostgresClientMeasurements`, `PostgresClientMeasurementRecords`, `PostgresProgressPhotos`, `PostgresClientProfiles`, `PostgresClientUnitPreferences`, `RandomProgressPhotoIds`, the eight use cases (`ReadOwnMeasurementHistoryUseCase`, `RecordMeasurementsUseCase`, `AttachProgressPhotosUseCase` (handed out as `attachProgressPhotos`), `ReadClientMeasurementHistoryUseCase`, `ReadClientProfileUseCase`, `OpenProgressPhotoUseCase`, `RemoveProgressPhotoUseCase` from `/client-profile`; `SaveUnitPreferenceUseCase` from `/unit-preference`) and the four controllers (`ClientMeasurementsController`, `ClientProfileController`, `ProgressPhotoController`, `UnitPreferenceController`). It takes from C18's handles `clientIdentities`, `measurementClients` and `unitPreferenceClients`, and from the container the database client, the `Clock`, the incidents handle (as `MeasurementIncidents`), and the `ProgressPhotoStore` and `ProgressPhotoRenditions` the container builds with C6's `createProgressPhotoStore(environment)` and `createProgressPhotoRenditions()`; it constructs no store or renditions of its own. Synchronous; one instance of each repository is shared by every use case that takes it, and the photo use cases share one port bundle. Returns `{ feature, handles: { measurements, recordMeasurementEntry, saveClientProfile, unitPreferences } }`, which the container hands to C19's composition; its input handles type is module-private |
| composition-site | apps/platform/src/features/client-resources/server/client-resources-composition.server.ts | `PostgresClientResources`, `RandomClientResourceIds`, the nine `/client-resources` use cases and the three controllers (incidents go to the use cases, not the controllers), from the container's clock, database, `ResourceClients` handle, `ClientResourceIncidents`, resource store and the two page factories (built by the container from `RESOURCE_RENDITIONS` and the worker URL); returns the feature directly |
| composition-site | apps/platform/src/features/client-onboarding/server/client-onboarding-composition.server.ts | `PostgresClientOnboardings` (over the database and C20's `saveClientProfile` and `recordMeasurementEntry`), `PostgresOnboardingReviews` (over the database, C18's `reviewStampWriter` and C20's `saveClientProfile`), `RandomDetailRequestIds`, `EmailOnboardingDetailsNotifications` (over the container's `ProductEmail`, with the app base path, public app URL, contact address and `Clock`), the nine `/client-onboarding` use cases (`ReadClientOnboardingUseCase`, `SaveOnboardingDraftUseCase`, `SubmitOnboardingUseCase`, `ReadOpenDetailRequestUseCase`, `AnswerOnboardingDetailsUseCase`, `ReadOnboardingReviewUseCase`, `OpenOnboardingReviewUseCase`, `RequestOnboardingDetailsUseCase`, `ApproveOnboardingAnswersUseCase`) and the two controllers (`ClientOnboardingController`, handed C20's `attachProgressPhotos`, `OnboardingReviewController`). Takes the container's `clock`, `incidents`, `database`, `productEmail`, `appBasePath`, `publicAppUrl` and `contactEmail`; C18's `onboardingClients`, `onboardingSubmissionStamps`, `onboardingReviewStamps` and `reviewStampWriter`; C20's `measurements`, `unitPreferences`, `saveClientProfile` and `recordMeasurementEntry`. Synchronous; its input type is module-private; returns its feature (`{ controller, coachReview }`) directly, with no handles |
| composition-site | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | `Waitlist.configure(...)` from the offer config, the waitlist repository, `EmailWaitlistConfirmation`, `GetWaitlistUseCase` with the supplied `FeatureFlagReader`, `JoinWaitlistUseCase` and the waitlist controller; returns `{ feature, handles: { pricingEligibility } }`; its input handles type is module-private |
| composition-site | apps/platform/src/server/platform-composition.server.ts | readyz, metadata, feature-flag and Stripe webhook controllers plus the runtime config the public site reads; it receives `FeatureFlagReader`, `PaymentEvents`, the signing secret, the completion handlers, the subscription-change handlers, the one refund handler and the one card handler, builds the two purpose-keyed maps with one builder that throws at startup on a duplicate purpose, constructs no persistence, and keeps `PlatformFeatureHandles` module-private |
| composition-site | apps/platform/src/server/feature-flag-overrides/feature-flag-overrides-composition.server.ts | `createFeatureFlagOverrideReader(reader)` over the container's raw reader and `createFeatureFlagOverrideMiddleware({ appBasePath })` in `browser` mode; the raw reader and `(_args, next) => next()` in `none` mode; both branches return `{ featureFlags, middleware }`; reachable only from the container |
| construction-site | apps/platform/src/server/database.server.ts (openPool, lazy) | pg Pool via createManagedDatabasePool; Drizzle client via createDatabaseClient |
| construction-site | apps/platform/src/features/store/email/create-product-delivery.server.ts | EmailProductDelivery over the `ProductEmail` it is handed; no provider branch |
| construction-site | apps/platform/src/features/waitlist/email/create-waitlist-confirmation.server.ts | EmailWaitlistConfirmation over the `ProductEmail` it is handed; no provider branch |
| construction-site | packages/infrastructure/src/email/create-product-email.server.ts | InMemoryProductEmail or `new Resend()` + ResendProductEmail, selected on `PRODUCT_EMAIL_PROVIDER` (`memory \| resend`) |
| construction-site | packages/infrastructure/src/bot-detection/verifier/create-bot-verifier.server.ts | StaticTokenBotVerifier or TurnstileBotVerifier, selected on `BOT_DETECTION_PROVIDER`; no `ENVIRONMENT` sniff |
| construction-site | packages/infrastructure/src/management-auth/create-management-authenticator.server.ts | BearerSecretManagementAuthenticator (bearer only) |
| construction-site | apps/platform/src/features/coaching-sales/email/create-coaching-sales-notifications.server.ts | EmailCoachingSalesNotifications and EmailRefundNotifications, each over the `ProductEmail` it is handed; no provider branch |
| construction-site | packages/infrastructure/src/payments/create-payments.server.ts | `createPayments(config)` → `{ checkout, events, subscriptions, customerCards }`: InMemoryPaymentCheckout, InMemoryPaymentEvents (with `STRIPE_VOCABULARY`), InMemoryPaymentSubscriptions and InMemoryPaymentCustomerCards, or one Stripe client with StripePaymentCheckout, StripePaymentEvents, StripePaymentSubscriptions (with the portal configuration id) and StripePaymentCustomerCards, selected on `PAYMENTS_PROVIDER` (`memory \| stripe`); the Stripe SDK is constructed nowhere else |
| construction-site | packages/infrastructure/src/identity/create-identity-invitations.server.ts | InMemoryIdentityInvitations, or `createClerkClient` + ClerkIdentityInvitations, selected on `IDENTITY_PROVIDER` (`memory \| clerk`) |
| construction-site | packages/infrastructure/src/client-media/create-progress-photo-store.server.ts | InMemoryProgressPhotoStore, or EncryptedFilesystemProgressPhotoStore over `CLIENT_MEDIA_ROOT`, the base64-decoded `CLIENT_MEDIA_KEY` and `CLIENT_MEDIA_KEY_ID`, selected on `CLIENT_MEDIA_PROVIDER` (`memory \| filesystem`); throws at construction when the root is not a readable, writable directory |
| construction-site | packages/infrastructure/src/images/create-progress-photo-renditions.server.ts | SharpProgressPhotoRenditions, no selection; `sharp` is called nowhere else |
| construction-site | apps/platform/src/features/store/api/downloads/zip-stream.server.ts (ZipDeliveryStream.create) | archiver ZipArchive at request time |
| construction-site | apps/platform/src/features/store/ui/public/cart/cart.ts, cart-provider.tsx | Zustand store with persist over localStorage (`cart-storage.ts`); one store per provider |
| construction-site | apps/platform/src/features/client-onboarding/ui/client/onboarding/unit-preference-store.tsx, draft-sync.ts | a Zustand vanilla store per `UnitPreferenceProvider`; `createDraftSync` over `localStorage` and a debounce timer, one per `useDraftSync` |
| route registry | apps/platform/src/routes.ts | a concatenation of eleven fragments (`publicSiteRoutes`, `platformApiRoutes`, `accountsApiRoutes`, `assessmentCallsApiRoutes`, `coachingSalesApiRoutes`, `clientOnboardingApiRoutes`, `clientProfileApiRoutes`, `waitlistApiRoutes`, `storeApiRoutes`, `clientPortalRoutes`, `coachPortalRoutes`), each built in its own feature or surface, with no path literals of its own |
| route (page) | surfaces/public-site/shell/layout.tsx (+ layout.server.ts loader), pages/{home,pricing,blog,privacy,terms}.tsx | the layout loader reads `waitlistContext`, `sessionContext` and `runtimeConfigContext` off `args.context` and returns `presentWaitlist(...)`. `pages/pricing.tsx`'s loader reads `waitlistContext` and `coachingSalesContext` (`checkouts.loadPricingCards`); it exports `handle.publicContentFrame = "full-bleed"`, as the booking page does |
| route (page) | features/store/ui/public/{catalog/catalog-page,product/product-page,download/download-page}.tsx (+ .server.ts loaders) | the loaders read `storeContext` |
| route (page) | surfaces/public-site/pages/invitation.tsx | the loader reads `accountsContext` and `sessionContext` and returns `{ signedIn, invitationPath }`; the browser resolves the fragment's token through C18's `api/public/invitation.ts`. Registered by `surfaces/public-site/routes.ts` after the layout route, outside the shell |
| route (page) | features/accounts/ui/public/sign-in-failed-page.tsx (+ .server.ts) | reads `accountsContext`. Registered through `accountsDeadEndRoutes`, which `surfaces/public-site/routes.ts` spreads after the layout route rather than inside it, so the page renders as a dead end with no public shell |
| route (page) | features/assessment-calls/ui/public/book/book-page.tsx, ui/public/join/join-page.tsx | both loaders read `assessmentCallsContext` and nothing else. The booking loader returns an `unavailable` presentation rather than throwing when slots cannot be read (D21), and 404s while booking is closed because `ListOpenSlotsUseCase` answers `closed`. The join loader redirects 302 to the meeting room for a known id, throws a 404 `Response` for any id that does not resolve (a malformed one included) that the root `ErrorBoundary` in `root.tsx` renders as the app's standard "Page not found" page, which echoes no id, and since GEN-192 returns `{ status: "link_not_set" }` instead of throwing when the coach has not yet saved a meeting room, which the page renders as its own "call link not ready" view built from C5's `DeadEndPage`. The module keeps a default export so it stays a page route: before GEN-192 that export always returned `null`, since the loader always threw; now it renders conditionally. The loader does not read the mode, so a join link keeps working if the site returns to waiting-list mode. The booking page module also exports `handle.publicContentFrame` as `"full-bleed"`, which the public-site layout reads through `useMatches` to drop its padded content frame |
| route (page) | features/assessment-calls/ui/coach/settings/settings-page.tsx | the loader reads `assessmentCallsContext` alone; the page saves through a fetcher against the settings resource route and declares no `ErrorBoundary` of its own. Registered through `assessmentCallsCoachRoutes`, which `surfaces/coach-portal/routes.ts` composes inside the coach layout |
| route (page) | surfaces/coach-portal/pages/assessment-calls.tsx | the loader reads `assessmentCallsContext` for the listing and `coachingSalesContext` for the calls' sales (`loadCallSales`: state and the client id of a paid call) and the callers' pricing tiers; re-exports C17's `AssessmentCallsErrorBoundary` |
| route (page) | features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx, ui/public/checkout-complete/checkout-complete-page.tsx | both loaders read `coachingSalesContext` alone and 404 while sales are closed: the select-bundle loader serves the page shell (`checkouts.loadBundlePageShell`) and the browser posts the fragment's payment-link token to `POST /api/coaching-sales/bundle-page` for the bundle page itself; the confirmation loader calls `checkouts.loadConfirmation`. Registered through `coachingSalesPublicRoutes` inside the public-site shell |
| route (page) | surfaces/client-portal/shell/access-layout.tsx (+ middleware), shell/layout.tsx; surfaces/coach-portal/shell/layout.tsx (+ middleware) | middleware calls `requirePortalAccess(args, { role })`; the client portal's access layout then runs C18's `requireClientPortalStanding`, which reads her portal standing (journey step and access), sets `clientJourneyContext` and redirects a client whose standing does not open the requested path, a client whose access has ended to the ended page only; the client sidebar layout's loader reads `coachingSalesContext` (`clientJourney.loadIdentity`) |
| route (page) | surfaces/client-portal/pages/home.tsx | the loader reads `coachingSalesContext` (`clientJourney.loadProgramStatus`), `clientOnboardingContext` (`controller.loadOpenRequest`) and `clientProfileContext` (`clientMeasurements.loadNudge`) |
| route (page) | surfaces/coach-portal/pages/home.tsx | the loader reads `assessmentCallsContext` (`coachAssessmentCalls.loadCalls`); re-exports C17's `AssessmentCallsErrorBoundary` |
| route (page) | surfaces/coach-portal/pages/client.tsx | the loader reads `coachingSalesContext` (`coachClients.loadClient`), `clientOnboardingContext` (`coachReview.loadReview`) and `clientProfileContext` (`coachProfile.load`, `coachProfile.loadMeasurements`); a 404 renders the page's own "client not found" boundary. Registered by `surfaces/coach-portal/routes.ts` inside the coach layout at `clients/:clientId` |
| route (page) | features/coaching-sales/ui/coach/clients/clients-page.tsx | the loader reads `coachingSalesContext` alone (`coachClients.loadRoster`); registered through `coachingSalesCoachRoutes`, which `surfaces/coach-portal/routes.ts` spreads inside the coach layout |
| route (page) | features/coaching-sales/ui/client/welcome/welcome-page.tsx | loader and action each make one call on `coachingSalesContext`'s `clientJourney` controller; registered through `coachingSalesClientRoutes` inside the client portal's access layout |
| route (page) | features/coaching-sales/ui/client/settings/settings-page.tsx, ui/client/ended/ended-page.tsx | each loader makes one call on `coachingSalesContext`'s `subscription` controller (`loadSettings`, `loadEnded`); the settings page is registered through `coachingSalesClientShellRoutes` inside the client sidebar shell, the ended page through `coachingSalesClientRoutes` inside the access layout and outside the shell |
| route (page) | features/client-onboarding/ui/client/onboarding/onboarding-page.tsx | the loader makes one call on `clientOnboardingContext`'s `controller.loadOnboarding`, which runs C9's `requirePortalAccess` for CLIENT and answers the wizard page, or the answer page while a detail request is open, and 404 for a client not on the journey. Registered through `clientOnboardingClientRoutes`, which `surfaces/client-portal/routes.ts` spreads inside the access layout and outside the sidebar shell |
| route (page) | features/client-profile/ui/client/profile/profile-page.tsx | the loader makes one call on `clientProfileContext`'s `clientMeasurements.loadPage`, which runs C9's `requirePortalAccess` for `CLIENT` and 404s a client with no journey record. Registered through `clientProfileClientRoutes`, which C12's `routes.ts` spreads inside the client portal's access layout and shell |
| route (resource) | features/store/api/{acquisitions/acquisitions,catalog/catalog,covers/covers,downloads/downloads,management/management-product-validations,management/management-products,management/management-product,management/management-product-versions}.ts | read `storeContext`; `acquisitions` also exports a `clientAction` (C6 `./http`'s `fetcherOutcomeOf` over the server action) for the fetcher that writes to it |
| route (resource) | features/waitlist/api/waitlist.ts; features/accounts/api/{account,clerk-webhooks}.ts; features/assessment-calls/api/booking/{slots,bookings}.ts; features/assessment-calls/api/settings/settings.ts; features/coaching-sales/api/{coach/payment-links,coach/invitation-resends,public/checkouts,public/bundle-page,public/invitation,client/subscription-cancellation,client/program-start,client/payment-method-session}.ts | read `waitlistContext` / `accountsContext` / `assessmentCallsContext` / `coachingSalesContext`; `waitlist`, `bookings`, `settings`, `payment-links`, `invitation-resends`, `subscription-cancellation` and `program-start` also export a `clientAction` (C6 `./http`'s `fetcherOutcomeOf` over the server action) for the fetcher that writes to them |
| route (resource) | features/client-onboarding/api/client/{draft,submission,detail-answers}.ts; features/client-onboarding/api/coach/{review-openings,detail-requests,approvals}.ts | read `clientOnboardingContext`; `draft` accepts PUT only, the other five POST only; `submission` takes a multipart body up to 32 MiB (the answers part and C20's photo parts) and answers each photo view's outcome under `photos`; the controllers run C9's `requireApiAccount` for CLIENT or COACH; the five POST routes also export a `clientAction` (C6 `./http`'s `fetcherOutcomeOf` over the server action) for the fetcher that writes to them, while `draft` is written by the raw-`fetch` autosave; registered through `clientOnboardingApiRoutes` in the root registry |
| route (resource) | features/client-profile/api/{client/measurements,client/unit-preference,photos/progress-photo}.ts | read `clientProfileContext`; `api/client-profile/measurements` accepts POST only, `api/client-profile/unit-preference` PUT only, `api/client-profile/photos/:photoId` GET and DELETE; each wraps the call in C6's `handleHttpErrorResponse`; `measurements` and `progress-photo` also export a `clientAction` (C6 `./http`'s `fetcherOutcomeOf` over the server action) for the fetcher that writes to them, and `unit-preference` is written by C19's raw-`fetch` draft autosave. Registered through `clientProfileApiRoutes` in the root registry |
| route (resource) | features/client-resources/api/resources/{client-resources,resource,resource-page,resource-thumbnail,resource-download,resource-opened}.ts | read `clientResourcesContext`; `client-resources` takes the coach's multipart upload (its `clientAction` is C6 `./http`'s `uploadOutcomeOf`), `resource` the coach's PATCH and DELETE and `resource-opened` the client's POST (their `clientAction` is `fetcherOutcomeOf`); the page, thumbnail and download routes are GET for any signed-in account, the domain rule deciding. Registered through `clientResourcesApiRoutes` in the root registry |
| route (resource) | server/api/{readyz/readyz,meta/meta,feature-flags/feature-flags,stripe-webhooks/stripe-webhooks}.ts | read `platformContext`; `api/stripe/webhooks` accepts POST only |
| route (resource) | surfaces/client-portal/api/{manifest,sw,readyz}.ts; surfaces/coach-portal/api/readyz.ts | pwa definitions; static Response |
| middleware | root.server.ts (Clerk, feature-flag overrides, feature contexts, account resolution); portal layout.server.ts and the client portal's access-layout.server.ts (role and journey guards; the journey guard sets `clientJourneyContext`) | see above; the override middleware runs `next()` inside the override store, so every loader, action and controller under it sees the request's overrides through the reader |
| CLI/build | apps/platform/db/drizzle.config.ts (schema globs), vite.config.ts, react-router.config.ts | tooling entry points, not imported by app code |
| package deployment | package manifests and docker/Dockerfile.react-router | `apps/platform` emits only `build`; runtime config, content, domain, infrastructure, and UI packages retain production source/artifacts while excluding `src/**/*.test.*` and `src/**/*.spec.*`; the Docker builder requires `build/server/index.js`, rejects top-level `src` and `e2e`, recursively rejects test/spec files under `node_modules/@eli-coach-platform`, and rejects `@eli-coach-platform/test-support` |

## Shared data shapes

| Shape | Components reading or writing it | Owning component |
|---|---|---|
| Postgres namespace `app` (appSchema) and the migration journal apps/platform/db/drizzle | C2 declares the namespace; C7 (store tables), C8 (waitlist_entries), C9 (accounts, account_role enum), C17 (assessment_calls), C18 (payment_links, checkout_sessions, clients, client_invitations, coaching_subscriptions, payment_cards), C19 (client_onboarding_drafts, client_onboarding_submissions, client_onboarding_reviews, client_onboarding_detail_requests), C20 (client_measurements, client_profiles, client_progress_photos, client_unit_preferences), C21 (client_resources), C6 (feature_flags, coach_time_reservations, coach_availability, coach_meeting_room, payment_events) attach tables; C15 drizzle.config.ts discovers them by glob | C2 owns the namespace; each table is owned by the component that declares it |
| The client-resource file layout under `CLIENT_RESOURCE_ROOT`: `<clientId>/<resourceId>/original`, `page-<n>`, `thumbnail` | C6 `client-media/client-resource-layout.server.ts` writes and reads it; C21's `client_resources` row holds no path, only the ids, format and page count | C6 owns the layout; the ids are C21's |
| `app.coach_availability` and `app.coach_meeting_room` (the two one-row singleton tables migration `0024_create_coach_availability_and_meeting_room.sql` creates) | C6 declares both (`coach-calendar/schema.server.ts`'s `availability/`-adjacent table and the new `coach-meeting-room/schema.server.ts`) and reads/writes them through `PostgresCoachAvailability`/`PostgresCoachMeetingRoom`; C1's `CoachAvailabilitySource`/`CoachAvailabilityChanges` and `CoachMeetingRoomSource`/`CoachMeetingRoomChanges` ports are the only way any other component reaches them; C17's composition constructs both adapters and its two settings use cases are the sole consumers | C6 owns the tables; C1 owns the ports and the validation |
| `app.waitlist_entries.reduced_slot` and its constraints | C8 declares them in U304 and migration 0019 (U1212); U303 allocates slots; U1211 reads the constraint names | C8 owns the table; N is U911's `WAITLIST_REDUCED_PRICING_CAP`, and changing it is a migration in the same PR (b3eb2653) |
| `app.feature_flags`, including `WAITLIST_MODE` | C6 declares and reads it; C15 migration 0018 seeds `WAITLIST_MODE=true`; C14 constructs the generic reader and, in `browser` mode, overlays the request's overrides on the read without writing the table; integration tests write it only for test arrangement; the Playwright suite reaches the flag only through the public `ff.WAITLIST_MODE` override | C6 owns the table; U963 owns the waitlist-mode interpretation and U1300 the booking one, both through `WAITLIST_MODE_FEATURE_FLAG` |
| store zod contracts (contracts/store.ts, store-management.ts) | C7 server half and C7 ui half; C11 through `contracts/` | C7 |
| waitlist zod contracts (contracts/waitlist.ts) | C8; C11 | C8 |
| assessment-call zod contracts (contracts/assessment-calls.ts, and since GEN-192 contracts/assessment-call-settings.ts) | C17 server half and C17 ui half only; no other component reads them | C17 |
| The call-moment wording (contracts/call-moment.ts: `formatCallMoment`, `formatDayFirstDate`, `formatMonthFirstDate`, `formatMonthFirstDay`, `formatClockTime`, `nameTimeZone`) | C17 only: the two email content builders read `formatCallMoment`, which is built on `formatDayFirstDate` and `formatClockTime`; `slot-calendar.tsx` reads `formatDayFirstDate` for the days' accessible names; the booking confirmation, the call overview and the slot picker read the on-screen date (`formatMonthFirstDate`), day heading (`formatMonthFirstDay`), time (`formatClockTime`) and zone (`nameTimeZone`). One module words a call for the emails and the screen, each formatter is named for its wording and every wording names its locale, so the server and the browser render a call identically; every function takes `(instant, timeZone)`, and one `Intl.DateTimeFormat` per wording and zone is cached for the life of the process | C17 |
| The assessment-call rule literals (ASSESSMENT_CALL_RULES: duration, buffer, step, horizon, lead) | C1 `/assessment-call` owns them as a `SlotPolicy` since the coach-calendar refactor; `/coach-availability` defines the `SlotPolicy` shape and names no appointment kind. `stepMinutes` is not a literal: it is derived as duration plus buffer from two module constants. `AssessmentCall` reads the duration to derive `endsAt`; `CoachAvailability` reads the duration, step, horizon and lead time off whichever policy it is handed, the duration so that a start is offered only if the call ends inside the window; `SlotPolicy.of` rejects an invalid policy, so a wrong literal fails at module load; `SlotPolicy.coachTimeFrom` reads the duration and the buffer to size the coach's held interval, which the slot filter tests for overlap and the repository reserves. No adapter re-applies the duration to compute an end: C17 reads `durationMinutes` only as a label (the controller's response and the wire literal, the email copy and `.ics` description, `CallOverview` on the page) and no longer reads `horizonDays`: since the booking-card rebuild the calendar's months are unbounded and a day with no open slot is disabled | C1 |
| The subaddress refusal: `EmailSubaddressPolicy` (`allowed \| refused`) and the error code `email_subaddress_refused` | C1 `/email-address` owns the policy and `EmailAddress.isAcceptedBy`; C14 selects it (`refused` only when `ENVIRONMENT` is `production`); C7, C8 and C17 each carry the code in their own `contracts/` error enum and map it to C4's `EMAIL_SUBADDRESS_REFUSED_MESSAGE` at their existing copy site (C17 controller, C8 `ui/public/errors.ts`, C7 `ui/public/acquisition/acquisition-flow.ts`) | C1 (policy) / C4 (wording) |
| accounts contracts (PublicSessionState, accountResponseSchema, AccountRole) | C9; C11; AccountRole originates in C1 | C9 (wire) / C1 (role) |
| BotDetectionConfig (zod schema in C6) | C6; C7 ui; C8 ui; C11 loader data and props | C6 |
| FeatureFlagSnapshot (featureFlagSnapshotSchema) | C14 controller and route; integration tests | C14 (`server/api/feature-flags/feature-flags-contract.ts`) |
| The request's feature-flag override set (`Readonly<FeatureFlagSet>` in an `AsyncLocalStorage`) and the `__eli_feature_flags` cookie | C14 only: the override middleware writes the store around `next()` and serialises the cookie (`Path=normalizeBasePath(APP_BASE_PATH)`, `HttpOnly`, `SameSite=Lax`); the decorator reader reads the store; the browser holds the cookie | C14 (`server/feature-flag-overrides/`) |
| RuntimeEnvironment | twelve concern shapes, each owned by its `concerns/*.ts` module; consumers read the concern type, and only `apps/platform/src/server/runtime-environment.server.ts` loads the process environment | C3 |
| Route path literals | one owner each: `features/<feature>/contracts/paths.ts`, `surfaces/public-site/paths.ts` and, for the endpoints no surface owns, `server/api/routes.ts` (`api/stripe/webhooks`). The `client` and `coach` portal segments are owned by the accounts feature because `surface-import` forbids a feature importing a surface; `BOOK_PATH` is owned by the assessment-calls feature and read by the public site and by coaching sales; the coach calls and settings paths and `COACH_CALLS_PAGE_PARAM` are owned by the assessment-calls feature (built from the accounts feature's `COACH_PORTAL_PATH`) and read by the coach portal and by coaching sales; the select-bundle, checkout-complete and coaching-sales API paths are owned by the coaching-sales feature | C7, C8, C9, C11, C13, C14, C17, C18 |
| The offer-plan literal `"all-bundles"` | C1 `/waitlist` owns it (`waitlist.ts:WaitlistOfferPlan`); read by C8 `ui/shared` (`bundleOfferPlan` on `WaitlistPresentation`), and re-declared as a bare string in C8 `contracts/waitlist.ts`, C8 `email/waitlist-confirmation-email.server.ts` and C3 `concerns/waitlist.ts` | C1 |
| WaitlistPresentation (mode, isClosed, isUnavailable, showsAuthControls, availabilityStatus, bundleOfferPlan) | C11 shell, hero, about, footer CTA, pricing and the email form. The closed/unavailable/open **copy** branch is re-derived in `hero.tsx`, `footer-cta.tsx` and `pricing.tsx` rather than carried on the presentation (owner ruling: copy tables stay in views) | C8 `ui/shared` |
| C18's tables (`app.payment_links`, `app.checkout_sessions`, `app.clients`, `app.client_invitations`, `app.coaching_subscriptions`) with foreign keys to C17's `app.assessment_calls`; migrations 0026, 0027, 0028, 0029 (`onboarding_submitted_at`), 0030 (the four review stamps), 0035 (the subscription lifecycle columns and checks) and 0036 (`payment_cards`) | C18 declares and writes them; one writer per `clients` column: `PostgresCoachingPurchases` inserts the row with its intake columns (`assessment_call_id`, `first_name`, `last_name`, `email`, `date_of_birth`, `gender`, `primary_goal`, `country`, `phone`, `created_at`) at purchase and nothing rewrites them; `PostgresClientInvitations.accept` binds `auth_subject_id`; `PostgresClientJourneys` writes `welcome_seen_at` and `onboarding_submitted_at` (the latter handed to C19 as `OnboardingSubmissionStamps`), each only while null; `writeReviewStamps` writes `review_opened_at`, `details_requested_at`, `details_answered_at` and `answers_approved_at`, called by `PostgresClientJourneys.record` (C19's `OnboardingReviewStamps`) in its own transaction and by C19's review repository inside its transaction as the handed `reviewStampWriter`. Readers: `PostgresClientJourneys`, `PostgresClientRoster`, `PostgresClientIdentities`, `PostgresOnboardingClients` (for C19 and C20 through the handles), `PostgresInvitedClients` and `PostgresCoachingPurchases`; C19's and C20's tables reference `clients.id` by foreign key. `clients_assessment_call_id_unique` and `clients_auth_subject_id_unique` are shared by the schema (`coachingSalesConstraints`) and the repositories' classified rejections; `client_invitations` keeps one invitation per client and one per token hash; `coaching_subscriptions` has two writers: `PostgresCoachingPurchases` inserts the row from `PurchasedSubscription.toSnapshot()`, and `PostgresCoachingSubscriptions` alone updates `status`, `start_choice`, `cancelled_at`, `access_ends_at`, `payment_problem_since` and the four refund columns, the changed columns only and guarded on every column the transition decided on as read (`status`, `start_choice`, `cancelled_at`, `access_ends_at`, `payment_problem_since`, `refunded_cents`); it is also read by `PostgresClientRoster` and by the cancelled-or-ended reads of `PostgresOnboardingClients` and `PostgresInvitedClients`, every reader selecting the current subscription through `data/subscriptions/current-subscription.server.ts`; its status, refund-reason, refund-complete, non-negative-amount and ending-has-access-end checks are shared by the schema and migration 0035; `coaching_subscriptions_one_open_per_client` is a partial unique index while the status is not `ended`; `app.payment_cards` holds one card on file per provider customer, written only by `PostgresPaymentCards` (upsert or delete guarded on the previous card) and read by it | C18 (the referenced table stays C17's; the four review stamps are a projection of C19's review rows) |
| C19's tables (`app.client_onboarding_drafts`, `app.client_onboarding_submissions`, `app.client_onboarding_reviews`, `app.client_onboarding_detail_requests`) with foreign keys to C18's `app.clients`; migrations 0029, 0031 and 0032 | C19 declares and writes them; `client_onboarding_submissions_client_id_unique` and `client_onboarding_detail_requests_open_per_client_unique` (partial, where `answered_at is null`) are shared by the schema (`clientOnboardingConstraints`) and the repositories' classified rejections; drafts and reviews are keyed by `client_id` | C19 (the referenced table stays C18's) |
| C20's tables (`app.client_profiles`, `app.client_measurements`, `app.client_unit_preferences`, `app.client_progress_photos`) with foreign keys to C18's `app.clients` (and the photos to `client_measurements`); migrations 0029, 0033 and 0034 | C20 declares and writes them; C19 writes the profile and the first measurement entry through C20's handed transaction-scoped writers; `client_profiles.progress_photos_consented_at` holds the photo consent; the photo bytes live in the C6 client-media store under the reference the photo row keeps | C20 (the referenced table stays C18's) |
| `app.payment_events` (the payment-event ledger: event id, received at) | C6 declares it and writes it through `recordPaymentEvent`, which a feature adapter calls inside its own transaction (C18's `PostgresCoachingPurchases.recordCompletion`, and `PostgresCoachingSubscriptions.saveForEvent` and `PostgresPaymentCards.saveForEvent` through `recordEventOnce`, which owns that transaction around the feature's guarded write); one ledger covers checkout, subscription-change, refund and card events; a repeated event id answers `duplicate` and the feature writes nothing else, and a stale subscription write rolls the ledger row back | C6 |
| Payment metadata key `purpose` (`PAYMENT_PURPOSE_METADATA_KEY`) and its values | C1 owns each value (`COACHING_SUBSCRIPTION_PURPOSE`) and carries it on `CreateCheckoutSessionCommand.metadata`; C6 writes it into the provider's session metadata and reads it back from the paid session, the subscription's metadata and an invoice's subscription details; C14's webhook controller routes a paid session and a subscription change to the handler registered for it; a refund and a card change carry no purpose and go to the one refund handler and the one card handler; each handler (C18) declares the purpose it serves | key C6; values C1 |
| Coaching bundle value lists (`COACHING_BUNDLE_IDS`, `COACHING_BUNDLE_MONTHS`, `PRICE_TIERS`, and each bundle's `currency`) | C1 publishes them from `/coaching-bundle` (each tuple checked against the catalog by a test); C6's coaching checkout mapper, C18's contracts (zod enums) and C18's schema (column enums and checks) import them; the checkout use case reads the currency off the bundle | C1 |
| coaching-sales zod contracts (contracts/coaching-sales.ts, bundle-cards.ts, client-journey.ts, coach-clients.ts, client-status.ts, paths.ts) and loader data (`BundlePage`, `CheckoutConfirmation`, `CallSales`, pricing tiers, bundle cards, `ProgramStatus`, `ClientIdentity`, `ClientRoster`, `CoachClient`) | C18 server and ui halves; C13 (`CallSalesState`, the calls and client pages' loader data, the coach-clients paths); C12 (`ClientIdentity`, `ProgramStatus` through the dashboard's loader data); C11 (bundle cards, the journey's portal link); C19 (`CLIENT_ONBOARDING_ROUTE_SEGMENT`, re-exported from its own `contracts/paths.ts`) | C18 |
| PaymentsConfig (`PAYMENTS_PROVIDER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SIGNING_SECRET`, `STRIPE_API_BASE_URL`) | C3 declares and refines; C6 factories read it; C14 passes the environment and the signing secret; the integration rig points the API base URL at WireMock | C3 |
| localStorage cart (STORE_CART_STORAGE_KEY) | C7 ui only | C7 |
| Email HTML rendered from React primitives (Email*) and the email theme (`EMAIL_COLORS`, `EMAIL_FONTS`) | C6 owns the primitives and the theme; the content builders and their style constants live in each feature's `email/` folder (C7, C8, C17, C18; accepted exception) and read the one theme | C6 |
| CLERK_TEST_ENVIRONMENT and the Stripe webhook signature scheme (`./stripe-webhook-signature`) | read only by tests (the integration rig and the e2e suite) | C16 |
| The auth subject id: `app.accounts.auth_subject_id` (C9) and `app.clients.auth_subject_id` (C18, unique, no foreign key) | C9 writes the account on provisioning; C18's `PostgresClientInvitations.accept` binds the client in the acceptance transaction; C1's `InvitationAcceptance` carries it between the two; account deletion leaves the client bound | C9 (the identity provider's user id) |
| The client journey step (`ClientJourneyStep`: `welcome \| onboarding \| submitted \| in-review \| needs-details \| approved`) and its paths | C1 `/client-journey` owns the steps (`ClientJourney.step` over the welcome, submission and four review stamps); C1 `/client-roster` maps each step to a `ClientStatus`; C18 `contracts/client-journey.ts` maps each step to a gate (destination and admitted paths, `clientJourneyRedirect`), to the nav's portal link (`clientJourneyPortalLink`, none from `submitted` on) and the post-submission steps to the program-status kinds; C18 `contracts/client-status.ts` labels, groups and tones the statuses; C11's portal destination, C12's access layout and C12's dashboard read them through C18 | C1 (steps) / C18 (paths and wording) |
| The client status (`CLIENT_STATUSES`: `invited \| onboarding \| awaiting-review \| in-review \| needs-details \| approved \| active \| cancelled \| inactive`) | C1 `/client-roster` owns the vocabulary and `clientStatusOf` (unbound account → `invited`, else the subscription's status, else the journey step's); `ListClientsUseCase` and `ReadClientRecordUseCase` attach it to each entry; C18 `contracts/coach-clients.ts` builds its wire schema from `CLIENT_STATUSES` and `ui/coach/clients/` labels, tones and filters it | C1 (vocabulary and rule) / C18 (labels and filters) |
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
| E1525 | apps/platform/src/features/assessment-calls/ui/coach/settings/settings-page.tsx | apps/platform/src/features/assessment-calls/contracts/assessment-call-settings.ts | type-only import | no | no | lateral | present |
| E1526 | apps/platform/src/features/assessment-calls/ui/coach/settings/settings-page.tsx | apps/platform/src/features/assessment-calls/server/guards/assessment-calls-context.server.ts | import | no | no | lateral | new (GEN-192) |
| E1529 | apps/platform/src/features/assessment-calls/contracts/assessment-call-settings.ts | external:zod | import | n/a | no | lateral | new (GEN-192) |
| E1508 | apps/platform/src/features/assessment-calls/contracts/assessment-call-settings.ts | packages/domain/src/coach-availability/index.ts | import | yes | no | lateral | new (GEN-192): `WEEKDAYS`, `Weekday` |
| E1509 | apps/platform/src/features/assessment-calls/contracts/assessment-call-settings.ts | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | import | no | no | lateral | new (GEN-192): `timeZoneSchema` |
| E55 | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | apps/platform/src/features/store/contracts/store.ts | import | no | yes | outward | present |
| E753 | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | external:crypto | import | n/a | yes | outward | present |
| E754 | apps/platform/src/features/store/api/acquisitions/acquisitions-controller.server.ts | packages/domain/src/acquisition/index.ts | import | yes | no | lateral | present |
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
| E574 | packages/domain/src/shared/index.ts | packages/domain/src/shared/clock.ts | import | no | no | lateral | present |
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
| E1413 | packages/ui/src/layout/dead-end-page.tsx | external:react | type-only import | n/a | no | lateral | present |
| E1578 | packages/ui/src/layout/dead-end-page.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | added (coach follow-ups) |
| E1414 | packages/ui/src/layout/dead-end-page.tsx | packages/ui/src/primitives/index.ts | import | no | no | lateral | present |
| E686 | packages/ui/src/layout/index.ts | packages/ui/src/layout/app-shell.tsx | import | no | no | lateral | present |
| E1415 | packages/ui/src/layout/index.ts | packages/ui/src/layout/dead-end-page.tsx | import | no | no | lateral | present |
| E1201 | packages/ui/src/layout/index.ts | packages/ui/src/layout/navigation-dialog.tsx | import | no | no | lateral | present |
| E687 | packages/ui/src/layout/index.ts | packages/ui/src/layout/phone-frame.tsx | import | no | no | lateral | present |
| E688 | packages/ui/src/layout/index.ts | packages/ui/src/layout/portal-shell.tsx | import | no | no | lateral | present |
| E1203 | packages/ui/src/layout/navigation-dialog.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E1212 | packages/ui/src/layout/navigation-dialog.tsx | external:react | import | n/a | no | lateral | present |
| E1211 | packages/ui/src/layout/navigation-dialog.tsx | packages/ui/src/layout/use-close-mobile-navigation-on-desktop.ts | import | no | no | lateral | present |
| E1208 | packages/ui/src/layout/navigation-dialog.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E992 | packages/ui/src/layout/phone-frame.tsx | external:react | import | n/a | no | lateral | present |
| E691 | packages/ui/src/layout/phone-frame.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E993 | packages/ui/src/layout/portal-shell.tsx | external:react | import | n/a | no | lateral | present |
| E1205 | packages/ui/src/layout/portal-shell.tsx | packages/ui/src/layout/navigation-dialog.tsx | import | no | no | lateral | present |
| E1206 | packages/ui/src/layout/portal-shell.tsx | packages/ui/src/layout/use-close-mobile-navigation-on-desktop.ts | import | no | no | lateral | removed |
| E693 | packages/ui/src/layout/portal-shell.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E694 | packages/ui/src/layout/portal-shell.tsx | packages/ui/src/lib/constants.ts | import | no | no | lateral | present |
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
| E1734 | packages/domain/src/coaching-subscription/coaching-subscription.ts | packages/domain/src/coaching-bundle/index.ts | type-only import | no | no | lateral | present |
| E1735 | packages/domain/src/coaching-subscription/coaching-purchases.ts | packages/domain/src/client/index.ts | type-only import | no | no | lateral | present |
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
| E1749 | packages/domain/src/coaching-subscription/record-checkout-completed-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscription.ts | type-only import | no | no | lateral | present |
| E1758 | apps/platform/src/features/coaching-sales/api/coach/payment-links-controller.server.ts | packages/domain/src/payment-link/index.ts | type-only import | yes | yes | inward | present |
| E1759 | apps/platform/src/features/coaching-sales/api/coach/payment-links-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-account.server.ts | import | yes | yes | outward | present |
| E1760 | apps/platform/src/features/coaching-sales/api/coach/payment-links-controller.server.ts | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | import | no | no | lateral | present |
| E1761 | apps/platform/src/features/coaching-sales/api/coach/payment-links.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E1762 | apps/platform/src/features/coaching-sales/api/coach/payment-links.ts | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E1763 | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | type-only import | no | yes | inward | present |
| E1784 | packages/infrastructure/src/payments/index.server.ts | packages/infrastructure/src/payments/payment-completion-handler.server.ts | re-export | no | no | lateral | present |
| E1785 | packages/infrastructure/src/payments/index.server.ts | packages/infrastructure/src/payments/payment-event-ledger.server.ts | re-export | no | no | lateral | present |
| E1786 | packages/infrastructure/src/payments/index.server.ts | packages/infrastructure/src/payments/payment-events.server.ts | type-only import | no | no | lateral | present |
| E1787 | packages/infrastructure/src/payments/index.server.ts | packages/infrastructure/src/payments/payment-webhook-incidents.server.ts | type-only import | no | no | lateral | present |
| E1788 | packages/infrastructure/src/payments/checkout-session-completion.server.ts | external:zod | import | n/a | yes | outward | present |
| E1801 | packages/infrastructure/src/payments/memory/in-memory-payment-checkout.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | yes | inward | present |
| E1803 | packages/infrastructure/src/payments/stripe/stripe-client.server.ts | packages/config/src/index.ts | type-only import | yes | yes | outward | present |
| E1804 | packages/infrastructure/src/payments/stripe/stripe-client.server.ts | external:stripe | import | n/a | yes | outward | present |
| E1807 | packages/infrastructure/src/payments/stripe/stripe-payment-checkout.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | yes | inward | present |
| E1808 | packages/infrastructure/src/payments/stripe/stripe-payment-checkout.server.ts | external:stripe | import | n/a | yes | outward | present |
| E1809 | packages/infrastructure/src/payments/stripe/stripe-payment-checkout.server.ts | external:zod | import | n/a | yes | outward | present |
| E1818 | packages/infrastructure/src/payments/payment-event-verdict.server.ts | external:zod | import | n/a | yes | outward | present |
| E1820 | packages/infrastructure/src/payments/stripe/stripe-payment-events.server.ts | packages/infrastructure/src/payments/payment-events.server.ts | type-only import | no | no | lateral | present |
| E1822 | packages/infrastructure/src/payments/stripe/stripe-payment-events.server.ts | external:stripe | import | n/a | yes | outward | present |
| E1823 | packages/infrastructure/src/payments/payment-event-ledger.server.ts | packages/infrastructure/src/payments/payment-events-schema.server.ts | import | no | yes | outward | present |
| E1824 | packages/infrastructure/src/payments/payment-event-ledger.server.ts | packages/db/src/index.ts | type-only import | yes | yes | outward | present |
| E1825 | packages/infrastructure/src/payments/payment-events-schema.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E1826 | apps/platform/src/features/coaching-sales/api/payments/coaching-purchase-completion-handler.server.ts | packages/domain/src/coaching-subscription/index.ts | import | yes | yes | inward | present |
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
| E1890 | packages/ui/src/overlays/index.ts | packages/ui/src/overlays/confirm-dialog.tsx | re-export | no | no | lateral | present |
| E1891 | packages/ui/src/overlays/confirm-dialog.tsx | packages/ui/src/primitives/button.tsx | import | no | no | lateral | present |
| E1894 | packages/ui/src/overlays/confirm-dialog.tsx | external:react | type-only import | n/a | no | lateral | present |
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
| E1920 | apps/platform/src/features/coaching-sales/ui/public/call-first-banner.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1921 | apps/platform/src/features/coaching-sales/ui/public/call-first-banner.tsx | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | yes | yes | inward | present |
| E1922 | apps/platform/src/features/coaching-sales/ui/public/call-first-banner.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1923 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/checkout-complete-page.tsx | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/confirmation-copy.ts | import | no | no | lateral | present |
| E1924 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/checkout-complete-page.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E1925 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/checkout-complete-page.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1926 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/checkout-complete-page.tsx | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | type-only import | no | yes | inward | present |
| E1927 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/checkout-complete-page.tsx | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E1929 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/checkout-complete-page.tsx | apps/platform/src/features/coaching-sales/ui/public/call-first-banner.tsx | import | no | no | lateral | present |
| E1930 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/checkout-complete-page.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E1945 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice.tsx | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice-copy.ts | import | no | no | lateral | present |
| E1946 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E1947 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice.tsx | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | import | no | yes | inward | present |
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
| E2024 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice.tsx | external:react | import | n/a | no | lateral | present |
| E2025 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice.tsx | external:react-router | import | n/a | no | lateral | present |
| E2026 | apps/platform/src/features/waitlist/data/repository.server.ts | external:drizzle-orm | import | n/a | no | lateral | present |
| E2028 | apps/platform/src/server/api/routes.ts | external:@react-router/dev | import | n/a | no | lateral | present |
| E2029 | apps/platform/src/server/api/stripe-webhooks/stripe-webhooks.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2030 | apps/platform/src/server/feature-contexts.server.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2033 | apps/platform/src/surfaces/public-site/pages/pricing.tsx | external:react-router | import | n/a | no | lateral | present |
| E2034 | apps/platform/src/surfaces/public-site/routes.ts | external:@react-router/dev | import | n/a | no | lateral | present |
| E2035 | packages/config/src/concerns/payments.ts | external:zod | import | n/a | no | lateral | present |
| E2038 | packages/infrastructure/src/payments/memory/in-memory-payment-checkout.server.ts | external:crypto | import | n/a | no | lateral | present |
| E2040 | packages/infrastructure/src/payments/payment-events-schema.server.ts | external:drizzle-orm/pg-core | import | n/a | no | lateral | present |
| E2041 | packages/infrastructure/src/payments/stripe/stripe-client.server.ts | external:stripe | import | n/a | no | lateral | present |
| E2042 | packages/infrastructure/src/payments/stripe/stripe-payment-checkout.server.ts | external:stripe | import | n/a | no | lateral | present |
| E2043 | packages/infrastructure/src/payments/stripe/stripe-payment-checkout.server.ts | external:zod | import | n/a | no | lateral | present |
| E2044 | packages/infrastructure/src/payments/stripe/stripe-payment-events.server.ts | external:stripe | import | n/a | no | lateral | present |
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
| E1991 | apps/platform/src/features/coaching-sales/api/public/checkouts-controller.server.ts | external:react-router | import | n/a | no | lateral | present |
| E1993 | apps/platform/src/features/coaching-sales/contracts/bundle-cards.ts | external:zod | import | n/a | yes | outward | present |
| E1994 | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | external:zod | import | n/a | yes | outward | present |
| E1998 | apps/platform/src/features/coaching-sales/data/schema.server.ts | external:drizzle-orm | import | n/a | no | lateral | present |
| E1999 | apps/platform/src/features/coaching-sales/data/schema.server.ts | external:drizzle-orm/pg-core | import | n/a | no | lateral | present |
| E2000 | apps/platform/src/features/coaching-sales/email/coaching-sales-email-styles.server.ts | external:react | type-only import | n/a | yes | outward | present |
| E2001 | apps/platform/src/features/coaching-sales/email/payment-link-email.server.ts | external:react | import | n/a | yes | outward | present |
| E2002 | apps/platform/src/features/coaching-sales/email/payment-link-email.server.ts | external:react-dom/server | import | n/a | no | lateral | present |
| E2020 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2021 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx | external:react | import | n/a | no | lateral | present |
| E2022 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/select-bundle-page.tsx | external:react-router | import | n/a | no | lateral | present |
| E2031 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | external:react-router | import | n/a | no | lateral | present |
| E2051 | packages/infrastructure/src/email/index.server.ts | packages/infrastructure/src/email/email-theme.server.ts | re-export | no | no | lateral | present |
| E2052 | apps/platform/src/features/assessment-calls/email/assessment-call-email-styles.server.ts | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
| E2053 | packages/ui/src/appointments/index.ts | packages/ui/src/appointments/appointment.ts | type-only import | no | no | lateral | present |
| E2054 | packages/ui/src/appointments/index.ts | packages/ui/src/appointments/row-action.tsx | re-export | no | no | lateral | present |
| E2055 | packages/ui/src/appointments/row-action.tsx | packages/ui/src/primitives/button.tsx | import | no | no | lateral | present |
| E2056 | packages/ui/src/appointments/row-action.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2057 | packages/ui/src/appointments/row-action.tsx | external:react | type-only import | n/a | no | lateral | present |
| E2058 | apps/platform/src/features/assessment-calls/ui/coach/join-call-link.tsx | packages/ui/src/appointments/index.ts | import | yes | no | lateral | present |
| E2059 | apps/platform/src/features/assessment-calls/ui/coach/join-call-link.tsx | external:lucide-react | import | n/a | no | lateral | present |
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
| E2096 | apps/platform/src/features/coaching-sales/api/public/invitation.ts | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E2097 | apps/platform/src/features/coaching-sales/api/public/invitation.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2098 | apps/platform/src/features/coaching-sales/api/public/invitation.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E2101 | apps/platform/src/features/coaching-sales/api/public/invitations-controller.server.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2102 | apps/platform/src/features/coaching-sales/api/public/invitations-controller.server.ts | packages/domain/src/client-invitation/index.ts | type-only import | yes | yes | inward | present |
| E2103 | apps/platform/src/features/coaching-sales/api/public/invitations-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E2105 | apps/platform/src/features/coaching-sales/contracts/client-journey.ts | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | no | lateral | present |
| E2106 | apps/platform/src/features/coaching-sales/contracts/client-journey.ts | external:zod | import | n/a | no | lateral | present |
| E2107 | apps/platform/src/features/coaching-sales/contracts/client-journey.ts | packages/domain/src/client-journey/index.ts | import | yes | yes | inward | present |
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
| E2149 | apps/platform/src/features/coaching-sales/server/guards/require-client-portal-standing.server.ts | apps/platform/src/features/accounts/server/guards/accounts-context.server.ts | import | yes | no | lateral | present |
| E2150 | apps/platform/src/features/coaching-sales/server/guards/require-client-portal-standing.server.ts | apps/platform/src/features/accounts/server/guards/session-context.server.ts | import | yes | no | lateral | present |
| E2151 | apps/platform/src/features/coaching-sales/server/guards/require-client-portal-standing.server.ts | apps/platform/src/features/coaching-sales/contracts/client-journey.ts | import | no | no | lateral | present |
| E2152 | apps/platform/src/features/coaching-sales/server/guards/require-client-portal-standing.server.ts | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E2153 | apps/platform/src/features/coaching-sales/server/guards/require-client-portal-standing.server.ts | external:react-router | import | n/a | no | lateral | present |
| E2154 | apps/platform/src/features/coaching-sales/server/guards/require-client-portal-standing.server.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E2155 | apps/platform/src/features/coaching-sales/server/guards/require-client-portal-standing.server.ts | packages/domain/src/client-journey/index.ts | type-only import | yes | yes | inward | present |
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
| E2188 | apps/platform/src/surfaces/client-portal/shell/access-layout.server.ts | apps/platform/src/features/coaching-sales/server/guards/require-client-portal-standing.server.ts | import | yes | no | lateral | present |
| E2189 | apps/platform/src/surfaces/client-portal/shell/access-layout.server.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2190 | apps/platform/src/surfaces/client-portal/shell/access-layout.tsx | apps/platform/src/surfaces/client-portal/shell/access-layout.server.ts | import | no | no | lateral | present |
| E2191 | apps/platform/src/surfaces/client-portal/shell/access-layout.tsx | external:react-router | import | n/a | no | lateral | present |
| E2192 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | external:react-router | import | n/a | no | lateral | present |
| E2193 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/features/coaching-sales/server/guards/require-client-portal-standing.server.ts | import | yes | no | lateral | present |
| E2194 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | apps/platform/src/surfaces/public-site/shell/portal-destination.ts | import | no | no | lateral | present |
| E2195 | apps/platform/src/surfaces/public-site/shell/layout.server.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2196 | apps/platform/src/surfaces/public-site/shell/portal-destination.ts | apps/platform/src/features/accounts/contracts/account.ts | type-only import | yes | no | lateral | present |
| E2197 | apps/platform/src/surfaces/public-site/shell/portal-destination.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E2198 | apps/platform/src/surfaces/public-site/shell/portal-destination.ts | apps/platform/src/features/coaching-sales/contracts/client-journey.ts | import | yes | no | lateral | present |
| E2199 | apps/platform/src/surfaces/public-site/shell/portal-destination.ts | packages/domain/src/account/index.ts | type-only import | yes | yes | inward | present |
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
| E2261 | apps/platform/src/features/assessment-calls/api/booking/assessment-calls-controller.server.ts | packages/content/src/index.ts | import | yes | no | lateral | present |
| E2262 | apps/platform/src/features/assessment-calls/api/booking/assessment-calls-controller.server.ts | packages/domain/src/shared/index.ts | type-only import | yes | yes | inward | present |
| E2263 | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | apps/platform/src/features/assessment-calls/contracts/countries.ts | import | no | no | lateral | present |
| E2264 | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | apps/platform/src/features/assessment-calls/contracts/visitor-profile.ts | import | no | no | lateral | present |
| E2265 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | apps/platform/src/features/assessment-calls/api/settings/assessment-call-settings-controller.server.ts | import | no | no | lateral | present |
| E2266 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/domain/src/email-address/index.ts | type-only import | yes | yes | inward | present |
| E2267 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | packages/infrastructure/src/coach-meeting-room/index.server.ts | import | yes | no | lateral | present |
| E2268 | apps/platform/src/features/assessment-calls/ui/public/book/booking-details-form.tsx | apps/platform/src/features/assessment-calls/contracts/countries.ts | import | no | no | lateral | present |
| E2269 | apps/platform/src/features/assessment-calls/ui/public/book/booking-details-form.tsx | apps/platform/src/features/assessment-calls/contracts/visitor-profile.ts | import | no | no | lateral | present |
| E2270 | apps/platform/src/features/assessment-calls/ui/public/book/booking-details-form.tsx | apps/platform/src/features/assessment-calls/ui/public/book/choice-select-field.tsx | import | no | no | lateral | present |
| E2271 | apps/platform/src/features/assessment-calls/ui/public/book/booking-details-form.tsx | apps/platform/src/features/assessment-calls/ui/public/book/date-of-birth-field.tsx | import | no | no | lateral | present |
| E2273 | apps/platform/src/features/assessment-calls/ui/public/book/booking-details-form.tsx | apps/platform/src/features/assessment-calls/ui/public/book/phone-field.tsx | import | no | no | lateral | present |
| E2276 | apps/platform/src/features/assessment-calls/ui/public/book/booking-details-form.tsx | external:react-hook-form | import | n/a | no | lateral | present |
| E2277 | apps/platform/src/features/store/server/store-composition.server.ts | packages/domain/src/email-address/index.ts | type-only import | yes | yes | inward | present |
| E2278 | apps/platform/src/features/store/ui/public/acquisition/acquisition-flow.ts | packages/content/src/index.ts | import | yes | no | lateral | present |
| E2279 | apps/platform/src/features/store/ui/public/acquisition/acquisition-form.ts | external:@hookform/resolvers | import | n/a | no | lateral | present |
| E2280 | apps/platform/src/features/store/ui/public/acquisition/acquisition-form.ts | external:react-hook-form | import | n/a | no | lateral | present |
| E2281 | apps/platform/src/features/waitlist/server/waitlist-composition.server.ts | packages/domain/src/email-address/index.ts | type-only import | yes | yes | inward | present |
| E2282 | apps/platform/src/features/waitlist/ui/public/errors.ts | packages/content/src/index.ts | import | yes | no | lateral | present |
| E2283 | apps/platform/src/server/container.server.ts | apps/platform/src/server/email-subaddress-policy.server.ts | import | no | no | lateral | present |
| E2284 | apps/platform/src/server/email-subaddress-policy.server.ts | packages/config/src/index.ts | type-only import | yes | no | lateral | present |
| E2285 | apps/platform/src/server/email-subaddress-policy.server.ts | packages/domain/src/email-address/index.ts | type-only import | yes | yes | inward | present |
| E2286 | packages/content/src/index.ts | packages/content/src/email-address-copy.ts | import | no | no | lateral | present |
| E2287 | packages/domain/src/acquisition/acquire-products-use-case.ts | packages/domain/src/email-address/index.ts | type-only import | no | no | lateral | present |
| E2288 | packages/domain/src/assessment-call/book-assessment-call-use-case.ts | packages/domain/src/assessment-call/visitor-profile.ts | type-only import | no | no | lateral | present |
| E2289 | packages/domain/src/email-address/email-address.ts | packages/domain/src/email-address/email-subaddress-policy.ts | type-only import | no | no | lateral | present |
| E2290 | packages/domain/src/email-address/index.ts | packages/domain/src/email-address/email-subaddress-policy.ts | type-only import | no | no | lateral | present |
| E2600 | apps/platform/src/features/assessment-calls/ui/public/book/booking-details-form.tsx | external:@hookform/resolvers/zod | import | n/a | no | lateral | present |
| E2601 | apps/platform/src/features/assessment-calls/ui/public/book/booking-details-form.tsx | external:motion/react | import | n/a | no | lateral | present |
| E2602 | apps/platform/src/features/assessment-calls/ui/public/book/choice-select-field.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2603 | apps/platform/src/features/assessment-calls/ui/public/book/date-of-birth-field.tsx | apps/platform/src/features/assessment-calls/contracts/visitor-profile.ts | import | no | yes | inward | present |
| E2604 | apps/platform/src/features/assessment-calls/ui/public/book/date-of-birth-field.tsx | apps/platform/src/features/assessment-calls/ui/shared/day-key.ts | import | no | yes | inward | present |
| E2605 | apps/platform/src/features/assessment-calls/ui/public/book/date-of-birth-field.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2606 | apps/platform/src/features/assessment-calls/ui/public/book/date-of-birth-field.tsx | external:react | import | n/a | no | lateral | present |
| E2607 | apps/platform/src/features/assessment-calls/ui/public/book/date-of-birth-field.tsx | packages/ui/src/calendar/index.ts | import | yes | no | lateral | present |
| E2608 | apps/platform/src/features/assessment-calls/ui/public/book/date-of-birth-field.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E2609 | apps/platform/src/features/assessment-calls/ui/public/book/date-of-birth-field.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2610 | apps/platform/src/features/assessment-calls/ui/public/book/phone-field.tsx | apps/platform/src/features/assessment-calls/contracts/countries.ts | import | no | yes | inward | present |
| E2611 | apps/platform/src/features/assessment-calls/ui/public/book/phone-field.tsx | external:react | type-only import | n/a | no | lateral | present |
| E2612 | apps/platform/src/features/assessment-calls/ui/public/book/phone-field.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2613 | apps/platform/src/features/client-onboarding/api/client/client-onboarding-controller.server.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E2614 | apps/platform/src/features/client-onboarding/api/client/client-onboarding-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-account.server.ts | import | yes | no | lateral | present |
| E2615 | apps/platform/src/features/client-onboarding/api/client/client-onboarding-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | import | yes | no | lateral | present |
| E2616 | apps/platform/src/features/client-onboarding/api/client/client-onboarding-controller.server.ts | apps/platform/src/features/client-onboarding/api/read-json-request-body.server.ts | import | no | no | lateral | present |
| E2617 | apps/platform/src/features/client-onboarding/api/client/client-onboarding-controller.server.ts | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | import | no | no | lateral | present |
| E2618 | apps/platform/src/features/client-onboarding/api/client/client-onboarding-controller.server.ts | external:react-router | type-only import | n/a | yes | outward | present |
| E2619 | apps/platform/src/features/client-onboarding/api/client/client-onboarding-controller.server.ts | packages/domain/src/client-onboarding/index.ts | import | yes | no | lateral | present |
| E2620 | apps/platform/src/features/client-onboarding/api/client/client-onboarding-controller.server.ts | packages/domain/src/shared/index.ts | type-only import | yes | no | lateral | present |
| E2621 | apps/platform/src/features/client-onboarding/api/client/client-onboarding-controller.server.ts | packages/domain/src/unit-preference/index.ts | type-only import | yes | no | lateral | present |
| E2622 | apps/platform/src/features/client-onboarding/api/client/client-onboarding-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E2623 | apps/platform/src/features/client-onboarding/api/client/detail-answers.ts | apps/platform/src/features/client-onboarding/server/guards/client-onboarding-context.server.ts | import | no | no | lateral | present |
| E2624 | apps/platform/src/features/client-onboarding/api/client/detail-answers.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2625 | apps/platform/src/features/client-onboarding/api/client/detail-answers.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E2626 | apps/platform/src/features/client-onboarding/api/client/draft.ts | apps/platform/src/features/client-onboarding/server/guards/client-onboarding-context.server.ts | import | no | no | lateral | present |
| E2627 | apps/platform/src/features/client-onboarding/api/client/draft.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2628 | apps/platform/src/features/client-onboarding/api/client/draft.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E2629 | apps/platform/src/features/client-onboarding/api/client/submission.ts | apps/platform/src/features/client-onboarding/server/guards/client-onboarding-context.server.ts | import | no | no | lateral | present |
| E2630 | apps/platform/src/features/client-onboarding/api/client/submission.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2631 | apps/platform/src/features/client-onboarding/api/client/submission.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E2632 | apps/platform/src/features/client-onboarding/api/coach/approvals.ts | apps/platform/src/features/client-onboarding/server/guards/client-onboarding-context.server.ts | import | no | no | lateral | present |
| E2633 | apps/platform/src/features/client-onboarding/api/coach/approvals.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2634 | apps/platform/src/features/client-onboarding/api/coach/approvals.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E2635 | apps/platform/src/features/client-onboarding/api/coach/detail-requests.ts | apps/platform/src/features/client-onboarding/server/guards/client-onboarding-context.server.ts | import | no | no | lateral | present |
| E2636 | apps/platform/src/features/client-onboarding/api/coach/detail-requests.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2637 | apps/platform/src/features/client-onboarding/api/coach/detail-requests.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E2638 | apps/platform/src/features/client-onboarding/api/coach/onboarding-review-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-account.server.ts | import | yes | no | lateral | present |
| E2639 | apps/platform/src/features/client-onboarding/api/coach/onboarding-review-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | import | yes | no | lateral | present |
| E2640 | apps/platform/src/features/client-onboarding/api/coach/onboarding-review-controller.server.ts | apps/platform/src/features/client-onboarding/api/coach/onboarding-review-presenter.server.ts | import | no | no | lateral | present |
| E2641 | apps/platform/src/features/client-onboarding/api/coach/onboarding-review-controller.server.ts | apps/platform/src/features/client-onboarding/api/read-json-request-body.server.ts | import | no | no | lateral | present |
| E2642 | apps/platform/src/features/client-onboarding/api/coach/onboarding-review-controller.server.ts | apps/platform/src/features/client-onboarding/contracts/onboarding-review.ts | import | no | no | lateral | present |
| E2643 | apps/platform/src/features/client-onboarding/api/coach/onboarding-review-controller.server.ts | external:react-router | type-only import | n/a | yes | outward | present |
| E2644 | apps/platform/src/features/client-onboarding/api/coach/onboarding-review-controller.server.ts | packages/domain/src/client-onboarding/index.ts | type-only import | yes | no | lateral | present |
| E2645 | apps/platform/src/features/client-onboarding/api/coach/onboarding-review-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E2646 | apps/platform/src/features/client-onboarding/api/coach/onboarding-review-presenter.server.ts | apps/platform/src/features/client-onboarding/contracts/onboarding-review.ts | type-only import | no | no | lateral | present |
| E2647 | apps/platform/src/features/client-onboarding/api/coach/onboarding-review-presenter.server.ts | apps/platform/src/features/client-profile/contracts/canonical-measure.ts | import | yes | no | lateral | present |
| E2648 | apps/platform/src/features/client-onboarding/api/coach/onboarding-review-presenter.server.ts | packages/domain/src/client-onboarding/index.ts | import | yes | no | lateral | present |
| E2649 | apps/platform/src/features/client-onboarding/api/coach/review-openings.ts | apps/platform/src/features/client-onboarding/server/guards/client-onboarding-context.server.ts | import | no | no | lateral | present |
| E2650 | apps/platform/src/features/client-onboarding/api/coach/review-openings.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2651 | apps/platform/src/features/client-onboarding/api/coach/review-openings.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E2652 | apps/platform/src/features/client-onboarding/api/read-json-request-body.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E2653 | apps/platform/src/features/client-onboarding/contracts/onboarding-review-copy.ts | apps/platform/src/features/assessment-calls/contracts/visitor-profile.ts | import | yes | no | lateral | present |
| E2654 | apps/platform/src/features/client-onboarding/contracts/onboarding-review-copy.ts | packages/domain/src/assessment-call/index.ts | type-only import | yes | no | lateral | present |
| E2655 | apps/platform/src/features/client-onboarding/contracts/onboarding-review.ts | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | import | no | no | lateral | present |
| E2656 | apps/platform/src/features/client-onboarding/contracts/onboarding-review.ts | external:zod | import | n/a | yes | outward | present |
| E2657 | apps/platform/src/features/client-onboarding/contracts/onboarding-review.ts | packages/domain/src/client-onboarding/index.ts | import | yes | no | lateral | present |
| E2658 | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | apps/platform/src/features/client-profile/contracts/unit-preference.ts | import | yes | no | lateral | present |
| E2659 | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | external:zod | import | n/a | yes | outward | present |
| E2660 | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present |
| E2661 | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | packages/domain/src/client-onboarding/index.ts | import | yes | no | lateral | present |
| E2662 | apps/platform/src/features/client-onboarding/contracts/paths.ts | apps/platform/src/features/coaching-sales/contracts/paths.ts | re-export | yes | no | lateral | present |
| E2663 | apps/platform/src/features/client-onboarding/data/client-profile-writers.server.ts | packages/db/src/index.ts | type-only import | yes | yes | outward | present |
| E2664 | apps/platform/src/features/client-onboarding/data/client-profile-writers.server.ts | packages/domain/src/client-profile/index.ts | type-only import | yes | no | lateral | present |
| E2665 | apps/platform/src/features/client-onboarding/data/client-profile-writers.server.ts | packages/domain/src/measurement/index.ts | type-only import | yes | no | lateral | present |
| E2666 | apps/platform/src/features/client-onboarding/data/onboardings/client-onboardings-repository.server.ts | apps/platform/src/features/client-onboarding/data/client-profile-writers.server.ts | type-only import | no | no | lateral | present |
| E2667 | apps/platform/src/features/client-onboarding/data/onboardings/client-onboardings-repository.server.ts | apps/platform/src/features/client-onboarding/data/schema.server.ts | import | no | yes | outward | present |
| E2668 | apps/platform/src/features/client-onboarding/data/onboardings/client-onboardings-repository.server.ts | external:drizzle-orm | import | n/a | yes | outward | present |
| E2669 | apps/platform/src/features/client-onboarding/data/onboardings/client-onboardings-repository.server.ts | packages/db/src/index.ts | import | yes | yes | outward | present |
| E2670 | apps/platform/src/features/client-onboarding/data/onboardings/client-onboardings-repository.server.ts | packages/domain/src/client-onboarding/index.ts | type-only import | yes | no | lateral | present |
| E2671 | apps/platform/src/features/client-onboarding/data/onboardings/client-onboardings-repository.server.ts | packages/domain/src/client-profile/index.ts | type-only import | yes | no | lateral | present |
| E2672 | apps/platform/src/features/client-onboarding/data/onboardings/client-onboardings-repository.server.ts | packages/domain/src/measurement/index.ts | type-only import | yes | no | lateral | present |
| E2673 | apps/platform/src/features/client-onboarding/data/reviews/detail-request-ids.server.ts | external:crypto | import | n/a | yes | outward | present |
| E2674 | apps/platform/src/features/client-onboarding/data/reviews/detail-request-ids.server.ts | packages/domain/src/client-onboarding/index.ts | type-only import | yes | no | lateral | present |
| E2675 | apps/platform/src/features/client-onboarding/data/reviews/onboarding-reviews-repository.server.ts | apps/platform/src/features/client-onboarding/data/client-profile-writers.server.ts | type-only import | no | no | lateral | present |
| E2676 | apps/platform/src/features/client-onboarding/data/reviews/onboarding-reviews-repository.server.ts | apps/platform/src/features/client-onboarding/data/schema.server.ts | import | no | yes | outward | present |
| E2677 | apps/platform/src/features/client-onboarding/data/reviews/onboarding-reviews-repository.server.ts | external:drizzle-orm | import | n/a | yes | outward | present |
| E2678 | apps/platform/src/features/client-onboarding/data/reviews/onboarding-reviews-repository.server.ts | packages/db/src/index.ts | import | yes | yes | outward | present |
| E2679 | apps/platform/src/features/client-onboarding/data/reviews/onboarding-reviews-repository.server.ts | packages/domain/src/client-onboarding/index.ts | import | yes | no | lateral | present |
| E2680 | apps/platform/src/features/client-onboarding/data/schema.server.ts | apps/platform/src/features/coaching-sales/data/schema.server.ts | import | yes | no | lateral | present |
| E2681 | apps/platform/src/features/client-onboarding/data/schema.server.ts | external:drizzle-orm | import | n/a | no | lateral | present |
| E2682 | apps/platform/src/features/client-onboarding/data/schema.server.ts | external:drizzle-orm/pg-core | import | n/a | no | lateral | present |
| E2683 | apps/platform/src/features/client-onboarding/data/schema.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E2684 | apps/platform/src/features/client-onboarding/data/schema.server.ts | packages/domain/src/client-onboarding/index.ts | type-only import | yes | yes | inward | present |
| E2685 | apps/platform/src/features/client-onboarding/email/details-request-email-styles.server.ts | external:react | type-only import | n/a | no | lateral | present |
| E2686 | apps/platform/src/features/client-onboarding/email/details-request-email-styles.server.ts | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
| E2687 | apps/platform/src/features/client-onboarding/email/details-request-email-template.server.tsx | apps/platform/src/features/client-onboarding/email/details-request-email-styles.server.ts | import | no | no | lateral | present |
| E2688 | apps/platform/src/features/client-onboarding/email/details-request-email-template.server.tsx | packages/infrastructure/src/email/index.server.ts | import | yes | no | lateral | present |
| E2689 | apps/platform/src/features/client-onboarding/email/details-request-email.server.ts | apps/platform/src/features/client-onboarding/email/details-request-email-template.server.tsx | import | no | yes | outward | present |
| E2690 | apps/platform/src/features/client-onboarding/email/details-request-email.server.ts | external:react | import | n/a | yes | outward | present |
| E2691 | apps/platform/src/features/client-onboarding/email/details-request-email.server.ts | external:react-dom/server | import | n/a | yes | outward | present |
| E2692 | apps/platform/src/features/client-onboarding/email/email-onboarding-details-notifications.server.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E2693 | apps/platform/src/features/client-onboarding/email/email-onboarding-details-notifications.server.ts | apps/platform/src/features/client-onboarding/email/details-request-email.server.ts | import | no | no | lateral | present |
| E2694 | apps/platform/src/features/client-onboarding/email/email-onboarding-details-notifications.server.ts | packages/config/src/index.ts | import | yes | yes | outward | present |
| E2695 | apps/platform/src/features/client-onboarding/email/email-onboarding-details-notifications.server.ts | packages/domain/src/client-onboarding/index.ts | type-only import | yes | no | lateral | present |
| E2696 | apps/platform/src/features/client-onboarding/email/email-onboarding-details-notifications.server.ts | packages/domain/src/shared/index.ts | type-only import | yes | no | lateral | present |
| E2697 | apps/platform/src/features/client-onboarding/email/email-onboarding-details-notifications.server.ts | packages/infrastructure/src/email/index.server.ts | type-only import | yes | yes | outward | present |
| E2698 | apps/platform/src/features/client-onboarding/routes.ts | apps/platform/src/features/client-onboarding/contracts/paths.ts | import | no | yes | inward | present |
| E2699 | apps/platform/src/features/client-onboarding/routes.ts | external:@react-router/dev/routes | import | n/a | no | lateral | present |
| E2700 | apps/platform/src/features/client-onboarding/server/client-onboarding-composition.server.ts | apps/platform/src/features/client-onboarding/api/client/client-onboarding-controller.server.ts | import | no | yes | inward | present |
| E2701 | apps/platform/src/features/client-onboarding/server/client-onboarding-composition.server.ts | apps/platform/src/features/client-onboarding/api/coach/onboarding-review-controller.server.ts | import | no | yes | inward | present |
| E2702 | apps/platform/src/features/client-onboarding/server/client-onboarding-composition.server.ts | apps/platform/src/features/client-onboarding/data/client-profile-writers.server.ts | type-only import | no | yes | inward | present |
| E2703 | apps/platform/src/features/client-onboarding/server/client-onboarding-composition.server.ts | apps/platform/src/features/client-onboarding/data/onboardings/client-onboardings-repository.server.ts | import | no | yes | inward | present |
| E2704 | apps/platform/src/features/client-onboarding/server/client-onboarding-composition.server.ts | apps/platform/src/features/client-onboarding/data/reviews/detail-request-ids.server.ts | import | no | yes | inward | present |
| E2705 | apps/platform/src/features/client-onboarding/server/client-onboarding-composition.server.ts | apps/platform/src/features/client-onboarding/data/reviews/onboarding-reviews-repository.server.ts | import | no | yes | inward | present |
| E2706 | apps/platform/src/features/client-onboarding/server/client-onboarding-composition.server.ts | apps/platform/src/features/client-onboarding/email/email-onboarding-details-notifications.server.ts | import | no | yes | inward | present |
| E2707 | apps/platform/src/features/client-onboarding/server/client-onboarding-composition.server.ts | packages/db/src/index.ts | type-only import | yes | yes | inward | present |
| E2708 | apps/platform/src/features/client-onboarding/server/client-onboarding-composition.server.ts | packages/domain/src/client-onboarding/index.ts | import | yes | yes | inward | present |
| E2709 | apps/platform/src/features/client-onboarding/server/client-onboarding-composition.server.ts | packages/domain/src/measurement/index.ts | type-only import | yes | yes | inward | present |
| E2710 | apps/platform/src/features/client-onboarding/server/client-onboarding-composition.server.ts | packages/domain/src/shared/index.ts | type-only import | yes | yes | inward | present |
| E2711 | apps/platform/src/features/client-onboarding/server/client-onboarding-composition.server.ts | packages/domain/src/unit-preference/index.ts | type-only import | yes | yes | inward | present |
| E2712 | apps/platform/src/features/client-onboarding/server/client-onboarding-composition.server.ts | packages/infrastructure/src/email/index.server.ts | type-only import | yes | yes | inward | present |
| E2713 | apps/platform/src/features/client-onboarding/server/guards/client-onboarding-context.server.ts | apps/platform/src/features/client-onboarding/server/client-onboarding-composition.server.ts | type-only import | no | yes | outward | present |
| E2714 | apps/platform/src/features/client-onboarding/server/guards/client-onboarding-context.server.ts | external:react-router | import | n/a | no | lateral | present |
| E2715 | apps/platform/src/features/client-onboarding/ui/client/onboarding/answer-request-card.tsx | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | yes | inward | present |
| E2716 | apps/platform/src/features/client-onboarding/ui/client/onboarding/answer-request-card.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding-review-copy.ts | import | no | yes | inward | present |
| E2717 | apps/platform/src/features/client-onboarding/ui/client/onboarding/answer-request-card.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | type-only import | no | yes | inward | present |
| E2719 | apps/platform/src/features/client-onboarding/ui/client/onboarding/answer-request-card.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-field-control.tsx | import | no | no | lateral | present |
| E2720 | apps/platform/src/features/client-onboarding/ui/client/onboarding/answer-request-card.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-values.ts | import | no | no | lateral | present |
| E2721 | apps/platform/src/features/client-onboarding/ui/client/onboarding/answer-request-card.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/unit-preference-store.tsx | import | no | no | lateral | present |
| E2722 | apps/platform/src/features/client-onboarding/ui/client/onboarding/answer-request-card.tsx | external:react | import | n/a | no | lateral | present |
| E2723 | apps/platform/src/features/client-onboarding/ui/client/onboarding/answer-request-card.tsx | external:react-hook-form | import | n/a | no | lateral | present |
| E2724 | apps/platform/src/features/client-onboarding/ui/client/onboarding/answer-request-card.tsx | external:react-router | import | n/a | no | lateral | present |
| E2725 | apps/platform/src/features/client-onboarding/ui/client/onboarding/answer-request-card.tsx | packages/domain/src/client-onboarding/index.ts | import | yes | yes | inward | present |
| E2726 | apps/platform/src/features/client-onboarding/ui/client/onboarding/answer-request-card.tsx | packages/domain/src/unit-preference/index.ts | type-only import | yes | yes | inward | present |
| E2727 | apps/platform/src/features/client-onboarding/ui/client/onboarding/answer-request-card.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E2728 | apps/platform/src/features/client-onboarding/ui/client/onboarding/answer-request-card.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2729 | apps/platform/src/features/client-onboarding/ui/client/onboarding/draft-sync.ts | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | import | no | yes | inward | present |
| E2731 | apps/platform/src/features/client-onboarding/ui/client/onboarding/draft-sync.ts | apps/platform/src/features/client-profile/contracts/unit-preference.ts | import | yes | yes | inward | present |
| E2732 | apps/platform/src/features/client-onboarding/ui/client/onboarding/draft-sync.ts | external:zod | import | n/a | no | lateral | present |
| E2733 | apps/platform/src/features/client-onboarding/ui/client/onboarding/draft-sync.ts | packages/domain/src/unit-preference/index.ts | type-only import | yes | yes | inward | present |
| E2734 | apps/platform/src/features/client-onboarding/ui/client/onboarding/measurement-system-field.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/unit-preference-store.tsx | import | no | no | lateral | present |
| E2735 | apps/platform/src/features/client-onboarding/ui/client/onboarding/measurement-system-field.tsx | external:react | import | n/a | no | lateral | present |
| E2736 | apps/platform/src/features/client-onboarding/ui/client/onboarding/measurement-system-field.tsx | packages/domain/src/unit-preference/index.ts | import | yes | yes | inward | present |
| E2737 | apps/platform/src/features/client-onboarding/ui/client/onboarding/measurement-system-field.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2746 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-consent.tsx | external:react-router | import | n/a | no | lateral | present |
| E2747 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-consent.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2748 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-field-control.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding-copy.ts | import | no | yes | inward | present |
| E2749 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-field-control.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-validation.ts | import | no | no | lateral | present |
| E2750 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-field-control.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-values.ts | import | no | no | lateral | present |
| E2751 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-field-control.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/unit-preference-store.tsx | import | no | no | lateral | present |
| E2752 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-field-control.tsx | apps/platform/src/features/client-profile/ui/shared/measure-field/measure-field.tsx | import | yes | no | lateral | present |
| E2753 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-field-control.tsx | external:react | import | n/a | no | lateral | present |
| E2754 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-field-control.tsx | external:react-hook-form | import | n/a | no | lateral | present |
| E2755 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-field-control.tsx | packages/domain/src/client-onboarding/index.ts | import | yes | yes | inward | present |
| E2756 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-field-control.tsx | packages/domain/src/unit-preference/index.ts | import | yes | yes | inward | present |
| E2757 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-field-control.tsx | packages/ui/src/calendar/index.ts | import | yes | no | lateral | present |
| E2758 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-field-control.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E2759 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-field-control.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2760 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-form-card.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | type-only import | no | yes | inward | present |
| E2761 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-form-card.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-field-control.tsx | import | no | no | lateral | present |
| E2762 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-form-card.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-values.ts | import | no | no | lateral | present |
| E2763 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-form-card.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/unit-preference-store.tsx | import | no | no | lateral | present |
| E2764 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-form-card.tsx | external:react | import | n/a | no | lateral | present |
| E2765 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-form-card.tsx | external:react-hook-form | import | n/a | no | lateral | present |
| E2766 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-form-card.tsx | packages/domain/src/client-onboarding/index.ts | type-only import | yes | yes | inward | present |
| E2767 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-form-card.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E2768 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-form-card.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2769 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-page.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding-review-copy.ts | import | no | yes | inward | present |
| E2770 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-page.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | type-only import | no | yes | inward | present |
| E2771 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-page.tsx | apps/platform/src/features/client-onboarding/server/guards/client-onboarding-context.server.ts | import | no | no | lateral | present |
| E2772 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-page.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/answer-request-card.tsx | import | no | no | lateral | present |
| E2773 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-page.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-wizard.tsx | import | no | no | lateral | present |
| E2774 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-page.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/unit-preference-store.tsx | import | no | no | lateral | present |
| E2775 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-page.tsx | external:react | type-only import | n/a | no | lateral | present |
| E2776 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-page.tsx | external:react-router | import | n/a | no | lateral | present |
| E2777 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-page.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2779 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-steps.ts | packages/domain/src/client-onboarding/index.ts | import | yes | yes | inward | present |
| E2780 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-validation.ts | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-values.ts | import | no | no | lateral | present |
| E2781 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-validation.ts | external:react-hook-form | type-only import | n/a | no | lateral | present |
| E2782 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-validation.ts | packages/domain/src/client-onboarding/index.ts | import | yes | yes | inward | present |
| E2783 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-validation.ts | packages/domain/src/unit-preference/index.ts | type-only import | yes | yes | inward | present |
| E2784 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-values.ts | packages/domain/src/client-onboarding/index.ts | import | yes | yes | inward | present |
| E2785 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-values.ts | packages/domain/src/unit-preference/index.ts | import | yes | yes | inward | present |
| E2786 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-wizard.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding-copy.ts | import | no | yes | inward | present |
| E2787 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-wizard.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | type-only import | no | yes | inward | present |
| E2788 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-wizard.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/measurement-system-field.tsx | import | no | no | lateral | present |
| E2789 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-wizard.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-consent.tsx | import | no | no | lateral | present |
| E2790 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-wizard.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-form-card.tsx | import | no | no | lateral | present |
| E2791 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-wizard.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-steps.ts | import | no | no | lateral | present |
| E2792 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-wizard.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-onboarding-draft.ts | import | no | no | lateral | present |
| E2793 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-wizard.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-to-coach.ts | import | no | no | lateral | present |
| E2794 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-wizard.tsx | external:motion/react | import | n/a | no | lateral | present |
| E2795 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-wizard.tsx | external:react | import | n/a | no | lateral | present |
| E2796 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-wizard.tsx | packages/domain/src/client-onboarding/index.ts | import | yes | yes | inward | present |
| E2797 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-wizard.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E2798 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-wizard.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2799 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-wizard.tsx | packages/ui/src/toast/index.ts | import | yes | no | lateral | present |
| E2800 | apps/platform/src/features/client-onboarding/ui/client/onboarding/unit-preference-store.tsx | external:react | import | n/a | no | lateral | present |
| E2801 | apps/platform/src/features/client-onboarding/ui/client/onboarding/unit-preference-store.tsx | external:zustand | import | n/a | no | lateral | present |
| E2802 | apps/platform/src/features/client-onboarding/ui/client/onboarding/unit-preference-store.tsx | external:zustand/vanilla | import | n/a | no | lateral | present |
| E2803 | apps/platform/src/features/client-onboarding/ui/client/onboarding/unit-preference-store.tsx | packages/domain/src/unit-preference/index.ts | import | yes | yes | inward | present |
| E2804 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-draft-sync.ts | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | type-only import | no | yes | inward | present |
| E2805 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-draft-sync.ts | apps/platform/src/features/client-onboarding/ui/client/onboarding/draft-sync.ts | import | no | no | lateral | present |
| E2807 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-draft-sync.ts | external:react | import | n/a | no | lateral | present |
| E2808 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-draft-sync.ts | packages/domain/src/unit-preference/index.ts | type-only import | yes | yes | inward | present |
| E2809 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-onboarding-draft.ts | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | type-only import | no | yes | inward | present |
| E2810 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-onboarding-draft.ts | apps/platform/src/features/client-onboarding/ui/client/onboarding/draft-sync.ts | import | no | no | lateral | present |
| E2811 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-onboarding-draft.ts | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-steps.ts | import | no | no | lateral | present |
| E2812 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-onboarding-draft.ts | apps/platform/src/features/client-onboarding/ui/client/onboarding/unit-preference-store.tsx | import | no | no | lateral | present |
| E2813 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-onboarding-draft.ts | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-draft-sync.ts | import | no | no | lateral | present |
| E2814 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-onboarding-draft.ts | external:react | import | n/a | no | lateral | present |
| E2815 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-onboarding-draft.ts | packages/domain/src/client-onboarding/index.ts | import | yes | yes | inward | present |
| E2816 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-onboarding-draft.ts | packages/domain/src/unit-preference/index.ts | type-only import | yes | yes | inward | present |
| E2817 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-to-coach.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | yes | inward | present |
| E2818 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-to-coach.ts | apps/platform/src/features/client-onboarding/contracts/onboarding-copy.ts | import | no | yes | inward | present |
| E2819 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-to-coach.ts | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | import | no | yes | inward | present |
| E2821 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-to-coach.ts | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-onboarding-draft.ts | type-only import | no | no | lateral | present |
| E2822 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-to-coach.ts | external:react | import | n/a | no | lateral | present |
| E2823 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-to-coach.ts | external:react-router | import | n/a | no | lateral | present |
| E2824 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-to-coach.ts | packages/domain/src/client-onboarding/index.ts | import | yes | yes | inward | present |
| E2825 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/answer-groups.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding-review-copy.ts | import | no | yes | inward | present |
| E2826 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/answer-groups.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding-review.ts | type-only import | no | yes | inward | present |
| E2827 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/answer-groups.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | type-only import | no | yes | inward | present |
| E2828 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/answer-groups.tsx | apps/platform/src/features/client-onboarding/ui/coach/onboarding/question-ids.ts | import | no | no | lateral | present |
| E2829 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/answer-groups.tsx | apps/platform/src/features/client-onboarding/ui/coach/onboarding/review-answer-value.tsx | import | no | no | lateral | present |
| E2830 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/answer-groups.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E2831 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/answer-groups.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2832 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/cycle-mode-info.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding-review-copy.ts | import | no | yes | inward | present |
| E2833 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/cycle-mode-info.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2834 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/cycle-mode-info.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2835 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-panel.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding-review-copy.ts | import | no | yes | inward | present |
| E2836 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-panel.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding-review.ts | type-only import | no | yes | inward | present |
| E2837 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-panel.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | type-only import | no | yes | inward | present |
| E2838 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-panel.tsx | apps/platform/src/features/client-onboarding/ui/coach/onboarding/answer-groups.tsx | import | no | no | lateral | present |
| E2839 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-panel.tsx | apps/platform/src/features/client-onboarding/ui/coach/onboarding/cycle-mode-info.tsx | import | no | no | lateral | present |
| E2840 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-panel.tsx | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-review-dialog.tsx | import | no | no | lateral | present |
| E2841 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-panel.tsx | apps/platform/src/features/client-onboarding/ui/coach/onboarding/question-ids.ts | import | no | no | lateral | present |
| E2843 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-panel.tsx | apps/platform/src/features/client-onboarding/ui/coach/onboarding/screening-warning.tsx | import | no | no | lateral | present |
| E2844 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-panel.tsx | apps/platform/src/features/client-onboarding/ui/coach/onboarding/use-onboarding-review-actions.ts | import | no | no | lateral | present |
| E2846 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-panel.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2847 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-panel.tsx | external:react | import | n/a | no | lateral | present |
| E2848 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-panel.tsx | packages/domain/src/assessment-call/index.ts | type-only import | yes | yes | inward | present |
| E2849 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-panel.tsx | packages/ui/src/overlays/index.ts | import | yes | no | lateral | present |
| E2850 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-panel.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E2851 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-panel.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2852 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-review-bar.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding-review-copy.ts | import | no | yes | inward | present |
| E2853 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-review-bar.tsx | external:react | import | n/a | no | lateral | present |
| E2854 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-review-bar.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2855 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-review-dialog.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding-review-copy.ts | import | no | yes | inward | present |
| E2856 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-review-dialog.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding-review.ts | type-only import | no | yes | inward | present |
| E2857 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-review-dialog.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | type-only import | no | yes | inward | present |
| E2858 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-review-dialog.tsx | apps/platform/src/features/client-onboarding/ui/coach/onboarding/answer-groups.tsx | import | no | no | lateral | present |
| E2859 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-review-dialog.tsx | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-review-bar.tsx | import | no | no | lateral | present |
| E2860 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-review-dialog.tsx | external:react | import | n/a | no | lateral | present |
| E2861 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-review-dialog.tsx | packages/domain/src/assessment-call/index.ts | type-only import | yes | yes | inward | present |
| E2862 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-review-dialog.tsx | packages/ui/src/overlays/index.ts | import | yes | no | lateral | present |
| E2863 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/question-ids.ts | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | type-only import | no | yes | inward | present |
| E2864 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/review-answer-value.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding-review-copy.ts | import | no | yes | inward | present |
| E2865 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/review-answer-value.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding-review.ts | type-only import | no | yes | inward | present |
| E2866 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/review-answer-value.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2868 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/screening-warning.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding-review-copy.ts | import | no | yes | inward | present |
| E2869 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/screening-warning.tsx | apps/platform/src/features/client-onboarding/contracts/onboarding-review.ts | type-only import | no | yes | inward | present |
| E2870 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/screening-warning.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E2871 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/screening-warning.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2872 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/use-onboarding-review-actions.ts | apps/platform/src/features/client-onboarding/contracts/onboarding-review-copy.ts | import | no | yes | inward | present |
| E2873 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/use-onboarding-review-actions.ts | apps/platform/src/features/client-onboarding/contracts/onboarding-review.ts | import | no | yes | inward | present |
| E2874 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/use-onboarding-review-actions.ts | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | type-only import | no | yes | inward | present |
| E2875 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/use-onboarding-review-actions.ts | apps/platform/src/features/client-onboarding/contracts/paths.ts | import | no | yes | inward | present |
| E2876 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/use-onboarding-review-actions.ts | external:react | import | n/a | no | lateral | present |
| E2877 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/use-onboarding-review-actions.ts | external:react-router | import | n/a | no | lateral | present |
| E2878 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/use-onboarding-review-actions.ts | packages/ui/src/toast/index.ts | import | yes | no | lateral | present |
| E2879 | apps/platform/src/features/client-profile/api/client/measurements-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-account.server.ts | import | yes | no | lateral | present |
| E2880 | apps/platform/src/features/client-profile/api/client/measurements-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | import | yes | no | lateral | present |
| E2881 | apps/platform/src/features/client-profile/api/client/measurements-controller.server.ts | apps/platform/src/features/client-profile/contracts/measurements.ts | import | no | no | lateral | present |
| E2882 | apps/platform/src/features/client-profile/api/client/measurements-controller.server.ts | external:react-router | type-only import | n/a | yes | outward | present |
| E2883 | apps/platform/src/features/client-profile/api/client/measurements-controller.server.ts | packages/domain/src/client-profile/index.ts | import | yes | no | lateral | present |
| E2886 | apps/platform/src/features/client-profile/api/client/measurements-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E2887 | apps/platform/src/features/client-profile/api/client/measurements.ts | apps/platform/src/features/client-profile/server/guards/client-profile-context.server.ts | import | no | no | lateral | present |
| E2888 | apps/platform/src/features/client-profile/api/client/measurements.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2889 | apps/platform/src/features/client-profile/api/client/measurements.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E2890 | apps/platform/src/features/client-profile/api/client/unit-preference-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-account.server.ts | import | yes | no | lateral | present |
| E2891 | apps/platform/src/features/client-profile/api/client/unit-preference-controller.server.ts | apps/platform/src/features/client-profile/contracts/unit-preference.ts | import | no | no | lateral | present |
| E2892 | apps/platform/src/features/client-profile/api/client/unit-preference-controller.server.ts | external:react-router | type-only import | n/a | yes | outward | present |
| E2893 | apps/platform/src/features/client-profile/api/client/unit-preference-controller.server.ts | packages/domain/src/unit-preference/index.ts | type-only import | yes | no | lateral | present |
| E2894 | apps/platform/src/features/client-profile/api/client/unit-preference-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E2895 | apps/platform/src/features/client-profile/api/client/unit-preference.ts | apps/platform/src/features/client-profile/server/guards/client-profile-context.server.ts | import | no | no | lateral | present |
| E2896 | apps/platform/src/features/client-profile/api/client/unit-preference.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2897 | apps/platform/src/features/client-profile/api/client/unit-preference.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E2898 | apps/platform/src/features/client-profile/api/coach/client-profile-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | import | yes | no | lateral | present |
| E2899 | apps/platform/src/features/client-profile/api/coach/client-profile-controller.server.ts | apps/platform/src/features/client-profile/contracts/client-profile.ts | import | no | no | lateral | present |
| E2900 | apps/platform/src/features/client-profile/api/coach/client-profile-controller.server.ts | apps/platform/src/features/client-profile/contracts/measurements.ts | import | no | no | lateral | present |
| E2901 | apps/platform/src/features/client-profile/api/coach/client-profile-controller.server.ts | external:react-router | type-only import | n/a | yes | outward | present |
| E2902 | apps/platform/src/features/client-profile/api/coach/client-profile-controller.server.ts | external:zod | import | n/a | yes | outward | present |
| E2903 | apps/platform/src/features/client-profile/api/coach/client-profile-controller.server.ts | packages/domain/src/client-profile/index.ts | type-only import | yes | no | lateral | present |
| E2904 | apps/platform/src/features/client-profile/api/photos/progress-photo-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-account.server.ts | import | yes | no | lateral | present |
| E2905 | apps/platform/src/features/client-profile/api/photos/progress-photo-controller.server.ts | external:react-router | type-only import | n/a | yes | outward | present |
| E2907 | apps/platform/src/features/client-profile/api/photos/progress-photo-controller.server.ts | external:zod | import | n/a | yes | outward | present |
| E2908 | apps/platform/src/features/client-profile/api/photos/progress-photo-controller.server.ts | packages/domain/src/client-profile/index.ts | type-only import | yes | no | lateral | present |
| E2909 | apps/platform/src/features/client-profile/api/photos/progress-photo.ts | apps/platform/src/features/client-profile/server/guards/client-profile-context.server.ts | import | no | no | lateral | present |
| E2910 | apps/platform/src/features/client-profile/api/photos/progress-photo.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E2911 | apps/platform/src/features/client-profile/api/photos/progress-photo.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E2912 | apps/platform/src/features/client-profile/contracts/canonical-measure.ts | packages/domain/src/unit-preference/index.ts | import | yes | no | lateral | present |
| E2913 | apps/platform/src/features/client-profile/contracts/client-profile.ts | external:zod | import | n/a | yes | outward | present |
| E2914 | apps/platform/src/features/client-profile/contracts/client-profile.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present |
| E2915 | apps/platform/src/features/client-profile/contracts/measurements.ts | apps/platform/src/features/assessment-calls/contracts/visitor-profile.ts | import | yes | no | lateral | present |
| E2916 | apps/platform/src/features/client-profile/contracts/measurements.ts | apps/platform/src/features/client-profile/contracts/unit-preference.ts | import | no | no | lateral | present |
| E2917 | apps/platform/src/features/client-profile/contracts/measurements.ts | external:zod | import | n/a | yes | outward | present |
| E2918 | apps/platform/src/features/client-profile/contracts/measurements.ts | packages/domain/src/assessment-call/index.ts | type-only import | yes | no | lateral | present |
| E2919 | apps/platform/src/features/client-profile/contracts/measurements.ts | packages/domain/src/client-profile/index.ts | import | yes | no | lateral | present |
| E2920 | apps/platform/src/features/client-profile/contracts/paths.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E2921 | apps/platform/src/features/client-profile/contracts/unit-preference.ts | external:zod | import | n/a | yes | outward | present |
| E2922 | apps/platform/src/features/client-profile/contracts/unit-preference.ts | packages/domain/src/unit-preference/index.ts | import | yes | no | lateral | present |
| E2923 | apps/platform/src/features/client-profile/data/measurements/client-measurement-records-repository.server.ts | apps/platform/src/features/client-profile/data/measurements/client-measurements-repository.server.ts | import | no | no | lateral | present |
| E2924 | apps/platform/src/features/client-profile/data/measurements/client-measurement-records-repository.server.ts | apps/platform/src/features/client-profile/data/photos/client-progress-photos-repository.server.ts | import | no | no | lateral | present |
| E2925 | apps/platform/src/features/client-profile/data/measurements/client-measurement-records-repository.server.ts | apps/platform/src/features/client-profile/data/schema.server.ts | import | no | yes | outward | present |
| E2926 | apps/platform/src/features/client-profile/data/measurements/client-measurement-records-repository.server.ts | external:drizzle-orm | import | n/a | yes | outward | present |
| E2927 | apps/platform/src/features/client-profile/data/measurements/client-measurement-records-repository.server.ts | packages/db/src/index.ts | type-only import | yes | yes | outward | present |
| E2928 | apps/platform/src/features/client-profile/data/measurements/client-measurement-records-repository.server.ts | packages/domain/src/client-profile/index.ts | type-only import | yes | no | lateral | present |
| E2929 | apps/platform/src/features/client-profile/data/measurements/client-measurement-records-repository.server.ts | packages/domain/src/measurement/index.ts | type-only import | yes | no | lateral | present |
| E2930 | apps/platform/src/features/client-profile/data/measurements/client-measurements-repository.server.ts | apps/platform/src/features/client-profile/data/schema.server.ts | import | no | yes | outward | present |
| E2931 | apps/platform/src/features/client-profile/data/measurements/client-measurements-repository.server.ts | external:drizzle-orm | import | n/a | yes | outward | present |
| E2932 | apps/platform/src/features/client-profile/data/measurements/client-measurements-repository.server.ts | packages/db/src/index.ts | type-only import | yes | yes | outward | present |
| E2933 | apps/platform/src/features/client-profile/data/measurements/client-measurements-repository.server.ts | packages/domain/src/measurement/index.ts | import | yes | no | lateral | present |
| E2934 | apps/platform/src/features/client-profile/data/photos/client-progress-photos-repository.server.ts | apps/platform/src/features/client-profile/data/schema.server.ts | import | no | yes | outward | present |
| E2935 | apps/platform/src/features/client-profile/data/photos/client-progress-photos-repository.server.ts | external:drizzle-orm | import | n/a | yes | outward | present |
| E2936 | apps/platform/src/features/client-profile/data/photos/client-progress-photos-repository.server.ts | packages/db/src/index.ts | type-only import | yes | yes | outward | present |
| E2937 | apps/platform/src/features/client-profile/data/photos/client-progress-photos-repository.server.ts | packages/domain/src/client-profile/index.ts | import | yes | no | lateral | present |
| E2938 | apps/platform/src/features/client-profile/data/photos/random-progress-photo-ids.server.ts | external:crypto | import | n/a | yes | outward | present |
| E2939 | apps/platform/src/features/client-profile/data/photos/random-progress-photo-ids.server.ts | packages/domain/src/client-profile/index.ts | type-only import | yes | no | lateral | present |
| E2940 | apps/platform/src/features/client-profile/data/profiles/client-profiles-repository.server.ts | apps/platform/src/features/client-profile/data/schema.server.ts | import | no | yes | outward | present |
| E2941 | apps/platform/src/features/client-profile/data/profiles/client-profiles-repository.server.ts | external:drizzle-orm | import | n/a | yes | outward | present |
| E2942 | apps/platform/src/features/client-profile/data/profiles/client-profiles-repository.server.ts | packages/db/src/index.ts | type-only import | yes | yes | outward | present |
| E2943 | apps/platform/src/features/client-profile/data/profiles/client-profiles-repository.server.ts | packages/domain/src/client-profile/index.ts | import | yes | no | lateral | present |
| E2944 | apps/platform/src/features/client-profile/data/schema.server.ts | apps/platform/src/features/coaching-sales/data/schema.server.ts | import | yes | no | lateral | present |
| E2945 | apps/platform/src/features/client-profile/data/schema.server.ts | external:drizzle-orm | import | n/a | no | lateral | present |
| E2946 | apps/platform/src/features/client-profile/data/schema.server.ts | external:drizzle-orm/pg-core | import | n/a | no | lateral | present |
| E2947 | apps/platform/src/features/client-profile/data/schema.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E2948 | apps/platform/src/features/client-profile/data/schema.server.ts | packages/domain/src/client-profile/index.ts | import | yes | yes | inward | present |
| E2949 | apps/platform/src/features/client-profile/data/schema.server.ts | packages/domain/src/unit-preference/index.ts | import | yes | yes | inward | present |
| E2950 | apps/platform/src/features/client-profile/data/unit-preferences/client-unit-preferences-repository.server.ts | apps/platform/src/features/client-profile/data/schema.server.ts | import | no | yes | outward | present |
| E2951 | apps/platform/src/features/client-profile/data/unit-preferences/client-unit-preferences-repository.server.ts | external:drizzle-orm | import | n/a | yes | outward | present |
| E2952 | apps/platform/src/features/client-profile/data/unit-preferences/client-unit-preferences-repository.server.ts | packages/db/src/index.ts | type-only import | yes | yes | outward | present |
| E2953 | apps/platform/src/features/client-profile/data/unit-preferences/client-unit-preferences-repository.server.ts | packages/domain/src/unit-preference/index.ts | import | yes | no | lateral | present |
| E2954 | apps/platform/src/features/client-profile/routes.ts | apps/platform/src/features/client-profile/contracts/paths.ts | import | no | yes | inward | present |
| E2955 | apps/platform/src/features/client-profile/routes.ts | external:@react-router/dev/routes | import | n/a | no | lateral | present |
| E2956 | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | apps/platform/src/features/client-profile/api/client/measurements-controller.server.ts | import | no | yes | inward | present |
| E2957 | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | apps/platform/src/features/client-profile/api/client/unit-preference-controller.server.ts | import | no | yes | inward | present |
| E2958 | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | apps/platform/src/features/client-profile/api/coach/client-profile-controller.server.ts | import | no | yes | inward | present |
| E2959 | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | apps/platform/src/features/client-profile/api/photos/progress-photo-controller.server.ts | import | no | yes | inward | present |
| E2960 | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | apps/platform/src/features/client-profile/data/measurements/client-measurement-records-repository.server.ts | import | no | yes | inward | present |
| E2961 | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | apps/platform/src/features/client-profile/data/measurements/client-measurements-repository.server.ts | import | no | yes | inward | present |
| E2962 | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | apps/platform/src/features/client-profile/data/photos/client-progress-photos-repository.server.ts | import | no | yes | inward | present |
| E2963 | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | apps/platform/src/features/client-profile/data/photos/random-progress-photo-ids.server.ts | import | no | yes | inward | present |
| E2964 | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | apps/platform/src/features/client-profile/data/profiles/client-profiles-repository.server.ts | import | no | yes | inward | present |
| E2965 | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | apps/platform/src/features/client-profile/data/unit-preferences/client-unit-preferences-repository.server.ts | import | no | yes | inward | present |
| E2966 | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | packages/db/src/index.ts | type-only import | yes | yes | inward | present |
| E2967 | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | packages/domain/src/client-profile/index.ts | import | yes | yes | inward | present |
| E2968 | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | packages/domain/src/client/index.ts | type-only import | yes | yes | inward | present |
| E2969 | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | packages/domain/src/measurement/index.ts | type-only import | yes | yes | inward | present |
| E2970 | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | packages/domain/src/shared/index.ts | type-only import | yes | yes | inward | present |
| E2971 | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | packages/domain/src/unit-preference/index.ts | import | yes | yes | inward | present |
| E2972 | apps/platform/src/features/client-profile/server/guards/client-profile-context.server.ts | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | type-only import | no | yes | outward | present |
| E2973 | apps/platform/src/features/client-profile/server/guards/client-profile-context.server.ts | external:react-router | import | n/a | no | lateral | present |
| E2974 | apps/platform/src/features/client-profile/ui/client/measurements/add-measurements-sheet.tsx | apps/platform/src/features/client-profile/contracts/measurements.ts | import | no | yes | inward | present |
| E2975 | apps/platform/src/features/client-profile/ui/client/measurements/add-measurements-sheet.tsx | apps/platform/src/features/client-profile/ui/client/measurements/measurement-form-values.ts | import | no | no | lateral | present |
| E2978 | apps/platform/src/features/client-profile/ui/client/measurements/add-measurements-sheet.tsx | apps/platform/src/features/client-profile/ui/shared/measure-field/measure-field.tsx | import | no | no | lateral | present |
| E2979 | apps/platform/src/features/client-profile/ui/client/measurements/add-measurements-sheet.tsx | external:react | import | n/a | no | lateral | present |
| E2980 | apps/platform/src/features/client-profile/ui/client/measurements/add-measurements-sheet.tsx | external:react-hook-form | import | n/a | no | lateral | present |
| E2982 | apps/platform/src/features/client-profile/ui/client/measurements/add-measurements-sheet.tsx | packages/domain/src/measurement/index.ts | import | yes | yes | inward | present |
| E2983 | apps/platform/src/features/client-profile/ui/client/measurements/add-measurements-sheet.tsx | packages/domain/src/unit-preference/index.ts | type-only import | yes | yes | inward | present |
| E2984 | apps/platform/src/features/client-profile/ui/client/measurements/add-measurements-sheet.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E2985 | apps/platform/src/features/client-profile/ui/client/measurements/add-measurements-sheet.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E2987 | apps/platform/src/features/client-profile/ui/client/measurements/measurement-form-values.ts | apps/platform/src/features/client-profile/contracts/measurements.ts | import | no | yes | inward | present |
| E2988 | apps/platform/src/features/client-profile/ui/client/measurements/measurement-form-values.ts | packages/domain/src/measurement/index.ts | import | yes | yes | inward | present |
| E2989 | apps/platform/src/features/client-profile/ui/client/measurements/measurement-form-values.ts | packages/domain/src/unit-preference/index.ts | import | yes | yes | inward | present |
| E2995 | apps/platform/src/features/client-profile/ui/client/measurements/measurements-section.tsx | apps/platform/src/features/client-profile/contracts/measurements.ts | import | no | yes | inward | present |
| E2996 | apps/platform/src/features/client-profile/ui/client/measurements/measurements-section.tsx | apps/platform/src/features/client-profile/ui/client/measurements/add-measurements-sheet.tsx | import | no | no | lateral | present |
| E2998 | apps/platform/src/features/client-profile/ui/client/measurements/measurements-section.tsx | apps/platform/src/features/client-profile/ui/shared/measurements/measurements-table.tsx | import | no | no | lateral | present |
| E2999 | apps/platform/src/features/client-profile/ui/client/measurements/measurements-section.tsx | apps/platform/src/features/client-profile/ui/shared/photos/photo-view-dialog.tsx | import | no | no | lateral | present |
| E3000 | apps/platform/src/features/client-profile/ui/client/measurements/measurements-section.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3001 | apps/platform/src/features/client-profile/ui/client/measurements/measurements-section.tsx | external:react | import | n/a | no | lateral | present |
| E3003 | apps/platform/src/features/client-profile/ui/client/measurements/measurements-section.tsx | packages/domain/src/unit-preference/index.ts | import | yes | yes | inward | present |
| E3004 | apps/platform/src/features/client-profile/ui/client/measurements/measurements-section.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E3015 | apps/platform/src/features/client-profile/ui/client/nudge/measurements-nudge.tsx | apps/platform/src/features/client-profile/contracts/measurements.ts | import | no | yes | inward | present |
| E3016 | apps/platform/src/features/client-profile/ui/client/nudge/measurements-nudge.tsx | apps/platform/src/features/client-profile/contracts/paths.ts | import | no | yes | inward | present |
| E3017 | apps/platform/src/features/client-profile/ui/client/nudge/measurements-nudge.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E3018 | apps/platform/src/features/client-profile/ui/client/profile/profile-page.tsx | apps/platform/src/features/client-profile/contracts/measurements.ts | type-only import | no | yes | inward | present |
| E3019 | apps/platform/src/features/client-profile/ui/client/profile/profile-page.tsx | apps/platform/src/features/client-profile/contracts/profile-page-copy.ts | import | no | yes | inward | present |
| E3020 | apps/platform/src/features/client-profile/ui/client/profile/profile-page.tsx | apps/platform/src/features/client-profile/server/guards/client-profile-context.server.ts | import | no | no | lateral | present |
| E3021 | apps/platform/src/features/client-profile/ui/client/profile/profile-page.tsx | apps/platform/src/features/client-profile/ui/client/measurements/measurements-section.tsx | import | no | no | lateral | present |
| E3022 | apps/platform/src/features/client-profile/ui/client/profile/profile-page.tsx | external:react-router | import | n/a | no | lateral | present |
| E3023 | apps/platform/src/features/client-profile/ui/client/profile/profile-page.tsx | packages/infrastructure/src/pwa/index.ts | import | yes | no | lateral | present |
| E3024 | apps/platform/src/features/client-profile/ui/client/profile/profile-page.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E3025 | apps/platform/src/features/client-profile/ui/coach/profile/client-profile-block.tsx | apps/platform/src/features/assessment-calls/contracts/countries.ts | import | yes | yes | inward | present |
| E3026 | apps/platform/src/features/client-profile/ui/coach/profile/client-profile-block.tsx | apps/platform/src/features/assessment-calls/contracts/visitor-profile.ts | import | yes | yes | inward | present |
| E3027 | apps/platform/src/features/client-profile/ui/coach/profile/client-profile-block.tsx | apps/platform/src/features/client-profile/contracts/canonical-measure.ts | import | no | yes | inward | present |
| E3028 | apps/platform/src/features/client-profile/ui/coach/profile/client-profile-block.tsx | apps/platform/src/features/client-profile/contracts/client-profile.ts | type-only import | no | yes | inward | present |
| E3031 | apps/platform/src/features/client-profile/ui/coach/profile/client-profile-block.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3032 | apps/platform/src/features/client-profile/ui/coach/profile/client-profile-block.tsx | external:react | import | n/a | no | lateral | present |
| E3033 | apps/platform/src/features/client-profile/ui/coach/profile/client-profile-block.tsx | packages/domain/src/assessment-call/index.ts | type-only import | yes | yes | inward | present |
| E3034 | apps/platform/src/features/client-profile/ui/coach/profile/client-profile-block.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E3035 | apps/platform/src/features/client-profile/ui/coach/profile/client-profile-block.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E3037 | apps/platform/src/features/client-profile/ui/shared/measure-field/measure-field.tsx | external:react-hook-form | import | n/a | no | lateral | present |
| E3038 | apps/platform/src/features/client-profile/ui/shared/measure-field/measure-field.tsx | packages/domain/src/measurement/index.ts | import | yes | yes | inward | present |
| E3039 | apps/platform/src/features/client-profile/ui/shared/measure-field/measure-field.tsx | packages/domain/src/unit-preference/index.ts | import | yes | yes | inward | present |
| E3040 | apps/platform/src/features/client-profile/ui/shared/measure-field/measure-field.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E3041 | apps/platform/src/features/client-profile/ui/shared/measurements/measurements-table.tsx | apps/platform/src/features/client-profile/contracts/measurements.ts | import | no | yes | inward | present |
| E3044 | apps/platform/src/features/client-profile/ui/shared/measurements/measurements-table.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3045 | apps/platform/src/features/client-profile/ui/shared/measurements/measurements-table.tsx | external:react | type-only import | n/a | no | lateral | present |
| E3046 | apps/platform/src/features/client-profile/ui/shared/measurements/measurements-table.tsx | packages/domain/src/unit-preference/index.ts | import | yes | yes | inward | present |
| E3047 | apps/platform/src/features/client-profile/ui/shared/measurements/measurements-table.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E3048 | apps/platform/src/features/client-profile/ui/shared/measurements/measurements-table.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E3049 | apps/platform/src/features/client-profile/ui/shared/photos/photo-view-dialog.tsx | apps/platform/src/features/client-profile/contracts/measurements.ts | import | no | yes | inward | present |
| E3050 | apps/platform/src/features/client-profile/ui/shared/photos/photo-view-dialog.tsx | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-frame.ts | import | no | no | lateral | present |
| E3051 | apps/platform/src/features/client-profile/ui/shared/photos/photo-view-dialog.tsx | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-url.ts | import | no | no | lateral | present |
| E3053 | apps/platform/src/features/client-profile/ui/shared/photos/photo-view-dialog.tsx | external:react | import | n/a | no | lateral | present |
| E3054 | apps/platform/src/features/client-profile/ui/shared/photos/photo-view-dialog.tsx | packages/domain/src/client-profile/index.ts | import | yes | yes | inward | present |
| E3055 | apps/platform/src/features/client-profile/ui/shared/photos/photo-view-dialog.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E3056 | apps/platform/src/features/client-profile/ui/shared/photos/photo-view-dialog.tsx | packages/ui/src/overlays/index.ts | import | yes | no | lateral | present |
| E3057 | apps/platform/src/features/client-profile/ui/shared/photos/photo-view-dialog.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E3058 | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-frame.ts | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E3059 | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-url.ts | apps/platform/src/features/client-profile/contracts/paths.ts | import | no | yes | inward | present |
| E3060 | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-url.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E3061 | apps/platform/src/features/coaching-sales/api/client/client-journey-controller.server.ts | apps/platform/src/features/coaching-sales/server/guards/client-journey-context.server.ts | import | no | no | lateral | present |
| E3062 | apps/platform/src/features/coaching-sales/api/coach/coach-clients-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-account.server.ts | import | yes | no | lateral | present |
| E3063 | apps/platform/src/features/coaching-sales/api/coach/coach-clients-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | import | yes | no | lateral | present |
| E3064 | apps/platform/src/features/coaching-sales/api/coach/coach-clients-controller.server.ts | apps/platform/src/features/coaching-sales/api/read-json-request-body.server.ts | import | no | no | lateral | present |
| E3065 | apps/platform/src/features/coaching-sales/api/coach/coach-clients-controller.server.ts | apps/platform/src/features/coaching-sales/contracts/coach-clients.ts | import | no | no | lateral | present |
| E3066 | apps/platform/src/features/coaching-sales/api/coach/coach-clients-controller.server.ts | external:react-router | type-only import | n/a | yes | outward | present |
| E3067 | apps/platform/src/features/coaching-sales/api/coach/coach-clients-controller.server.ts | packages/domain/src/client-invitation/index.ts | type-only import | yes | no | lateral | present |
| E3068 | apps/platform/src/features/coaching-sales/api/coach/coach-clients-controller.server.ts | packages/domain/src/client-roster/index.ts | type-only import | yes | no | lateral | present |
| E3069 | apps/platform/src/features/coaching-sales/api/coach/coach-clients-controller.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | no | lateral | present |
| E3070 | apps/platform/src/features/coaching-sales/api/coach/invitation-resends.ts | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E3071 | apps/platform/src/features/coaching-sales/api/coach/invitation-resends.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E3072 | apps/platform/src/features/coaching-sales/api/coach/invitation-resends.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E3073 | apps/platform/src/features/coaching-sales/api/public/checkouts-controller.server.ts | apps/platform/src/features/coaching-sales/api/read-json-request-body.server.ts | import | no | no | lateral | present |
| E3074 | apps/platform/src/features/coaching-sales/api/public/invitations-controller.server.ts | apps/platform/src/features/coaching-sales/api/read-json-request-body.server.ts | import | no | no | lateral | present |
| E3075 | apps/platform/src/features/coaching-sales/api/read-json-request-body.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E3076 | apps/platform/src/features/coaching-sales/contracts/client-journey.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E3077 | apps/platform/src/features/coaching-sales/contracts/client-status.ts | apps/platform/src/features/coaching-sales/contracts/coach-clients.ts | type-only import | no | no | lateral | present |
| E3078 | apps/platform/src/features/coaching-sales/contracts/coach-clients.ts | apps/platform/src/features/coaching-sales/contracts/bundle-cards.ts | import | no | no | lateral | present |
| E3079 | apps/platform/src/features/coaching-sales/contracts/coach-clients.ts | external:zod | import | n/a | yes | outward | present |
| E3080 | apps/platform/src/features/coaching-sales/contracts/coach-clients.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present |
| E3081 | apps/platform/src/features/coaching-sales/contracts/coach-clients.ts | packages/domain/src/client-roster/index.ts | import | yes | no | lateral | present |
| E3082 | apps/platform/src/features/coaching-sales/data/client-journeys/client-journeys-repository.server.ts | apps/platform/src/features/coaching-sales/data/client-journeys/review-stamps.server.ts | import | no | no | lateral | present |
| E3083 | apps/platform/src/features/coaching-sales/data/client-journeys/client-journeys-repository.server.ts | packages/domain/src/client-onboarding/index.ts | type-only import | yes | no | lateral | present |
| E3084 | apps/platform/src/features/coaching-sales/data/client-journeys/review-stamps.server.ts | apps/platform/src/features/coaching-sales/data/schema.server.ts | import | no | yes | outward | present |
| E3085 | apps/platform/src/features/coaching-sales/data/client-journeys/review-stamps.server.ts | external:drizzle-orm | import | n/a | yes | outward | present |
| E3086 | apps/platform/src/features/coaching-sales/data/client-journeys/review-stamps.server.ts | packages/db/src/index.ts | type-only import | yes | yes | outward | present |
| E3087 | apps/platform/src/features/coaching-sales/data/client-journeys/review-stamps.server.ts | packages/domain/src/client-onboarding/index.ts | type-only import | yes | no | lateral | present |
| E3088 | apps/platform/src/features/coaching-sales/data/clients/client-identities-reader.server.ts | apps/platform/src/features/coaching-sales/data/schema.server.ts | import | no | yes | outward | present |
| E3089 | apps/platform/src/features/coaching-sales/data/clients/client-identities-reader.server.ts | external:drizzle-orm | import | n/a | yes | outward | present |
| E3090 | apps/platform/src/features/coaching-sales/data/clients/client-identities-reader.server.ts | packages/db/src/index.ts | type-only import | yes | yes | outward | present |
| E3091 | apps/platform/src/features/coaching-sales/data/clients/client-identities-reader.server.ts | packages/domain/src/client/index.ts | type-only import | yes | no | lateral | present |
| E3092 | apps/platform/src/features/coaching-sales/data/clients/client-roster-reader.server.ts | apps/platform/src/features/coaching-sales/data/schema.server.ts | import | no | yes | outward | present |
| E3093 | apps/platform/src/features/coaching-sales/data/clients/client-roster-reader.server.ts | external:drizzle-orm | import | n/a | yes | outward | present |
| E3094 | apps/platform/src/features/coaching-sales/data/clients/client-roster-reader.server.ts | packages/db/src/index.ts | type-only import | yes | yes | outward | present |
| E3095 | apps/platform/src/features/coaching-sales/data/clients/client-roster-reader.server.ts | packages/domain/src/client-roster/index.ts | type-only import | yes | no | lateral | present |
| E3096 | apps/platform/src/features/coaching-sales/data/clients/onboarding-clients-reader.server.ts | apps/platform/src/features/coaching-sales/data/schema.server.ts | import | no | yes | outward | present |
| E3097 | apps/platform/src/features/coaching-sales/data/clients/onboarding-clients-reader.server.ts | external:drizzle-orm | import | n/a | yes | outward | present |
| E3098 | apps/platform/src/features/coaching-sales/data/clients/onboarding-clients-reader.server.ts | packages/db/src/index.ts | type-only import | yes | yes | outward | present |
| E3099 | apps/platform/src/features/coaching-sales/data/clients/onboarding-clients-reader.server.ts | packages/domain/src/client-onboarding/index.ts | type-only import | yes | no | lateral | present |
| E3100 | apps/platform/src/features/coaching-sales/data/clients/onboarding-clients-reader.server.ts | packages/domain/src/client-profile/index.ts | type-only import | yes | no | lateral | present |
| E3101 | apps/platform/src/features/coaching-sales/data/clients/onboarding-clients-reader.server.ts | packages/domain/src/unit-preference/index.ts | type-only import | yes | no | lateral | present |
| E3103 | apps/platform/src/features/coaching-sales/routes.ts | external:@react-router/dev/routes | import | n/a | no | lateral | present |
| E3104 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/api/coach/coach-clients-controller.server.ts | import | no | yes | inward | present |
| E3105 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/data/client-journeys/review-stamps.server.ts | import | no | yes | inward | present |
| E3106 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/data/clients/client-identities-reader.server.ts | import | no | yes | inward | present |
| E3107 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/data/clients/client-roster-reader.server.ts | import | no | yes | inward | present |
| E3108 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/data/clients/onboarding-clients-reader.server.ts | import | no | yes | inward | present |
| E3109 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | packages/domain/src/client-onboarding/index.ts | type-only import | yes | yes | inward | present |
| E3110 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | packages/domain/src/client-profile/index.ts | type-only import | yes | yes | inward | present |
| E3111 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | packages/domain/src/client-roster/index.ts | import | yes | yes | inward | present |
| E3112 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | packages/domain/src/client/index.ts | type-only import | yes | yes | inward | present |
| E3113 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | packages/domain/src/unit-preference/index.ts | type-only import | yes | yes | inward | present |
| E3114 | apps/platform/src/features/coaching-sales/server/guards/client-journey-context.server.ts | external:react-router | import | n/a | yes | outward | present |
| E3115 | apps/platform/src/features/coaching-sales/server/guards/client-journey-context.server.ts | packages/domain/src/client-journey/index.ts | type-only import | yes | no | lateral | present |
| E3116 | apps/platform/src/features/coaching-sales/server/guards/require-client-portal-standing.server.ts | apps/platform/src/features/coaching-sales/server/guards/client-journey-context.server.ts | import | no | no | lateral | present |
| E3117 | apps/platform/src/features/coaching-sales/ui/client/status/program-status-card.tsx | apps/platform/src/features/coaching-sales/contracts/client-journey.ts | type-only import | no | yes | inward | present |
| E3118 | apps/platform/src/features/coaching-sales/ui/client/status/program-status-card.tsx | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | yes | inward | present |
| E3119 | apps/platform/src/features/coaching-sales/ui/client/status/program-status-card.tsx | apps/platform/src/features/coaching-sales/ui/client/status/program-status-copy.ts | import | no | yes | inward | present |
| E3121 | apps/platform/src/features/coaching-sales/ui/client/status/program-status-card.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3122 | apps/platform/src/features/coaching-sales/ui/client/status/program-status-card.tsx | external:react-router | import | n/a | no | lateral | present |
| E3123 | apps/platform/src/features/coaching-sales/ui/client/status/program-status-card.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E3124 | apps/platform/src/features/coaching-sales/ui/client/status/program-status-card.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E3125 | apps/platform/src/features/coaching-sales/ui/client/status/program-status-copy.ts | apps/platform/src/features/coaching-sales/contracts/client-journey.ts | type-only import | no | no | lateral | present |
| E3126 | apps/platform/src/features/coaching-sales/ui/coach/call-sales/call-sales-state-badge.tsx | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | type-only import | no | yes | inward | present |
| E3127 | apps/platform/src/features/coaching-sales/ui/coach/call-sales/call-sales-state-badge.tsx | apps/platform/src/features/coaching-sales/ui/coach/call-sales/call-sales-state-labels.ts | import | no | yes | inward | present |
| E3128 | apps/platform/src/features/coaching-sales/ui/coach/call-sales/call-sales-state-badge.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E3129 | apps/platform/src/features/coaching-sales/ui/coach/call-sales/call-sales-state-labels.ts | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | type-only import | no | no | lateral | present |
| E3130 | apps/platform/src/features/coaching-sales/ui/coach/call-sales/payment-link-action.tsx | apps/platform/src/features/assessment-calls/contracts/visitor-profile.ts | import | yes | yes | inward | present |
| E3131 | apps/platform/src/features/coaching-sales/ui/coach/call-sales/payment-link-action.tsx | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | import | no | yes | inward | present |
| E3132 | apps/platform/src/features/coaching-sales/ui/coach/call-sales/payment-link-action.tsx | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | yes | inward | present |
| E3133 | apps/platform/src/features/coaching-sales/ui/coach/call-sales/payment-link-action.tsx | apps/platform/src/features/coaching-sales/ui/coach/use-confirmed-json-action.ts | import | no | no | lateral | present |
| E3134 | apps/platform/src/features/coaching-sales/ui/coach/call-sales/payment-link-action.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3135 | apps/platform/src/features/coaching-sales/ui/coach/call-sales/payment-link-action.tsx | packages/domain/src/assessment-call/index.ts | type-only import | yes | yes | inward | present |
| E3136 | apps/platform/src/features/coaching-sales/ui/coach/call-sales/payment-link-action.tsx | packages/ui/src/appointments/index.ts | import | yes | no | lateral | present |
| E3137 | apps/platform/src/features/coaching-sales/ui/coach/call-sales/payment-link-action.tsx | packages/ui/src/overlays/index.ts | import | yes | no | lateral | present |
| E3138 | apps/platform/src/features/coaching-sales/ui/coach/call-sales/pricing-tier-label.ts | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | type-only import | no | no | lateral | present |
| E3139 | apps/platform/src/features/coaching-sales/ui/coach/call-sales/sales-status-filter.tsx | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | yes | yes | inward | present |
| E3140 | apps/platform/src/features/coaching-sales/ui/coach/call-sales/sales-status-filter.tsx | apps/platform/src/features/coaching-sales/contracts/coaching-sales.ts | import | no | yes | inward | present |
| E3141 | apps/platform/src/features/coaching-sales/ui/coach/call-sales/sales-status-filter.tsx | apps/platform/src/features/coaching-sales/ui/coach/call-sales/call-sales-state-labels.ts | import | no | yes | inward | present |
| E3142 | apps/platform/src/features/coaching-sales/ui/coach/call-sales/sales-status-filter.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E3143 | apps/platform/src/features/coaching-sales/ui/coach/call-sales/sales-status-filter.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E3144 | apps/platform/src/features/coaching-sales/ui/coach/clients/assessment-call-block.tsx | apps/platform/src/features/assessment-calls/contracts/call-moment.ts | import | yes | yes | inward | present |
| E3145 | apps/platform/src/features/coaching-sales/ui/coach/clients/assessment-call-block.tsx | apps/platform/src/features/assessment-calls/contracts/countries.ts | import | yes | yes | inward | present |
| E3146 | apps/platform/src/features/coaching-sales/ui/coach/clients/assessment-call-block.tsx | apps/platform/src/features/assessment-calls/contracts/visitor-profile.ts | import | yes | yes | inward | present |
| E3147 | apps/platform/src/features/coaching-sales/ui/coach/clients/assessment-call-block.tsx | apps/platform/src/features/coaching-sales/contracts/coach-clients.ts | type-only import | no | yes | inward | present |
| E3150 | apps/platform/src/features/coaching-sales/ui/coach/clients/assessment-call-block.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3151 | apps/platform/src/features/coaching-sales/ui/coach/clients/assessment-call-block.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E3152 | apps/platform/src/features/coaching-sales/ui/coach/clients/assessment-call-block.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E3153 | apps/platform/src/features/coaching-sales/ui/coach/clients/client-status-badge.tsx | apps/platform/src/features/coaching-sales/contracts/client-status.ts | import | no | yes | inward | present |
| E3154 | apps/platform/src/features/coaching-sales/ui/coach/clients/client-status-badge.tsx | apps/platform/src/features/coaching-sales/contracts/coach-clients.ts | type-only import | no | yes | inward | present |
| E3155 | apps/platform/src/features/coaching-sales/ui/coach/clients/client-status-badge.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E3156 | apps/platform/src/features/coaching-sales/ui/coach/clients/client-status-filter.tsx | apps/platform/src/features/coaching-sales/contracts/client-status.ts | import | no | yes | inward | present |
| E3157 | apps/platform/src/features/coaching-sales/ui/coach/clients/client-status-filter.tsx | apps/platform/src/features/coaching-sales/ui/coach/clients/roster-listing.ts | import | no | yes | inward | present |
| E3158 | apps/platform/src/features/coaching-sales/ui/coach/clients/client-status-filter.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E3159 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-page.tsx | apps/platform/src/features/coaching-sales/contracts/coach-clients.ts | type-only import | no | yes | inward | present |
| E3160 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-page.tsx | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E3161 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-page.tsx | apps/platform/src/features/coaching-sales/ui/coach/clients/client-status-filter.tsx | import | no | no | lateral | present |
| E3162 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-page.tsx | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-table.tsx | import | no | no | lateral | present |
| E3163 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-page.tsx | apps/platform/src/features/coaching-sales/ui/coach/clients/roster-listing.ts | import | no | yes | inward | present |
| E3164 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-page.tsx | apps/platform/src/features/coaching-sales/ui/coach/clients/use-roster-params.ts | import | no | no | lateral | present |
| E3165 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-page.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3166 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-page.tsx | external:react-router | import | n/a | no | lateral | present |
| E3167 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-page.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E3168 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-page.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E3169 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-page.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E3170 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-page.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E3171 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-table.tsx | apps/platform/src/features/coaching-sales/contracts/bundle-cards.ts | import | no | yes | inward | present |
| E3172 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-table.tsx | apps/platform/src/features/coaching-sales/contracts/coach-clients.ts | type-only import | no | yes | inward | present |
| E3173 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-table.tsx | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | yes | inward | present |
| E3174 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-table.tsx | apps/platform/src/features/coaching-sales/ui/coach/clients/client-status-badge.tsx | import | no | no | lateral | present |
| E3175 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-table.tsx | apps/platform/src/features/coaching-sales/ui/coach/clients/roster-listing.ts | import | no | yes | inward | present |
| E3177 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-table.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3178 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-table.tsx | external:react | type-only import | n/a | no | lateral | present |
| E3179 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-table.tsx | external:react-router | import | n/a | no | lateral | present |
| E3180 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-table.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E3181 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-table.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E3182 | apps/platform/src/features/coaching-sales/ui/coach/clients/invitation-block.tsx | apps/platform/src/features/assessment-calls/contracts/visitor-profile.ts | import | yes | yes | inward | present |
| E3183 | apps/platform/src/features/coaching-sales/ui/coach/clients/invitation-block.tsx | apps/platform/src/features/coaching-sales/contracts/coach-clients.ts | import | no | yes | inward | present |
| E3184 | apps/platform/src/features/coaching-sales/ui/coach/clients/invitation-block.tsx | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | yes | inward | present |
| E3185 | apps/platform/src/features/coaching-sales/ui/coach/clients/invitation-block.tsx | apps/platform/src/features/coaching-sales/ui/coach/clients/invitation-state-line.ts | import | no | yes | inward | present |
| E3186 | apps/platform/src/features/coaching-sales/ui/coach/clients/invitation-block.tsx | apps/platform/src/features/coaching-sales/ui/coach/use-confirmed-json-action.ts | import | no | no | lateral | present |
| E3188 | apps/platform/src/features/coaching-sales/ui/coach/clients/invitation-block.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3189 | apps/platform/src/features/coaching-sales/ui/coach/clients/invitation-block.tsx | external:react-router | import | n/a | no | lateral | present |
| E3191 | apps/platform/src/features/coaching-sales/ui/coach/clients/invitation-block.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E3192 | apps/platform/src/features/coaching-sales/ui/coach/clients/invitation-block.tsx | packages/ui/src/overlays/index.ts | import | yes | no | lateral | present |
| E3193 | apps/platform/src/features/coaching-sales/ui/coach/clients/invitation-block.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E3194 | apps/platform/src/features/coaching-sales/ui/coach/clients/invitation-block.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E3195 | apps/platform/src/features/coaching-sales/ui/coach/clients/invitation-state-line.ts | apps/platform/src/features/coaching-sales/contracts/coach-clients.ts | type-only import | no | no | lateral | present |
| E3197 | apps/platform/src/features/coaching-sales/ui/coach/clients/roster-listing.ts | apps/platform/src/features/coaching-sales/contracts/client-status.ts | import | no | no | lateral | present |
| E3198 | apps/platform/src/features/coaching-sales/ui/coach/clients/roster-listing.ts | apps/platform/src/features/coaching-sales/contracts/coach-clients.ts | type-only import | no | no | lateral | present |
| E3199 | apps/platform/src/features/coaching-sales/ui/coach/clients/subscription-summary.tsx | apps/platform/src/features/assessment-calls/contracts/visitor-profile.ts | import | yes | yes | inward | present |
| E3200 | apps/platform/src/features/coaching-sales/ui/coach/clients/subscription-summary.tsx | apps/platform/src/features/coaching-sales/contracts/bundle-cards.ts | import | no | yes | inward | present |
| E3201 | apps/platform/src/features/coaching-sales/ui/coach/clients/subscription-summary.tsx | apps/platform/src/features/coaching-sales/contracts/coach-clients.ts | type-only import | no | yes | inward | present |
| E3203 | apps/platform/src/features/coaching-sales/ui/coach/clients/subscription-summary.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3204 | apps/platform/src/features/coaching-sales/ui/coach/clients/subscription-summary.tsx | packages/domain/src/assessment-call/index.ts | type-only import | yes | yes | inward | present |
| E3205 | apps/platform/src/features/coaching-sales/ui/coach/clients/subscription-summary.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E3206 | apps/platform/src/features/coaching-sales/ui/coach/clients/subscription-summary.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E3207 | apps/platform/src/features/coaching-sales/ui/coach/clients/use-roster-params.ts | apps/platform/src/features/coaching-sales/ui/coach/clients/roster-listing.ts | import | no | yes | inward | present |
| E3208 | apps/platform/src/features/coaching-sales/ui/coach/clients/use-roster-params.ts | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E3209 | apps/platform/src/features/coaching-sales/ui/coach/clients/view-client-link.tsx | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | yes | inward | present |
| E3210 | apps/platform/src/features/coaching-sales/ui/coach/clients/view-client-link.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3211 | apps/platform/src/features/coaching-sales/ui/coach/clients/view-client-link.tsx | packages/ui/src/appointments/index.ts | import | yes | no | lateral | present |
| E3214 | apps/platform/src/features/coaching-sales/ui/coach/use-confirmed-json-action.ts | external:zod | type-only import | n/a | no | lateral | present |
| E3215 | apps/platform/src/features/coaching-sales/ui/coach/use-confirmed-json-action.ts | packages/ui/src/toast/index.ts | import | yes | no | lateral | present |
| E3221 | apps/platform/src/root.tsx | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | yes | inward | present |
| E3222 | apps/platform/src/root.tsx | external:@clerk/react-router | import | n/a | no | lateral | present |
| E3223 | apps/platform/src/root.tsx | external:motion/react | import | n/a | no | lateral | present |
| E3224 | apps/platform/src/root.tsx | external:react-router | import | n/a | no | lateral | present |
| E3225 | apps/platform/src/routes.ts | apps/platform/src/features/client-onboarding/routes.ts | import | yes | no | lateral | present |
| E3226 | apps/platform/src/routes.ts | apps/platform/src/features/client-profile/routes.ts | import | yes | no | lateral | present |
| E3227 | apps/platform/src/routes.ts | external:@react-router/dev/routes | type-only import | n/a | no | lateral | present |
| E3228 | apps/platform/src/server/container.server.ts | apps/platform/src/features/client-onboarding/server/client-onboarding-composition.server.ts | import | yes | no | lateral | present |
| E3229 | apps/platform/src/server/container.server.ts | apps/platform/src/features/client-profile/server/client-profile-composition.server.ts | import | yes | no | lateral | present |
| E3230 | apps/platform/src/server/container.server.ts | packages/infrastructure/src/client-media/index.server.ts | import | yes | yes | inward | present |
| E3231 | apps/platform/src/server/container.server.ts | packages/infrastructure/src/images/index.server.ts | import | yes | yes | inward | present |
| E3232 | apps/platform/src/server/feature-contexts.server.ts | apps/platform/src/features/client-onboarding/server/guards/client-onboarding-context.server.ts | import | yes | yes | inward | present |
| E3233 | apps/platform/src/server/feature-contexts.server.ts | apps/platform/src/features/client-profile/server/guards/client-profile-context.server.ts | import | yes | yes | inward | present |
| E3234 | apps/platform/src/server/logger.server.ts | packages/domain/src/client-onboarding/index.ts | type-only import | yes | no | lateral | present |
| E3235 | apps/platform/src/server/logger.server.ts | packages/domain/src/client-profile/index.ts | type-only import | yes | no | lateral | present |
| E3236 | apps/platform/src/server/logger.server.ts | packages/domain/src/client-roster/index.ts | type-only import | yes | no | lateral | present |
| E3237 | apps/platform/src/surfaces/client-portal/pages/home.tsx | apps/platform/src/features/client-onboarding/server/guards/client-onboarding-context.server.ts | import | yes | no | lateral | present |
| E3238 | apps/platform/src/surfaces/client-portal/pages/home.tsx | apps/platform/src/features/client-profile/server/guards/client-profile-context.server.ts | import | yes | no | lateral | present |
| E3239 | apps/platform/src/surfaces/client-portal/pages/home.tsx | apps/platform/src/features/client-profile/ui/client/nudge/measurements-nudge.tsx | import | yes | no | lateral | present |
| E3240 | apps/platform/src/surfaces/client-portal/pages/home.tsx | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | yes | no | lateral | present |
| E3241 | apps/platform/src/surfaces/client-portal/pages/home.tsx | apps/platform/src/features/coaching-sales/ui/client/status/program-status-card.tsx | import | yes | no | lateral | present |
| E3242 | apps/platform/src/surfaces/client-portal/pages/home.tsx | apps/platform/src/surfaces/client-portal/shell/client-identity-presentation.ts | type-only import | no | yes | inward | present |
| E3243 | apps/platform/src/surfaces/client-portal/pages/home.tsx | apps/platform/src/surfaces/client-portal/shell/client-portal-meta.ts | import | no | yes | inward | present |
| E3244 | apps/platform/src/surfaces/client-portal/pages/home.tsx | external:react-router | import | n/a | no | lateral | present |
| E3245 | apps/platform/src/surfaces/client-portal/pages/home.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E3246 | apps/platform/src/surfaces/client-portal/routes.ts | apps/platform/src/features/client-onboarding/routes.ts | import | yes | no | lateral | present |
| E3247 | apps/platform/src/surfaces/client-portal/routes.ts | apps/platform/src/features/client-profile/routes.ts | import | yes | no | lateral | present |
| E3248 | apps/platform/src/surfaces/client-portal/routes.ts | external:@react-router/dev/routes | import | n/a | no | lateral | present |
| E3249 | apps/platform/src/surfaces/client-portal/shell/client-identity-presentation.ts | apps/platform/src/features/coaching-sales/contracts/client-journey.ts | type-only import | yes | no | lateral | present |
| E3250 | apps/platform/src/surfaces/client-portal/shell/client-name-block.tsx | apps/platform/src/features/client-profile/contracts/paths.ts | import | yes | yes | inward | present |
| E3251 | apps/platform/src/surfaces/client-portal/shell/client-name-block.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3252 | apps/platform/src/surfaces/client-portal/shell/client-name-block.tsx | external:react-router | import | n/a | no | lateral | present |
| E3253 | apps/platform/src/surfaces/client-portal/shell/client-name-block.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E3254 | apps/platform/src/surfaces/client-portal/shell/client-portal-meta.ts | external:react-router | type-only import | n/a | yes | outward | present |
| E3255 | apps/platform/src/surfaces/client-portal/shell/client-portal-meta.ts | packages/infrastructure/src/pwa/index.ts | import | yes | yes | outward | present |
| E3256 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | apps/platform/src/features/accounts/ui/shared/sign-out-control.tsx | import | yes | no | lateral | present |
| E3257 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | yes | no | lateral | present |
| E3258 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | apps/platform/src/surfaces/client-portal/shell/client-identity-presentation.ts | import | no | yes | inward | present |
| E3259 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | apps/platform/src/surfaces/client-portal/shell/client-name-block.tsx | import | no | no | lateral | present |
| E3260 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | apps/platform/src/surfaces/client-portal/shell/client-portal-meta.ts | import | no | yes | inward | present |
| E3261 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3262 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E3264 | apps/platform/src/surfaces/client-portal/shell/navigation-links.ts | apps/platform/src/features/client-profile/contracts/paths.ts | import | yes | no | lateral | present |
| E3265 | apps/platform/src/surfaces/client-portal/shell/navigation-links.ts | external:lucide-react | import | n/a | yes | outward | present |
| E3266 | apps/platform/src/surfaces/client-portal/shell/navigation-links.ts | packages/ui/src/layout/index.ts | type-only import | yes | yes | outward | present |
| E3267 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | apps/platform/src/features/coaching-sales/ui/coach/call-sales/call-sales-state-badge.tsx | import | yes | yes | outward | present |
| E3268 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | apps/platform/src/features/coaching-sales/ui/coach/call-sales/payment-link-action.tsx | import | yes | yes | outward | present |
| E3269 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | apps/platform/src/features/coaching-sales/ui/coach/call-sales/pricing-tier-label.ts | import | yes | no | lateral | present |
| E3270 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | apps/platform/src/features/coaching-sales/ui/coach/call-sales/sales-status-filter.tsx | import | yes | yes | outward | present |
| E3271 | apps/platform/src/surfaces/coach-portal/pages/assessment-calls.tsx | apps/platform/src/features/coaching-sales/ui/coach/clients/view-client-link.tsx | import | yes | yes | outward | present |
| E3272 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | apps/platform/src/features/client-onboarding/server/guards/client-onboarding-context.server.ts | import | yes | yes | outward | present |
| E3273 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-panel.tsx | import | yes | yes | outward | present |
| E3274 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | apps/platform/src/features/client-profile/contracts/measurements.ts | import | yes | no | lateral | present |
| E3275 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | apps/platform/src/features/client-profile/server/guards/client-profile-context.server.ts | import | yes | yes | outward | present |
| E3276 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | apps/platform/src/features/client-profile/ui/coach/profile/client-profile-block.tsx | import | yes | yes | outward | present |
| E3277 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | apps/platform/src/features/client-profile/ui/shared/measurements/measurements-table.tsx | import | yes | yes | outward | present |
| E3278 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | apps/platform/src/features/client-profile/ui/shared/photos/photo-view-dialog.tsx | import | yes | yes | outward | present |
| E3279 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | yes | no | lateral | present |
| E3280 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | yes | yes | outward | present |
| E3281 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | apps/platform/src/features/coaching-sales/ui/coach/clients/assessment-call-block.tsx | import | yes | yes | outward | present |
| E3282 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | apps/platform/src/features/coaching-sales/ui/coach/clients/client-status-badge.tsx | import | yes | yes | outward | present |
| E3283 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | apps/platform/src/features/coaching-sales/ui/coach/clients/invitation-block.tsx | import | yes | yes | outward | present |
| E3284 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | apps/platform/src/features/coaching-sales/ui/coach/clients/roster-listing.ts | import | yes | no | lateral | present |
| E3285 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | apps/platform/src/features/coaching-sales/ui/coach/clients/subscription-summary.tsx | import | yes | yes | outward | present |
| E3286 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | external:lucide-react | import | n/a | yes | outward | present |
| E3287 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | external:react | import | n/a | yes | outward | present |
| E3288 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | external:react-router | import | n/a | yes | outward | present |
| E3290 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | packages/ui/src/lib/index.ts | import | yes | yes | outward | present |
| E3291 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | packages/ui/src/primitives/index.ts | import | yes | yes | outward | present |
| E3292 | apps/platform/src/surfaces/coach-portal/routes.ts | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | yes | yes | inward | present |
| E3293 | apps/platform/src/surfaces/coach-portal/routes.ts | apps/platform/src/features/coaching-sales/routes.ts | import | yes | no | lateral | present |
| E3294 | apps/platform/src/surfaces/coach-portal/routes.ts | external:@react-router/dev/routes | import | n/a | no | lateral | present |
| E3295 | apps/platform/src/surfaces/coach-portal/shell/layout.tsx | external:react-router | import | n/a | no | lateral | present |
| E3297 | apps/platform/src/surfaces/coach-portal/shell/navigation-links.tsx | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | yes | no | lateral | present |
| E3298 | packages/config/src/concerns/client-media.ts | external:zod | import | n/a | no | lateral | present |
| E3299 | packages/config/src/concerns/client-media.ts | packages/config/src/concerns/app.ts | import | no | no | lateral | present |
| E3300 | packages/config/src/index.ts | packages/config/src/concerns/client-media.ts | type-only import | no | no | lateral | present |
| E3301 | packages/config/src/runtime-environment.ts | packages/config/src/concerns/client-media.ts | import | no | no | lateral | present |
| E3302 | packages/domain/src/client-invitation/index.ts | packages/domain/src/client-invitation/read-client-invitation-use-case.ts | re-export | no | no | lateral | present |
| E3303 | packages/domain/src/client-invitation/index.ts | packages/domain/src/client-invitation/resend-invitation-use-case.ts | re-export | no | no | lateral | present |
| E3304 | packages/domain/src/client-invitation/read-client-invitation-use-case.ts | packages/domain/src/client-invitation/client-invitation.ts | type-only import | no | yes | inward | present |
| E3305 | packages/domain/src/client-invitation/read-client-invitation-use-case.ts | packages/domain/src/client-invitation/client-invitations.ts | type-only import | no | no | lateral | present |
| E3306 | packages/domain/src/client-invitation/read-client-invitation-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E3307 | packages/domain/src/client-invitation/resend-invitation-use-case.ts | packages/domain/src/client-invitation/client-invitation-incidents.ts | type-only import | no | no | lateral | present |
| E3308 | packages/domain/src/client-invitation/resend-invitation-use-case.ts | packages/domain/src/client-invitation/client-invitation-notifications.ts | type-only import | no | no | lateral | present |
| E3309 | packages/domain/src/client-invitation/resend-invitation-use-case.ts | packages/domain/src/client-invitation/client-invitation.ts | type-only import | no | yes | inward | present |
| E3310 | packages/domain/src/client-invitation/resend-invitation-use-case.ts | packages/domain/src/client-invitation/client-invitations.ts | type-only import | no | no | lateral | present |
| E3311 | packages/domain/src/client-invitation/resend-invitation-use-case.ts | packages/domain/src/client-invitation/identity-invitations.ts | type-only import | no | no | lateral | present |
| E3312 | packages/domain/src/client-invitation/resend-invitation-use-case.ts | packages/domain/src/client-invitation/invitation-token.ts | type-only import | no | no | lateral | present |
| E3313 | packages/domain/src/client-invitation/resend-invitation-use-case.ts | packages/domain/src/client-invitation/invited-client.ts | type-only import | no | no | lateral | present |
| E3314 | packages/domain/src/client-invitation/resend-invitation-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E3315 | packages/domain/src/client-journey/client-journey.ts | packages/domain/src/client-onboarding/index.ts | import | no | no | lateral | present |
| E3318 | packages/domain/src/client-journey/index.ts | packages/domain/src/client-journey/read-program-status-use-case.ts | re-export | no | no | lateral | present |
| E3319 | packages/domain/src/client-journey/read-program-status-use-case.ts | packages/domain/src/client-journey/client-journey.ts | import | no | yes | inward | present |
| E3320 | packages/domain/src/client-journey/read-program-status-use-case.ts | packages/domain/src/client-journey/client-journeys.ts | type-only import | no | no | lateral | present |
| E3322 | packages/domain/src/client-journey/read-program-status-use-case.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | no | no | lateral | present |
| E3323 | packages/domain/src/client-onboarding/answer-onboarding-details-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-incidents.ts | type-only import | no | no | lateral | present |
| E3324 | packages/domain/src/client-onboarding/answer-onboarding-details-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-source.ts | type-only import | no | no | lateral | present |
| E3325 | packages/domain/src/client-onboarding/answer-onboarding-details-use-case.ts | packages/domain/src/client-onboarding/client-onboarding.ts | type-only import | no | yes | inward | present |
| E3326 | packages/domain/src/client-onboarding/answer-onboarding-details-use-case.ts | packages/domain/src/client-onboarding/onboarding-answers.ts | type-only import | no | yes | inward | present |
| E3327 | packages/domain/src/client-onboarding/answer-onboarding-details-use-case.ts | packages/domain/src/client-onboarding/onboarding-clients.ts | type-only import | no | no | lateral | present |
| E3328 | packages/domain/src/client-onboarding/answer-onboarding-details-use-case.ts | packages/domain/src/client-onboarding/onboarding-profile-facts.ts | import | no | yes | inward | present |
| E3329 | packages/domain/src/client-onboarding/answer-onboarding-details-use-case.ts | packages/domain/src/client-onboarding/onboarding-review.ts | import | no | yes | inward | present |
| E3330 | packages/domain/src/client-onboarding/answer-onboarding-details-use-case.ts | packages/domain/src/client-onboarding/onboarding-reviews.ts | type-only import | no | yes | inward | present |
| E3331 | packages/domain/src/client-onboarding/answer-onboarding-details-use-case.ts | packages/domain/src/client-profile/index.ts | import | no | no | lateral | present |
| E3332 | packages/domain/src/client-onboarding/answer-onboarding-details-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E3333 | packages/domain/src/client-onboarding/answer-onboarding-details-use-case.ts | packages/domain/src/unit-preference/index.ts | import | no | no | lateral | present |
| E3334 | packages/domain/src/client-onboarding/approve-onboarding-answers-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-incidents.ts | type-only import | no | no | lateral | present |
| E3335 | packages/domain/src/client-onboarding/approve-onboarding-answers-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-source.ts | type-only import | no | no | lateral | present |
| E3336 | packages/domain/src/client-onboarding/approve-onboarding-answers-use-case.ts | packages/domain/src/client-onboarding/onboarding-clients.ts | type-only import | no | no | lateral | present |
| E3337 | packages/domain/src/client-onboarding/approve-onboarding-answers-use-case.ts | packages/domain/src/client-onboarding/onboarding-review.ts | import | no | yes | inward | present |
| E3338 | packages/domain/src/client-onboarding/approve-onboarding-answers-use-case.ts | packages/domain/src/client-onboarding/onboarding-reviews.ts | type-only import | no | yes | inward | present |
| E3339 | packages/domain/src/client-onboarding/approve-onboarding-answers-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E3340 | packages/domain/src/client-onboarding/client-onboarding-changes.ts | packages/domain/src/client-onboarding/onboarding-draft.ts | type-only import | no | yes | outward | present |
| E3341 | packages/domain/src/client-onboarding/client-onboarding-changes.ts | packages/domain/src/client-onboarding/onboarding-submission.ts | type-only import | no | no | lateral | present |
| E3342 | packages/domain/src/client-onboarding/client-onboarding-changes.ts | packages/domain/src/client-profile/index.ts | type-only import | no | no | lateral | present |
| E3343 | packages/domain/src/client-onboarding/client-onboarding-changes.ts | packages/domain/src/measurement/index.ts | type-only import | no | no | lateral | present |
| E3344 | packages/domain/src/client-onboarding/client-onboarding-incidents.ts | packages/domain/src/client-onboarding/onboarding-schema.ts | type-only import | no | yes | inward | present |
| E3345 | packages/domain/src/client-onboarding/client-onboarding-incidents.ts | packages/domain/src/client-onboarding/onboarding-submission.ts | type-only import | no | yes | inward | present |
| E3346 | packages/domain/src/client-onboarding/client-onboarding-source.ts | packages/domain/src/client-onboarding/onboarding-draft.ts | type-only import | no | no | lateral | present |
| E3347 | packages/domain/src/client-onboarding/client-onboarding-source.ts | packages/domain/src/client-onboarding/onboarding-submission.ts | type-only import | no | yes | inward | present |
| E3348 | packages/domain/src/client-onboarding/client-onboarding.ts | packages/domain/src/assessment-call/index.ts | type-only import | no | no | lateral | present |
| E3349 | packages/domain/src/client-onboarding/client-onboarding.ts | packages/domain/src/client-onboarding/onboarding-answers.ts | import | no | no | lateral | present |
| E3350 | packages/domain/src/client-onboarding/client-onboarding.ts | packages/domain/src/client-onboarding/onboarding-clients.ts | type-only import | no | yes | outward | present |
| E3351 | packages/domain/src/client-onboarding/client-onboarding.ts | packages/domain/src/client-onboarding/onboarding-consents.ts | type-only import | no | yes | outward | present |
| E3352 | packages/domain/src/client-onboarding/client-onboarding.ts | packages/domain/src/client-onboarding/onboarding-draft.ts | type-only import | no | yes | outward | present |
| E3353 | packages/domain/src/client-onboarding/client-onboarding.ts | packages/domain/src/client-onboarding/onboarding-measurements.ts | import | no | no | lateral | present |
| E3354 | packages/domain/src/client-onboarding/client-onboarding.ts | packages/domain/src/client-onboarding/onboarding-schema.ts | import | no | no | lateral | present |
| E3355 | packages/domain/src/client-onboarding/client-onboarding.ts | packages/domain/src/client-onboarding/onboarding-submission.ts | import | no | no | lateral | present |
| E3356 | packages/domain/src/client-onboarding/client-onboarding.ts | packages/domain/src/client-onboarding/onboarding-validation.ts | import | no | no | lateral | present |
| E3357 | packages/domain/src/client-onboarding/client-onboarding.ts | packages/domain/src/measurement/index.ts | type-only import | no | no | lateral | present |
| E3358 | packages/domain/src/client-onboarding/client-onboarding.ts | packages/domain/src/unit-preference/index.ts | type-only import | no | no | lateral | present |
| E3359 | packages/domain/src/client-onboarding/detail-request.ts | packages/domain/src/client-onboarding/client-onboarding.ts | type-only import | no | no | lateral | present |
| E3360 | packages/domain/src/client-onboarding/detail-request.ts | packages/domain/src/client-onboarding/onboarding-answers.ts | import | no | no | lateral | present |
| E3361 | packages/domain/src/client-onboarding/detail-request.ts | packages/domain/src/client-onboarding/onboarding-schema.ts | type-only import | no | no | lateral | present |
| E3362 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/answer-onboarding-details-use-case.ts | re-export | no | no | lateral | present |
| E3363 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/approve-onboarding-answers-use-case.ts | re-export | no | no | lateral | present |
| E3364 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/client-onboarding-changes.ts | type-only import | no | no | lateral | present |
| E3365 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/client-onboarding-incidents.ts | type-only import | no | no | lateral | present |
| E3366 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/client-onboarding-source.ts | type-only import | no | no | lateral | present |
| E3367 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/client-onboarding.ts | re-export | no | no | lateral | present |
| E3368 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/detail-request.ts | re-export | no | no | lateral | present |
| E3369 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/onboarding-answers.ts | re-export | no | no | lateral | present |
| E3370 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/onboarding-clients.ts | type-only import | no | no | lateral | present |
| E3371 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/onboarding-consents.ts | type-only import | no | no | lateral | present |
| E3372 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/onboarding-details-notifications.ts | type-only import | no | no | lateral | present |
| E3373 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/onboarding-draft.ts | re-export | no | no | lateral | present |
| E3374 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/onboarding-profile-facts.ts | re-export | no | no | lateral | present |
| E3375 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/onboarding-review-stamps.ts | type-only import | no | no | lateral | present |
| E3376 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/onboarding-review.ts | re-export | no | no | lateral | present |
| E3377 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/onboarding-reviews.ts | type-only import | no | no | lateral | present |
| E3378 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/onboarding-schema.ts | re-export | no | no | lateral | present |
| E3379 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/onboarding-submission-stamps.ts | type-only import | no | no | lateral | present |
| E3380 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/onboarding-submission.ts | re-export | no | no | lateral | present |
| E3381 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/onboarding-validation.ts | re-export | no | no | lateral | present |
| E3382 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/open-onboarding-review-use-case.ts | re-export | no | no | lateral | present |
| E3383 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/read-client-onboarding-use-case.ts | re-export | no | no | lateral | present |
| E3384 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/read-onboarding-review-use-case.ts | re-export | no | no | lateral | present |
| E3385 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/read-open-detail-request-use-case.ts | re-export | no | no | lateral | present |
| E3386 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/request-onboarding-details-use-case.ts | re-export | no | no | lateral | present |
| E3387 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/save-onboarding-draft-use-case.ts | re-export | no | no | lateral | present |
| E3388 | packages/domain/src/client-onboarding/index.ts | packages/domain/src/client-onboarding/submit-onboarding-use-case.ts | re-export | no | no | lateral | present |
| E3389 | packages/domain/src/client-onboarding/onboarding-answers.ts | packages/domain/src/client-onboarding/onboarding-schema.ts | type-only import | no | no | lateral | present |
| E3390 | packages/domain/src/client-onboarding/onboarding-clients.ts | packages/domain/src/assessment-call/index.ts | type-only import | no | no | lateral | present |
| E3391 | packages/domain/src/client-onboarding/onboarding-clients.ts | packages/domain/src/client-onboarding/onboarding-review-stamps.ts | type-only import | no | no | lateral | present |
| E3392 | packages/domain/src/client-onboarding/onboarding-draft.ts | packages/domain/src/client-onboarding/onboarding-answers.ts | import | no | yes | inward | present |
| E3393 | packages/domain/src/client-onboarding/onboarding-draft.ts | packages/domain/src/client-onboarding/onboarding-consents.ts | import | no | no | lateral | present |
| E3394 | packages/domain/src/client-onboarding/onboarding-measurements.ts | packages/domain/src/client-onboarding/onboarding-answers.ts | type-only import | no | no | lateral | present |
| E3395 | packages/domain/src/client-onboarding/onboarding-measurements.ts | packages/domain/src/measurement/index.ts | import | no | no | lateral | present |
| E3396 | packages/domain/src/client-onboarding/onboarding-profile-facts.ts | packages/domain/src/client-onboarding/onboarding-answers.ts | type-only import | no | no | lateral | present |
| E3397 | packages/domain/src/client-onboarding/onboarding-profile-facts.ts | packages/domain/src/client-profile/index.ts | type-only import | no | no | lateral | present |
| E3398 | packages/domain/src/client-onboarding/onboarding-review.ts | packages/domain/src/assessment-call/index.ts | type-only import | no | no | lateral | present |
| E3399 | packages/domain/src/client-onboarding/onboarding-review.ts | packages/domain/src/client-onboarding/client-onboarding.ts | type-only import | no | no | lateral | present |
| E3400 | packages/domain/src/client-onboarding/onboarding-review.ts | packages/domain/src/client-onboarding/detail-request.ts | import | no | no | lateral | present |
| E3401 | packages/domain/src/client-onboarding/onboarding-review.ts | packages/domain/src/client-onboarding/onboarding-answers.ts | import | no | no | lateral | present |
| E3402 | packages/domain/src/client-onboarding/onboarding-review.ts | packages/domain/src/client-onboarding/onboarding-clients.ts | type-only import | no | yes | outward | present |
| E3403 | packages/domain/src/client-onboarding/onboarding-review.ts | packages/domain/src/client-onboarding/onboarding-review-stamps.ts | type-only import | no | yes | outward | present |
| E3404 | packages/domain/src/client-onboarding/onboarding-review.ts | packages/domain/src/client-onboarding/onboarding-schema.ts | import | no | no | lateral | present |
| E3405 | packages/domain/src/client-onboarding/onboarding-review.ts | packages/domain/src/client-onboarding/onboarding-submission.ts | import | no | no | lateral | present |
| E3406 | packages/domain/src/client-onboarding/onboarding-review.ts | packages/domain/src/client-onboarding/onboarding-validation.ts | import | no | no | lateral | present |
| E3407 | packages/domain/src/client-onboarding/onboarding-review.ts | packages/domain/src/unit-preference/index.ts | type-only import | no | no | lateral | present |
| E3408 | packages/domain/src/client-onboarding/onboarding-reviews.ts | packages/domain/src/client-onboarding/detail-request.ts | type-only import | no | no | lateral | present |
| E3409 | packages/domain/src/client-onboarding/onboarding-reviews.ts | packages/domain/src/client-onboarding/onboarding-answers.ts | type-only import | no | no | lateral | present |
| E3410 | packages/domain/src/client-onboarding/onboarding-reviews.ts | packages/domain/src/client-onboarding/onboarding-review-stamps.ts | type-only import | no | yes | outward | present |
| E3411 | packages/domain/src/client-onboarding/onboarding-reviews.ts | packages/domain/src/client-profile/index.ts | type-only import | no | no | lateral | present |
| E3412 | packages/domain/src/client-onboarding/onboarding-schema.ts | packages/domain/src/assessment-call/index.ts | type-only import | no | no | lateral | present |
| E3413 | packages/domain/src/client-onboarding/onboarding-schema.ts | packages/domain/src/measurement/index.ts | import | no | no | lateral | present |
| E3414 | packages/domain/src/client-onboarding/onboarding-submission.ts | packages/domain/src/client-onboarding/onboarding-answers.ts | type-only import | no | no | lateral | present |
| E3415 | packages/domain/src/client-onboarding/onboarding-submission.ts | packages/domain/src/client-onboarding/onboarding-consents.ts | type-only import | no | yes | outward | present |
| E3416 | packages/domain/src/client-onboarding/onboarding-validation.ts | packages/domain/src/client-onboarding/onboarding-answers.ts | type-only import | no | no | lateral | present |
| E3417 | packages/domain/src/client-onboarding/onboarding-validation.ts | packages/domain/src/client-onboarding/onboarding-schema.ts | type-only import | no | no | lateral | present |
| E3418 | packages/domain/src/client-onboarding/onboarding-validation.ts | packages/domain/src/measurement/index.ts | import | no | no | lateral | present |
| E3419 | packages/domain/src/client-onboarding/onboarding-validation.ts | packages/domain/src/unit-preference/index.ts | import | no | no | lateral | present |
| E3420 | packages/domain/src/client-onboarding/open-onboarding-review-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-incidents.ts | type-only import | no | no | lateral | present |
| E3421 | packages/domain/src/client-onboarding/open-onboarding-review-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-source.ts | type-only import | no | no | lateral | present |
| E3422 | packages/domain/src/client-onboarding/open-onboarding-review-use-case.ts | packages/domain/src/client-onboarding/onboarding-clients.ts | type-only import | no | no | lateral | present |
| E3423 | packages/domain/src/client-onboarding/open-onboarding-review-use-case.ts | packages/domain/src/client-onboarding/onboarding-review.ts | import | no | yes | inward | present |
| E3424 | packages/domain/src/client-onboarding/open-onboarding-review-use-case.ts | packages/domain/src/client-onboarding/onboarding-reviews.ts | type-only import | no | yes | inward | present |
| E3425 | packages/domain/src/client-onboarding/open-onboarding-review-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E3426 | packages/domain/src/client-onboarding/read-client-onboarding-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-source.ts | type-only import | no | no | lateral | present |
| E3427 | packages/domain/src/client-onboarding/read-client-onboarding-use-case.ts | packages/domain/src/client-onboarding/client-onboarding.ts | import | no | yes | inward | present |
| E3428 | packages/domain/src/client-onboarding/read-client-onboarding-use-case.ts | packages/domain/src/client-onboarding/onboarding-clients.ts | type-only import | no | no | lateral | present |
| E3429 | packages/domain/src/client-onboarding/read-client-onboarding-use-case.ts | packages/domain/src/unit-preference/index.ts | import | no | no | lateral | present |
| E3430 | packages/domain/src/client-onboarding/read-onboarding-review-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-incidents.ts | type-only import | no | no | lateral | present |
| E3431 | packages/domain/src/client-onboarding/read-onboarding-review-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-source.ts | type-only import | no | no | lateral | present |
| E3432 | packages/domain/src/client-onboarding/read-onboarding-review-use-case.ts | packages/domain/src/client-onboarding/detail-request.ts | type-only import | no | yes | inward | present |
| E3433 | packages/domain/src/client-onboarding/read-onboarding-review-use-case.ts | packages/domain/src/client-onboarding/onboarding-answers.ts | import | no | yes | inward | present |
| E3434 | packages/domain/src/client-onboarding/read-onboarding-review-use-case.ts | packages/domain/src/client-onboarding/onboarding-clients.ts | type-only import | no | no | lateral | present |
| E3435 | packages/domain/src/client-onboarding/read-onboarding-review-use-case.ts | packages/domain/src/client-onboarding/onboarding-review-stamps.ts | type-only import | no | no | lateral | present |
| E3436 | packages/domain/src/client-onboarding/read-onboarding-review-use-case.ts | packages/domain/src/client-onboarding/onboarding-review.ts | import | no | yes | inward | present |
| E3437 | packages/domain/src/client-onboarding/read-onboarding-review-use-case.ts | packages/domain/src/client-onboarding/onboarding-reviews.ts | type-only import | no | yes | inward | present |
| E3438 | packages/domain/src/client-onboarding/read-onboarding-review-use-case.ts | packages/domain/src/client-onboarding/onboarding-schema.ts | type-only import | no | yes | inward | present |
| E3439 | packages/domain/src/client-onboarding/read-onboarding-review-use-case.ts | packages/domain/src/client-onboarding/onboarding-submission.ts | import | no | yes | inward | present |
| E3440 | packages/domain/src/client-onboarding/read-onboarding-review-use-case.ts | packages/domain/src/measurement/index.ts | import | no | no | lateral | present |
| E3441 | packages/domain/src/client-onboarding/read-open-detail-request-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-incidents.ts | type-only import | no | no | lateral | present |
| E3442 | packages/domain/src/client-onboarding/read-open-detail-request-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-source.ts | type-only import | no | no | lateral | present |
| E3443 | packages/domain/src/client-onboarding/read-open-detail-request-use-case.ts | packages/domain/src/client-onboarding/onboarding-answers.ts | type-only import | no | yes | inward | present |
| E3444 | packages/domain/src/client-onboarding/read-open-detail-request-use-case.ts | packages/domain/src/client-onboarding/onboarding-clients.ts | type-only import | no | no | lateral | present |
| E3445 | packages/domain/src/client-onboarding/read-open-detail-request-use-case.ts | packages/domain/src/client-onboarding/onboarding-review-stamps.ts | type-only import | no | no | lateral | present |
| E3446 | packages/domain/src/client-onboarding/read-open-detail-request-use-case.ts | packages/domain/src/client-onboarding/onboarding-review.ts | import | no | yes | inward | present |
| E3447 | packages/domain/src/client-onboarding/read-open-detail-request-use-case.ts | packages/domain/src/client-onboarding/onboarding-reviews.ts | type-only import | no | yes | inward | present |
| E3448 | packages/domain/src/client-onboarding/request-onboarding-details-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-incidents.ts | type-only import | no | no | lateral | present |
| E3449 | packages/domain/src/client-onboarding/request-onboarding-details-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-source.ts | type-only import | no | no | lateral | present |
| E3450 | packages/domain/src/client-onboarding/request-onboarding-details-use-case.ts | packages/domain/src/client-onboarding/detail-request.ts | type-only import | no | yes | inward | present |
| E3451 | packages/domain/src/client-onboarding/request-onboarding-details-use-case.ts | packages/domain/src/client-onboarding/onboarding-answers.ts | type-only import | no | yes | inward | present |
| E3452 | packages/domain/src/client-onboarding/request-onboarding-details-use-case.ts | packages/domain/src/client-onboarding/onboarding-clients.ts | type-only import | no | no | lateral | present |
| E3453 | packages/domain/src/client-onboarding/request-onboarding-details-use-case.ts | packages/domain/src/client-onboarding/onboarding-details-notifications.ts | type-only import | no | no | lateral | present |
| E3454 | packages/domain/src/client-onboarding/request-onboarding-details-use-case.ts | packages/domain/src/client-onboarding/onboarding-review.ts | import | no | yes | inward | present |
| E3455 | packages/domain/src/client-onboarding/request-onboarding-details-use-case.ts | packages/domain/src/client-onboarding/onboarding-reviews.ts | type-only import | no | yes | inward | present |
| E3456 | packages/domain/src/client-onboarding/request-onboarding-details-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E3457 | packages/domain/src/client-onboarding/save-onboarding-draft-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-changes.ts | type-only import | no | yes | inward | present |
| E3458 | packages/domain/src/client-onboarding/save-onboarding-draft-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-incidents.ts | type-only import | no | no | lateral | present |
| E3459 | packages/domain/src/client-onboarding/save-onboarding-draft-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-source.ts | type-only import | no | no | lateral | present |
| E3460 | packages/domain/src/client-onboarding/save-onboarding-draft-use-case.ts | packages/domain/src/client-onboarding/client-onboarding.ts | import | no | yes | inward | present |
| E3461 | packages/domain/src/client-onboarding/save-onboarding-draft-use-case.ts | packages/domain/src/client-onboarding/onboarding-answers.ts | type-only import | no | yes | inward | present |
| E3462 | packages/domain/src/client-onboarding/save-onboarding-draft-use-case.ts | packages/domain/src/client-onboarding/onboarding-clients.ts | type-only import | no | no | lateral | present |
| E3463 | packages/domain/src/client-onboarding/save-onboarding-draft-use-case.ts | packages/domain/src/client-onboarding/onboarding-consents.ts | type-only import | no | no | lateral | present |
| E3464 | packages/domain/src/client-onboarding/save-onboarding-draft-use-case.ts | packages/domain/src/client-onboarding/onboarding-schema.ts | type-only import | no | yes | inward | present |
| E3465 | packages/domain/src/client-onboarding/save-onboarding-draft-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E3466 | packages/domain/src/client-onboarding/submit-onboarding-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-changes.ts | type-only import | no | yes | inward | present |
| E3467 | packages/domain/src/client-onboarding/submit-onboarding-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-incidents.ts | type-only import | no | no | lateral | present |
| E3468 | packages/domain/src/client-onboarding/submit-onboarding-use-case.ts | packages/domain/src/client-onboarding/client-onboarding-source.ts | type-only import | no | no | lateral | present |
| E3469 | packages/domain/src/client-onboarding/submit-onboarding-use-case.ts | packages/domain/src/client-onboarding/client-onboarding.ts | import | no | yes | inward | present |
| E3470 | packages/domain/src/client-onboarding/submit-onboarding-use-case.ts | packages/domain/src/client-onboarding/onboarding-answers.ts | type-only import | no | yes | inward | present |
| E3471 | packages/domain/src/client-onboarding/submit-onboarding-use-case.ts | packages/domain/src/client-onboarding/onboarding-clients.ts | type-only import | no | no | lateral | present |
| E3472 | packages/domain/src/client-onboarding/submit-onboarding-use-case.ts | packages/domain/src/client-onboarding/onboarding-consents.ts | type-only import | no | no | lateral | present |
| E3473 | packages/domain/src/client-onboarding/submit-onboarding-use-case.ts | packages/domain/src/client-onboarding/onboarding-profile-facts.ts | import | no | yes | inward | present |
| E3474 | packages/domain/src/client-onboarding/submit-onboarding-use-case.ts | packages/domain/src/client-onboarding/onboarding-submission-stamps.ts | type-only import | no | no | lateral | present |
| E3475 | packages/domain/src/client-onboarding/submit-onboarding-use-case.ts | packages/domain/src/client-onboarding/onboarding-submission.ts | import | no | yes | inward | present |
| E3476 | packages/domain/src/client-onboarding/submit-onboarding-use-case.ts | packages/domain/src/client-profile/index.ts | import | no | no | lateral | present |
| E3477 | packages/domain/src/client-onboarding/submit-onboarding-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E3478 | packages/domain/src/client-onboarding/submit-onboarding-use-case.ts | packages/domain/src/unit-preference/index.ts | import | no | no | lateral | present |
| E3479 | packages/domain/src/client-profile/client-measurement-records.ts | packages/domain/src/client-profile/measurement-history.ts | type-only import | no | yes | inward | present |
| E3480 | packages/domain/src/client-profile/client-measurement-records.ts | packages/domain/src/measurement/index.ts | type-only import | no | no | lateral | present |
| E3481 | packages/domain/src/client-profile/client-profiles.ts | packages/domain/src/client-profile/client-profile.ts | type-only import | no | no | lateral | present |
| E3482 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/client-measurement-records.ts | type-only import | no | no | lateral | present |
| E3483 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/client-profile.ts | re-export | no | no | lateral | present |
| E3484 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/client-profiles.ts | type-only import | no | no | lateral | present |
| E3485 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/measurement-clients.ts | type-only import | no | no | lateral | present |
| E3486 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/measurement-history.ts | re-export | no | no | lateral | present |
| E3487 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/measurement-incidents.ts | type-only import | no | no | lateral | present |
| E3488 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/open-progress-photo-use-case.ts | re-export | no | no | lateral | present |
| E3489 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/progress-photo-reference.ts | type-only import | no | no | lateral | present |
| E3490 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/progress-photo-renditions.ts | type-only import | no | no | lateral | present |
| E3491 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/progress-photo-store.ts | type-only import | no | no | lateral | present |
| E3492 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/progress-photo.ts | re-export | no | no | lateral | present |
| E3493 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/progress-photos.ts | type-only import | no | no | lateral | present |
| E3494 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/read-client-measurement-history-use-case.ts | re-export | no | no | lateral | present |
| E3495 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/read-client-profile-use-case.ts | re-export | no | no | lateral | present |
| E3496 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/read-own-measurement-history-use-case.ts | re-export | no | no | lateral | present |
| E3497 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/record-measurements-use-case.ts | re-export | no | no | lateral | present |
| E3498 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/remove-progress-photo-use-case.ts | re-export | no | no | lateral | present |
| E3499 | packages/domain/src/client-profile/measurement-history.ts | packages/domain/src/client-profile/progress-photo.ts | type-only import | no | no | lateral | present |
| E3500 | packages/domain/src/client-profile/measurement-history.ts | packages/domain/src/measurement/index.ts | type-only import | no | no | lateral | present |
| E3501 | packages/domain/src/client-profile/measurement-incidents.ts | packages/domain/src/account/index.ts | type-only import | no | no | lateral | present |
| E3502 | packages/domain/src/client-profile/measurement-incidents.ts | packages/domain/src/client-profile/progress-photo.ts | type-only import | no | yes | inward | present |
| E3503 | packages/domain/src/client-profile/open-progress-photo-use-case.ts | packages/domain/src/account/index.ts | type-only import | no | no | lateral | present |
| E3504 | packages/domain/src/client-profile/open-progress-photo-use-case.ts | packages/domain/src/client-profile/measurement-clients.ts | type-only import | no | no | lateral | present |
| E3505 | packages/domain/src/client-profile/open-progress-photo-use-case.ts | packages/domain/src/client-profile/measurement-incidents.ts | type-only import | no | no | lateral | present |
| E3506 | packages/domain/src/client-profile/open-progress-photo-use-case.ts | packages/domain/src/client-profile/progress-photo-store.ts | type-only import | no | no | lateral | present |
| E3507 | packages/domain/src/client-profile/open-progress-photo-use-case.ts | packages/domain/src/client-profile/progress-photo.ts | type-only import | no | yes | inward | present |
| E3508 | packages/domain/src/client-profile/open-progress-photo-use-case.ts | packages/domain/src/client-profile/progress-photos.ts | type-only import | no | no | lateral | present |
| E3509 | packages/domain/src/client-profile/progress-photo-store.ts | packages/domain/src/client-profile/progress-photo-reference.ts | type-only import | no | no | lateral | present |
| E3510 | packages/domain/src/client-profile/progress-photo.ts | packages/domain/src/client-profile/progress-photo-reference.ts | type-only import | no | yes | outward | present |
| E3511 | packages/domain/src/client-profile/progress-photos.ts | packages/domain/src/client-profile/progress-photo.ts | type-only import | no | yes | inward | present |
| E3512 | packages/domain/src/client-profile/read-client-measurement-history-use-case.ts | packages/domain/src/client-profile/client-measurement-records.ts | type-only import | no | no | lateral | present |
| E3513 | packages/domain/src/client-profile/read-client-measurement-history-use-case.ts | packages/domain/src/client-profile/measurement-history.ts | import | no | yes | inward | present |
| E3514 | packages/domain/src/client-profile/read-client-profile-use-case.ts | packages/domain/src/client-profile/client-profile.ts | type-only import | no | yes | inward | present |
| E3515 | packages/domain/src/client-profile/read-client-profile-use-case.ts | packages/domain/src/client-profile/client-profiles.ts | type-only import | no | yes | inward | present |
| E3516 | packages/domain/src/client-profile/read-client-profile-use-case.ts | packages/domain/src/client/index.ts | type-only import | no | no | lateral | present |
| E3517 | packages/domain/src/client-profile/read-client-profile-use-case.ts | packages/domain/src/measurement/index.ts | import | no | no | lateral | present |
| E3518 | packages/domain/src/client-profile/read-own-measurement-history-use-case.ts | packages/domain/src/client-profile/client-measurement-records.ts | type-only import | no | no | lateral | present |
| E3519 | packages/domain/src/client-profile/read-own-measurement-history-use-case.ts | packages/domain/src/client-profile/client-profiles.ts | type-only import | no | yes | inward | present |
| E3520 | packages/domain/src/client-profile/read-own-measurement-history-use-case.ts | packages/domain/src/client-profile/measurement-clients.ts | type-only import | no | no | lateral | present |
| E3521 | packages/domain/src/client-profile/read-own-measurement-history-use-case.ts | packages/domain/src/client-profile/measurement-history.ts | import | no | yes | inward | present |
| E3522 | packages/domain/src/client-profile/record-measurements-use-case.ts | packages/domain/src/client-profile/client-measurement-records.ts | type-only import | no | no | lateral | present |
| E3523 | packages/domain/src/client-profile/record-measurements-use-case.ts | packages/domain/src/client-profile/client-profiles.ts | type-only import | no | yes | inward | present |
| E3524 | packages/domain/src/client-profile/record-measurements-use-case.ts | packages/domain/src/client-profile/measurement-clients.ts | type-only import | no | no | lateral | present |
| E3525 | packages/domain/src/client-profile/record-measurements-use-case.ts | packages/domain/src/client-profile/measurement-incidents.ts | type-only import | no | no | lateral | present |
| E3526 | packages/domain/src/client-profile/record-measurements-use-case.ts | packages/domain/src/client-profile/progress-photo-renditions.ts | type-only import | no | yes | inward | present |
| E3527 | packages/domain/src/client-profile/record-measurements-use-case.ts | packages/domain/src/client-profile/progress-photo-store.ts | type-only import | no | no | lateral | present |
| E3529 | packages/domain/src/client-profile/record-measurements-use-case.ts | packages/domain/src/client-profile/progress-photos.ts | type-only import | no | no | lateral | present |
| E3530 | packages/domain/src/client-profile/record-measurements-use-case.ts | packages/domain/src/measurement/index.ts | import | no | no | lateral | present |
| E3531 | packages/domain/src/client-profile/record-measurements-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E3532 | packages/domain/src/client-profile/remove-progress-photo-use-case.ts | packages/domain/src/client-profile/measurement-clients.ts | type-only import | no | no | lateral | present |
| E3533 | packages/domain/src/client-profile/remove-progress-photo-use-case.ts | packages/domain/src/client-profile/measurement-incidents.ts | type-only import | no | no | lateral | present |
| E3534 | packages/domain/src/client-profile/remove-progress-photo-use-case.ts | packages/domain/src/client-profile/progress-photo-store.ts | type-only import | no | no | lateral | present |
| E3535 | packages/domain/src/client-profile/remove-progress-photo-use-case.ts | packages/domain/src/client-profile/progress-photos.ts | type-only import | no | no | lateral | present |
| E3536 | packages/domain/src/client-roster/client-roster.ts | packages/domain/src/assessment-call/index.ts | type-only import | no | no | lateral | present |
| E3537 | packages/domain/src/client-roster/client-roster.ts | packages/domain/src/client-journey/index.ts | import | no | no | lateral | present |
| E3539 | packages/domain/src/client-roster/client-roster.ts | packages/domain/src/coaching-subscription/index.ts | import | no | no | lateral | present |
| E3540 | packages/domain/src/client-roster/index.ts | packages/domain/src/client-roster/client-roster-incidents.ts | type-only import | no | no | lateral | present |
| E3541 | packages/domain/src/client-roster/index.ts | packages/domain/src/client-roster/client-roster.ts | re-export | no | no | lateral | present |
| E3542 | packages/domain/src/client-roster/index.ts | packages/domain/src/client-roster/list-clients-use-case.ts | re-export | no | no | lateral | present |
| E3543 | packages/domain/src/client-roster/index.ts | packages/domain/src/client-roster/read-client-record-use-case.ts | re-export | no | no | lateral | present |
| E3544 | packages/domain/src/client-roster/list-clients-use-case.ts | packages/domain/src/client-roster/client-roster-incidents.ts | type-only import | no | no | lateral | present |
| E3545 | packages/domain/src/client-roster/list-clients-use-case.ts | packages/domain/src/client-roster/client-roster.ts | import | no | no | lateral | present |
| E3546 | packages/domain/src/client-roster/read-client-record-use-case.ts | packages/domain/src/assessment-call/index.ts | type-only import | no | no | lateral | present |
| E3547 | packages/domain/src/client-roster/read-client-record-use-case.ts | packages/domain/src/client-roster/client-roster.ts | import | no | no | lateral | present |
| E3548 | packages/domain/src/client-roster/read-client-record-use-case.ts | packages/domain/src/payment-link/index.ts | type-only import | no | no | lateral | present |
| E3549 | packages/domain/src/client/client-identities.ts | packages/domain/src/assessment-call/index.ts | type-only import | no | no | lateral | present |
| E3550 | packages/domain/src/client/index.ts | packages/domain/src/client/client-identities.ts | type-only import | no | no | lateral | present |
| E3551 | packages/domain/src/measurement/client-measurements-source.ts | packages/domain/src/measurement/measurement.ts | type-only import | no | yes | inward | present |
| E3552 | packages/domain/src/measurement/index.ts | packages/domain/src/measurement/client-measurements-source.ts | type-only import | no | no | lateral | present |
| E3553 | packages/domain/src/measurement/index.ts | packages/domain/src/measurement/measurement-fields.ts | re-export | no | no | lateral | present |
| E3554 | packages/domain/src/measurement/index.ts | packages/domain/src/measurement/measurement-validation.ts | re-export | no | no | lateral | present |
| E3555 | packages/domain/src/measurement/index.ts | packages/domain/src/measurement/measurement.ts | re-export | no | no | lateral | present |
| E3556 | packages/domain/src/measurement/measurement-validation.ts | packages/domain/src/measurement/measurement-fields.ts | import | no | no | lateral | present |
| E3557 | packages/domain/src/measurement/measurement-validation.ts | packages/domain/src/measurement/measurement.ts | type-only import | no | no | lateral | present |
| E3558 | packages/domain/src/measurement/measurement-validation.ts | packages/domain/src/unit-preference/index.ts | import | no | no | lateral | present |
| E3559 | packages/domain/src/unit-preference/client-unit-preferences-source.ts | packages/domain/src/unit-preference/unit-preference.ts | type-only import | no | no | lateral | present |
| E3560 | packages/domain/src/unit-preference/client-unit-preferences.ts | packages/domain/src/unit-preference/client-unit-preferences-source.ts | type-only import | no | yes | inward | present |
| E3561 | packages/domain/src/unit-preference/client-unit-preferences.ts | packages/domain/src/unit-preference/unit-preference.ts | type-only import | no | yes | inward | present |
| E3562 | packages/domain/src/unit-preference/index.ts | packages/domain/src/unit-preference/client-unit-preferences-source.ts | type-only import | no | no | lateral | present |
| E3563 | packages/domain/src/unit-preference/index.ts | packages/domain/src/unit-preference/client-unit-preferences.ts | type-only import | no | no | lateral | present |
| E3564 | packages/domain/src/unit-preference/index.ts | packages/domain/src/unit-preference/measure-units.ts | re-export | no | no | lateral | present |
| E3565 | packages/domain/src/unit-preference/index.ts | packages/domain/src/unit-preference/save-unit-preference-use-case.ts | re-export | no | no | lateral | present |
| E3566 | packages/domain/src/unit-preference/index.ts | packages/domain/src/unit-preference/unit-preference-clients.ts | type-only import | no | no | lateral | present |
| E3567 | packages/domain/src/unit-preference/index.ts | packages/domain/src/unit-preference/unit-preference.ts | re-export | no | no | lateral | present |
| E3568 | packages/domain/src/unit-preference/measure-units.ts | packages/domain/src/unit-preference/unit-preference.ts | type-only import | no | no | lateral | present |
| E3569 | packages/domain/src/unit-preference/save-unit-preference-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E3570 | packages/domain/src/unit-preference/save-unit-preference-use-case.ts | packages/domain/src/unit-preference/client-unit-preferences.ts | type-only import | no | no | lateral | present |
| E3571 | packages/domain/src/unit-preference/save-unit-preference-use-case.ts | packages/domain/src/unit-preference/unit-preference-clients.ts | type-only import | no | no | lateral | present |
| E3572 | packages/domain/src/unit-preference/save-unit-preference-use-case.ts | packages/domain/src/unit-preference/unit-preference.ts | import | no | yes | inward | present |
| E3574 | packages/infrastructure/src/client-media/create-progress-photo-store.server.ts | packages/config/src/index.ts | type-only import | yes | yes | outward | present |
| E3575 | packages/infrastructure/src/client-media/create-progress-photo-store.server.ts | packages/domain/src/client-profile/index.ts | type-only import | yes | no | lateral | present |
| E3576 | packages/infrastructure/src/client-media/create-progress-photo-store.server.ts | packages/infrastructure/src/client-media/filesystem/encrypted-filesystem-progress-photo-store.server.ts | import | no | no | lateral | present |
| E3577 | packages/infrastructure/src/client-media/create-progress-photo-store.server.ts | packages/infrastructure/src/client-media/memory/in-memory-progress-photo-store.server.ts | import | no | no | lateral | present |
| E3578 | packages/infrastructure/src/client-media/filesystem/encrypted-filesystem-progress-photo-store.server.ts | external:fs/promises | import | n/a | yes | outward | present |
| E3579 | packages/infrastructure/src/client-media/filesystem/encrypted-filesystem-progress-photo-store.server.ts | external:path | import | n/a | yes | outward | present |
| E3580 | packages/infrastructure/src/client-media/filesystem/encrypted-filesystem-progress-photo-store.server.ts | packages/domain/src/client-profile/index.ts | type-only import | yes | no | lateral | present |
| E3581 | packages/infrastructure/src/client-media/filesystem/encrypted-filesystem-progress-photo-store.server.ts | packages/infrastructure/src/client-media/filesystem/media-root-confinement.server.ts | import | no | no | lateral | present |
| E3582 | packages/infrastructure/src/client-media/filesystem/encrypted-filesystem-progress-photo-store.server.ts | packages/infrastructure/src/client-media/filesystem/progress-photo-cipher.server.ts | import | no | no | lateral | present |
| E3583 | packages/infrastructure/src/client-media/filesystem/encrypted-filesystem-progress-photo-store.server.ts | packages/infrastructure/src/client-media/progress-photo-layout.server.ts | import | no | no | lateral | present |
| E3584 | packages/infrastructure/src/client-media/filesystem/media-root-confinement.server.ts | external:fs/promises | import | n/a | yes | outward | present |
| E3585 | packages/infrastructure/src/client-media/filesystem/media-root-confinement.server.ts | external:path | import | n/a | yes | outward | present |
| E3586 | packages/infrastructure/src/client-media/filesystem/progress-photo-cipher.server.ts | external:crypto | import | n/a | yes | outward | present |
| E3587 | packages/infrastructure/src/client-media/index.server.ts | packages/infrastructure/src/client-media/create-progress-photo-store.server.ts | re-export | no | yes | inward | present |
| E3588 | packages/infrastructure/src/client-media/memory/in-memory-progress-photo-store.server.ts | packages/domain/src/client-profile/index.ts | type-only import | yes | no | lateral | present |
| E3589 | packages/infrastructure/src/client-media/memory/in-memory-progress-photo-store.server.ts | packages/infrastructure/src/client-media/progress-photo-layout.server.ts | import | no | no | lateral | present |
| E3591 | packages/infrastructure/src/images/create-progress-photo-renditions.server.ts | packages/domain/src/client-profile/index.ts | type-only import | yes | no | lateral | present |
| E3592 | packages/infrastructure/src/images/index.server.ts | packages/infrastructure/src/images/create-progress-photo-renditions.server.ts | re-export | no | yes | inward | present |
| E3593 | packages/ui/src/appointments/appointment-card.tsx | packages/ui/src/lib/typography.ts | import | no | no | lateral | present |
| E3594 | packages/ui/src/appointments/appointment-card.tsx | packages/ui/src/primitives/date-time-label.tsx | import | no | no | lateral | present |
| E3595 | packages/ui/src/calendar/date-field.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3596 | packages/ui/src/calendar/date-field.tsx | external:react | import | n/a | no | lateral | present |
| E3597 | packages/ui/src/calendar/date-field.tsx | external:react-day-picker | type-only import | n/a | no | lateral | present |
| E3598 | packages/ui/src/calendar/date-field.tsx | packages/ui/src/calendar/calendar.tsx | import | no | no | lateral | present |
| E3599 | packages/ui/src/calendar/date-field.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E3600 | packages/ui/src/calendar/date-field.tsx | packages/ui/src/lib/use-display-time-zone.ts | import | no | yes | inward | present |
| E3601 | packages/ui/src/calendar/date-field.tsx | packages/ui/src/primitives/field-frame.ts | import | no | no | lateral | present |
| E3602 | packages/ui/src/calendar/date-field.tsx | packages/ui/src/primitives/field-size.ts | import | no | no | lateral | present |
| E3603 | packages/ui/src/calendar/date-field.tsx | packages/ui/src/primitives/index.ts | import | no | no | lateral | present |
| E3604 | packages/ui/src/calendar/index.ts | packages/ui/src/calendar/date-field.tsx | re-export | no | no | lateral | present |
| E3605 | packages/ui/src/layout/bottom-sheet.tsx | external:motion/react | import | n/a | no | lateral | present |
| E3606 | packages/ui/src/layout/bottom-sheet.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E3607 | packages/ui/src/layout/bottom-sheet.tsx | external:react | import | n/a | no | lateral | present |
| E3608 | packages/ui/src/layout/bottom-sheet.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E3609 | packages/ui/src/layout/dead-end-page.tsx | packages/ui/src/lib/data-attributes.ts | type-only import | no | no | lateral | present |
| E3610 | packages/ui/src/layout/index.ts | packages/ui/src/layout/responsive-sheet-dialog.tsx | re-export | no | no | lateral | present |
| E3611 | packages/ui/src/layout/navigation-dialog.tsx | external:motion/react | import | n/a | no | lateral | present |
| E3612 | packages/ui/src/layout/navigation-dialog.tsx | packages/ui/src/lib/focus-main-content.ts | import | no | no | lateral | present |
| E3613 | packages/ui/src/layout/portal-shell.tsx | external:motion/react | import | n/a | no | lateral | present |
| E3614 | packages/ui/src/layout/portal-shell.tsx | external:react-router | import | n/a | no | lateral | present |
| E3615 | packages/ui/src/layout/portal-shell.tsx | packages/ui/src/layout/bottom-sheet.tsx | import | no | no | lateral | present |
| E3616 | packages/ui/src/layout/portal-shell.tsx | packages/ui/src/lib/focus-main-content.ts | import | no | no | lateral | present |
| E3617 | packages/ui/src/layout/portal-shell.tsx | packages/ui/src/primitives/button.tsx | import | no | no | lateral | present |
| E3618 | packages/ui/src/layout/responsive-sheet-dialog.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E3619 | packages/ui/src/layout/responsive-sheet-dialog.tsx | external:react | type-only import | n/a | no | lateral | present |
| E3620 | packages/ui/src/layout/responsive-sheet-dialog.tsx | packages/ui/src/layout/bottom-sheet.tsx | import | no | no | lateral | present |
| E3622 | packages/ui/src/layout/responsive-sheet-dialog.tsx | packages/ui/src/lib/dialog-frame.tsx | import | no | no | lateral | present |
| E3624 | packages/ui/src/lib/cn.ts | external:tailwind-merge | import | n/a | no | lateral | present |
| E3625 | packages/ui/src/lib/dialog-frame.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3626 | packages/ui/src/lib/dialog-frame.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E3627 | packages/ui/src/lib/dialog-frame.tsx | external:react | type-only import | n/a | no | lateral | present |
| E3628 | packages/ui/src/lib/dialog-frame.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E3629 | packages/ui/src/lib/dialog-frame.tsx | packages/ui/src/lib/use-return-focus-to-opener.ts | import | no | yes | inward | present |
| E3630 | packages/ui/src/lib/focus-main-content.ts | packages/ui/src/lib/constants.ts | import | no | no | lateral | present |
| E3631 | packages/ui/src/lib/index.ts | packages/ui/src/lib/typography.ts | re-export | no | no | lateral | present |
| E3632 | packages/ui/src/lib/use-return-focus-to-opener.ts | external:react | import | n/a | yes | outward | present |
| E3633 | packages/ui/src/overlays/confirm-dialog.tsx | packages/ui/src/overlays/dialog.tsx | import | no | no | lateral | present |
| E3634 | packages/ui/src/overlays/dialog.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E3635 | packages/ui/src/overlays/dialog.tsx | external:react | import | n/a | no | lateral | present |
| E3636 | packages/ui/src/overlays/dialog.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E3637 | packages/ui/src/overlays/dialog.tsx | packages/ui/src/lib/dialog-frame.tsx | import | no | no | lateral | present |
| E3638 | packages/ui/src/overlays/index.ts | packages/ui/src/overlays/dialog.tsx | re-export | no | no | lateral | present |
| E3639 | packages/ui/src/portal/collapsible-portal-widget.tsx | external:react | type-only import | n/a | no | lateral | present |
| E3640 | packages/ui/src/portal/collapsible-portal-widget.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E3641 | packages/ui/src/portal/collapsible-portal-widget.tsx | packages/ui/src/lib/data-attributes.ts | type-only import | no | no | lateral | present |
| E3642 | packages/ui/src/portal/collapsible-portal-widget.tsx | packages/ui/src/lib/typography.ts | import | no | no | lateral | present |
| E3643 | packages/ui/src/portal/collapsible-portal-widget.tsx | packages/ui/src/portal/portal-widget.tsx | import | no | no | lateral | present |
| E3644 | packages/ui/src/portal/collapsible-portal-widget.tsx | packages/ui/src/primitives/accordion.tsx | import | no | no | lateral | present |
| E3645 | packages/ui/src/portal/empty-state.tsx | external:lucide-react | type-only import | n/a | no | lateral | present |
| E3646 | packages/ui/src/portal/empty-state.tsx | external:react | type-only import | n/a | no | lateral | present |
| E3647 | packages/ui/src/portal/index.ts | packages/ui/src/portal/collapsible-portal-widget.tsx | re-export | no | no | lateral | present |
| E3648 | packages/ui/src/portal/index.ts | packages/ui/src/portal/empty-state.tsx | re-export | no | no | lateral | present |
| E3649 | packages/ui/src/portal/index.ts | packages/ui/src/portal/portal-page-header.tsx | re-export | no | no | lateral | present |
| E3650 | packages/ui/src/portal/index.ts | packages/ui/src/portal/portal-widget.tsx | re-export | no | no | lateral | present |
| E3651 | packages/ui/src/portal/index.ts | packages/ui/src/portal/reading.tsx | re-export | no | no | lateral | present |
| E3652 | packages/ui/src/portal/index.ts | packages/ui/src/portal/settings-section.tsx | re-export | no | no | lateral | present |
| E3653 | packages/ui/src/portal/index.ts | packages/ui/src/portal/widget-link.tsx | re-export | no | no | lateral | present |
| E3654 | packages/ui/src/portal/portal-widget.tsx | external:react | type-only import | n/a | no | lateral | present |
| E3655 | packages/ui/src/portal/portal-widget.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E3656 | packages/ui/src/portal/portal-widget.tsx | packages/ui/src/lib/data-attributes.ts | type-only import | no | no | lateral | present |
| E3657 | packages/ui/src/portal/portal-widget.tsx | packages/ui/src/lib/typography.ts | import | no | no | lateral | present |
| E3658 | packages/ui/src/portal/portal-widget.tsx | packages/ui/src/primitives/card.tsx | import | no | no | lateral | present |
| E3659 | packages/ui/src/portal/reading.tsx | external:react | type-only import | n/a | no | lateral | present |
| E3660 | packages/ui/src/portal/reading.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E3661 | packages/ui/src/portal/reading.tsx | packages/ui/src/lib/typography.ts | import | no | no | lateral | present |
| E3662 | packages/ui/src/primitives/accordion.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3663 | packages/ui/src/primitives/accordion.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E3664 | packages/ui/src/primitives/accordion.tsx | external:react | import | n/a | no | lateral | present |
| E3665 | packages/ui/src/primitives/accordion.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E3666 | packages/ui/src/primitives/checkbox-field.tsx | external:react | import | n/a | no | lateral | present |
| E3667 | packages/ui/src/primitives/checkbox-field.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E3668 | packages/ui/src/primitives/checkbox-field.tsx | packages/ui/src/primitives/card.tsx | import | no | no | lateral | present |
| E3669 | packages/ui/src/primitives/checkbox-field.tsx | packages/ui/src/primitives/checkbox.tsx | import | no | no | lateral | present |
| E3670 | packages/ui/src/primitives/checkbox-field.tsx | packages/ui/src/primitives/field-error.tsx | import | no | no | lateral | present |
| E3671 | packages/ui/src/primitives/choice-group.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E3672 | packages/ui/src/primitives/choice-group.tsx | external:react | import | n/a | no | lateral | present |
| E3673 | packages/ui/src/primitives/choice-group.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E3674 | packages/ui/src/primitives/choice-group.tsx | packages/ui/src/primitives/radio-group.tsx | import | no | no | lateral | present |
| E3675 | packages/ui/src/primitives/field-error.tsx | external:react | type-only import | n/a | no | lateral | present |
| E3676 | packages/ui/src/primitives/field-hint.tsx | external:react | type-only import | n/a | no | lateral | present |
| E3677 | packages/ui/src/primitives/icon-hint.tsx | external:react | import | n/a | no | lateral | present |
| E3678 | packages/ui/src/primitives/icon-hint.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E3679 | packages/ui/src/primitives/icon-hint.tsx | packages/ui/src/primitives/popover.tsx | import | no | no | lateral | present |
| E3680 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/accordion.tsx | re-export | no | no | lateral | present |
| E3681 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/avatar.tsx | re-export | no | no | lateral | present |
| E3682 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/checkbox-field.tsx | re-export | no | no | lateral | present |
| E3683 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/choice-group.tsx | re-export | no | no | lateral | present |
| E3684 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/field-error.tsx | re-export | no | no | lateral | present |
| E3685 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/field-hint.tsx | re-export | no | no | lateral | present |
| E3686 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/icon-hint.tsx | re-export | no | no | lateral | present |
| E3687 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/stepper.tsx | re-export | no | no | lateral | present |
| E3688 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/table.tsx | re-export | no | no | lateral | present |
| E3689 | packages/ui/src/primitives/input.tsx | packages/ui/src/primitives/field-frame.ts | import | no | no | lateral | present |
| E3690 | packages/ui/src/primitives/input.tsx | packages/ui/src/primitives/field-size.ts | import | no | no | lateral | present |
| E3691 | packages/ui/src/primitives/section-eyebrow.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E3692 | packages/ui/src/primitives/select.tsx | packages/ui/src/primitives/field-frame.ts | import | no | no | lateral | present |
| E3693 | packages/ui/src/primitives/stepper.tsx | external:react | type-only import | n/a | no | lateral | present |
| E3694 | packages/ui/src/primitives/stepper.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E3695 | packages/ui/src/primitives/table.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3696 | packages/ui/src/primitives/table.tsx | external:react | import | n/a | no | lateral | present |
| E3697 | packages/ui/src/primitives/table.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E1490 | apps/platform/src/features/assessment-calls/api/coach/coach-assessment-calls-controller.server.ts | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | import | no | no | lateral | present |
| E1491 | apps/platform/src/features/assessment-calls/api/coach/coach-assessment-calls-controller.server.ts | apps/platform/src/features/assessment-calls/contracts/paths.ts | import | no | no | lateral | present |
| E1492 | apps/platform/src/features/assessment-calls/api/coach/coach-assessment-calls-controller.server.ts | packages/domain/src/assessment-call/index.ts | import | yes | no | lateral | present |
| E1493 | apps/platform/src/features/assessment-calls/api/coach/coach-assessment-calls-controller.server.ts | packages/domain/src/shared/index.ts | import | yes | no | lateral | present |
| E1494 | apps/platform/src/features/assessment-calls/contracts/paths.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E1495 | apps/platform/src/features/assessment-calls/server/assessment-calls-composition.server.ts | apps/platform/src/features/assessment-calls/api/coach/coach-assessment-calls-controller.server.ts | import | no | no | lateral | present |
| E1496 | apps/platform/src/features/assessment-calls/ui/coach/assessment-call-listing.ts | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | import | no | no | lateral | present |
| E1567 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls-error-boundary.tsx | apps/platform/src/features/assessment-calls/contracts/assessment-calls.ts | import | no | no | lateral | added (coach follow-ups) |
| E1569 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls-error-boundary.tsx | external:lucide-react | import | n/a | no | lateral | added (coach follow-ups) |
| E1570 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls-error-boundary.tsx | external:react-router | import | n/a | no | lateral | added (coach follow-ups) |
| E1571 | apps/platform/src/features/assessment-calls/ui/coach/assessment-calls-error-boundary.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | added (coach follow-ups) |
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
| E3698 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-panel.tsx | packages/domain/src/measurement/index.ts | import | yes | yes | inward | present |
| E3699 | apps/platform/src/features/client-onboarding/ui/coach/onboarding/onboarding-panel.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E3701 | apps/platform/src/features/client-profile/ui/shared/measurements/measurements-table.tsx | packages/domain/src/measurement/index.ts | import | yes | yes | inward | present |
| E3702 | apps/platform/src/features/client-profile/ui/shared/measurements/measurements-table.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E3703 | apps/platform/src/features/coaching-sales/ui/client/status/program-status-card.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E3704 | apps/platform/src/features/coaching-sales/ui/coach/clients/invitation-state-line.ts | packages/ui/src/lib/index.ts | import | yes | yes | outward | present |
| E3705 | apps/platform/src/features/coaching-sales/ui/public/checkout-complete/confirmation-copy.ts | packages/ui/src/lib/index.ts | import | yes | yes | outward | present |
| E3706 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E3707 | packages/domain/src/client-profile/read-own-measurement-history-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E3708 | packages/domain/src/client-profile/read-own-measurement-history-use-case.ts | packages/domain/src/unit-preference/index.ts | import | no | no | lateral | present |
| E3709 | packages/domain/src/measurement/index.ts | packages/domain/src/measurement/body-metrics.ts | re-export | no | no | lateral | present |
| E3710 | packages/ui/src/lib/calendar-day-format.ts | packages/ui/src/lib/use-display-time-zone.ts | import | no | no | lateral | present |
| E3711 | packages/ui/src/lib/index.ts | packages/ui/src/lib/calendar-day-format.ts | re-export | no | no | lateral | present |
| E3712 | packages/ui/src/lib/index.ts | packages/ui/src/lib/described-by.ts | re-export | no | no | lateral | present |
| E3713 | packages/ui/src/lib/index.ts | packages/ui/src/lib/phone-link.tsx | re-export | no | no | lateral | present |
| E3714 | packages/ui/src/lib/phone-link.tsx | packages/ui/src/lib/constants.ts | import | no | no | lateral | present |
| E3715 | packages/ui/src/primitives/field-layout.tsx | external:react | import | n/a | no | lateral | present |
| E3716 | packages/ui/src/primitives/field-layout.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E3717 | packages/ui/src/primitives/field-layout.tsx | packages/ui/src/lib/described-by.ts | import | no | no | lateral | present |
| E3718 | packages/ui/src/primitives/field-layout.tsx | packages/ui/src/primitives/field-error.tsx | import | no | no | lateral | present |
| E3719 | packages/ui/src/primitives/field-layout.tsx | packages/ui/src/primitives/field-hint.tsx | import | no | no | lateral | present |
| E3720 | packages/ui/src/primitives/field-layout.tsx | packages/ui/src/primitives/label.tsx | import | no | no | lateral | present |
| E3721 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/field-layout.tsx | re-export | no | no | lateral | present |
| E3722 | apps/platform/src/features/client-onboarding/api/client/client-onboarding-controller.server.ts | apps/platform/src/features/client-profile/contracts/progress-photo-parts.ts | import | yes | no | lateral | present |
| E3723 | apps/platform/src/features/client-onboarding/api/client/client-onboarding-controller.server.ts | packages/domain/src/client-profile/index.ts | type-only import | yes | no | lateral | present |
| E3724 | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | apps/platform/src/features/client-profile/contracts/progress-photo-parts.ts | import | yes | no | lateral | present |
| E3725 | apps/platform/src/features/client-onboarding/server/client-onboarding-composition.server.ts | packages/domain/src/client-profile/index.ts | type-only import | yes | yes | inward | present |
| E3729 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-wizard.tsx | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-block.tsx | import | yes | no | lateral | present |
| E3730 | apps/platform/src/features/client-onboarding/ui/client/onboarding/onboarding-wizard.tsx | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-picks.ts | import | yes | no | lateral | present |
| E3731 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-to-coach.ts | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-picks.ts | import | yes | no | lateral | present |
| E3733 | apps/platform/src/features/client-profile/api/client/measurements-controller.server.ts | apps/platform/src/features/client-profile/contracts/progress-photo-parts.ts | import | no | no | lateral | present |
| E3734 | apps/platform/src/features/client-profile/contracts/measurements.ts | apps/platform/src/features/client-profile/contracts/progress-photo-parts.ts | import | no | no | lateral | present |
| E3735 | apps/platform/src/features/client-profile/contracts/progress-photo-parts.ts | external:zod | import | n/a | yes | outward | present |
| E3736 | apps/platform/src/features/client-profile/contracts/progress-photo-parts.ts | packages/domain/src/client-profile/index.ts | import | yes | no | lateral | present |
| E3737 | apps/platform/src/features/client-profile/ui/client/measurements/add-measurements-sheet.tsx | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-block.tsx | import | no | no | lateral | present |
| E3738 | apps/platform/src/features/client-profile/ui/client/measurements/add-measurements-sheet.tsx | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-picks.ts | import | no | no | lateral | present |
| E3745 | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-block.tsx | apps/platform/src/features/client-profile/contracts/measurements.ts | import | no | yes | inward | present |
| E3746 | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-block.tsx | apps/platform/src/features/client-profile/contracts/progress-photo-consent.ts | import | no | yes | inward | present |
| E3747 | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-block.tsx | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-frame.ts | import | no | no | lateral | present |
| E3748 | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-block.tsx | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-picks.ts | import | no | no | lateral | present |
| E3749 | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-block.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3750 | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-block.tsx | external:react | import | n/a | no | lateral | present |
| E3751 | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-block.tsx | packages/domain/src/client-profile/index.ts | import | yes | yes | inward | present |
| E3752 | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-block.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E3753 | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-block.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E3754 | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-picks.ts | apps/platform/src/features/client-profile/contracts/progress-photo-parts.ts | import | no | yes | inward | present |
| E3755 | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-picks.ts | packages/domain/src/client-profile/index.ts | import | yes | yes | inward | present |
| E3759 | apps/platform/src/root.tsx | packages/ui/src/toast/index.ts | import | yes | no | lateral | present |
| E3761 | packages/domain/src/client-profile/attach-progress-photos-use-case.ts | packages/domain/src/client-profile/client-profiles.ts | type-only import | no | no | lateral | present |
| E3762 | packages/domain/src/client-profile/attach-progress-photos-use-case.ts | packages/domain/src/client-profile/measurement-incidents.ts | type-only import | no | no | lateral | present |
| E3763 | packages/domain/src/client-profile/attach-progress-photos-use-case.ts | packages/domain/src/client-profile/progress-photo-intake.ts | import | no | no | lateral | present |
| E3764 | packages/domain/src/client-profile/attach-progress-photos-use-case.ts | packages/domain/src/client-profile/progress-photo-renditions.ts | type-only import | no | no | lateral | present |
| E3765 | packages/domain/src/client-profile/attach-progress-photos-use-case.ts | packages/domain/src/client-profile/progress-photo-store.ts | type-only import | no | no | lateral | present |
| E3766 | packages/domain/src/client-profile/attach-progress-photos-use-case.ts | packages/domain/src/client-profile/progress-photos.ts | type-only import | no | no | lateral | present |
| E3767 | packages/domain/src/client-profile/attach-progress-photos-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E3768 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/attach-progress-photos-use-case.ts | re-export | no | no | lateral | present |
| E3769 | packages/domain/src/client-profile/index.ts | packages/domain/src/client-profile/progress-photo-intake.ts | type-only import | no | no | lateral | present |
| E3770 | packages/domain/src/client-profile/progress-photo-intake.ts | packages/domain/src/client-profile/measurement-incidents.ts | type-only import | no | no | lateral | present |
| E3771 | packages/domain/src/client-profile/progress-photo-intake.ts | packages/domain/src/client-profile/progress-photo-renditions.ts | type-only import | no | no | lateral | present |
| E3772 | packages/domain/src/client-profile/progress-photo-intake.ts | packages/domain/src/client-profile/progress-photo-store.ts | type-only import | no | no | lateral | present |
| E3773 | packages/domain/src/client-profile/progress-photo-intake.ts | packages/domain/src/client-profile/progress-photo.ts | import | no | no | lateral | present |
| E3774 | packages/domain/src/client-profile/progress-photo-intake.ts | packages/domain/src/client-profile/progress-photos.ts | type-only import | no | no | lateral | present |
| E3775 | packages/domain/src/client-profile/record-measurements-use-case.ts | packages/domain/src/client-profile/progress-photo-intake.ts | import | no | no | lateral | present |
| E3776 | packages/domain/src/client-profile/remove-progress-photo-use-case.ts | packages/domain/src/account/index.ts | type-only import | no | no | lateral | present |
| E3777 | packages/ui/src/overlays/index.ts | packages/ui/src/overlays/lightbox.tsx | re-export | no | no | lateral | present |
| E3778 | packages/ui/src/overlays/lightbox.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3779 | packages/ui/src/overlays/lightbox.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E3780 | packages/ui/src/overlays/lightbox.tsx | external:react | import | n/a | no | lateral | present |
| E3781 | packages/ui/src/overlays/lightbox.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E3782 | packages/ui/src/overlays/lightbox.tsx | packages/ui/src/lib/dialog-frame.tsx | import | no | no | lateral | present |
| E3784 | packages/ui/src/overlays/lightbox.tsx | packages/ui/src/primitives/button.tsx | import | no | no | lateral | present |
| E3785 | packages/ui/src/overlays/use-photo-gestures.ts | external:react | import | n/a | no | lateral | present |
| E3786 | apps/platform/src/features/assessment-calls/api/booking/bookings.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E3787 | apps/platform/src/features/assessment-calls/api/booking/bookings.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E3788 | packages/infrastructure/src/http/index.ts | packages/infrastructure/src/http/fetcher-outcome.ts | re-export | no | no | lateral | present |
| E3789 | apps/platform/src/features/assessment-calls/api/settings/settings.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E3790 | apps/platform/src/features/assessment-calls/api/settings/settings.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E3791 | apps/platform/src/features/assessment-calls/ui/coach/settings/settings-page.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E3792 | apps/platform/src/features/assessment-calls/ui/coach/settings/settings-page.tsx | external:react-router | import | n/a | no | lateral | present |
| E3793 | apps/platform/src/features/client-onboarding/api/client/detail-answers.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E3794 | apps/platform/src/features/client-onboarding/api/client/submission.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E3795 | apps/platform/src/features/client-onboarding/api/coach/approvals.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E3796 | apps/platform/src/features/client-onboarding/api/coach/detail-requests.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E3797 | apps/platform/src/features/client-onboarding/api/coach/review-openings.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E3798 | apps/platform/src/features/client-onboarding/ui/client/onboarding/answer-request-card.tsx | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-detail-answers.ts | import | no | no | lateral | present |
| E3799 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-detail-answers.ts | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | import | no | yes | inward | present |
| E3800 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-detail-answers.ts | apps/platform/src/features/client-onboarding/contracts/onboarding-review-copy.ts | import | no | yes | inward | present |
| E3801 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-detail-answers.ts | apps/platform/src/features/client-onboarding/contracts/paths.ts | import | no | yes | inward | present |
| E3802 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-detail-answers.ts | external:react | import | n/a | no | lateral | present |
| E3803 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-detail-answers.ts | external:react-router | import | n/a | no | lateral | present |
| E3804 | apps/platform/src/features/client-onboarding/ui/client/onboarding/draft-autosave-requests.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E3805 | apps/platform/src/features/client-onboarding/ui/client/onboarding/draft-autosave-requests.ts | packages/domain/src/unit-preference/index.ts | type-only import | yes | yes | inward | present |
| E3806 | apps/platform/src/features/client-onboarding/ui/client/onboarding/draft-autosave-requests.ts | apps/platform/src/features/client-onboarding/contracts/onboarding.ts | type-only import | no | yes | inward | present |
| E3807 | apps/platform/src/features/client-onboarding/ui/client/onboarding/draft-autosave-requests.ts | apps/platform/src/features/client-onboarding/contracts/paths.ts | import | no | yes | inward | present |
| E3808 | apps/platform/src/features/client-onboarding/ui/client/onboarding/draft-autosave-requests.ts | apps/platform/src/features/client-profile/contracts/paths.ts | import | yes | yes | inward | present |
| E3809 | apps/platform/src/features/client-onboarding/ui/client/onboarding/draft-sync.ts | apps/platform/src/features/client-onboarding/ui/client/onboarding/draft-autosave-requests.ts | type-only import | no | no | lateral | present |
| E3810 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-draft-sync.ts | apps/platform/src/features/client-onboarding/ui/client/onboarding/draft-autosave-requests.ts | import | no | no | lateral | present |
| E3811 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-to-coach.ts | packages/domain/src/client-profile/index.ts | type-only import | yes | yes | inward | present |
| E3812 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-to-coach.ts | packages/ui/src/toast/index.ts | import | yes | no | lateral | present |
| E3813 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-to-coach.ts | apps/platform/src/features/client-onboarding/contracts/paths.ts | import | no | yes | inward | present |
| E3814 | apps/platform/src/features/client-onboarding/ui/client/onboarding/use-send-to-coach.ts | apps/platform/src/features/client-profile/contracts/measurements.ts | import | yes | yes | inward | present |
| E3815 | apps/platform/src/features/client-profile/api/client/measurements.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E3816 | apps/platform/src/features/client-profile/api/photos/progress-photo.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E3817 | apps/platform/src/features/client-profile/ui/client/measurements/add-measurements-sheet.tsx | apps/platform/src/features/client-profile/ui/client/measurements/use-measurements-recording.ts | import | no | no | lateral | present |
| E3818 | apps/platform/src/features/client-profile/ui/client/measurements/use-measurements-recording.ts | packages/ui/src/toast/index.ts | import | yes | no | lateral | present |
| E3819 | apps/platform/src/features/client-profile/ui/client/measurements/use-measurements-recording.ts | apps/platform/src/features/client-profile/contracts/measurements.ts | import | no | yes | inward | present |
| E3820 | apps/platform/src/features/client-profile/ui/client/measurements/use-measurements-recording.ts | apps/platform/src/features/client-profile/contracts/paths.ts | import | no | yes | inward | present |
| E3821 | apps/platform/src/features/client-profile/ui/client/measurements/use-measurements-recording.ts | apps/platform/src/features/client-profile/ui/shared/photos/progress-photo-picks.ts | import | no | no | lateral | present |
| E3822 | apps/platform/src/features/client-profile/ui/client/measurements/use-measurements-recording.ts | external:react | import | n/a | no | lateral | present |
| E3823 | apps/platform/src/features/client-profile/ui/client/measurements/use-measurements-recording.ts | external:react-router | import | n/a | no | lateral | present |
| E3824 | apps/platform/src/features/client-profile/ui/client/measurements/measurements-section.tsx | apps/platform/src/features/client-profile/ui/client/measurements/use-progress-photo-removal.ts | import | no | no | lateral | present |
| E3825 | apps/platform/src/features/client-profile/ui/client/measurements/use-progress-photo-removal.ts | packages/ui/src/toast/index.ts | import | yes | no | lateral | present |
| E3826 | apps/platform/src/features/client-profile/ui/client/measurements/use-progress-photo-removal.ts | apps/platform/src/features/client-profile/contracts/measurements.ts | import | no | yes | inward | present |
| E3827 | apps/platform/src/features/client-profile/ui/client/measurements/use-progress-photo-removal.ts | apps/platform/src/features/client-profile/contracts/paths.ts | import | no | yes | inward | present |
| E3828 | apps/platform/src/features/client-profile/ui/client/measurements/use-progress-photo-removal.ts | external:react | import | n/a | no | lateral | present |
| E3829 | apps/platform/src/features/client-profile/ui/client/measurements/use-progress-photo-removal.ts | external:react-router | import | n/a | no | lateral | present |
| E3830 | apps/platform/src/features/coaching-sales/api/coach/invitation-resends.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E3831 | apps/platform/src/features/coaching-sales/api/coach/payment-links.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E3832 | apps/platform/src/features/store/api/acquisitions/acquisitions.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E3833 | apps/platform/src/features/store/api/acquisitions/acquisitions.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E3834 | apps/platform/src/features/waitlist/api/waitlist.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E3835 | apps/platform/src/features/waitlist/api/waitlist.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E3836 | apps/platform/src/features/coaching-sales/api/client/payment-method-session.ts | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E3837 | apps/platform/src/features/coaching-sales/api/client/payment-method-session.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E3838 | apps/platform/src/features/coaching-sales/api/client/payment-method-session.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E3839 | apps/platform/src/features/coaching-sales/api/client/program-start.ts | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E3840 | apps/platform/src/features/coaching-sales/api/client/program-start.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E3841 | apps/platform/src/features/coaching-sales/api/client/program-start.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E3842 | apps/platform/src/features/coaching-sales/api/client/subscription-cancellation.ts | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E3843 | apps/platform/src/features/coaching-sales/api/client/subscription-cancellation.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E3844 | apps/platform/src/features/coaching-sales/api/client/subscription-cancellation.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E3845 | apps/platform/src/features/coaching-sales/api/client/subscription-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-account.server.ts | import | yes | no | lateral | present |
| E3846 | apps/platform/src/features/coaching-sales/api/client/subscription-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | import | yes | no | lateral | present |
| E3847 | apps/platform/src/features/coaching-sales/api/client/subscription-controller.server.ts | apps/platform/src/features/coaching-sales/contracts/client-subscription.ts | import | no | no | lateral | present |
| E3848 | apps/platform/src/features/coaching-sales/api/client/subscription-controller.server.ts | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | no | lateral | present |
| E3849 | apps/platform/src/features/coaching-sales/api/client/subscription-controller.server.ts | external:react-router | import | n/a | yes | outward | present |
| E3850 | apps/platform/src/features/coaching-sales/api/client/subscription-controller.server.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E3851 | apps/platform/src/features/coaching-sales/api/client/subscription-controller.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | no | lateral | present |
| E3852 | apps/platform/src/features/coaching-sales/api/payments/coaching-subscription-event-handler.server.ts | packages/domain/src/coaching-subscription/index.ts | import | yes | no | lateral | present |
| E3853 | apps/platform/src/features/coaching-sales/api/payments/coaching-subscription-event-handler.server.ts | packages/infrastructure/src/payments/index.server.ts | import | yes | no | lateral | present |
| E3854 | apps/platform/src/features/coaching-sales/contracts/client-subscription.ts | apps/platform/src/features/coaching-sales/contracts/bundle-cards.ts | import | no | no | lateral | present |
| E3855 | apps/platform/src/features/coaching-sales/contracts/client-subscription.ts | external:zod | import | n/a | yes | outward | present |
| E3856 | apps/platform/src/features/coaching-sales/contracts/client-subscription.ts | packages/domain/src/coaching-subscription/index.ts | import | yes | no | lateral | present |
| E3857 | apps/platform/src/features/coaching-sales/contracts/coach-clients.ts | packages/domain/src/coaching-subscription/index.ts | import | yes | no | lateral | present |
| E3858 | apps/platform/src/features/coaching-sales/contracts/subscription-refunds.ts | packages/domain/src/coaching-subscription/index.ts | import | yes | no | lateral | present |
| E3859 | apps/platform/src/features/coaching-sales/data/clients/client-roster-reader.server.ts | apps/platform/src/features/coaching-sales/data/subscriptions/subscription-row.server.ts | import | no | no | lateral | present |
| E3866 | apps/platform/src/features/coaching-sales/data/subscriptions/subscription-row.server.ts | apps/platform/src/features/coaching-sales/data/schema.server.ts | import | no | yes | outward | present |
| E3867 | apps/platform/src/features/coaching-sales/data/subscriptions/subscription-row.server.ts | packages/db/src/index.ts | type-only import | yes | no | lateral | present |
| E3868 | apps/platform/src/features/coaching-sales/data/subscriptions/subscription-row.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | no | lateral | present |
| E3869 | apps/platform/src/features/coaching-sales/data/subscriptions/subscriptions-repository.server.ts | apps/platform/src/features/coaching-sales/data/schema.server.ts | import | no | yes | outward | present |
| E3870 | apps/platform/src/features/coaching-sales/data/subscriptions/subscriptions-repository.server.ts | apps/platform/src/features/coaching-sales/data/subscriptions/subscription-row.server.ts | import | no | no | lateral | present |
| E3871 | apps/platform/src/features/coaching-sales/data/subscriptions/subscriptions-repository.server.ts | external:drizzle-orm | import | n/a | yes | outward | present |
| E3872 | apps/platform/src/features/coaching-sales/data/subscriptions/subscriptions-repository.server.ts | packages/db/src/index.ts | type-only import | yes | no | lateral | present |
| E3873 | apps/platform/src/features/coaching-sales/data/subscriptions/subscriptions-repository.server.ts | packages/domain/src/coaching-subscription/index.ts | import | yes | no | lateral | present |
| E3874 | apps/platform/src/features/coaching-sales/data/subscriptions/subscriptions-repository.server.ts | packages/domain/src/shared/index.ts | type-only import | yes | no | lateral | present |
| E3875 | apps/platform/src/features/coaching-sales/data/subscriptions/subscriptions-repository.server.ts | packages/infrastructure/src/payments/index.server.ts | import | yes | no | lateral | present |
| E3876 | apps/platform/src/features/coaching-sales/email/create-coaching-sales-notifications.server.ts | apps/platform/src/features/coaching-sales/email/email-refund-notifications.server.ts | import | no | no | lateral | present |
| E3877 | apps/platform/src/features/coaching-sales/email/create-coaching-sales-notifications.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | no | lateral | present |
| E3878 | apps/platform/src/features/coaching-sales/email/email-refund-notifications.server.ts | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | no | lateral | present |
| E3879 | apps/platform/src/features/coaching-sales/email/email-refund-notifications.server.ts | apps/platform/src/features/coaching-sales/email/refund-due-email.server.ts | import | no | no | lateral | present |
| E3880 | apps/platform/src/features/coaching-sales/email/email-refund-notifications.server.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E3881 | apps/platform/src/features/coaching-sales/email/email-refund-notifications.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | no | lateral | present |
| E3882 | apps/platform/src/features/coaching-sales/email/email-refund-notifications.server.ts | packages/domain/src/shared/index.ts | type-only import | yes | no | lateral | present |
| E3883 | apps/platform/src/features/coaching-sales/email/email-refund-notifications.server.ts | packages/infrastructure/src/email/index.server.ts | type-only import | yes | no | lateral | present |
| E3884 | apps/platform/src/features/coaching-sales/email/refund-due-email-template.server.tsx | apps/platform/src/features/coaching-sales/email/coaching-sales-email-styles.server.ts | import | no | no | lateral | present |
| E3885 | apps/platform/src/features/coaching-sales/email/refund-due-email-template.server.tsx | packages/infrastructure/src/email/index.server.ts | import | yes | yes | inward | present |
| E3886 | apps/platform/src/features/coaching-sales/email/refund-due-email.server.ts | apps/platform/src/features/coaching-sales/contracts/subscription-refunds.ts | import | no | no | lateral | present |
| E3887 | apps/platform/src/features/coaching-sales/email/refund-due-email.server.ts | apps/platform/src/features/coaching-sales/email/refund-due-email-template.server.tsx | import | no | yes | outward | present |
| E3888 | apps/platform/src/features/coaching-sales/email/refund-due-email.server.ts | external:react | import | n/a | yes | outward | present |
| E3889 | apps/platform/src/features/coaching-sales/email/refund-due-email.server.ts | external:react-dom/server | import | n/a | yes | outward | present |
| E3890 | apps/platform/src/features/coaching-sales/email/refund-due-email.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | no | lateral | present |
| E3891 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/api/client/subscription-controller.server.ts | import | no | yes | inward | present |
| E3892 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/api/payments/coaching-subscription-event-handler.server.ts | import | no | yes | inward | present |
| E3893 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/data/subscriptions/subscriptions-repository.server.ts | import | no | yes | inward | present |
| E3894 | apps/platform/src/features/coaching-sales/ui/client/ended/ended-page.tsx | apps/platform/src/features/coaching-sales/contracts/client-subscription.ts | type-only import | no | yes | inward | present |
| E3895 | apps/platform/src/features/coaching-sales/ui/client/ended/ended-page.tsx | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E3896 | apps/platform/src/features/coaching-sales/ui/client/ended/ended-page.tsx | apps/platform/src/features/coaching-sales/ui/client/ended/ended-copy.ts | import | no | yes | inward | present |
| E3897 | apps/platform/src/features/coaching-sales/ui/client/ended/ended-page.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3898 | apps/platform/src/features/coaching-sales/ui/client/ended/ended-page.tsx | external:react-router | import | n/a | no | lateral | present |
| E3899 | apps/platform/src/features/coaching-sales/ui/client/ended/ended-page.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E3900 | apps/platform/src/features/coaching-sales/ui/client/settings/cancel-subscription-dialog.tsx | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-copy.ts | import | no | yes | inward | present |
| E3901 | apps/platform/src/features/coaching-sales/ui/client/settings/cancel-subscription-dialog.tsx | apps/platform/src/features/coaching-sales/ui/client/settings/use-cancel-subscription.ts | type-only import | no | no | lateral | present |
| E3902 | apps/platform/src/features/coaching-sales/ui/client/settings/cancel-subscription-dialog.tsx | packages/ui/src/overlays/index.ts | import | yes | no | lateral | present |
| E3903 | apps/platform/src/features/coaching-sales/ui/client/settings/cancel-subscription-dialog.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E3904 | apps/platform/src/features/coaching-sales/ui/client/payment-method/payment-method-form.tsx | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | yes | inward | present |
| E3905 | apps/platform/src/features/coaching-sales/ui/client/payment-method/payment-method-form.tsx | external:react | import | n/a | no | lateral | present |
| E3906 | apps/platform/src/features/coaching-sales/ui/client/payment-method/payment-method-form.tsx | packages/config/src/index.ts | import | yes | yes | inward | present |
| E3907 | apps/platform/src/features/coaching-sales/ui/client/settings/settings-page.tsx | apps/platform/src/features/coaching-sales/contracts/client-subscription.ts | type-only import | no | yes | inward | present |
| E3908 | apps/platform/src/features/coaching-sales/ui/client/settings/settings-page.tsx | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | no | no | lateral | present |
| E3909 | apps/platform/src/features/coaching-sales/ui/client/settings/settings-page.tsx | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-copy.ts | import | no | yes | inward | present |
| E3910 | apps/platform/src/features/coaching-sales/ui/client/settings/settings-page.tsx | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-section.tsx | import | no | no | lateral | present |
| E3911 | apps/platform/src/features/coaching-sales/ui/client/settings/settings-page.tsx | external:react-router | import | n/a | no | lateral | present |
| E3912 | apps/platform/src/features/coaching-sales/ui/client/settings/settings-page.tsx | packages/infrastructure/src/pwa/index.ts | import | yes | no | lateral | present |
| E3913 | apps/platform/src/features/coaching-sales/ui/client/settings/settings-page.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E3914 | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-copy.ts | apps/platform/src/features/coaching-sales/contracts/bundle-cards.ts | import | no | no | lateral | present |
| E3915 | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-copy.ts | apps/platform/src/features/coaching-sales/contracts/client-subscription.ts | type-only import | no | no | lateral | present |
| E3916 | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-section.tsx | apps/platform/src/features/coaching-sales/contracts/client-subscription.ts | import | no | yes | inward | present |
| E3917 | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-section.tsx | apps/platform/src/features/coaching-sales/ui/client/settings/cancel-subscription-dialog.tsx | import | no | no | lateral | present |
| E3919 | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-section.tsx | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-copy.ts | import | no | yes | inward | present |
| E3920 | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-section.tsx | apps/platform/src/features/coaching-sales/ui/client/settings/use-cancel-subscription.ts | import | no | no | lateral | present |
| E3921 | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-section.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E3922 | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-section.tsx | external:react | import | n/a | no | lateral | present |
| E3923 | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-section.tsx | external:react-router | import | n/a | no | lateral | present |
| E3924 | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-section.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E3925 | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-section.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E3926 | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-section.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E3927 | apps/platform/src/features/coaching-sales/ui/client/settings/use-cancel-subscription.ts | apps/platform/src/features/coaching-sales/contracts/client-subscription.ts | import | no | yes | inward | present |
| E3928 | apps/platform/src/features/coaching-sales/ui/client/settings/use-cancel-subscription.ts | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | yes | inward | present |
| E3929 | apps/platform/src/features/coaching-sales/ui/client/settings/use-cancel-subscription.ts | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-copy.ts | import | no | yes | inward | present |
| E3930 | apps/platform/src/features/coaching-sales/ui/client/settings/use-cancel-subscription.ts | external:react | import | n/a | no | lateral | present |
| E3932 | apps/platform/src/features/coaching-sales/ui/client/settings/use-cancel-subscription.ts | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E3933 | apps/platform/src/features/coaching-sales/ui/client/settings/use-cancel-subscription.ts | packages/ui/src/toast/index.ts | import | yes | no | lateral | present |
| E3936 | apps/platform/src/features/coaching-sales/ui/client/status/program-status-card.tsx | apps/platform/src/features/coaching-sales/ui/client/status/start-now-dialog.tsx | import | no | no | lateral | present |
| E3937 | apps/platform/src/features/coaching-sales/ui/client/status/program-status-card.tsx | apps/platform/src/features/coaching-sales/ui/client/status/use-start-now.ts | import | no | no | lateral | present |
| E3938 | apps/platform/src/features/coaching-sales/ui/client/status/start-now-dialog.tsx | apps/platform/src/features/coaching-sales/ui/client/status/program-status-copy.ts | import | no | yes | inward | present |
| E3939 | apps/platform/src/features/coaching-sales/ui/client/status/start-now-dialog.tsx | apps/platform/src/features/coaching-sales/ui/client/status/use-start-now.ts | type-only import | no | no | lateral | present |
| E3940 | apps/platform/src/features/coaching-sales/ui/client/status/start-now-dialog.tsx | apps/platform/src/features/coaching-sales/ui/shared/immediate-start-copy.ts | import | no | yes | inward | present |
| E3941 | apps/platform/src/features/coaching-sales/ui/client/status/start-now-dialog.tsx | packages/ui/src/overlays/index.ts | import | yes | no | lateral | present |
| E3942 | apps/platform/src/features/coaching-sales/ui/client/status/use-start-now.ts | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | no | yes | inward | present |
| E3945 | apps/platform/src/features/coaching-sales/ui/coach/clients/clients-table.tsx | apps/platform/src/features/coaching-sales/ui/coach/clients/needs-refund-badge.tsx | import | no | no | lateral | present |
| E3946 | apps/platform/src/features/coaching-sales/ui/coach/clients/needs-refund-badge.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E3947 | apps/platform/src/features/coaching-sales/ui/coach/clients/subscription-summary.tsx | apps/platform/src/features/coaching-sales/contracts/subscription-refunds.ts | import | no | yes | inward | present |
| E3948 | apps/platform/src/features/coaching-sales/ui/public/select-bundle/start-choice.tsx | apps/platform/src/features/coaching-sales/ui/shared/immediate-start-copy.ts | import | no | yes | inward | present |
| E3949 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | external:react-hook-form | import | n/a | no | lateral | present |
| E3950 | apps/platform/src/features/store/ui/public/cart/cart-drawer.tsx | external:react-router | import | n/a | no | lateral | present |
| E3951 | apps/platform/src/server/logger.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | no | lateral | present |
| E3952 | apps/platform/src/surfaces/client-portal/shell/navigation-links.ts | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | yes | no | lateral | present |
| E3953 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | apps/platform/src/features/coaching-sales/ui/coach/clients/needs-refund-badge.tsx | import | yes | no | lateral | present |
| E3954 | packages/domain/src/client-journey/index.ts | packages/domain/src/client-journey/read-client-portal-standing-use-case.ts | re-export | no | yes | inward | present |
| E3955 | packages/domain/src/client-journey/read-client-portal-standing-use-case.ts | packages/domain/src/client-journey/client-journey.ts | import | no | yes | inward | present |
| E3956 | packages/domain/src/client-journey/read-client-portal-standing-use-case.ts | packages/domain/src/client-journey/client-journeys.ts | type-only import | no | no | lateral | present |
| E3957 | packages/domain/src/client-journey/read-client-portal-standing-use-case.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | no | no | lateral | present |
| E3958 | packages/domain/src/client-journey/read-client-portal-standing-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E3959 | packages/domain/src/client-roster/list-clients-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E3960 | packages/domain/src/client-roster/read-client-record-use-case.ts | packages/domain/src/coaching-subscription/index.ts | import | no | no | lateral | present |
| E3961 | packages/domain/src/client-roster/read-client-record-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E3962 | packages/domain/src/coaching-subscription/cancel-subscription-use-case.ts | packages/domain/src/client/index.ts | type-only import | no | no | lateral | present |
| E3963 | packages/domain/src/coaching-subscription/cancel-subscription-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscription-incidents.ts | type-only import | no | no | lateral | present |
| E3964 | packages/domain/src/coaching-subscription/cancel-subscription-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscription.ts | type-only import | no | yes | inward | present |
| E3965 | packages/domain/src/coaching-subscription/cancel-subscription-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscriptions.ts | type-only import | no | no | lateral | present |
| E3966 | packages/domain/src/coaching-subscription/cancel-subscription-use-case.ts | packages/domain/src/coaching-subscription/payment-subscriptions.ts | type-only import | no | no | lateral | present |
| E3967 | packages/domain/src/coaching-subscription/cancel-subscription-use-case.ts | packages/domain/src/coaching-subscription/refund-notifications.ts | type-only import | no | no | lateral | present |
| E3968 | packages/domain/src/coaching-subscription/cancel-subscription-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E3969 | packages/domain/src/coaching-subscription/coaching-purchases.ts | packages/domain/src/coaching-subscription/purchased-subscription.ts | type-only import | no | yes | inward | present |
| E3970 | packages/domain/src/coaching-subscription/coaching-subscription-incidents.ts | packages/domain/src/coaching-subscription/coaching-subscription.ts | type-only import | no | yes | inward | present |
| E3971 | packages/domain/src/coaching-subscription/coaching-subscription-incidents.ts | packages/domain/src/coaching-subscription/subscription-event.ts | type-only import | no | no | lateral | present |
| E3972 | packages/domain/src/coaching-subscription/coaching-subscription.ts | packages/domain/src/coaching-subscription/refund-due.ts | import | no | no | lateral | present |
| E3973 | packages/domain/src/coaching-subscription/coaching-subscriptions.ts | packages/domain/src/coaching-subscription/coaching-subscription.ts | type-only import | no | yes | inward | present |
| E3974 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/cancel-subscription-use-case.ts | re-export | no | yes | inward | present |
| E3975 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/coaching-subscription-incidents.ts | type-only import | no | yes | inward | present |
| E3976 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/coaching-subscriptions.ts | type-only import | no | yes | inward | present |
| E3977 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/open-payment-method-session-use-case.ts | re-export | no | yes | inward | present |
| E3978 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/payment-subscriptions.ts | type-only import | no | yes | inward | present |
| E3979 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/purchased-subscription.ts | re-export | no | yes | inward | present |
| E3980 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/read-client-subscription-use-case.ts | re-export | no | yes | inward | present |
| E3981 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/reconcile-subscription-event-use-case.ts | re-export | no | yes | inward | present |
| E3982 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/refund-due.ts | re-export | no | yes | inward | present |
| E3983 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/refund-notifications.ts | type-only import | no | yes | inward | present |
| E3984 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/start-program-now-use-case.ts | re-export | no | yes | inward | present |
| E3985 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/subscription-event.ts | type-only import | no | yes | inward | present |
| E3986 | packages/domain/src/coaching-subscription/open-payment-method-session-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscription-incidents.ts | type-only import | no | no | lateral | present |
| E3987 | packages/domain/src/coaching-subscription/open-payment-method-session-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscriptions.ts | type-only import | no | no | lateral | present |
| E3988 | packages/domain/src/coaching-subscription/open-payment-method-session-use-case.ts | packages/domain/src/coaching-subscription/payment-subscriptions.ts | type-only import | no | no | lateral | present |
| E3989 | packages/domain/src/coaching-subscription/open-payment-method-session-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E3990 | packages/domain/src/coaching-subscription/purchased-subscription.ts | packages/domain/src/coaching-bundle/index.ts | import | no | no | lateral | present |
| E3991 | packages/domain/src/coaching-subscription/purchased-subscription.ts | packages/domain/src/coaching-subscription/coaching-subscription.ts | type-only import | no | no | lateral | present |
| E3992 | packages/domain/src/coaching-subscription/read-client-subscription-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscription.ts | import | no | yes | inward | present |
| E3993 | packages/domain/src/coaching-subscription/read-client-subscription-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscriptions.ts | type-only import | no | no | lateral | present |
| E3994 | packages/domain/src/coaching-subscription/read-client-subscription-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E3995 | packages/domain/src/coaching-subscription/reconcile-subscription-event-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscription-incidents.ts | type-only import | no | no | lateral | present |
| E3996 | packages/domain/src/coaching-subscription/reconcile-subscription-event-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscription.ts | type-only import | no | yes | inward | present |
| E3997 | packages/domain/src/coaching-subscription/reconcile-subscription-event-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscriptions.ts | type-only import | no | no | lateral | present |
| E3998 | packages/domain/src/coaching-subscription/reconcile-subscription-event-use-case.ts | packages/domain/src/coaching-subscription/subscription-event.ts | type-only import | no | no | lateral | present |
| E3999 | packages/domain/src/coaching-subscription/record-checkout-completed-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscription-incidents.ts | type-only import | no | no | lateral | present |
| E4000 | packages/domain/src/coaching-subscription/record-checkout-completed-use-case.ts | packages/domain/src/coaching-subscription/payment-subscriptions.ts | type-only import | no | no | lateral | present |
| E4001 | packages/domain/src/coaching-subscription/record-checkout-completed-use-case.ts | packages/domain/src/coaching-subscription/purchased-subscription.ts | import | no | yes | inward | present |
| E4002 | packages/domain/src/coaching-subscription/refund-notifications.ts | packages/domain/src/coaching-subscription/refund-due.ts | type-only import | no | yes | inward | present |
| E4003 | packages/domain/src/coaching-subscription/start-program-now-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscription-incidents.ts | type-only import | no | no | lateral | present |
| E4004 | packages/domain/src/coaching-subscription/start-program-now-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscriptions.ts | type-only import | no | no | lateral | present |
| E4005 | packages/domain/src/coaching-subscription/start-program-now-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E4006 | packages/infrastructure/src/payments/coaching-subscription-change.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | no | lateral | present |
| E4013 | packages/infrastructure/src/payments/index.server.ts | packages/infrastructure/src/payments/coaching-subscription-change.server.ts | re-export | no | no | lateral | present |
| E4015 | packages/infrastructure/src/payments/index.server.ts | packages/infrastructure/src/payments/payment-event-handlers.server.ts | type-only import | no | no | lateral | present |
| E4017 | packages/infrastructure/src/payments/memory/in-memory-payment-subscriptions.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | no | lateral | present |
| E4023 | packages/infrastructure/src/payments/stripe/stripe-payment-subscriptions.server.ts | external:stripe | type-only import | n/a | yes | outward | present |
| E4024 | packages/infrastructure/src/payments/stripe/stripe-payment-subscriptions.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | no | lateral | present |
| E4025 | packages/ui/src/portal/settings-section.tsx | external:react | type-only import | n/a | no | lateral | present |
| E4026 | packages/ui/src/portal/settings-section.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E4027 | packages/ui/src/portal/settings-section.tsx | packages/ui/src/lib/data-attributes.ts | type-only import | no | no | lateral | present |
| E4028 | packages/ui/src/portal/settings-section.tsx | packages/ui/src/lib/typography.ts | import | no | no | lateral | present |
| E4029 | packages/ui/src/portal/settings-section.tsx | packages/ui/src/primitives/card.tsx | import | no | no | lateral | present |
| E4030 | packages/ui/src/portal/settings-section.tsx | packages/ui/src/primitives/label.tsx | import | no | no | lateral | present |
| E4031 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/inline-problem.tsx | re-export | no | no | lateral | present |
| E4032 | packages/ui/src/primitives/inline-problem.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E4033 | packages/ui/src/primitives/inline-problem.tsx | external:react | type-only import | n/a | no | lateral | present |
| E4034 | packages/ui/src/primitives/inline-problem.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E4035 | apps/platform/src/features/client-onboarding/api/client/detail-answers.ts | apps/platform/src/features/coaching-sales/server/guards/require-client-portal-standing.server.ts | import | yes | yes | inward | present |
| E4036 | apps/platform/src/features/client-onboarding/api/client/draft.ts | apps/platform/src/features/coaching-sales/server/guards/require-client-portal-standing.server.ts | import | yes | yes | inward | present |
| E4037 | apps/platform/src/features/client-onboarding/api/client/submission.ts | apps/platform/src/features/coaching-sales/server/guards/require-client-portal-standing.server.ts | import | yes | yes | inward | present |
| E4038 | apps/platform/src/features/client-profile/api/client/measurements.ts | apps/platform/src/features/coaching-sales/server/guards/require-client-portal-standing.server.ts | import | yes | yes | inward | present |
| E4039 | apps/platform/src/features/client-profile/api/client/unit-preference.ts | apps/platform/src/features/coaching-sales/server/guards/require-client-portal-standing.server.ts | import | yes | yes | inward | present |
| E4040 | apps/platform/src/features/coaching-sales/api/client/program-start.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E4041 | apps/platform/src/features/coaching-sales/api/client/subscription-cancellation.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E4042 | apps/platform/src/features/coaching-sales/data/clients/client-roster-reader.server.ts | apps/platform/src/features/coaching-sales/data/subscriptions/current-subscription.server.ts | import | no | no | lateral | present |
| E4043 | apps/platform/src/features/coaching-sales/data/clients/onboarding-clients-reader.server.ts | apps/platform/src/features/coaching-sales/data/subscriptions/current-subscription.server.ts | import | no | no | lateral | present |
| E4044 | apps/platform/src/features/coaching-sales/data/clients/onboarding-clients-reader.server.ts | packages/domain/src/coaching-subscription/index.ts | import | yes | no | lateral | present |
| E4045 | apps/platform/src/features/coaching-sales/data/invitations/invited-clients-repository.server.ts | apps/platform/src/features/coaching-sales/data/subscriptions/current-subscription.server.ts | import | no | no | lateral | present |
| E4046 | apps/platform/src/features/coaching-sales/data/invitations/invited-clients-repository.server.ts | packages/domain/src/coaching-subscription/index.ts | import | yes | no | lateral | present |
| E4047 | apps/platform/src/features/coaching-sales/data/subscriptions/current-subscription.server.ts | apps/platform/src/features/coaching-sales/data/schema.server.ts | import | no | yes | outward | present |
| E4048 | apps/platform/src/features/coaching-sales/data/subscriptions/current-subscription.server.ts | external:drizzle-orm | import | n/a | yes | outward | present |
| E4049 | apps/platform/src/features/coaching-sales/data/subscriptions/current-subscription.server.ts | external:drizzle-orm/pg-core | import | n/a | yes | outward | present |
| E4050 | apps/platform/src/features/coaching-sales/data/subscriptions/current-subscription.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | no | lateral | present |
| E4051 | apps/platform/src/features/coaching-sales/data/subscriptions/subscriptions-repository.server.ts | apps/platform/src/features/coaching-sales/data/subscriptions/current-subscription.server.ts | import | no | no | lateral | present |
| E4052 | apps/platform/src/features/coaching-sales/email/refund-due-email.server.ts | apps/platform/src/features/coaching-sales/contracts/money.ts | import | no | no | lateral | present |
| E4053 | apps/platform/src/features/coaching-sales/ui/client/payment-method/change-payment-method-button.tsx | apps/platform/src/features/coaching-sales/ui/client/payment-method/payment-method-copy.ts | import | no | yes | inward | present |
| E4054 | apps/platform/src/features/coaching-sales/ui/client/payment-method/change-payment-method-button.tsx | apps/platform/src/features/coaching-sales/ui/client/payment-method/payment-method-form.tsx | import | no | no | lateral | present |
| E4055 | apps/platform/src/features/coaching-sales/ui/client/payment-method/change-payment-method-button.tsx | external:react | type-only import | n/a | no | lateral | present |
| E4056 | apps/platform/src/features/coaching-sales/ui/client/payment-method/change-payment-method-button.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E4057 | apps/platform/src/features/coaching-sales/ui/client/payment-method/payment-method-problems.tsx | apps/platform/src/features/coaching-sales/ui/client/payment-method/payment-method-copy.ts | import | no | yes | inward | present |
| E4058 | apps/platform/src/features/coaching-sales/ui/client/payment-method/payment-method-problems.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E4059 | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-section.tsx | apps/platform/src/features/coaching-sales/ui/client/payment-method/change-payment-method-button.tsx | import | no | no | lateral | present |
| E4060 | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-section.tsx | apps/platform/src/features/coaching-sales/ui/client/payment-method/payment-method-problems.tsx | import | no | no | lateral | present |
| E4061 | apps/platform/src/features/coaching-sales/ui/client/settings/use-cancel-subscription.ts | apps/platform/src/features/coaching-sales/ui/shared/use-confirmed-fetcher-dialog.ts | import | no | no | lateral | present |
| E4067 | apps/platform/src/features/coaching-sales/ui/client/status/program-status-card.tsx | apps/platform/src/features/coaching-sales/ui/client/status/start-now-offer.tsx | import | no | no | lateral | present |
| E4068 | apps/platform/src/features/coaching-sales/ui/client/status/start-now-dialog.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E4069 | apps/platform/src/features/coaching-sales/ui/client/status/start-now-offer.tsx | apps/platform/src/features/coaching-sales/ui/client/status/program-status-copy.ts | import | no | yes | inward | present |
| E4070 | apps/platform/src/features/coaching-sales/ui/client/status/start-now-offer.tsx | apps/platform/src/features/coaching-sales/ui/client/status/use-start-now.ts | type-only import | no | no | lateral | present |
| E4071 | apps/platform/src/features/coaching-sales/ui/client/status/start-now-offer.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E4072 | apps/platform/src/features/coaching-sales/ui/client/status/use-start-now.ts | apps/platform/src/features/coaching-sales/contracts/client-subscription.ts | import | no | yes | inward | present |
| E4073 | apps/platform/src/features/coaching-sales/ui/client/status/use-start-now.ts | apps/platform/src/features/coaching-sales/ui/client/status/program-status-copy.ts | import | no | yes | inward | present |
| E4074 | apps/platform/src/features/coaching-sales/ui/client/status/use-start-now.ts | apps/platform/src/features/coaching-sales/ui/shared/use-confirmed-fetcher-dialog.ts | import | no | no | lateral | present |
| E4075 | apps/platform/src/features/coaching-sales/ui/coach/clients/subscription-summary.tsx | apps/platform/src/features/coaching-sales/contracts/money.ts | import | no | yes | inward | present |
| E4076 | apps/platform/src/features/coaching-sales/ui/coach/use-confirmed-json-action.ts | apps/platform/src/features/coaching-sales/ui/shared/use-confirmed-fetcher-dialog.ts | import | no | no | lateral | present |
| E4077 | apps/platform/src/features/coaching-sales/ui/shared/use-confirmed-fetcher-dialog.ts | external:react | import | n/a | no | lateral | present |
| E4078 | apps/platform/src/features/coaching-sales/ui/shared/use-confirmed-fetcher-dialog.ts | external:react-router | import | n/a | no | lateral | present |
| E4079 | packages/domain/src/coaching-subscription/start-program-now-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscription.ts | type-only import | no | yes | inward | present |
| E4081 | packages/domain/src/client-journey/read-program-status-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E4083 | packages/infrastructure/src/payments/memory/in-memory-payment-events.server.ts | packages/infrastructure/src/payments/payment-provider-vocabulary.server.ts | type-only import | no | no | lateral | present |
| E4084 | packages/infrastructure/src/payments/stripe/stripe-payment-events.server.ts | packages/infrastructure/src/payments/stripe/stripe-vocabulary.server.ts | import | no | no | lateral | present |
| E4085 | packages/infrastructure/src/payments/stripe/stripe-vocabulary.server.ts | packages/infrastructure/src/payments/payment-provider-vocabulary.server.ts | type-only import | no | no | lateral | present |
| E4086 | apps/platform/src/features/coaching-sales/api/payments/coaching-payment-card-handler.server.ts | packages/domain/src/coaching-subscription/index.ts | import | yes | no | lateral | present |
| E4087 | apps/platform/src/features/coaching-sales/api/payments/coaching-payment-card-handler.server.ts | packages/infrastructure/src/payments/index.server.ts | type-only import | yes | no | lateral | present |
| E4088 | apps/platform/src/features/coaching-sales/data/payment-cards/payment-cards-repository.server.ts | apps/platform/src/features/coaching-sales/data/schema.server.ts | import | no | yes | outward | present |
| E4089 | apps/platform/src/features/coaching-sales/data/payment-cards/payment-cards-repository.server.ts | external:drizzle-orm | import | n/a | yes | outward | present |
| E4090 | apps/platform/src/features/coaching-sales/data/payment-cards/payment-cards-repository.server.ts | packages/db/src/index.ts | type-only import | yes | no | lateral | present |
| E4091 | apps/platform/src/features/coaching-sales/data/payment-cards/payment-cards-repository.server.ts | packages/domain/src/coaching-subscription/index.ts | import | yes | no | lateral | present |
| E4092 | apps/platform/src/features/coaching-sales/data/payment-cards/payment-cards-repository.server.ts | packages/domain/src/shared/index.ts | type-only import | yes | no | lateral | present |
| E4093 | apps/platform/src/features/coaching-sales/data/payment-cards/payment-cards-repository.server.ts | packages/infrastructure/src/payments/index.server.ts | import | yes | no | lateral | present |
| E4094 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/api/payments/coaching-payment-card-handler.server.ts | import | no | yes | inward | present |
| E4095 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | apps/platform/src/features/coaching-sales/data/payment-cards/payment-cards-repository.server.ts | import | no | yes | inward | present |
| E4096 | apps/platform/src/features/coaching-sales/ui/client/payment-method/payment-card-reading.tsx | apps/platform/src/features/coaching-sales/contracts/client-subscription.ts | type-only import | no | yes | inward | present |
| E4097 | apps/platform/src/features/coaching-sales/ui/client/payment-method/payment-card-reading.tsx | apps/platform/src/features/coaching-sales/ui/client/payment-method/payment-method-copy.ts | import | no | yes | inward | present |
| E4098 | apps/platform/src/features/coaching-sales/ui/client/payment-method/payment-card-reading.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E4099 | apps/platform/src/features/coaching-sales/ui/client/payment-method/payment-card-reading.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E4100 | apps/platform/src/features/coaching-sales/ui/client/payment-method/payment-method-copy.ts | apps/platform/src/features/coaching-sales/contracts/client-subscription.ts | type-only import | no | no | lateral | present |
| E4101 | apps/platform/src/features/coaching-sales/ui/client/settings/subscription-section.tsx | apps/platform/src/features/coaching-sales/ui/client/payment-method/payment-card-reading.tsx | import | no | no | lateral | present |
| E4102 | packages/domain/src/coaching-subscription/coaching-subscription-incidents.ts | packages/domain/src/coaching-subscription/payment-card.ts | type-only import | no | yes | inward | present |
| E4103 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/mirror-payment-card-use-case.ts | re-export | no | yes | inward | present |
| E4104 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/payment-card.ts | re-export | no | yes | inward | present |
| E4105 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/payment-cards.ts | type-only import | no | yes | inward | present |
| E4106 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/payment-customer-cards.ts | type-only import | no | yes | inward | present |
| E4107 | packages/domain/src/coaching-subscription/index.ts | packages/domain/src/coaching-subscription/refresh-payment-card-use-case.ts | re-export | no | yes | inward | present |
| E4108 | packages/domain/src/coaching-subscription/mirror-payment-card-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscription-incidents.ts | type-only import | no | no | lateral | present |
| E4109 | packages/domain/src/coaching-subscription/mirror-payment-card-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscriptions.ts | type-only import | no | no | lateral | present |
| E4110 | packages/domain/src/coaching-subscription/mirror-payment-card-use-case.ts | packages/domain/src/coaching-subscription/payment-card.ts | import | no | yes | inward | present |
| E4111 | packages/domain/src/coaching-subscription/mirror-payment-card-use-case.ts | packages/domain/src/coaching-subscription/payment-cards.ts | type-only import | no | no | lateral | present |
| E4112 | packages/domain/src/coaching-subscription/payment-cards.ts | packages/domain/src/coaching-subscription/payment-card.ts | type-only import | no | yes | inward | present |
| E4113 | packages/domain/src/coaching-subscription/payment-customer-cards.ts | packages/domain/src/coaching-subscription/payment-card.ts | type-only import | no | yes | inward | present |
| E4114 | packages/domain/src/coaching-subscription/read-client-subscription-use-case.ts | packages/domain/src/coaching-subscription/payment-card.ts | type-only import | no | yes | inward | present |
| E4115 | packages/domain/src/coaching-subscription/read-client-subscription-use-case.ts | packages/domain/src/coaching-subscription/payment-cards.ts | type-only import | no | no | lateral | present |
| E4116 | packages/domain/src/coaching-subscription/refresh-payment-card-use-case.ts | packages/domain/src/coaching-subscription/coaching-subscription-incidents.ts | type-only import | no | no | lateral | present |
| E4117 | packages/domain/src/coaching-subscription/refresh-payment-card-use-case.ts | packages/domain/src/coaching-subscription/payment-cards.ts | type-only import | no | no | lateral | present |
| E4118 | packages/domain/src/coaching-subscription/refresh-payment-card-use-case.ts | packages/domain/src/coaching-subscription/payment-customer-cards.ts | type-only import | no | no | lateral | present |
| E4126 | packages/infrastructure/src/payments/memory/in-memory-payment-customer-cards.server.ts | packages/domain/src/coaching-subscription/index.ts | import | yes | no | lateral | present |
| E4131 | packages/infrastructure/src/payments/stripe/stripe-payment-customer-cards.server.ts | external:stripe | type-only import | n/a | yes | outward | present |
| E4132 | packages/infrastructure/src/payments/stripe/stripe-payment-customer-cards.server.ts | external:zod | import | n/a | yes | outward | present |
| E4133 | packages/infrastructure/src/payments/stripe/stripe-payment-customer-cards.server.ts | packages/domain/src/coaching-subscription/index.ts | import | yes | no | lateral | present |
| E4135 | packages/infrastructure/src/payments/stripe/stripe-payment-customer-cards.server.ts | packages/infrastructure/src/payments/payment-provider-vocabulary.server.ts | import | no | no | lateral | present |
| E4136 | packages/infrastructure/src/payments/stripe/stripe-payment-customer-cards.server.ts | packages/infrastructure/src/payments/stripe/stripe-vocabulary.server.ts | import | no | no | lateral | present |
| E4137 | packages/ui/src/primitives/card-brand-mark.tsx | external:react | type-only import | n/a | no | lateral | present |
| E4138 | packages/ui/src/primitives/card-brand-mark.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E4139 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/card-brand-mark.tsx | re-export | no | no | lateral | present |
| E4142 | packages/infrastructure/src/payments/payment-provider-vocabulary.server.ts | external:zod | import | n/a | yes | outward | present |
| E4144 | packages/infrastructure/src/payments/coaching-subscription-change.server.ts | packages/infrastructure/src/payments/payment-event-types.server.ts | type-only import | no | no | lateral | present |
| E4145 | packages/infrastructure/src/payments/create-payments.server.ts | packages/config/src/index.ts | type-only import | yes | no | lateral | present |
| E4146 | packages/infrastructure/src/payments/create-payments.server.ts | packages/domain/src/coaching-subscription/index.ts | type-only import | yes | yes | inward | present |
| E4147 | packages/infrastructure/src/payments/create-payments.server.ts | packages/infrastructure/src/payments/memory/in-memory-payment-checkout.server.ts | import | no | no | lateral | present |
| E4148 | packages/infrastructure/src/payments/create-payments.server.ts | packages/infrastructure/src/payments/memory/in-memory-payment-customer-cards.server.ts | import | no | no | lateral | present |
| E4149 | packages/infrastructure/src/payments/create-payments.server.ts | packages/infrastructure/src/payments/memory/in-memory-payment-events.server.ts | import | no | no | lateral | present |
| E4150 | packages/infrastructure/src/payments/create-payments.server.ts | packages/infrastructure/src/payments/memory/in-memory-payment-subscriptions.server.ts | import | no | no | lateral | present |
| E4151 | packages/infrastructure/src/payments/create-payments.server.ts | packages/infrastructure/src/payments/payment-events.server.ts | type-only import | no | no | lateral | present |
| E4152 | packages/infrastructure/src/payments/create-payments.server.ts | packages/infrastructure/src/payments/stripe/stripe-client.server.ts | import | no | no | lateral | present |
| E4153 | packages/infrastructure/src/payments/create-payments.server.ts | packages/infrastructure/src/payments/stripe/stripe-payment-checkout.server.ts | import | no | no | lateral | present |
| E4154 | packages/infrastructure/src/payments/create-payments.server.ts | packages/infrastructure/src/payments/stripe/stripe-payment-customer-cards.server.ts | import | no | no | lateral | present |
| E4155 | packages/infrastructure/src/payments/create-payments.server.ts | packages/infrastructure/src/payments/stripe/stripe-payment-events.server.ts | import | no | no | lateral | present |
| E4156 | packages/infrastructure/src/payments/create-payments.server.ts | packages/infrastructure/src/payments/stripe/stripe-payment-subscriptions.server.ts | import | no | no | lateral | present |
| E4157 | packages/infrastructure/src/payments/create-payments.server.ts | packages/infrastructure/src/payments/stripe/stripe-vocabulary.server.ts | import | no | no | lateral | present |
| E4158 | packages/infrastructure/src/payments/index.server.ts | packages/infrastructure/src/payments/create-payments.server.ts | re-export | no | no | lateral | present |
| E4159 | packages/infrastructure/src/payments/index.server.ts | packages/infrastructure/src/payments/payment-event-types.server.ts | type-only import | no | no | lateral | present |
| E4160 | packages/infrastructure/src/payments/memory/in-memory-payment-events.server.ts | packages/infrastructure/src/payments/payment-event-reader.server.ts | import | no | no | lateral | present |
| E4161 | packages/infrastructure/src/payments/memory/in-memory-payment-events.server.ts | packages/infrastructure/src/payments/payment-event-types.server.ts | type-only import | no | no | lateral | present |
| E4162 | packages/infrastructure/src/payments/payment-completion-handler.server.ts | packages/infrastructure/src/payments/payment-event-types.server.ts | type-only import | no | no | lateral | present |
| E4163 | packages/infrastructure/src/payments/payment-event-handlers.server.ts | packages/infrastructure/src/payments/payment-event-types.server.ts | type-only import | no | no | lateral | present |
| E4164 | packages/infrastructure/src/payments/payment-event-reader.server.ts | external:zod | import | n/a | yes | outward | present |
| E4165 | packages/infrastructure/src/payments/payment-event-reader.server.ts | packages/infrastructure/src/payments/payment-completion-handler.server.ts | import | no | no | lateral | present |
| E4166 | packages/infrastructure/src/payments/payment-event-reader.server.ts | packages/infrastructure/src/payments/payment-event-types.server.ts | type-only import | no | no | lateral | present |
| E4167 | packages/infrastructure/src/payments/payment-event-reader.server.ts | packages/infrastructure/src/payments/payment-provider-vocabulary.server.ts | import | no | no | lateral | present |
| E4168 | packages/infrastructure/src/payments/payment-event-types.server.ts | packages/infrastructure/src/payments/payment-provider-vocabulary.server.ts | type-only import | no | no | lateral | present |
| E4169 | packages/infrastructure/src/payments/payment-events.server.ts | packages/infrastructure/src/payments/payment-event-types.server.ts | type-only import | no | no | lateral | present |
| E4170 | packages/infrastructure/src/payments/stripe/stripe-payment-checkout.server.ts | packages/domain/src/coaching-bundle/index.ts | import | yes | yes | inward | present |
| E4171 | packages/infrastructure/src/payments/stripe/stripe-payment-checkout.server.ts | packages/infrastructure/src/payments/payment-completion-handler.server.ts | import | no | no | lateral | present |
| E4172 | packages/infrastructure/src/payments/stripe/stripe-payment-checkout.server.ts | packages/infrastructure/src/payments/payment-event-reader.server.ts | import | no | no | lateral | present |
| E4173 | packages/infrastructure/src/payments/stripe/stripe-payment-checkout.server.ts | packages/infrastructure/src/payments/payment-event-types.server.ts | type-only import | no | no | lateral | present |
| E4174 | packages/infrastructure/src/payments/stripe/stripe-payment-customer-cards.server.ts | packages/infrastructure/src/payments/payment-event-reader.server.ts | import | no | no | lateral | present |
| E4175 | packages/infrastructure/src/payments/stripe/stripe-payment-events.server.ts | packages/infrastructure/src/payments/payment-event-reader.server.ts | import | no | no | lateral | present |
| E4176 | packages/infrastructure/src/payments/stripe/stripe-payment-events.server.ts | packages/infrastructure/src/payments/payment-event-types.server.ts | type-only import | no | no | lateral | present |
| E4177 | apps/platform/src/features/client-profile/api/photos/progress-photo-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E4178 | apps/platform/src/features/client-resources/api/coach/coach-resources-controller.server.ts | packages/domain/src/client-resources/index.ts | type-only import | yes | yes | inward | present |
| E4179 | apps/platform/src/features/client-resources/api/coach/coach-resources-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | import | yes | yes | outward | present |
| E4180 | apps/platform/src/features/client-resources/api/coach/coach-resources-controller.server.ts | apps/platform/src/features/client-resources/contracts/client-resources.ts | import | no | no | lateral | present |
| E4181 | apps/platform/src/features/client-resources/api/coach/coach-resources-controller.server.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E4182 | apps/platform/src/features/client-resources/api/coach/coach-resources-controller.server.ts | external:zod | import | n/a | no | lateral | present |
| E4183 | apps/platform/src/features/client-resources/api/resources/client-resources-controller.server.ts | packages/domain/src/client-resources/index.ts | import | yes | yes | inward | present |
| E4184 | apps/platform/src/features/client-resources/api/resources/client-resources-controller.server.ts | packages/infrastructure/src/http/index.server.ts | import | yes | no | lateral | present |
| E4185 | apps/platform/src/features/client-resources/api/resources/client-resources-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-account.server.ts | import | yes | yes | outward | present |
| E4186 | apps/platform/src/features/client-resources/api/resources/client-resources-controller.server.ts | apps/platform/src/features/client-resources/contracts/client-resources.ts | import | no | no | lateral | present |
| E4187 | apps/platform/src/features/client-resources/api/resources/client-resources-controller.server.ts | apps/platform/src/features/client-resources/contracts/resource-upload-parts.ts | import | no | no | lateral | present |
| E4188 | apps/platform/src/features/client-resources/api/resources/client-resources-controller.server.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E4189 | apps/platform/src/features/client-resources/api/resources/client-resources-controller.server.ts | external:zod | import | n/a | no | lateral | present |
| E4190 | apps/platform/src/features/client-resources/api/resources/client-resources.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E4191 | apps/platform/src/features/client-resources/api/resources/client-resources.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E4192 | apps/platform/src/features/client-resources/api/resources/client-resources.ts | apps/platform/src/features/client-resources/contracts/resource-upload-progress.ts | import | no | yes | inward | present |
| E4193 | apps/platform/src/features/client-resources/api/resources/client-resources.ts | apps/platform/src/features/client-resources/server/guards/client-resources-context.server.ts | import | no | no | lateral | present |
| E4194 | apps/platform/src/features/client-resources/api/resources/client-resources.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E4195 | apps/platform/src/features/client-resources/api/resources/resource-download.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E4196 | apps/platform/src/features/client-resources/api/resources/resource-download.ts | apps/platform/src/features/client-resources/server/guards/client-resources-context.server.ts | import | no | no | lateral | present |
| E4197 | apps/platform/src/features/client-resources/api/resources/resource-download.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E4198 | apps/platform/src/features/client-resources/api/resources/resource-page.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E4199 | apps/platform/src/features/client-resources/api/resources/resource-page.ts | apps/platform/src/features/client-resources/server/guards/client-resources-context.server.ts | import | no | no | lateral | present |
| E4200 | apps/platform/src/features/client-resources/api/resources/resource-page.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E4201 | apps/platform/src/features/client-resources/api/resources/resource-thumbnail.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E4202 | apps/platform/src/features/client-resources/api/resources/resource-thumbnail.ts | apps/platform/src/features/client-resources/server/guards/client-resources-context.server.ts | import | no | no | lateral | present |
| E4203 | apps/platform/src/features/client-resources/api/resources/resource-thumbnail.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E4204 | apps/platform/src/features/client-resources/contracts/client-resources.ts | packages/domain/src/client-resources/index.ts | import | yes | yes | inward | present |
| E4205 | apps/platform/src/features/client-resources/contracts/client-resources.ts | external:zod | import | n/a | no | lateral | present |
| E4206 | apps/platform/src/features/client-resources/contracts/paths.ts | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | yes | no | lateral | present |
| E4207 | apps/platform/src/features/client-resources/contracts/resource-upload-progress.ts | packages/infrastructure/src/http/index.ts | import | yes | no | lateral | present |
| E4208 | apps/platform/src/features/client-resources/data/resources/client-resources-repository.server.ts | packages/db/src/index.ts | type-only import | yes | no | lateral | present |
| E4209 | apps/platform/src/features/client-resources/data/resources/client-resources-repository.server.ts | packages/domain/src/client-resources/index.ts | import | yes | yes | inward | present |
| E4210 | apps/platform/src/features/client-resources/data/resources/client-resources-repository.server.ts | apps/platform/src/features/client-resources/data/schema.server.ts | import | no | no | lateral | present |
| E4211 | apps/platform/src/features/client-resources/data/resources/client-resources-repository.server.ts | external:drizzle-orm | import | n/a | no | lateral | present |
| E4212 | apps/platform/src/features/client-resources/data/resources/random-client-resource-ids.server.ts | packages/domain/src/client-resources/index.ts | type-only import | yes | yes | inward | present |
| E4213 | apps/platform/src/features/client-resources/data/resources/random-client-resource-ids.server.ts | external:crypto | import | n/a | no | lateral | present |
| E4214 | apps/platform/src/features/client-resources/data/schema.server.ts | packages/db/src/index.ts | import | yes | no | lateral | present |
| E4215 | apps/platform/src/features/client-resources/data/schema.server.ts | packages/domain/src/client-resources/index.ts | import | yes | yes | inward | present |
| E4216 | apps/platform/src/features/client-resources/data/schema.server.ts | apps/platform/src/features/coaching-sales/data/schema.server.ts | import | yes | no | lateral | present |
| E4217 | apps/platform/src/features/client-resources/data/schema.server.ts | external:drizzle-orm | import | n/a | no | lateral | present |
| E4218 | apps/platform/src/features/client-resources/data/schema.server.ts | external:drizzle-orm/pg-core | import | n/a | no | lateral | present |
| E4219 | apps/platform/src/features/client-resources/routes.ts | apps/platform/src/features/client-resources/contracts/paths.ts | import | no | yes | inward | present |
| E4220 | apps/platform/src/features/client-resources/routes.ts | external:@react-router/dev/routes | import | n/a | no | lateral | present |
| E4221 | apps/platform/src/features/client-resources/server/client-resources-composition.server.ts | packages/db/src/index.ts | type-only import | yes | no | lateral | present |
| E4222 | apps/platform/src/features/client-resources/server/client-resources-composition.server.ts | packages/domain/src/client-resources/index.ts | import | yes | yes | inward | present |
| E4223 | apps/platform/src/features/client-resources/server/client-resources-composition.server.ts | packages/domain/src/shared/index.ts | type-only import | yes | yes | inward | present |
| E4224 | apps/platform/src/features/client-resources/server/client-resources-composition.server.ts | apps/platform/src/features/client-resources/api/coach/coach-resources-controller.server.ts | import | no | no | lateral | present |
| E4225 | apps/platform/src/features/client-resources/server/client-resources-composition.server.ts | apps/platform/src/features/client-resources/api/resources/client-resources-controller.server.ts | import | no | no | lateral | present |
| E4226 | apps/platform/src/features/client-resources/server/client-resources-composition.server.ts | apps/platform/src/features/client-resources/data/resources/client-resources-repository.server.ts | import | no | no | lateral | present |
| E4227 | apps/platform/src/features/client-resources/server/client-resources-composition.server.ts | apps/platform/src/features/client-resources/data/resources/random-client-resource-ids.server.ts | import | no | no | lateral | present |
| E4228 | apps/platform/src/features/client-resources/server/guards/client-resources-context.server.ts | apps/platform/src/features/client-resources/server/client-resources-composition.server.ts | type-only import | no | yes | inward | present |
| E4229 | apps/platform/src/features/client-resources/server/guards/client-resources-context.server.ts | external:react-router | import | n/a | no | lateral | present |
| E4230 | apps/platform/src/features/client-resources/ui/coach/resources/resource-form-dialog.tsx | apps/platform/src/features/client-resources/ui/coach/resources/resource-upload-check.ts | import | no | no | lateral | present |
| E4231 | apps/platform/src/features/client-resources/ui/coach/resources/resource-form-dialog.tsx | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-upload.ts | import | no | no | lateral | present |
| E4232 | apps/platform/src/features/client-resources/ui/coach/resources/resource-form-dialog.tsx | packages/domain/src/client-resources/index.ts | import | yes | yes | inward | present |
| E4233 | apps/platform/src/features/client-resources/ui/coach/resources/resource-form-dialog.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E4234 | apps/platform/src/features/client-resources/ui/coach/resources/resource-form-dialog.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E4235 | apps/platform/src/features/client-resources/ui/coach/resources/resource-form-dialog.tsx | packages/ui/src/toast/index.ts | import | yes | no | lateral | present |
| E4236 | apps/platform/src/features/client-resources/ui/coach/resources/resource-form-dialog.tsx | apps/platform/src/features/client-resources/ui/shared/resources/resource-copy.ts | import | no | no | lateral | present |
| E4237 | apps/platform/src/features/client-resources/ui/coach/resources/resource-form-dialog.tsx | apps/platform/src/features/client-resources/ui/shared/resources/resource-file-cover.tsx | import | no | no | lateral | present |
| E4238 | apps/platform/src/features/client-resources/ui/coach/resources/resource-form-dialog.tsx | external:react | import | n/a | no | lateral | present |
| E4239 | apps/platform/src/features/client-resources/ui/coach/resources/resource-form-dialog.tsx | external:react-hook-form | import | n/a | no | lateral | present |
| E4240 | apps/platform/src/features/client-resources/ui/coach/resources/coach-resource-library.tsx | apps/platform/src/features/client-resources/ui/coach/resources/resource-form-dialog.tsx | import | no | no | lateral | present |
| E4241 | apps/platform/src/features/client-resources/ui/coach/resources/coach-resource-library.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E4242 | apps/platform/src/features/client-resources/ui/coach/resources/coach-resource-library.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E4243 | apps/platform/src/features/client-resources/ui/coach/resources/coach-resource-library.tsx | apps/platform/src/features/client-resources/contracts/client-resources.ts | type-only import | no | yes | inward | present |
| E4244 | apps/platform/src/features/client-resources/ui/coach/resources/coach-resource-library.tsx | apps/platform/src/features/client-resources/ui/shared/resources/resource-copy.ts | import | no | no | lateral | present |
| E4247 | apps/platform/src/features/client-resources/ui/coach/resources/coach-resource-library.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E4248 | apps/platform/src/features/client-resources/ui/coach/resources/coach-resource-library.tsx | external:react | import | n/a | no | lateral | present |
| E4249 | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-upload.ts | packages/domain/src/client-resources/index.ts | type-only import | yes | yes | inward | present |
| E4250 | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-upload.ts | apps/platform/src/features/client-resources/contracts/client-resources.ts | import | no | yes | inward | present |
| E4251 | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-upload.ts | apps/platform/src/features/client-resources/contracts/paths.ts | import | no | yes | inward | present |
| E4252 | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-upload.ts | apps/platform/src/features/client-resources/contracts/resource-upload-parts.ts | import | no | yes | inward | present |
| E4253 | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-upload.ts | apps/platform/src/features/client-resources/contracts/resource-upload-progress.ts | import | no | yes | inward | present |
| E4254 | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-upload.ts | external:react | import | n/a | no | lateral | present |
| E4255 | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-upload.ts | external:react-router | import | n/a | no | lateral | present |
| E4256 | apps/platform/src/features/client-resources/ui/shared/resources/resource-card.tsx | apps/platform/src/features/client-resources/ui/shared/resources/resource-copy.ts | import | no | no | lateral | present |
| E4257 | apps/platform/src/features/client-resources/ui/shared/resources/resource-card.tsx | apps/platform/src/features/client-resources/ui/shared/resources/resource-file-cover.tsx | import | no | no | lateral | present |
| E4258 | apps/platform/src/features/client-resources/ui/shared/resources/resource-card.tsx | apps/platform/src/features/client-resources/ui/shared/resources/resource-urls.ts | import | no | no | lateral | present |
| E4259 | apps/platform/src/features/client-resources/ui/shared/resources/resource-card.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E4260 | apps/platform/src/features/client-resources/ui/shared/resources/resource-card.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E4261 | apps/platform/src/features/client-resources/ui/shared/resources/resource-card.tsx | apps/platform/src/features/client-resources/contracts/client-resources.ts | type-only import | no | yes | inward | present |
| E4262 | apps/platform/src/features/client-resources/ui/shared/resources/resource-card.tsx | external:react | import | n/a | no | lateral | present |
| E4263 | apps/platform/src/features/client-resources/ui/shared/resources/resource-copy.ts | packages/domain/src/client-resources/index.ts | import | yes | yes | inward | present |
| E4264 | apps/platform/src/features/client-resources/ui/shared/resources/resource-file-cover.tsx | packages/domain/src/client-resources/index.ts | type-only import | yes | yes | inward | present |
| E4265 | apps/platform/src/features/client-resources/ui/shared/resources/resource-file-cover.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E4266 | apps/platform/src/features/client-resources/ui/shared/resources/resource-file-cover.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E4267 | apps/platform/src/features/client-resources/ui/shared/resources/resource-grid.tsx | apps/platform/src/features/client-resources/ui/shared/resources/resource-card.tsx | import | no | no | lateral | present |
| E4268 | apps/platform/src/features/client-resources/ui/shared/resources/resource-grid.tsx | apps/platform/src/features/client-resources/contracts/client-resources.ts | type-only import | no | yes | inward | present |
| E4269 | apps/platform/src/features/client-resources/ui/shared/resources/resource-urls.ts | packages/config/src/index.ts | import | yes | no | lateral | present |
| E4270 | apps/platform/src/features/client-resources/ui/shared/resources/resource-urls.ts | apps/platform/src/features/client-resources/contracts/paths.ts | import | no | yes | inward | present |
| E4271 | apps/platform/src/features/client-resources/ui/shared/resources/resource-viewer.tsx | apps/platform/src/features/client-resources/ui/shared/resources/resource-copy.ts | import | no | no | lateral | present |
| E4272 | apps/platform/src/features/client-resources/ui/shared/resources/resource-viewer.tsx | apps/platform/src/features/client-resources/ui/shared/resources/resource-file-cover.tsx | import | no | no | lateral | present |
| E4273 | apps/platform/src/features/client-resources/ui/shared/resources/resource-viewer.tsx | apps/platform/src/features/client-resources/ui/shared/resources/resource-urls.ts | import | no | no | lateral | present |
| E4274 | apps/platform/src/features/client-resources/ui/shared/resources/resource-viewer.tsx | packages/ui/src/lib/index.ts | import | yes | no | lateral | present |
| E4275 | apps/platform/src/features/client-resources/ui/shared/resources/resource-viewer.tsx | packages/ui/src/motion/index.ts | import | yes | no | lateral | present |
| E4276 | apps/platform/src/features/client-resources/ui/shared/resources/resource-viewer.tsx | packages/ui/src/overlays/index.ts | import | yes | no | lateral | present |
| E4277 | apps/platform/src/features/client-resources/ui/shared/resources/resource-viewer.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E4278 | apps/platform/src/features/client-resources/ui/shared/resources/resource-viewer.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E4279 | apps/platform/src/features/client-resources/ui/shared/resources/resource-viewer.tsx | apps/platform/src/features/client-resources/contracts/client-resources.ts | type-only import | no | yes | inward | present |
| E4280 | apps/platform/src/features/client-resources/ui/shared/resources/resource-viewer.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E4281 | apps/platform/src/features/client-resources/ui/shared/resources/resource-viewer.tsx | external:motion/react | import | n/a | no | lateral | present |
| E4282 | apps/platform/src/features/client-resources/ui/shared/resources/resource-viewer.tsx | external:react | import | n/a | no | lateral | present |
| E4283 | apps/platform/src/features/client-resources/ui/shared/resources/resources-unavailable.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E4284 | apps/platform/src/features/client-resources/ui/shared/resources/resources-unavailable.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E4285 | apps/platform/src/features/client-resources/ui/shared/resources/resources-unavailable.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E4287 | apps/platform/src/features/coaching-sales/server/coaching-sales-composition.server.ts | packages/domain/src/client-resources/index.ts | type-only import | yes | yes | inward | present |
| E4288 | apps/platform/src/routes.ts | apps/platform/src/features/client-resources/routes.ts | import | yes | no | lateral | present |
| E4289 | apps/platform/src/server/container.server.ts | packages/domain/src/client-resources/index.ts | import | yes | yes | inward | present |
| E4290 | apps/platform/src/server/container.server.ts | packages/infrastructure/src/documents/index.server.ts | import | yes | no | lateral | present |
| E4291 | apps/platform/src/server/container.server.ts | apps/platform/src/features/client-resources/server/client-resources-composition.server.ts | import | yes | no | lateral | present |
| E4292 | apps/platform/src/server/feature-contexts.server.ts | apps/platform/src/features/client-resources/server/guards/client-resources-context.server.ts | import | yes | yes | outward | present |
| E4293 | apps/platform/src/server/logger.server.ts | packages/domain/src/client-resources/index.ts | type-only import | yes | yes | inward | present |
| E4294 | apps/platform/src/surfaces/coach-portal/pages/client-resources.tsx | apps/platform/src/features/client-resources/server/guards/client-resources-context.server.ts | import | yes | no | lateral | present |
| E4295 | apps/platform/src/surfaces/coach-portal/pages/client-resources.tsx | apps/platform/src/features/client-resources/ui/coach/resources/coach-resource-library.tsx | import | yes | no | lateral | present |
| E4296 | apps/platform/src/surfaces/coach-portal/pages/client-resources.tsx | apps/platform/src/features/client-resources/ui/shared/resources/resource-copy.ts | import | yes | no | lateral | present |
| E4297 | apps/platform/src/surfaces/coach-portal/pages/client-resources.tsx | apps/platform/src/features/coaching-sales/contracts/paths.ts | import | yes | yes | inward | present |
| E4298 | apps/platform/src/surfaces/coach-portal/pages/client-resources.tsx | apps/platform/src/features/coaching-sales/server/guards/coaching-sales-context.server.ts | import | yes | no | lateral | present |
| E4299 | apps/platform/src/surfaces/coach-portal/pages/client-resources.tsx | apps/platform/src/features/coaching-sales/ui/coach/clients/roster-listing.ts | import | yes | no | lateral | present |
| E4300 | apps/platform/src/surfaces/coach-portal/pages/client-resources.tsx | apps/platform/src/surfaces/coach-portal/sections/client-not-found.tsx | import | no | no | lateral | present |
| E4301 | apps/platform/src/surfaces/coach-portal/pages/client-resources.tsx | external:react-router | import | n/a | no | lateral | present |
| E4302 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | apps/platform/src/features/client-resources/contracts/paths.ts | import | yes | yes | inward | present |
| E4303 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | apps/platform/src/surfaces/coach-portal/sections/client-not-found.tsx | import | no | no | lateral | present |
| E4304 | apps/platform/src/surfaces/coach-portal/routes.ts | apps/platform/src/features/client-resources/contracts/paths.ts | import | yes | yes | inward | present |
| E4305 | apps/platform/src/surfaces/coach-portal/sections/client-not-found.tsx | packages/ui/src/layout/index.ts | import | yes | no | lateral | present |
| E4306 | apps/platform/src/surfaces/coach-portal/sections/client-not-found.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E4307 | packages/config/src/concerns/client-resources.ts | packages/config/src/concerns/app.ts | import | no | no | lateral | present |
| E4308 | packages/config/src/concerns/client-resources.ts | external:zod | import | n/a | no | lateral | present |
| E4309 | packages/config/src/runtime-environment.ts | packages/config/src/concerns/client-resources.ts | import | no | no | lateral | present |
| E4310 | packages/domain/src/client-resources/add-client-resource-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E4311 | packages/domain/src/client-resources/add-client-resource-use-case.ts | packages/domain/src/client-resources/client-resource-access.ts | type-only import | no | no | lateral | present |
| E4312 | packages/domain/src/client-resources/add-client-resource-use-case.ts | packages/domain/src/client-resources/client-resource-ids.ts | type-only import | no | no | lateral | present |
| E4313 | packages/domain/src/client-resources/add-client-resource-use-case.ts | packages/domain/src/client-resources/client-resource-incidents.ts | type-only import | no | no | lateral | present |
| E4314 | packages/domain/src/client-resources/add-client-resource-use-case.ts | packages/domain/src/client-resources/client-resource-store.ts | type-only import | no | no | lateral | present |
| E4315 | packages/domain/src/client-resources/add-client-resource-use-case.ts | packages/domain/src/client-resources/client-resources.ts | type-only import | no | no | lateral | present |
| E4316 | packages/domain/src/client-resources/add-client-resource-use-case.ts | packages/domain/src/client-resources/resource-clients.ts | type-only import | no | no | lateral | present |
| E4317 | packages/domain/src/client-resources/add-client-resource-use-case.ts | packages/domain/src/client-resources/resource-details.ts | import | no | yes | inward | present |
| E4318 | packages/domain/src/client-resources/add-client-resource-use-case.ts | packages/domain/src/client-resources/resource-document-pages.ts | type-only import | no | no | lateral | present |
| E4319 | packages/domain/src/client-resources/add-client-resource-use-case.ts | packages/domain/src/client-resources/resource-file-intake.ts | import | no | yes | inward | present |
| E4320 | packages/domain/src/client-resources/add-client-resource-use-case.ts | packages/domain/src/client-resources/resource-file-kind.ts | type-only import | no | yes | inward | present |
| E4321 | packages/domain/src/client-resources/add-client-resource-use-case.ts | packages/domain/src/client-resources/resource-image-pages.ts | type-only import | no | no | lateral | present |
| E4322 | packages/domain/src/client-resources/client-resource-access.ts | packages/domain/src/account/index.ts | type-only import | no | no | lateral | present |
| E4323 | packages/domain/src/client-resources/client-resource-access.ts | packages/domain/src/client-resources/client-resource-incidents.ts | type-only import | no | no | lateral | present |
| E4324 | packages/domain/src/client-resources/client-resource-access.ts | packages/domain/src/client-resources/client-resources.ts | type-only import | no | no | lateral | present |
| E4325 | packages/domain/src/client-resources/client-resource-access.ts | packages/domain/src/client-resources/resource-clients.ts | type-only import | no | no | lateral | present |
| E4326 | packages/domain/src/client-resources/client-resource-incidents.ts | packages/domain/src/account/index.ts | type-only import | no | no | lateral | present |
| E4327 | packages/domain/src/client-resources/client-resource-incidents.ts | packages/domain/src/client-resources/resource-file-intake.ts | type-only import | no | yes | inward | present |
| E4328 | packages/domain/src/client-resources/client-resource-incidents.ts | packages/domain/src/client-resources/resource-file-kind.ts | type-only import | no | yes | inward | present |
| E4329 | packages/domain/src/client-resources/download-client-resource-use-case.ts | packages/domain/src/client-resources/client-resource-access.ts | import | no | no | lateral | present |
| E4330 | packages/domain/src/client-resources/download-client-resource-use-case.ts | packages/domain/src/client-resources/client-resource-incidents.ts | type-only import | no | no | lateral | present |
| E4331 | packages/domain/src/client-resources/download-client-resource-use-case.ts | packages/domain/src/client-resources/client-resource-store.ts | type-only import | no | no | lateral | present |
| E4332 | packages/domain/src/client-resources/download-client-resource-use-case.ts | packages/domain/src/client-resources/client-resources.ts | type-only import | no | no | lateral | present |
| E4333 | packages/domain/src/client-resources/download-client-resource-use-case.ts | packages/domain/src/client-resources/resource-clients.ts | type-only import | no | no | lateral | present |
| E4334 | packages/domain/src/client-resources/download-client-resource-use-case.ts | packages/domain/src/client-resources/resource-file-kind.ts | type-only import | no | yes | inward | present |
| E4335 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/add-client-resource-use-case.ts | import | no | no | lateral | present |
| E4336 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/client-resource-access.ts | type-only import | no | no | lateral | present |
| E4337 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/client-resource-ids.ts | type-only import | no | no | lateral | present |
| E4338 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/client-resource-incidents.ts | type-only import | no | no | lateral | present |
| E4339 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/client-resource-store.ts | type-only import | no | no | lateral | present |
| E4340 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/client-resources.ts | type-only import | no | no | lateral | present |
| E4341 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/download-client-resource-use-case.ts | import | no | no | lateral | present |
| E4342 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/list-client-resources-use-case.ts | import | no | no | lateral | present |
| E4343 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/open-resource-preview-use-case.ts | import | no | no | lateral | present |
| E4344 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/resource-clients.ts | type-only import | no | no | lateral | present |
| E4345 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/resource-details.ts | import | no | yes | inward | present |
| E4346 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/resource-document-pages.ts | type-only import | no | no | lateral | present |
| E4347 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/resource-file-intake.ts | import | no | yes | inward | present |
| E4348 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/resource-file-kind.ts | import | no | yes | inward | present |
| E4349 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/resource-image-pages.ts | type-only import | no | no | lateral | present |
| E4350 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/resource-renditions.ts | import | no | yes | inward | present |
| E4351 | packages/domain/src/client-resources/list-client-resources-use-case.ts | packages/domain/src/client-resources/client-resource-access.ts | import | no | no | lateral | present |
| E4352 | packages/domain/src/client-resources/list-client-resources-use-case.ts | packages/domain/src/client-resources/client-resource-incidents.ts | type-only import | no | no | lateral | present |
| E4353 | packages/domain/src/client-resources/list-client-resources-use-case.ts | packages/domain/src/client-resources/client-resources.ts | type-only import | no | no | lateral | present |
| E4354 | packages/domain/src/client-resources/list-client-resources-use-case.ts | packages/domain/src/client-resources/resource-clients.ts | type-only import | no | no | lateral | present |
| E4355 | packages/domain/src/client-resources/open-resource-preview-use-case.ts | packages/domain/src/client-resources/client-resource-access.ts | import | no | no | lateral | present |
| E4356 | packages/domain/src/client-resources/open-resource-preview-use-case.ts | packages/domain/src/client-resources/client-resource-incidents.ts | type-only import | no | no | lateral | present |
| E4357 | packages/domain/src/client-resources/open-resource-preview-use-case.ts | packages/domain/src/client-resources/client-resource-store.ts | type-only import | no | no | lateral | present |
| E4358 | packages/domain/src/client-resources/open-resource-preview-use-case.ts | packages/domain/src/client-resources/client-resources.ts | type-only import | no | no | lateral | present |
| E4359 | packages/domain/src/client-resources/open-resource-preview-use-case.ts | packages/domain/src/client-resources/resource-clients.ts | type-only import | no | no | lateral | present |
| E4360 | packages/domain/src/client-resources/open-resource-preview-use-case.ts | packages/domain/src/client-resources/resource-renditions.ts | import | no | yes | inward | present |
| E4361 | packages/domain/src/client-resources/resource-document-pages.ts | packages/domain/src/client-resources/client-resource-store.ts | type-only import | no | no | lateral | present |
| E4362 | packages/domain/src/client-resources/resource-file-intake.ts | packages/domain/src/client-resources/resource-file-kind.ts | import | no | no | lateral | present |
| E4363 | packages/domain/src/client-resources/resource-file-intake.ts | packages/domain/src/client-resources/resource-file-signature.ts | import | no | no | lateral | present |
| E4364 | packages/domain/src/client-resources/resource-file-signature.ts | packages/domain/src/client-resources/resource-file-kind.ts | type-only import | no | no | lateral | present |
| E4365 | packages/infrastructure/src/client-media/client-resource-layout.server.ts | packages/infrastructure/src/client-media/storage-key-segment.server.ts | import | no | no | lateral | present |
| E4366 | packages/infrastructure/src/client-media/create-client-resource-store.server.ts | packages/infrastructure/src/client-media/filesystem/filesystem-client-resource-store.server.ts | import | no | no | lateral | present |
| E4367 | packages/infrastructure/src/client-media/create-client-resource-store.server.ts | packages/domain/src/client-resources/index.ts | type-only import | yes | yes | inward | present |
| E4368 | packages/infrastructure/src/client-media/filesystem/encrypted-filesystem-progress-photo-store.server.ts | packages/infrastructure/src/client-media/filesystem/media-files.server.ts | import | no | no | lateral | present |
| E4369 | packages/infrastructure/src/client-media/filesystem/filesystem-client-resource-store.server.ts | packages/infrastructure/src/client-media/client-resource-layout.server.ts | import | no | no | lateral | present |
| E4370 | packages/infrastructure/src/client-media/filesystem/filesystem-client-resource-store.server.ts | packages/infrastructure/src/client-media/filesystem/media-files.server.ts | import | no | no | lateral | present |
| E4371 | packages/infrastructure/src/client-media/filesystem/filesystem-client-resource-store.server.ts | packages/infrastructure/src/client-media/filesystem/media-root-confinement.server.ts | import | no | no | lateral | present |
| E4372 | packages/infrastructure/src/client-media/filesystem/filesystem-client-resource-store.server.ts | packages/domain/src/client-resources/index.ts | type-only import | yes | yes | inward | present |
| E4373 | packages/infrastructure/src/client-media/filesystem/filesystem-client-resource-store.server.ts | external:fs/promises | import | n/a | no | lateral | present |
| E4374 | packages/infrastructure/src/client-media/filesystem/filesystem-client-resource-store.server.ts | external:path | import | n/a | no | lateral | present |
| E4375 | packages/infrastructure/src/client-media/filesystem/media-files.server.ts | packages/infrastructure/src/client-media/filesystem/media-root-confinement.server.ts | import | no | no | lateral | present |
| E4376 | packages/infrastructure/src/client-media/filesystem/media-files.server.ts | external:fs/promises | import | n/a | no | lateral | present |
| E4377 | packages/infrastructure/src/client-media/index.server.ts | packages/infrastructure/src/client-media/create-client-resource-store.server.ts | import | no | no | lateral | present |
| E4378 | packages/infrastructure/src/client-media/progress-photo-layout.server.ts | packages/infrastructure/src/client-media/storage-key-segment.server.ts | import | no | no | lateral | present |
| E4379 | packages/infrastructure/src/documents/create-pdf-cover-renderer.server.ts | packages/infrastructure/src/documents/pdf-page-renderer.server.ts | import | no | no | lateral | present |
| E4380 | packages/infrastructure/src/documents/index.server.ts | packages/infrastructure/src/documents/create-pdf-cover-renderer.server.ts | import | no | no | lateral | present |
| E4381 | packages/infrastructure/src/documents/index.server.ts | packages/infrastructure/src/documents/create-resource-document-pages.server.ts | import | no | no | lateral | present |
| E4382 | packages/infrastructure/src/documents/pdf-page-renderer.server.ts | external:@napi-rs/canvas | import | n/a | no | lateral | present |
| E4383 | packages/infrastructure/src/documents/pdf-page-renderer.server.ts | external:pdfjs-dist/legacy/build/pdf.mjs | import | n/a | no | lateral | present |
| E4384 | packages/infrastructure/src/documents/pdf-page-renderer.server.ts | external:url | import | n/a | no | lateral | present |
| E4385 | packages/infrastructure/src/documents/pdf-pages-worker.server.ts | packages/infrastructure/src/documents/pdf-page-renderer.server.ts | import | no | no | lateral | present |
| E4386 | packages/infrastructure/src/documents/pdf-pages-worker.server.ts | packages/infrastructure/src/documents/pdf-pages-messages.server.ts | type-only import | no | no | lateral | present |
| E4387 | packages/infrastructure/src/documents/pdf-pages-worker.server.ts | external:pdfjs-dist/legacy/build/pdf.mjs | type-only import | n/a | no | lateral | present |
| E4388 | packages/infrastructure/src/documents/pdf-pages-worker.server.ts | external:worker_threads | import | n/a | no | lateral | present |
| E4389 | packages/infrastructure/src/documents/pdf-pages.server.ts | packages/infrastructure/src/documents/pdf-pages-messages.server.ts | type-only import | no | no | lateral | present |
| E4390 | packages/infrastructure/src/documents/pdf-pages.server.ts | external:worker_threads | import | n/a | no | lateral | present |
| E4391 | packages/infrastructure/src/http/fetcher-outcome.ts | packages/infrastructure/src/http/failed-submission.ts | import | no | no | lateral | present |
| E4392 | packages/infrastructure/src/http/index.server.ts | packages/infrastructure/src/http/private-file-response.server.ts | import | no | no | lateral | present |
| E4393 | packages/infrastructure/src/http/index.ts | packages/infrastructure/src/http/upload-progress.ts | import | no | no | lateral | present |
| E4394 | packages/infrastructure/src/http/index.ts | packages/infrastructure/src/http/upload-transport.ts | import | no | no | lateral | present |
| E4395 | packages/infrastructure/src/http/private-file-response.server.ts | external:path | import | n/a | no | lateral | present |
| E4396 | packages/infrastructure/src/http/upload-transport.ts | packages/infrastructure/src/http/failed-submission.ts | import | no | no | lateral | present |
| E4397 | packages/infrastructure/src/http/upload-transport.ts | packages/infrastructure/src/http/upload-progress.ts | import | no | no | lateral | present |
| E4398 | packages/infrastructure/src/images/accepted-image.server.ts | external:sharp | type-only import | n/a | no | lateral | present |
| E4399 | packages/infrastructure/src/images/create-progress-photo-renditions.server.ts | packages/infrastructure/src/images/accepted-image.server.ts | import | no | no | lateral | present |
| E4400 | packages/infrastructure/src/images/index.server.ts | packages/infrastructure/src/images/create-resource-image-pages.server.ts | import | no | no | lateral | present |
| E4401 | packages/ui/src/layout/bottom-sheet.tsx | packages/ui/src/lib/dialog-frame.tsx | import | no | no | lateral | present |
| E4402 | packages/ui/src/layout/index.ts | packages/ui/src/layout/sheet-dialog-parts.tsx | import | no | no | lateral | present |
| E4403 | packages/ui/src/layout/responsive-sheet-dialog.tsx | packages/ui/src/lib/viewport.ts | import | no | no | lateral | present |
| E4404 | packages/ui/src/layout/sheet-dialog-parts.tsx | external:react | type-only import | n/a | no | lateral | present |
| E4405 | packages/ui/src/lib/index.ts | packages/ui/src/lib/viewport.ts | import | no | no | lateral | present |
| E4406 | packages/ui/src/lib/viewport.ts | external:react | import | n/a | no | lateral | present |
| E4407 | packages/ui/src/overlays/index.ts | packages/ui/src/overlays/viewer-dialog.tsx | import | no | no | lateral | present |
| E4408 | packages/ui/src/overlays/index.ts | packages/ui/src/overlays/zoomable-image.tsx | import | no | no | lateral | present |
| E4409 | packages/ui/src/overlays/lightbox.tsx | packages/ui/src/overlays/zoomable-image.tsx | import | no | no | lateral | present |
| E4410 | packages/ui/src/overlays/viewer-dialog.tsx | packages/ui/src/lib/dialog-frame.tsx | import | no | no | lateral | present |
| E4411 | packages/ui/src/overlays/viewer-dialog.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E4412 | packages/ui/src/overlays/viewer-dialog.tsx | external:react | type-only import | n/a | no | lateral | present |
| E4413 | packages/ui/src/overlays/zoomable-image.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E4414 | packages/ui/src/overlays/zoomable-image.tsx | packages/ui/src/overlays/use-photo-gestures.ts | import | no | no | lateral | present |
| E4415 | packages/ui/src/overlays/zoomable-image.tsx | external:react | import | n/a | no | lateral | present |
| E4416 | packages/ui/src/primitives/file-dropzone.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E4417 | packages/ui/src/primitives/file-dropzone.tsx | packages/ui/src/lib/described-by.ts | import | no | no | lateral | present |
| E4418 | packages/ui/src/primitives/file-dropzone.tsx | packages/ui/src/primitives/button.tsx | import | no | no | lateral | present |
| E4419 | packages/ui/src/primitives/file-dropzone.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E4420 | packages/ui/src/primitives/file-dropzone.tsx | external:react | import | n/a | no | lateral | present |
| E4421 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/file-dropzone.tsx | import | no | no | lateral | present |
| E4422 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/progress.tsx | import | no | no | lateral | present |
| E4423 | packages/ui/src/primitives/progress.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E4424 | packages/ui/src/primitives/progress.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E4425 | packages/ui/src/primitives/progress.tsx | external:react | type-only import | n/a | no | lateral | present |
| E4426 | apps/platform/src/features/client-resources/ui/coach/resources/resource-upload-check.ts | packages/domain/src/client-resources/index.ts | import | yes | yes | inward | present |
| E4427 | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-upload.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E4428 | apps/platform/src/surfaces/coach-portal/pages/client-resources.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E4429 | apps/platform/src/surfaces/coach-portal/pages/client.tsx | packages/ui/src/portal/index.ts | import | yes | no | lateral | present |
| E4430 | packages/domain/src/client-resources/add-client-resource-use-case.ts | packages/domain/src/client-resources/client-resource.ts | import | no | yes | inward | present |
| E4431 | packages/domain/src/client-resources/client-resource-access.ts | packages/domain/src/client-resources/client-resource.ts | type-only import | no | yes | inward | present |
| E4432 | packages/domain/src/client-resources/client-resource-store.ts | packages/domain/src/client-resources/client-resource.ts | type-only import | no | yes | inward | present |
| E4433 | packages/domain/src/client-resources/client-resource.ts | packages/domain/src/client-resources/resource-details.ts | type-only import | no | no | lateral | present |
| E4434 | packages/domain/src/client-resources/client-resource.ts | packages/domain/src/client-resources/resource-file-kind.ts | import | no | no | lateral | present |
| E4435 | packages/domain/src/client-resources/client-resource.ts | packages/domain/src/client-resources/resource-file-name.ts | import | no | no | lateral | present |
| E4436 | packages/domain/src/client-resources/compound-file-directory.ts | packages/domain/src/client-resources/byte-view.ts | import | no | no | lateral | present |
| E4437 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/client-resource.ts | import | no | yes | inward | present |
| E4438 | packages/domain/src/client-resources/open-resource-preview-use-case.ts | packages/domain/src/client-resources/client-resource.ts | type-only import | no | yes | inward | present |
| E4439 | packages/domain/src/client-resources/resource-file-signature.ts | packages/domain/src/client-resources/byte-view.ts | import | no | no | lateral | present |
| E4440 | packages/domain/src/client-resources/resource-file-signature.ts | packages/domain/src/client-resources/compound-file-directory.ts | import | no | no | lateral | present |
| E4441 | packages/domain/src/client-resources/resource-file-signature.ts | packages/domain/src/client-resources/zip-central-directory.ts | import | no | no | lateral | present |
| E4442 | packages/domain/src/client-resources/zip-central-directory.ts | packages/domain/src/client-resources/byte-view.ts | import | no | no | lateral | present |
| E4443 | packages/infrastructure/src/client-media/create-client-resource-store.server.ts | packages/infrastructure/src/client-media/filesystem/media-root.server.ts | import | no | no | lateral | present |
| E4444 | packages/infrastructure/src/client-media/create-progress-photo-store.server.ts | packages/infrastructure/src/client-media/filesystem/media-root.server.ts | import | no | no | lateral | present |
| E4445 | packages/infrastructure/src/client-media/filesystem/media-root.server.ts | external:fs | import | n/a | no | lateral | present |
| E4446 | packages/infrastructure/src/documents/create-resource-document-pages.server.ts | packages/domain/src/client-resources/index.ts | type-only import | yes | yes | inward | present |
| E4447 | packages/infrastructure/src/documents/create-resource-document-pages.server.ts | packages/infrastructure/src/documents/pdf-page-renderer.server.ts | import | no | no | lateral | present |
| E4448 | packages/infrastructure/src/documents/create-resource-document-pages.server.ts | packages/infrastructure/src/documents/pdf-pages.server.ts | import | no | no | lateral | present |
| E4449 | packages/infrastructure/src/documents/pdf-pages-messages.server.ts | packages/infrastructure/src/documents/pdf-page-renderer.server.ts | type-only import | no | no | lateral | present |
| E4450 | packages/infrastructure/src/documents/pdf-pages.server.ts | packages/infrastructure/src/documents/pdf-page-renderer.server.ts | type-only import | no | no | lateral | present |
| E4451 | packages/infrastructure/src/http/private-file-response.server.ts | external:stream/web | import | n/a | no | lateral | present |
| E4452 | packages/infrastructure/src/images/create-resource-image-pages.server.ts | external:sharp | type-only import | n/a | no | lateral | present |
| E4453 | packages/infrastructure/src/images/create-resource-image-pages.server.ts | packages/domain/src/client-resources/index.ts | type-only import | yes | yes | inward | present |
| E4454 | packages/infrastructure/src/images/create-resource-image-pages.server.ts | packages/infrastructure/src/images/accepted-image.server.ts | import | no | no | lateral | present |
| E4455 | packages/ui/src/portal/index.ts | packages/ui/src/portal/portal-back-link.tsx | import | no | no | lateral | present |
| E4456 | packages/ui/src/portal/portal-back-link.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E4457 | packages/ui/src/portal/portal-back-link.tsx | external:react | type-only import | n/a | no | lateral | present |
| E4458 | packages/ui/src/portal/portal-back-link.tsx | external:react-router | import | n/a | no | lateral | present |
| E4459 | apps/platform/src/features/client-resources/ui/coach/resources/coach-resource-library.tsx | apps/platform/src/features/client-resources/ui/shared/resources/resources-unavailable.tsx | import | no | no | lateral | present |
| E4460 | apps/platform/src/features/client-resources/ui/coach/resources/coach-resource-library.tsx | external:react-router | import | n/a | no | lateral | present |
| E4461 | packages/domain/src/client-resources/list-client-resources-use-case.ts | packages/domain/src/client-resources/client-resource.ts | type-only import | no | yes | inward | present |
| E4462 | packages/domain/src/coaching-subscription/record-checkout-completed-use-case.ts | packages/domain/src/coaching-subscription/payment-checkout.ts | type-only import | no | no | lateral | present |
| E4463 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/resource-file-name.ts | import | no | yes | inward | present |
| E4464 | packages/domain/src/client-resources/client-resources.ts | packages/domain/src/client-resources/client-resource.ts | type-only import | no | yes | inward | present |
| E4465 | apps/platform/src/surfaces/client-portal/routes.ts | apps/platform/src/features/client-resources/routes.ts | import | yes | no | lateral | present |
| E4466 | apps/platform/src/surfaces/client-portal/shell/layout.tsx | apps/platform/src/features/client-resources/server/guards/client-resources-context.server.ts | import | yes | yes | inward | present |
| E4467 | apps/platform/src/surfaces/client-portal/shell/navigation-links.ts | apps/platform/src/features/client-resources/contracts/paths.ts | import | yes | yes | inward | present |
| E4468 | apps/platform/src/features/client-resources/contracts/paths.ts | apps/platform/src/features/accounts/contracts/paths.ts | import | yes | no | lateral | present |
| E4471 | apps/platform/src/features/client-resources/api/resources/resource-opened.ts | apps/platform/src/features/client-resources/server/guards/client-resources-context.server.ts | import | no | no | lateral | present |
| E4472 | apps/platform/src/features/client-resources/api/resources/resource-opened.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E4473 | apps/platform/src/features/client-resources/api/resources/resource-opened.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E4474 | apps/platform/src/features/client-resources/api/client/own-resources-controller.server.ts | packages/domain/src/client-resources/index.ts | type-only import | yes | yes | inward | present |
| E4475 | apps/platform/src/features/client-resources/api/client/own-resources-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-account.server.ts | import | yes | no | lateral | present |
| E4476 | apps/platform/src/features/client-resources/api/client/own-resources-controller.server.ts | apps/platform/src/features/accounts/server/guards/require-portal-access.server.ts | import | yes | no | lateral | present |
| E4477 | apps/platform/src/features/client-resources/api/client/own-resources-controller.server.ts | apps/platform/src/features/accounts/server/guards/session-context.server.ts | import | yes | no | lateral | present |
| E4478 | apps/platform/src/features/client-resources/api/client/own-resources-controller.server.ts | apps/platform/src/features/client-resources/contracts/client-resources.ts | import | no | yes | inward | present |
| E4479 | apps/platform/src/features/client-resources/server/client-resources-composition.server.ts | apps/platform/src/features/client-resources/api/client/own-resources-controller.server.ts | import | no | no | lateral | present |
| E4480 | apps/platform/src/features/client-resources/ui/client/resources/resources-page.tsx | apps/platform/src/features/client-resources/server/guards/client-resources-context.server.ts | import | no | no | lateral | present |
| E4481 | apps/platform/src/features/client-resources/ui/client/resources/resources-page.tsx | apps/platform/src/features/client-resources/ui/client/resources/client-resource-library.tsx | import | no | no | lateral | present |
| E4482 | apps/platform/src/features/client-resources/ui/client/resources/client-resource-library.tsx | apps/platform/src/features/client-resources/ui/shared/resources/resource-gallery.tsx | import | no | no | lateral | present |
| E4483 | apps/platform/src/features/client-resources/ui/client/resources/client-resource-library.tsx | apps/platform/src/features/client-resources/ui/shared/resources/resources-unavailable.tsx | import | no | no | lateral | present |
| E4484 | apps/platform/src/features/client-resources/ui/client/resources/client-resource-library.tsx | apps/platform/src/features/client-resources/contracts/paths.ts | import | no | yes | inward | present |
| E4485 | apps/platform/src/features/client-resources/ui/coach/resources/coach-resource-library.tsx | apps/platform/src/features/client-resources/ui/shared/resources/resource-gallery.tsx | import | no | no | lateral | present |
| E4486 | apps/platform/src/features/client-resources/ui/shared/resources/resource-gallery.tsx | apps/platform/src/features/client-resources/ui/shared/resources/resource-grid.tsx | import | no | no | lateral | present |
| E4487 | apps/platform/src/features/client-resources/ui/shared/resources/resource-gallery.tsx | apps/platform/src/features/client-resources/ui/shared/resources/resource-viewer.tsx | import | no | no | lateral | present |
| E4488 | packages/domain/src/client-resources/list-own-resources-use-case.ts | packages/domain/src/client-resources/client-resource-access.ts | import | no | no | lateral | present |
| E4489 | packages/domain/src/client-resources/count-unopened-resources-use-case.ts | packages/domain/src/client-resources/client-resource-access.ts | import | no | no | lateral | present |
| E4490 | packages/domain/src/client-resources/mark-resource-opened-use-case.ts | packages/domain/src/client-resources/client-resource-access.ts | import | no | no | lateral | present |
| E4491 | packages/domain/src/client-resources/mark-resource-opened-use-case.ts | packages/domain/src/shared/index.ts | type-only import | no | no | lateral | present |
| E4492 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/list-own-resources-use-case.ts | re-export | no | no | lateral | present |
| E4493 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/count-unopened-resources-use-case.ts | re-export | no | no | lateral | present |
| E4494 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/mark-resource-opened-use-case.ts | re-export | no | no | lateral | present |
| E4495 | apps/platform/src/features/client-resources/api/resources/resource.ts | apps/platform/src/features/client-resources/server/guards/client-resources-context.server.ts | import | no | no | lateral | present |
| E4496 | apps/platform/src/features/client-resources/api/resources/resource.ts | packages/infrastructure/src/http/index.ts | import | yes | yes | inward | present |
| E4497 | apps/platform/src/features/client-resources/api/resources/resource.ts | packages/infrastructure/src/http/index.server.ts | import | yes | yes | inward | present |
| E4498 | apps/platform/src/features/client-resources/api/resources/resource.ts | external:react-router | type-only import | n/a | no | lateral | present |
| E4499 | apps/platform/src/features/client-resources/ui/coach/resources/resource-form-dialog.tsx | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-details-change.ts | import | no | no | lateral | present |
| E4500 | apps/platform/src/features/client-resources/ui/coach/resources/resource-form-dialog.tsx | apps/platform/src/features/client-resources/contracts/client-resources.ts | type-only import | no | yes | inward | present |
| E4501 | apps/platform/src/features/client-resources/ui/coach/resources/coach-resource-library.tsx | apps/platform/src/features/client-resources/ui/coach/resources/resource-actions-menu.tsx | import | no | no | lateral | present |
| E4502 | apps/platform/src/features/client-resources/ui/coach/resources/coach-resource-library.tsx | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-removal.ts | import | no | no | lateral | present |
| E4503 | apps/platform/src/features/client-resources/ui/coach/resources/coach-resource-library.tsx | packages/ui/src/overlays/index.ts | import | yes | no | lateral | present |
| E4504 | apps/platform/src/features/client-resources/ui/coach/resources/resource-actions-menu.tsx | packages/ui/src/primitives/index.ts | import | yes | no | lateral | present |
| E4505 | apps/platform/src/features/client-resources/ui/coach/resources/resource-actions-menu.tsx | external:lucide-react | import | n/a | no | lateral | present |
| E4506 | apps/platform/src/features/client-resources/ui/coach/resources/resource-actions-menu.tsx | external:react | import | n/a | no | lateral | present |
| E4507 | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-details-change.ts | packages/domain/src/client-resources/index.ts | type-only import | yes | yes | inward | present |
| E4508 | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-details-change.ts | apps/platform/src/features/client-resources/contracts/client-resources.ts | import | no | yes | inward | present |
| E4509 | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-details-change.ts | apps/platform/src/features/client-resources/contracts/paths.ts | import | no | yes | inward | present |
| E4510 | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-details-change.ts | external:react | import | n/a | no | lateral | present |
| E4511 | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-details-change.ts | external:react-router | import | n/a | no | lateral | present |
| E4512 | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-removal.ts | packages/ui/src/toast/index.ts | import | yes | no | lateral | present |
| E4513 | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-removal.ts | apps/platform/src/features/client-resources/contracts/client-resources.ts | import | no | yes | inward | present |
| E4514 | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-removal.ts | apps/platform/src/features/client-resources/contracts/paths.ts | import | no | yes | inward | present |
| E4515 | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-removal.ts | external:react | import | n/a | no | lateral | present |
| E4516 | apps/platform/src/features/client-resources/ui/coach/resources/use-resource-removal.ts | external:react-router | import | n/a | no | lateral | present |
| E4517 | packages/domain/src/client-resources/change-resource-details-use-case.ts | packages/domain/src/client-resources/client-resource-access.ts | import | no | no | lateral | present |
| E4518 | packages/domain/src/client-resources/change-resource-details-use-case.ts | packages/domain/src/client-resources/resource-details.ts | import | no | no | lateral | present |
| E4519 | packages/domain/src/client-resources/remove-client-resource-use-case.ts | packages/domain/src/client-resources/client-resource-access.ts | import | no | no | lateral | present |
| E4520 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/change-resource-details-use-case.ts | re-export | no | no | lateral | present |
| E4521 | packages/domain/src/client-resources/index.ts | packages/domain/src/client-resources/remove-client-resource-use-case.ts | re-export | no | no | lateral | present |
| E4522 | packages/ui/src/primitives/index.ts | packages/ui/src/primitives/dropdown-menu.tsx | re-export | no | no | lateral | present |
| E4523 | packages/ui/src/primitives/dropdown-menu.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E4524 | packages/ui/src/primitives/dropdown-menu.tsx | external:radix-ui | import | n/a | no | lateral | present |
| E4525 | packages/ui/src/primitives/dropdown-menu.tsx | external:react | import | n/a | no | lateral | present |
| E4526 | packages/ui/src/portal/portal-page-header.tsx | packages/ui/src/lib/cn.ts | import | no | no | lateral | present |
| E4527 | apps/platform/src/features/client-resources/ui/shared/resources/resource-grid.tsx | external:react | type-only import | n/a | no | lateral | present |
