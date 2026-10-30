# Architecture

Last audit: 2026-09-15 at commit 148d594f, scope apps/platform, packages, tools, knip.json, eslint.config.mjs; 2026-10-12 at commit 612252b7, scope feature-layer bounded contexts. Last update: 2026-10-28, the bounded-context layout. Maintained by the architecture inspection workflow; changes ship with the PR that causes them.

## Shape

The business rules live in each component's `domain/` under `apps/platform/src/bounded-contexts/<bounded-context>/<component>/`, one concept folder per entity (`account`, `acquisition`, `assessment-call`, `cart`, `check-in`, `client`, `client-invitation`, `client-journey`, `client-onboarding`, `client-profile`, `client-resources`, `client-roster`, `client-settings`, `coach-availability`, `coach-meeting-room`, `coach-schedule`, `coaching-bundle`, `coaching-subscription`, `download-grant`, `email-address`, `exercise`, `feature-flag`, `measurement`, `notification`, `nutrition`, `payment-link`, `product`, `waitlist`), and each component declares its own `ClockPort`. Rules are methods on the entity classes that carry the decisions — account lifecycle and portal access (`Account#isActive`), waitlist availability and reduced-pricing allocation, delivery limits and their windows, download-grant validity and delivery shape, publication slug, taxonomy, size-cap, digest and target rules, cart reconciliation, purchasability (`Product.evaluatePurchasability`), file-format resolution, email normalization and the subaddress rule (`EmailAddress`, `isAcceptedBy` an `EmailSubaddressPolicy` the container selects: refused only when `ENVIRONMENT` is `production`, and checked first by the booking, waitlist and store use cases), and the assessment-call rules — which starts in the coach's own zone are open (`CoachAvailabilityPort.openSlotStarts`, `isOpenStart`, stepping in minutes from the window's opening, where a start is open only when the call ends inside the window and the call and its buffer overlap none of the coach's busy intervals), whether a slot may be reserved (`AssessmentCall.decideReservation`, where a taken slot is refused whoever holds it), and the assessment call's slot policy (`ASSESSMENT_CALL_RULES`, a `SlotPolicy` the assessment-calls domain owns and hands to the coach's open-slot computation: the duration, read once to derive `endsAt` on the snapshot so no adapter re-applies it, the buffer, which with the duration sizes the coach's time a call reserves, and the step, horizon and lead time; `SlotPolicy.of` rejects a policy whose step is shorter than the call or whose values are not whole minutes) — and the coaching-sales rules — a payment link's thirty-day validity and usability (`PaymentLink.isUsable`), the bundle catalog's per-tier prices (`CoachingBundle`), the fourteen-day withdrawal deadline (`withdrawalDeadline`), the subscription a completed checkout buys (`PurchasedSubscription.fromCompletedCheckout`), and the subscription's lifecycle (`CoachingSubscription`): the day a waiting client's work starts (`programWorkStart`) and the one window in which she may let the coach start now (`startNowUntil`, `startNow`), which cancellation applies (`cancellationRule`: a full refund only for a waiting start before the withdrawal deadline, otherwise a cancellation with access until the paid-through date, nothing once cancelled or ended), the cancellation itself and the instruction it gives the payment provider (`cancel`), the refund due and its settlement (`RefundDue`, outstanding until the provider's refunds reach the amount owed; `hasRefundOutstanding`), the payment problem (`hasPaymentProblem`), the card on file (`PaymentCard`, whose detach clears only the stored card), the derived status and portal access (`statusOf`, `hasPortalAccessAt`: a cancelled subscription reads ended once her access end has passed), whether it is cancelled or ended (`isCancelledOrEnded`), and the mirror of the provider's subscription, invoice and refund events — and a paid client's account invitation — pending until accepted or thirty days old, accepted once and only by the subject that first accepted it, reissued with a fresh token on resend, and standing `pending`, `expired` or `email-failed` for the coach (`AccountInvitation.isPending`, `wasAcceptedBy`, `standing`) — and journey (`ClientJourney.step`: `welcome` until the welcome is seen, `onboarding` until submission, then `submitted`, `in-review`, `needs-details` or `approved` by `/client-onboarding`'s `reviewStageOf` over the four review stamps; `welcomeWording`, five-part when her forms include cycle context) — and the client status the coach's roster shows (`CLIENT_STATUSES`: `invited` until an account is bound while her subscription is not cancelled or ended, else the subscription's derived status, else the journey step's) and whether a refund is due (`hasRefundOutstanding`) — and the onboarding rules: the questionnaire and who is asked what (`ONBOARDING_FORMS`, `formsForGender`, the reveal, conceal and requires rules and exclusive options), a draft that keeps only asked answers, a submission refused once submitted, without the special-category and disclaimer consents, or with an invalid answer, carrying the first measurement entry and the profile facts (`ClientOnboarding.submit`, `profileFactsOf`), PAR-Q screening skipped outside ages 15–69 and its outcome, nutrition-advice, pregnancy and migraine-contraception flags and cycle mode for the coach's review, and the review itself — opened once, approved only while awaiting or in review, a detail request only in review with a note and questions she was asked, answered only on the asked questions and validated in her units (`OnboardingReview`, `DetailRequest`) — and the unit preference (`UnitPreference`, metric or imperial, and the kg↔lb and cm↔in conversions and entry steps in `measure-units.ts`), the measurement fields and their validation (`MEASUREMENT_FIELDS`: weight 30–300 kg and waist 40–200 cm required, hips, thigh and arm optional; `measurementProblem` words a missing or out-of-range reading in the reader's units; `measurementEntryOf` makes no entry without weight and waist), a client's measurement history and when she is due (`MeasurementHistory.dueLine`: measurements 28 days after the latest full set, a weigh-in 7 days after the latest entry), read for her together with what is due now and her units, metric until she chooses (`ReadOwnMeasurementHistoryUseCase`), the waist-to-height ratio of an entry (`waistToHeightRatio` in `/measurement`), progress photos (`ProgressPhoto.accepts`: JPEG, PNG or WebP of at most 10 MiB; front, side and back views; the coach may open every photo, a client only her own, and only the owner removes one) and the photo consent (`ClientProfile.hasPhotoConsent`, recorded once, without which a photo is refused) — and the check-in rules (`CheckIn`: a request decided under the client's lock, her waiting request first and then a taken hour; a pending request lapsing at its start and an approved one passing at its end; whose turn it is to answer and who may withdraw; the join window and its emphasis from ten minutes before the start; and `CHECK_IN_RULES`, the check-in's `SlotPolicy`: an hour on the hour, a day's notice, thirty days ahead) — and `<Verb><Noun>UseCase` classes, each with one `execute` method, sequence them. The ports are named for their consumers' capabilities: thirty-nine gateways (`CheckInsPort`, `ClientReachPort`, `AccountsPort`, `WaitlistEntriesPort`, `StoreCatalogPort`, `StoreAcquisitionsPort`, `StoreProductPublicationsPort`, `DownloadGrantsPort`, `FeatureFlagsPort`, `ProductAssetsPort`, `AssessmentCallReservationsPort`, `CoachAvailabilitySourcePort`, `CoachCalendarPort`, `PricingEligibilityPort`, `CheckoutSessionsPort`, `CoachingPurchasesPort`, `CoachingSubscriptionsPort`, `PaymentCardsPort`, `PaymentCheckoutPort`, `PaymentCustomerCardsPort`, `PaymentSubscriptionsPort`, `PaymentLinksPort`, `AssessmentCallReader`, `CallSalesStatesPort`, `AccountInvitationsPort`, `InvitedClientsPort`, `ClientJourneysPort`, `IdentityInvitationsPort`, `ClientIdentitiesPort`, `ClientRosterPort`, `ClientOnboardingSourcePort`, `OnboardingClientsPort`, `OnboardingReviewsPort`, `ClientMeasurementsSourcePort`, `ClientMeasurementRecordsPort`, `ClientProfilesPort`, `ProgressPhotosPort`, `ProgressPhotoStorePort`, `ClientAvatarsPort`, `ClientAvatarStorePort`, `ClientSettingsSourcePort`), the eight notification ports (`CheckInNotificationsPort`, `WaitlistConfirmationPort`, `ProductDeliveryPort`, `AssessmentCallNotificationsPort`, `CoachingSalesNotificationsPort`, `AccountInvitationNotificationsPort`, `OnboardingDetailsNotificationsPort`, `RefundNotificationsPort`), the consumer ports a component declares for what it needs from another component, implemented in its own `adapters/outbound/<provider>/` over the provider's facade or sibling entry (`PaidClientAdmissionPort`, `AccountInvitations`, `CoachTimePort`, `ClientReach`, `WaitlistModePort`), the writer, digest, hasher, token and id ports (`ProductAssetWriterPort`, `ProductAssetDigestPort`, `PayloadDigestGeneratorPort`, `DownloadTokenHasherPort`, `PaymentLinkTokenGeneratorPort`, `PaymentLinkTokenHasherPort`, `InvitationTokenGeneratorPort`, `InvitationTokenHasherPort`, `AccountIdsPort`, `AccountInvitationIdsPort`, `AssessmentCallIdsPort`, `CheckInIdsPort`, `ClientIdsPort`, `ClientResourceIdsPort`, `CoachingSubscriptionIdsPort`, `DetailRequestIdsPort`, `ExerciseIdsPort`, `ExerciseVideoIdsPort`, `FoodIdsPort`, `MeasurementIdsPort`, `PaymentLinkIdsPort`, `ProgressPhotoIdsPort`; each slice whose entities the domain constructs owns one `<Noun>Ids` port, implemented by a `Random<Noun>Ids` adapter in the owning component's `adapters/outbound/persistence/`, per the entity-id rule in conventions.md), the seven change ports a save goes through (`CoachAvailabilityChangesPort`, `CoachMeetingRoomChangesPort`, `ClientOnboardingChangesPort`, `ClientSettingsChangesPort`, `ClientIdentityChangesPort`, and the journey's `OnboardingSubmissionStampsPort` and `OnboardingReviewStampsPort`), the read port `CoachMeetingRoomSourcePort`, the image ports `ProgressPhotoRenditionsPort` and `ClientAvatarRenditionsPort`, the input boundary `FeatureFlagReaderPort`, `Clock` in each component's `domain/`, and ten incidents ports beside the use cases that consume them (`CheckInIncidentsPort`, `AcquisitionIncidentsPort`, `WaitlistIncidentsPort`, `AssessmentCallIncidentsPort`, `CoachingSalesIncidentsPort`, `CoachingSubscriptionIncidentsPort`, `AccountInvitationIncidentsPort`, `ClientOnboardingIncidentsPort`, `MeasurementIncidentsPort`, `ClientRosterIncidentsPort`). Waitlist mode is persisted policy input, not deployment configuration: `Waitlist` is the configured waiting-list aggregate whose cap and active offer are shared by availability and registration, and `GetWaitlistUseCase` reads waiting-list mode through the waitlist's own `WaitlistMode` port on every execution, over the operations feature-flags facade (true enables, false or absent disables), and assembles the plain `WaitlistSnapshot` from that mode, the entity's offer and its computed availability. A failed flag read is reported through `WaitlistIncidents.waitlistModeReadFailed()` and safe-enables the waitlist with availability unknown. `AssessmentCallBookingWindow` reads the same flag, through its own port over the same facade, for booking, and `CoachingSalesWindow` for coaching sales: each is open only while the flag is not true, and closed on a failed read, reported through its slice's incidents port. Each read crosses into the operations bounded context only through its consumer's `adapters/outbound/operations/` adapter. The offer object is readonly but not deeply immutable; that R17 cost is accepted until offer mutation or a second offer model is required. A `domain/` imports only itself (`domain-imports-only-itself`), so no package and no Node built-in reaches inside it — which is why the wall-clock arithmetic the assessment-call slots need is written against `Intl.DateTimeFormat` alone, in coach-schedule's `domain/coach-availability/zoned-time.ts`, rather than against a date library, and why the photo ports carry bytes as `Uint8Array`.

Details plug in through those ports. Each component under `apps/platform/src/bounded-contexts/<bounded-context>/<component>/` holds its Postgres repositories and tables (`adapters/outbound/persistence/`), email adapters (`adapters/outbound/email/`), its incidents adapter (`adapters/outbound/logging/`), one adapter folder per provider it calls (`adapters/outbound/<provider>/`), HTTP controllers, route modules and its request-context key (`adapters/inbound/http/`), the facade implementations it backs (`adapters/inbound/facades/`), route fragment (`routes.ts`), wire schemas, path literals and anything else both halves must word identically (`public/`, the one browser-safe folder the server half and the browser half may both import), its composition (`composition.server.ts`), its environment shape (`config.server.ts`) and its browser code (`ui/<slice>/`, with presenters and step machines in `ui/shared/` and `ui/public/`), whose user-action writes go through React Router fetchers against the component's own resource routes, and every resource route a fetcher writes to recovers a failed write in a one-line `clientAction`. The coach's time is a component without a page of its own beyond Settings: `scheduling/coach-schedule` (C23) holds the coach's availability window and meeting room (read and saved, edited through the coach's Settings section and its resource route), the one `coach_time_reservations` table with the Postgres read of her reserved time, and the coach-time, meeting-room and open-slots facades every appointment kind reserves, releases and reads through. Technical concerns live in `apps/platform/src/shared/<concern>/` and hold no business rule: the database client, pool, `app` namespace and ambient unit of work (`shared/database`, C2), the design system (`shared/design-system`, C5, eleven concern folders and the stylesheet with no root barrel; `calendar` is where a composite over a third-party widget goes so that consumers of `primitives` do not carry the vendor, and `toast` holds the second such composite the same way (`Toaster` over `sonner`), its own folder rather than a place inside `overlays` beside `Sheet` so that `overlays`' other consumers do not carry `sonner`; the one dialog frame `overlays`' `Dialog` and `layout`'s `ResponsiveSheetDialog` both render is private in `lib`, the one folder both may import), Turnstile bot detection and email-address acceptance (`shared/submission-checks`), Resend and in-memory product email with the email primitives and the calendar invite (`shared/email`), HTTP helpers (`shared/http`: the server's request and error helpers, among them `resolveFieldErrorCode`, the streaming multipart reader `readStreamingFormData` and its `isFormDataRequest` test, the size-free `parseByteRange` and the ranged, privately cached `createPrivateMediaResponse` the exercise video plays through; and, browser-safe, the `fetcherOutcomeOf` every fetcher-written resource route's `clientAction` returns, the progress-reporting `uploadOutcomeOf` with `createUploadProgress`, `useUploadState`, and the `UnitOfWork` type controllers name), the PDF renderer, file-type detection and hasher (`shared/documents`), the `sharp` wrapper (`shared/images`), the filesystem storage primitives with their root confinement (`shared/private-files`), link tokens (`shared/tokens`), the console logger (`shared/logging`), the system clock (`shared/clock`) and PWA registration (`shared/pwa`). The provider adapters live in the component that calls the provider: the payment provider in coaching sales (Stripe and in-memory checkout, subscription, customer-card and webhook adapters, the provider-neutral subscription-change, refund and card-change shapes with the coaching purpose's mapper, the shared `payment_events` ledger, and the payments contracts `PaymentEventsPort`, `PaymentCompletionHandlerPort`, `PaymentSubscriptionChangeHandlerPort`, `PaymentRefundHandlerPort`, `PaymentCardHandlerPort` and `PaymentWebhookIncidents`), the identity provider's invitations in accounts (Clerk and in-memory, behind `IdentityInvitationsPort`; a replacement revokes the earlier invitation before it creates the fresh one), bearer-secret management auth in the store, the feature-flag repository in operations' component flags, the exercise demo videos in the exercise library (a plain filesystem store under `EXERCISE_VIDEO_ROOT` behind `ExerciseVideoStorePort`), the client's progress photos and avatar in client profile (one AES-256-GCM encrypted filesystem store and an in-memory double, behind `ProgressPhotoStorePort` and `ClientAvatarStorePort`, selected by `CLIENT_MEDIA_PROVIDER`) with their renditions over `shared/images`. `apps/platform/test-support` (C16) is a dev-only fixture folder no production module imports. The application composition root is `apps/platform/src/composition-root/container.server.ts`, memoised behind `getPlatformContainer()` and imported only by `root.server.ts`: it builds the shared details once (the database, the console logger each component's incidents adapter writes through, the system clock, the link tokens, the payment provider, the email transport, the identity invitations, the client media stores and renditions), composes the seven bounded contexts in order (operations, legal, access, scheduling, clients, programs, sales), each through its own `composition.server.ts`, and hands each consumer composition the provider facades it names; inside a bounded context its composition composes its components in order and passes an earlier component's handles to a later one, and only each component's `feature` reaches a request context. The feature-flags composition selects, by `FEATURE_FLAG_OVERRIDES` (`browser` by default when `ENVIRONMENT` is `local` or `test`, `none` elsewhere, `browser` refused when `ENVIRONMENT=production`), whether its reader is handed on raw or wrapped by its `adapters/outbound/overrides/` decorator, which overlays the request's `ff.<FLAG>` query and `__eli_feature_flags` cookie overrides that the override middleware parses and holds in an `AsyncLocalStorage` store around `next()`. The platform feature-flag API, the public-site shell and the booking window each execute that reader per request, with no result cache and no production write path; in `browser` mode the same parameterless `execute()` answers with the request's overrides on top and the database row is never written. Only the feature-flags composition imports `adapters/outbound/overrides/`; `root.server.ts` mounts its middleware between Clerk and the feature contexts. Routes and loaders read their component's request-context key (`accountsContext`, `accessContext`, `storeContext`, `waitlistContext`, `coachScheduleContext`, `assessmentCallsContext`, `coachingSalesContext`, `clientOnboardingContext`, `clientProfileContext`, `platformContext`, `runtimeConfigContext`) off `args.context` instead of resolving anything from a container; the clients journey guard also sets `clientJourneyContext`, the signed-in client's journey snapshot, which only its own client-journey controller reads. Surfaces (`public-site`, `client-portal`, `coach-portal`) assemble components into products and own only route modules, shells and sections; the client portal wraps every client route in a pathless access layout that runs the accounts role guard and the clients component's journey gate, which reads her journey step and whether her portal access has ended and then admits her to the ended page only, and inside it a sidebar shell, with Dashboard, Profile and Settings in its sidebar, Dashboard and Profile in its tab bar and the client's name as a link to her profile, holds the dashboard, the client-profile component's profile page and the coaching-sales component's settings page, while the clients welcome page, the coaching-sales ended page and the client-onboarding page sit outside the shell; its dashboard composes the coaching-sales program status, the client-onboarding open request and the client-profile measurements nudge; `public-site` reaches the booking component through a route fragment and one path literal, and the coaching-sales component through two route fragments, its context key, the bundle selector its pricing page renders, the invitation states its invitation page renders, and the portal-standing guard and portal link its nav's portal link is resolved from; at runtime its layout also reads the route handles of the booking page and of its own pricing page, which both ask for a full-bleed content frame. `coach-portal` owns the assessment-calls page, which composes the assessment-calls component's section with the coaching-sales component's sales blocks, because the coaching-sales component is downstream of assessment calls and neither imports the other's UI, and the client page, which composes the coaching-sales, client-onboarding and client-profile components' coach blocks (among them the client-profile component's shared measurements table and photo dialog); the coaching-sales component's clients page imports only its own component and so lives in that component.

Boundaries are enforced by three tools. `tools/dependency-cruiser.config.cjs` declares the path rules for the bounded-context layout — the bounded-context order and one component order inside each bounded context (`bounded-context-order-<bc>`, `component-order-<component>`, generated from `BOUNDED_CONTEXT_ORDER` and `COMPONENT_ORDER`), schema foreign keys pointing at providers, sibling reads through published folders only, cross-context reads through the provider adapter and the bounded context's `public/` only, `ui/` and inbound HTTP reads of other bounded contexts, request-context key consumers, the compositions imported only from the level above, `domain/` importing only itself, the bounded context's facade folder importing no `domain/`, no cross-context `domain/` import, database types only in persistence and compositions, shared importing no bounded context, surface-to-bounded-context and surface-to-surface, the composition root, browser half, route thinness, the feature-flag override folder's single importer, a component's shared UI never importing its own actor UI, the browser-only design system, the design system's layering, vendor confinement (Clerk, Stripe, Resend, `sharp`, `react-dnd`, pdf rendering, `@fastify/busboy`, `file-type`) and the hygiene rules — `knip.json` holds published surfaces at zero unused exports, files, dependencies and unlisted dependencies, and `tools/domain-layout.mjs` checks every `domain/`'s per-entity folder layout and that no `shared/` folder holds a `domain/` or `adapters/`. All three run in `pnpm check:boundaries`, directly inside `pnpm validate` and the Docker builder stage, so a crossing fails workspace validation and image builds. `tools/boundaries.test.mjs` proves every dependency-cruiser rule against `tools/boundary-fixtures/`, one fixture that trips and one that passes per rule, each generated family proven once at family level. `tools/domain-layout.test.mjs` exercises `tools/domain-layout.mjs` against `tools/domain-layout-fixtures/` and against the real tree. Two rules stay review-owned by decision: controller shape (no base controller, no per-request instance field) and failure mapping (an adapter never swallows an infrastructure failure into a result-union member; a named expected condition may be classified and everything else is rethrown). The classified conditions are ENOENT in the filesystem asset store; ENOENT in the encrypted client media store (a missing photo or avatar opens as nothing and deletes as a no-op) and EEXIST on a folder it creates; Postgres `22P02` in the assessment-call repository (a malformed booking id is a mistyped URL) and Postgres `23P01` on the `coach_time_reservations_no_overlap` exclusion constraint in C23's `PostgresCoachTimeReservationsRepository.reserve` (losing a race for the coach's time is a taken slot), both read through C2's `isCausedByDatabaseError`; the waitlist signup's unique and check violations on its three named constraints, which register at the regular price or refresh consent; an insert that does nothing on `clients_assessment_call_id_unique` in the clients admitted-clients repository (a second payment for one call, answered `call_already_paid`), Postgres `23505` on `clients_auth_subject_id_unique` in the invited-clients repository (a lost acceptance race); Postgres `23505` on `client_onboarding_submissions_client_id_unique` in the client onboardings repository (a second submission is `already-submitted`) and on the partial `client_onboarding_detail_requests_open_per_client_unique` in the onboarding reviews repository (a request while one is open answers `not-in-review`); in the Clerk identity adapter, a revoke answered 404, or 400 with `invitation_revoked`, `invitation_already_revoked` or `invitation_cannot_be_revoked_code` (the earlier invitation is already settled, so the replacement goes on); in the Stripe adapters, a missing checkout session, an already-closed session on expiry, and an unverifiable webhook signature or body; and, in the progress-photo renditions adapter, any throw from `sharp` while reading or re-encoding an upload, answered `refused` like a format outside JPEG, PNG and WebP. Each is recorded in `decisions.md`. The component graph has no cycles at module, component or design-system-folder level. Deployment adds artifact controls outside the dependency rules: the platform package's `files` allowlist emits only `build`, and the Docker builder asserts that the deployed artifact contains `build/server/index.js`, has no top-level `src`, `e2e` or `test-support`, and holds no test or spec file outside `node_modules`. `tools/check-deploy-resolves.mjs`, proven by `tools/check-deploy-resolves.test.mjs`, resolves every bare import of every emitted server module under `build/server/` (the entry, the PDF worker and the renderer chunk the worker imports) from the `pnpm --prod deploy` layout, in the Docker builder and in `pnpm check:deploy`, the last step of `pnpm validate`; a vendor the adapters import (`@clerk/backend`, `stripe`, `sharp`) is declared by the platform package. Environment, Docker, CI, integration and Lighthouse wiring no longer carry `WAITLIST_MODE`; the seed folder `apps/platform/db/seeds/` inserts the persisted flag true after every migrate, and the Playwright suite leaves it alone, taking bookings out of waiting-list mode per browser through the public `ff.WAITLIST_MODE=false` override.

## Current shape (generated)

<!-- arch:summary -->
Components: 50, units: 1531, edges: 5159, component cycles: 0, uncovered modules: 0.

| Component | Units | Fan-in | Fan-out | I | A | D | Zone |
|---|---|---|---|---|---|---|---|
| C2 apps/platform/src/shared/database | 9 | 77 | 1 | 0.01 | 0.22 | 0.77 | none |
| C5 apps/platform/src/shared/design-system | 130 | 192 | 0 | 0 | 0.09 | 0.91 | pain |
| C7 apps/platform/src/bounded-contexts/sales/store | 88 | 5 | 35 | 0.88 | 0.38 | 0.25 | none |
| C8 apps/platform/src/bounded-contexts/sales/waitlist | 38 | 13 | 16 | 0.55 | 0.41 | 0.04 | none |
| C9 apps/platform/src/bounded-contexts/access/accounts | 59 | 14 | 25 | 0.64 | 0.38 | 0.02 | none |
| C11 apps/platform/src/surfaces/public-site | 29 | 1 | 21 | 0.95 | 0.19 | 0.14 | none |
| C12 apps/platform/src/surfaces/client-portal | 14 | 1 | 10 | 0.91 | 0.08 | 0.01 | none |
| C13 apps/platform/src/surfaces/coach-portal | 13 | 1 | 11 | 0.92 | 0.03 | 0.06 | none |
| C14 apps/platform/src/composition-root | 17 | 3 | 9 | 0.75 | 0.29 | 0.04 | none |
| C15 apps/platform | 5 | 0 | 4 | 1 | 0 | 0 | none |
| C16 apps/platform/test-support | 0 | 0 | 0 | undefined | undefined | undefined | none |
| C17 apps/platform/src/bounded-contexts/scheduling/assessment-calls | 76 | 22 | 44 | 0.67 | 0.3 | 0.03 | none |
| C18 apps/platform/src/bounded-contexts/sales/coaching-sales | 171 | 11 | 65 | 0.86 | 0.3 | 0.16 | none |
| C20 apps/platform/src/bounded-contexts/clients/client-profile | 232 | 12 | 99 | 0.89 | 0.29 | 0.18 | none |
| C21 apps/platform/src/bounded-contexts/clients/client-resources | 79 | 7 | 38 | 0.84 | 0.31 | 0.16 | none |
| C22 apps/platform/src/bounded-contexts/clients/check-ins | 133 | 9 | 61 | 0.87 | 0.33 | 0.2 | none |
| C23 apps/platform/src/bounded-contexts/scheduling/coach-schedule | 41 | 12 | 15 | 0.56 | 0.28 | 0.17 | none |
| C24 apps/platform/src/bounded-contexts/clients/clients | 88 | 41 | 38 | 0.48 | 0.31 | 0.2 | none |
| C25 apps/platform/src/bounded-contexts/programs/exercise-library | 59 | 5 | 24 | 0.83 | 0.32 | 0.15 | none |
| C26 apps/platform/src/bounded-contexts/programs/nutrition-library | 75 | 5 | 31 | 0.86 | 0.32 | 0.18 | none |
| C27 apps/platform/src/bounded-contexts/clients/notifications | 26 | 9 | 10 | 0.53 | 0.34 | 0.13 | none |
| C28 apps/platform/src/bounded-contexts/operations/feature-flags | 18 | 4 | 7 | 0.64 | 0.27 | 0.1 | none |
| C29 apps/platform/src/bounded-contexts/legal/legal | 11 | 2 | 5 | 0.71 | 0.38 | 0.09 | none |
| C30 apps/platform/src/bounded-contexts/operations/public (facades, DTOs, path literals) | 1 | 9 | 0 | 0 | 0.5 | 0.5 | none |
| C31 apps/platform/src/bounded-contexts/legal/public (facades, DTOs, path literals) | 6 | 10 | 1 | 0.09 | 0.21 | 0.69 | none |
| C32 apps/platform/src/bounded-contexts/access/public (facades, DTOs, path literals) | 3 | 72 | 0 | 0 | 0.36 | 0.64 | none |
| C33 apps/platform/src/bounded-contexts/scheduling/public (facades, DTOs, path literals) | 7 | 27 | 0 | 0 | 0.9 | 0.1 | none |
| C34 apps/platform/src/bounded-contexts/clients/public (facades, DTOs, path literals) | 6 | 16 | 0 | 0 | 0.88 | 0.13 | none |
| C35 apps/platform/src/bounded-contexts/sales/public (facades, DTOs, path literals) | 1 | 9 | 0 | 0 | 0 | 1 | pain |
| C36 apps/platform/src/bounded-contexts/operations (composition, routes, request-context) | 3 | 2 | 3 | 0.6 | 0.25 | 0.15 | none |
| C37 apps/platform/src/bounded-contexts/legal (composition, routes) | 2 | 2 | 2 | 0.5 | 0.33 | 0.17 | none |
| C38 apps/platform/src/bounded-contexts/access (composition, routes, request-context) | 3 | 2 | 3 | 0.6 | 0.25 | 0.15 | none |
| C39 apps/platform/src/bounded-contexts/scheduling (composition, routes, request-context) | 4 | 13 | 4 | 0.24 | 0.1 | 0.66 | none |
| C40 apps/platform/src/bounded-contexts/clients (composition, routes, request-context) | 4 | 19 | 4 | 0.17 | 0.05 | 0.78 | pain |
| C41 apps/platform/src/bounded-contexts/programs (composition, routes, request-context) | 3 | 3 | 3 | 0.5 | 0.2 | 0.3 | none |
| C42 apps/platform/src/bounded-contexts/sales (composition, routes, request-context) | 3 | 10 | 3 | 0.23 | 0.13 | 0.64 | none |
| C43 apps/platform/src/shared/brand | 1 | 16 | 0 | 0 | 0 | 1 | pain |
| C44 apps/platform/src/shared/clock | 3 | 3 | 0 | 0 | 0 | 1 | pain |
| C45 apps/platform/src/shared/contact | 2 | 10 | 0 | 0 | 0.25 | 0.75 | none |
| C46 apps/platform/src/shared/documents | 7 | 5 | 0 | 0 | 0.44 | 0.56 | none |
| C47 apps/platform/src/shared/email | 11 | 35 | 1 | 0.03 | 0.07 | 0.9 | pain |
| C48 apps/platform/src/shared/http | 16 | 149 | 0 | 0 | 0.11 | 0.89 | pain |
| C49 apps/platform/src/shared/images | 1 | 4 | 0 | 0 | 0.33 | 0.67 | none |
| C50 apps/platform/src/shared/logging | 2 | 25 | 0 | 0 | 0.25 | 0.75 | none |
| C51 apps/platform/src/shared/private-files | 5 | 10 | 0 | 0 | 0 | 1 | pain |
| C52 apps/platform/src/shared/pwa | 3 | 7 | 1 | 0.13 | 0 | 0.88 | pain |
| C53 apps/platform/src/shared/runtime | 1 | 10 | 0 | 0 | 0.5 | 0.5 | none |
| C54 apps/platform/src/shared/submission-checks | 19 | 22 | 1 | 0.04 | 0.23 | 0.72 | none |
| C55 apps/platform/src/shared/time-format | 2 | 18 | 0 | 0 | 0 | 1 | pain |
| C56 apps/platform/src/shared/tokens | 1 | 1 | 1 | 0.5 | 0 | 0.5 | none |

| From | To | Importing modules |
|---|---|---|
| C2 | C48 | 1 |
| C7 | C2 | 6 |
| C7 | C5 | 6 |
| C7 | C31 | 3 |
| C7 | C35 | 4 |
| C7 | C43 | 1 |
| C7 | C47 | 4 |
| C7 | C48 | 15 |
| C7 | C50 | 2 |
| C7 | C53 | 1 |
| C7 | C54 | 5 |
| C8 | C2 | 3 |
| C8 | C5 | 2 |
| C8 | C30 | 2 |
| C8 | C31 | 2 |
| C8 | C43 | 1 |
| C8 | C47 | 4 |
| C8 | C48 | 3 |
| C8 | C50 | 2 |
| C8 | C54 | 5 |
| C9 | C2 | 4 |
| C9 | C5 | 5 |
| C9 | C32 | 10 |
| C9 | C43 | 1 |
| C9 | C47 | 3 |
| C9 | C48 | 8 |
| C9 | C50 | 2 |
| C9 | C53 | 1 |
| C11 | C5 | 15 |
| C11 | C7 | 1 |
| C11 | C8 | 7 |
| C11 | C9 | 5 |
| C11 | C14 | 1 |
| C11 | C18 | 1 |
| C11 | C24 | 1 |
| C11 | C32 | 5 |
| C11 | C35 | 4 |
| C11 | C37 | 1 |
| C11 | C39 | 4 |
| C11 | C40 | 1 |
| C11 | C42 | 3 |
| C11 | C43 | 1 |
| C11 | C48 | 5 |
| C11 | C54 | 4 |
| C12 | C5 | 5 |
| C12 | C9 | 1 |
| C12 | C18 | 4 |
| C12 | C20 | 5 |
| C12 | C21 | 1 |
| C12 | C22 | 2 |
| C12 | C24 | 2 |
| C12 | C27 | 1 |
| C12 | C32 | 5 |
| C12 | C40 | 5 |
| C12 | C42 | 3 |
| C12 | C48 | 1 |
| C12 | C52 | 4 |
| C13 | C5 | 7 |
| C13 | C17 | 3 |
| C13 | C18 | 2 |
| C13 | C20 | 3 |
| C13 | C21 | 3 |
| C13 | C22 | 4 |
| C13 | C24 | 7 |
| C13 | C25 | 1 |
| C13 | C26 | 1 |
| C13 | C27 | 1 |
| C13 | C32 | 4 |
| C13 | C39 | 4 |
| C13 | C40 | 7 |
| C13 | C41 | 1 |
| C13 | C42 | 2 |
| C14 | C2 | 4 |
| C14 | C7 | 1 |
| C14 | C8 | 1 |
| C14 | C9 | 2 |
| C14 | C17 | 1 |
| C14 | C18 | 1 |
| C14 | C20 | 1 |
| C14 | C25 | 1 |
| C14 | C26 | 1 |
| C14 | C28 | 1 |
| C14 | C32 | 1 |
| C14 | C36 | 1 |
| C14 | C37 | 1 |
| C14 | C38 | 1 |
| C14 | C39 | 1 |
| C14 | C40 | 1 |
| C14 | C41 | 1 |
| C14 | C42 | 1 |
| C14 | C43 | 1 |
| C14 | C44 | 1 |
| C14 | C46 | 1 |
| C14 | C47 | 2 |
| C14 | C48 | 2 |
| C14 | C50 | 1 |
| C14 | C54 | 4 |
| C14 | C56 | 1 |
| C15 | C5 | 2 |
| C15 | C9 | 1 |
| C15 | C11 | 1 |
| C15 | C12 | 1 |
| C15 | C13 | 1 |
| C15 | C14 | 2 |
| C15 | C32 | 1 |
| C15 | C35 | 1 |
| C15 | C36 | 1 |
| C15 | C38 | 1 |
| C15 | C39 | 1 |
| C15 | C40 | 1 |
| C15 | C41 | 1 |
| C15 | C42 | 1 |
| C15 | C48 | 1 |
| C17 | C2 | 3 |
| C17 | C5 | 17 |
| C17 | C23 | 4 |
| C17 | C30 | 2 |
| C17 | C32 | 1 |
| C17 | C33 | 5 |
| C17 | C43 | 2 |
| C17 | C44 | 1 |
| C17 | C45 | 6 |
| C17 | C47 | 7 |
| C17 | C48 | 6 |
| C17 | C50 | 2 |
| C17 | C54 | 4 |
| C17 | C55 | 9 |
| C18 | C2 | 8 |
| C18 | C5 | 24 |
| C18 | C8 | 2 |
| C18 | C17 | 3 |
| C18 | C24 | 1 |
| C18 | C30 | 2 |
| C18 | C32 | 4 |
| C18 | C33 | 4 |
| C18 | C34 | 7 |
| C18 | C39 | 2 |
| C18 | C40 | 4 |
| C18 | C47 | 7 |
| C18 | C48 | 16 |
| C18 | C50 | 2 |
| C18 | C53 | 1 |
| C20 | C2 | 11 |
| C20 | C5 | 41 |
| C20 | C17 | 4 |
| C20 | C23 | 1 |
| C20 | C24 | 14 |
| C20 | C32 | 14 |
| C20 | C33 | 3 |
| C20 | C34 | 2 |
| C20 | C43 | 1 |
| C20 | C45 | 2 |
| C20 | C47 | 4 |
| C20 | C48 | 27 |
| C20 | C49 | 2 |
| C20 | C50 | 2 |
| C20 | C51 | 3 |
| C20 | C52 | 1 |
| C20 | C53 | 1 |
| C21 | C2 | 3 |
| C21 | C5 | 13 |
| C21 | C24 | 4 |
| C21 | C32 | 4 |
| C21 | C46 | 2 |
| C21 | C48 | 11 |
| C21 | C49 | 1 |
| C21 | C50 | 2 |
| C21 | C51 | 3 |
| C21 | C52 | 1 |
| C22 | C2 | 5 |
| C22 | C5 | 19 |
| C22 | C17 | 4 |
| C22 | C23 | 3 |
| C22 | C24 | 5 |
| C22 | C27 | 4 |
| C22 | C32 | 6 |
| C22 | C33 | 8 |
| C22 | C34 | 2 |
| C22 | C39 | 1 |
| C22 | C43 | 7 |
| C22 | C47 | 4 |
| C22 | C48 | 20 |
| C22 | C50 | 2 |
| C22 | C52 | 1 |
| C22 | C55 | 8 |
| C23 | C2 | 6 |
| C23 | C5 | 2 |
| C23 | C32 | 2 |
| C23 | C33 | 5 |
| C23 | C48 | 2 |
| C24 | C2 | 10 |
| C24 | C5 | 11 |
| C24 | C17 | 3 |
| C24 | C32 | 9 |
| C24 | C33 | 2 |
| C24 | C34 | 4 |
| C24 | C44 | 1 |
| C24 | C45 | 2 |
| C24 | C48 | 7 |
| C24 | C50 | 2 |
| C24 | C55 | 1 |
| C25 | C2 | 3 |
| C25 | C5 | 8 |
| C25 | C9 | 1 |
| C25 | C32 | 2 |
| C25 | C46 | 1 |
| C25 | C48 | 9 |
| C25 | C50 | 2 |
| C25 | C51 | 2 |
| C25 | C53 | 1 |
| C26 | C2 | 5 |
| C26 | C5 | 13 |
| C26 | C9 | 1 |
| C26 | C32 | 3 |
| C26 | C48 | 9 |
| C26 | C49 | 1 |
| C26 | C50 | 2 |
| C26 | C51 | 2 |
| C26 | C53 | 1 |
| C27 | C2 | 3 |
| C27 | C5 | 1 |
| C27 | C24 | 3 |
| C27 | C32 | 1 |
| C27 | C48 | 3 |
| C27 | C50 | 2 |
| C28 | C2 | 3 |
| C28 | C30 | 3 |
| C28 | C48 | 2 |
| C28 | C53 | 2 |
| C29 | C5 | 1 |
| C29 | C31 | 5 |
| C31 | C43 | 1 |
| C36 | C28 | 3 |
| C37 | C29 | 2 |
| C38 | C9 | 3 |
| C39 | C17 | 4 |
| C39 | C23 | 4 |
| C40 | C20 | 3 |
| C40 | C21 | 3 |
| C40 | C22 | 3 |
| C40 | C24 | 4 |
| C40 | C27 | 3 |
| C40 | C34 | 1 |
| C41 | C25 | 3 |
| C41 | C26 | 3 |
| C42 | C7 | 3 |
| C42 | C8 | 3 |
| C42 | C18 | 3 |
| C47 | C53 | 1 |
| C52 | C48 | 1 |
| C54 | C53 | 1 |
| C56 | C46 | 1 |
<!-- /arch:summary -->

## Reading this folder

- `model/components.json`: the enforced components and the path globs that belong to each.
- `model/rules.json`: the rings and the glob rules that classify a path's ring, kind, and actors.
- `model/overrides.json`: per-path exceptions to the rules, by exact path.
- `model/boundaries.json`: the ports rules declare, their owners and humble sides, shared data shapes, and cohesion groups.
- `decisions.md`: deferred decisions, why each cohesion group exists, cohesion position per component, intended exceptions, open questions.
- `conventions.md`: where a file goes and what it may import; the folder layout the dependency rules assume.

Terms: a *unit* is a class, module, function, interface, or data structure. A *component* is a group of units behind one published interface that tooling enforces. An *edge* from A to B means A's source code names B. *Policy* is business rules; *detail* is databases, frameworks, transports, vendors, UI, and the data shapes they produce. A *ring* is a band of units at one level of distance from inputs and outputs; dependencies point inward.
