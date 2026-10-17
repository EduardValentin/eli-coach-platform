# Architecture

Last audit: 2026-09-15 at commit 148d594f, scope apps/platform, packages, tools, knip.json, eslint.config.mjs; 2026-10-12 at commit 612252b7, scope feature-layer bounded contexts. Last update: 2026-10-16 at commit ec26b13f, change review. Maintained by the architecture inspection workflow; changes ship with the PR that causes them.

## Shape

The business rules live in `packages/domain` (C1), published as twenty-nine subpaths with no root barrel: one folder per entity (`account`, `acquisition`, `assessment-call`, `cart`, `check-in`, `client`, `client-invitation`, `client-journey`, `client-onboarding`, `client-profile`, `client-resources`, `client-roster`, `coach-availability`, `coach-meeting-room`, `coach-schedule`, `coaching-bundle`, `coaching-subscription`, `download-grant`, `email-address`, `exercise`, `feature-flag`, `measurement`, `notification`, `nutrition`, `payment-link`, `product`, `unit-preference`, `waitlist`) plus the interface-only `shared`. Rules are methods on the entity classes that carry the decisions — account lifecycle and portal access (`Account#isActive`), waitlist availability and reduced-pricing allocation, delivery limits and their windows, download-grant validity and delivery shape, publication slug, taxonomy, size-cap, digest and target rules, cart reconciliation, purchasability (`Product.evaluatePurchasability`), file-format resolution, email normalization and the subaddress rule (`EmailAddress`, `isAcceptedBy` an `EmailSubaddressPolicy` the container selects: refused only when `ENVIRONMENT` is `production`, and checked first by the booking, waitlist and store use cases), and the assessment-call rules — which starts in the coach's own zone are open (`CoachAvailability.openSlotStarts`, `isOpenStart`, stepping in minutes from the window's opening, where a start is open only when the call ends inside the window and the call and its buffer overlap none of the coach's busy intervals), whether a slot may be reserved (`AssessmentCall.decideReservation`, where a taken slot is refused whoever holds it), and the assessment call's slot policy (`ASSESSMENT_CALL_RULES`, a `SlotPolicy` the `/assessment-call` slice owns and hands to `CoachAvailability`: the duration, read once to derive `endsAt` on the snapshot so no adapter re-applies it, the buffer, which with the duration sizes the coach's time a call reserves, and the step, horizon and lead time; `SlotPolicy.of` rejects a policy whose step is shorter than the call or whose values are not whole minutes) — and the coaching-sales rules — a payment link's thirty-day validity and usability (`PaymentLink.isUsable`), the bundle catalog's per-tier prices (`CoachingBundle`), the fourteen-day withdrawal deadline (`withdrawalDeadline`), the subscription a completed checkout buys (`PurchasedSubscription.fromCompletedCheckout`), and the subscription's lifecycle (`CoachingSubscription`): the day a waiting client's work starts (`programWorkStart`) and the one window in which she may let the coach start now (`startNowUntil`, `startNow`), which cancellation applies (`cancellationRule`: a full refund only for a waiting start before the withdrawal deadline, otherwise a cancellation with access until the paid-through date, nothing once cancelled or ended), the cancellation itself and the instruction it gives the payment provider (`cancel`), the refund due and its settlement (`RefundDue`, outstanding until the provider's refunds reach the amount owed; `hasRefundOutstanding`), the payment problem (`hasPaymentProblem`), the card on file (`PaymentCard`, whose detach clears only the stored card), the derived status and portal access (`statusOf`, `hasPortalAccessAt`: a cancelled subscription reads ended once her access end has passed), whether it is cancelled or ended (`isCancelledOrEnded`), and the mirror of the provider's subscription, invoice and refund events — and a paid client's invitation — pending until used or thirty days old, accepted once and only by the subject that first accepted it, reissued with a fresh token on resend, and standing `pending`, `expired` or `email-failed` for the coach (`ClientInvitation.isPending`, `wasAcceptedBy`, `standing`) — and journey (`ClientJourney.step`: `welcome` until the welcome is seen, `onboarding` until submission, then `submitted`, `in-review`, `needs-details` or `approved` by `/client-onboarding`'s `reviewStageOf` over the four review stamps; `welcomeWording`, five-part when her forms include cycle context) — and the client status the coach's roster shows (`CLIENT_STATUSES`: `invited` until an account is bound while her subscription is not cancelled or ended, else the subscription's derived status, else the journey step's) and whether a refund is due (`hasRefundOutstanding`) — and the onboarding rules: the questionnaire and who is asked what (`ONBOARDING_FORMS`, `formsForGender`, the reveal, conceal and requires rules and exclusive options), a draft that keeps only asked answers, a submission refused once submitted, without the special-category and disclaimer consents, or with an invalid answer, carrying the first measurement entry and the profile facts (`ClientOnboarding.submit`, `profileFactsOf`), PAR-Q screening skipped outside ages 15–69 and its outcome, nutrition-advice, pregnancy and migraine-contraception flags and cycle mode for the coach's review, and the review itself — opened once, approved only while awaiting or in review, a detail request only in review with a note and questions she was asked, answered only on the asked questions and validated in her units (`OnboardingReview`, `DetailRequest`) — and the unit preference (`UnitPreference`, metric or imperial, and the kg↔lb and cm↔in conversions and entry steps in `measure-units.ts`), the measurement fields and their validation (`MEASUREMENT_FIELDS`: weight 30–300 kg and waist 40–200 cm required, hips, thigh and arm optional; `measurementProblem` words a missing or out-of-range reading in the reader's units; `measurementEntryOf` makes no entry without weight and waist), a client's measurement history and when she is due (`MeasurementHistory.dueLine`: measurements 28 days after the latest full set, a weigh-in 7 days after the latest entry), read for her together with what is due now and her units, metric until she chooses (`ReadOwnMeasurementHistoryUseCase`), the waist-to-height ratio of an entry (`waistToHeightRatio` in `/measurement`), progress photos (`ProgressPhoto.accepts`: JPEG, PNG or WebP of at most 10 MiB; front, side and back views; the coach may open every photo, a client only her own, and only the owner removes one) and the photo consent (`ClientProfile.hasPhotoConsent`, recorded once, without which a photo is refused) — and the check-in rules (`CheckIn`: a request decided under the client's lock, her waiting request first and then a taken hour; a pending request lapsing at its start and an approved one passing at its end; whose turn it is to answer and who may withdraw; the join window and its emphasis from ten minutes before the start; and `CHECK_IN_RULES`, the check-in's `SlotPolicy`: an hour on the hour, a day's notice, thirty days ahead) — and `<Verb><Noun>UseCase` classes, each with one `execute` method, sequence them. Eighty-seven published ports and one unpublished one are named for their consumers' capabilities: thirty-nine gateways (`CheckIns`, `ClientReach`, `Accounts`, `WaitlistEntries`, `StoreCatalog`, `StoreAcquisitions`, `StoreProductPublications`, `DownloadGrants`, `FeatureFlags`, `ProductAssets`, `AssessmentCallReservations`, `CoachAvailabilitySource`, `CoachCalendar`, `PricingEligibility`, `CheckoutSessions`, `CoachingPurchases`, `CoachingSubscriptions`, `PaymentCards`, `PaymentCheckout`, `PaymentCustomerCards`, `PaymentSubscriptions`, `PaymentLinks`, `AssessmentCallReader`, `CallSalesStates`, `ClientInvitations`, `InvitedClients`, `ClientJourneys`, `IdentityInvitations`, `ClientIdentities`, `ClientRoster`, `ClientOnboardingSource`, `OnboardingClients`, `OnboardingReviews`, `ClientMeasurementsSource`, `ClientMeasurementRecords`, `ClientProfiles`, `ProgressPhotos`, `ProgressPhotoStore`, `ClientUnitPreferencesSource`), the eight notification ports (`CheckInNotifications`, `WaitlistConfirmation`, `ProductDelivery`, `AssessmentCallNotifications`, `CoachingSalesNotifications`, `ClientInvitationNotifications`, `OnboardingDetailsNotifications`, `RefundNotifications`), the two consumer ports one slice's use case asks another slice's work through, satisfied by a composition (`InvitationAcceptance`, `PaidClientAdmission`), the writer, digest, hasher, token and id ports (`ProductAssetWriter`, `ProductAssetDigest`, `PayloadDigestGenerator`, `DownloadTokenHasher`, `PaymentLinkTokenGenerator`, `PaymentLinkTokenHasher`, `InvitationTokenGenerator`, `InvitationTokenHasher`, `AccountIds`, `AssessmentCallIds`, `CheckInIds`, `ClientIds`, `ClientInvitationIds`, `ClientResourceIds`, `CoachingSubscriptionIds`, `DetailRequestIds`, `ExerciseIds`, `ExerciseVideoIds`, `FoodIds`, `MeasurementIds`, `PaymentLinkIds`, `ProgressPhotoIds`; each slice whose entities the domain constructs owns one `<Noun>Ids` port, implemented by a `Random<Noun>Ids` adapter in the owning feature's `data/`, per the entity-id rule in conventions.md), the six change ports a save goes through (`CoachAvailabilityChanges`, `CoachMeetingRoomChanges`, `ClientOnboardingChanges`, `ClientUnitPreferences`, and the journey's `OnboardingSubmissionStamps` and `OnboardingReviewStamps`), the read port `CoachMeetingRoomSource`, the image port `ProgressPhotoRenditions`, the input boundary `FeatureFlagReader`, `Clock` as the sole `shared` port, and ten incidents ports beside the use cases that consume them (`CheckInIncidents`, `AcquisitionIncidents`, `WaitlistIncidents`, `AssessmentCallIncidents`, `CoachingSalesIncidents`, `CoachingSubscriptionIncidents`, `ClientInvitationIncidents`, `ClientOnboardingIncidents`, `MeasurementIncidents`, `ClientRosterIncidents`). `DownloadTokenGenerator` remains deliberately unpublished because its only consumer is inside the package. Waitlist mode is persisted policy input, not deployment configuration: `Waitlist` is the configured waiting-list aggregate whose cap and active offer are shared by availability and registration, and `GetWaitlistUseCase` reads the existing `FeatureFlagReader` on every execution, reads `WAITLIST_MODE` from the published `FeatureFlagSet` (true enables, false or absent disables), and assembles the plain `WaitlistSnapshot` from that mode, the entity's offer and its computed availability. A failed flag read is reported through `WaitlistIncidents.waitlistModeReadFailed()` and safe-enables the waitlist with availability unknown. `AssessmentCallBookingWindow` reads the same flag, through the same key, for booking, and `CoachingSalesWindow` for coaching sales: each is open only while the flag is not true, and closed on a failed read, reported through its slice's incidents port. The resulting `waitlist → feature-flag`, `assessment-call → feature-flag` and `payment-link → feature-flag` edges enter the sibling's index, stay in the use-case ring and close no cycle. The offer object is readonly but not deeply immutable; that R17 cost is accepted until offer mutation or a second offer model is required. The package declares no dependencies and its tsconfig sets `"types": []`, so neither an import nor an ambient Node global reaches inside it — which is why the wall-clock arithmetic the assessment-call slots need is written against `Intl.DateTimeFormat` alone, in `coach-availability/zoned-time.ts`, rather than against a date library, and why the photo ports carry bytes as `Uint8Array`.

Details plug in through those ports. Each feature under `apps/platform/src/features/<feature>/` holds its Postgres repositories (`data/`), email adapters (`email/`), HTTP controllers and route modules (`api/`), route fragment (`routes.ts`), wire schemas, path literals and anything else both halves must word identically (`public/`, the one browser-safe folder the server half and the browser half may both import), request-context key and guards (`server/guards/`), its composition (`server/<feature>-composition.server.ts`) and its browser code (`ui/<slice>/`, with presenters and step machines in `ui/shared/` and `ui/public/`), whose user-action writes go through React Router fetchers against the feature's own resource routes, and every resource route a fetcher writes to recovers a failed write in a one-line `clientAction`. The coach's time is a feature without a page of its own beyond Settings: `features/coach-schedule` (C23) holds the coach's availability window and meeting room (read and saved, edited through the coach's Settings section and its resource route), the one `coach_time_reservations` table with the Postgres read of her reserved time, and the transaction-scoped writers every appointment kind reserves and releases through, all handed to the assessment-calls and check-ins compositions as composition handles. `packages/infrastructure` (C6) holds adapters and factories — Turnstile bot detection, Resend and in-memory product email, bearer-secret management auth, the feature-flag repository, the payment provider (Stripe and in-memory checkout, subscription, customer-card and webhook adapters, the provider-neutral subscription-change, refund and card-change shapes with the coaching purpose's mapper, and the shared `payment_events` ledger every purpose records its events in from inside its own transaction), the identity provider's invitations (Clerk and in-memory, behind C1's `IdentityInvitations`; a replacement revokes the earlier invitation before it creates the fresh one), the exercise demo videos (a plain filesystem store under `EXERCISE_VIDEO_ROOT` behind C1's `ExerciseVideoStore`, in the `private-files` concern beside the client-resource and progress-photo stores and their shared root confinement, with the format detector behind `ExerciseVideoFormatDetector` in the documents concern), the client's progress photos (an AES-256-GCM encrypted filesystem store and an in-memory double behind C1's `ProgressPhotoStore`, selected by `CLIENT_MEDIA_PROVIDER`), their renditions (`sharp`, behind C1's `ProgressPhotoRenditions`, in the only module allowed to name it), HTTP helpers (the server's request and error helpers under `./http/server`, among them `resolveFieldErrorCode`, which the booking and settings controllers word a refused field with, the streaming multipart reader `readStreamingFormData` and its `isFormDataRequest` test, the size-free `parseByteRange` and the ranged, privately cached `createPrivateMediaResponse` the exercise video plays through; and under the browser-safe `./http` the `fetcherOutcomeOf` every fetcher-written resource route's `clientAction` returns, the progress-reporting `uploadOutcomeOf` with `createUploadProgress`, and `useUploadState`, the one reading of an upload's state the resource upload and the exercise save share) and PWA definitions — and owns the nine adapter-facing contracts `BotVerifier`, `ProductEmail`, `ManagementAuthenticator`, `PaymentEvents`, `PaymentCompletionHandler`, `PaymentSubscriptionChangeHandler`, `PaymentRefundHandler`, `PaymentCardHandler` and `PaymentWebhookIncidents` inside their matching concerns. `packages/test-support` (C16) is a dev-only fixture package no production package declares. `packages/db`, `packages/config`, `packages/content` and `packages/ui` are leaf packages; `packages/ui` publishes eleven concern subpaths and the stylesheet with no root barrel; `calendar` is where a composite over a third-party widget goes so that consumers of `primitives` do not carry the vendor, and `toast` holds the second such composite the same way (`Toaster` over `sonner`), its own subpath rather than a place inside `overlays` beside `Sheet` so that `overlays`' other consumers do not carry `sonner`; the one dialog frame `overlays`' `Dialog` and `layout`'s `ResponsiveSheetDialog` both render is package-private in `lib`, the one subpath both may import. The application composition root is `apps/platform/src/server/container.server.ts`, memoised behind `getPlatformContainer()` and imported only by `root.server.ts`: it builds the shared handles once, including one `createConsoleLogger()` that implements the nine domain incident interfaces and C6's `PaymentWebhookIncidents`, the payments checkout, subscriptions, customer cards and event verifier, the identity invitations, the progress-photo store and renditions, and one `PostgresFeatureFlagRepository` behind one stateless `GetFeatureFlagsUseCase`, selects by the C3 `FEATURE_FLAG_OVERRIDES` concern (`browser` by default when `ENVIRONMENT` is `local` or `test`, `none` elsewhere, `browser` refused when `ENVIRONMENT=production`) whether that reader is handed on raw or wrapped by the `server/feature-flag-overrides/` decorator, which overlays the request's `ff.<FLAG>` query and `__eli_feature_flags` cookie overrides that the override middleware parses and holds in an `AsyncLocalStorage` store around `next()`, and calls the seven feature compositions (`waitlist`, `assessment-calls`, `coaching-sales`, `client-profile`, `client-onboarding`, `accounts`, `store`), all synchronous, handing the same feature-flag reader to the platform, waitlist, assessment-calls and coaching-sales compositions; a composition that hands a port, a handler or a transaction-scoped writer to another returns `{ feature, handles }` (waitlist → `pricingEligibility`; coach schedule → `availability`, `calendar`, `meetingRoom` and `coachTime` for assessment calls and check-ins; assessment calls → `assessmentCallReader`; coaching sales → `paymentCompletionHandler` and `subscriptionChangeHandler`, which the platform's Stripe webhook dispatches to by purpose, `refundHandler` and `paymentCardHandler`, the one handler it hands every refund and every card change, `invitationAcceptance`, which accounts' provisioning asks, `clientIdentities`, `measurementClients` and `unitPreferenceClients` for client profile, and `onboardingClients`, `onboardingReviewStamps`, `onboardingSubmissionStamps` and `reviewStampWriter` for client onboarding, and `clientIds` (its `ClientIds` adapter) for coaching sales; client profile → `measurements`, `unitPreferences`, `recordMeasurementEntry`, `saveClientProfile` and `measurementIds` (its `MeasurementIds` adapter, so onboarding's first entry and a repeat entry draw ids from one source) for client onboarding), the container passes those handles in dependency order (waitlist, coach schedule, assessment calls, coaching sales, client profile, client onboarding, platform, then accounts and store), and only `feature` reaches a request context; `platform-composition.server.ts` constructs no persistence. The platform feature-flag API, the public-site shell and the booking window each execute that reader per request, with no result cache and no production write path; in `browser` mode the same parameterless `execute()` answers with the request's overrides on top and the database row is never written. Only `container.server.ts` imports `server/feature-flag-overrides/`; `root.server.ts` mounts its middleware between Clerk and the feature contexts. Routes and loaders read their feature's request-context key (`accountsContext`, `sessionContext`, `storeContext`, `waitlistContext`, `coachScheduleContext`, `assessmentCallsContext`, `coachingSalesContext`, `clientOnboardingContext`, `clientProfileContext`, `platformContext`, `runtimeConfigContext`) off `args.context` instead of resolving anything from a container; coaching sales' journey guard also sets `clientJourneyContext`, the signed-in client's journey snapshot, which only its own client-journey controller reads. Surfaces (`public-site`, `client-portal`, `coach-portal`) assemble features into products and own only route modules, shells and sections; the client portal wraps every client route in a pathless access layout that runs the accounts role guard and the clients feature's journey gate, which reads her journey step and whether her portal access has ended and then admits her to the ended page only, and inside it a sidebar shell, with Dashboard, Profile and Settings in its sidebar, Dashboard and Profile in its tab bar and the client's name as a link to her profile, holds the dashboard, the client-profile feature's profile page and the coaching-sales feature's settings page, while the clients welcome page, the coaching-sales ended page and the client-onboarding page sit outside the shell; its dashboard composes the coaching-sales program status, the client-onboarding open request and the client-profile measurements nudge; `public-site` reaches the booking feature through a route fragment and one path literal, and the coaching-sales feature through two route fragments, its context key, the bundle selector its pricing page renders, the invitation states its invitation page renders, and the portal-standing guard and portal link its nav's portal link is resolved from; at runtime its layout also reads the route handles of the booking page and of its own pricing page, which both ask for a full-bleed content frame. `coach-portal` owns the assessment-calls page, which composes the assessment-calls feature's section with the coaching-sales feature's sales blocks, because the coaching-sales feature is downstream of assessment calls and neither imports the other's UI, and the client page, which composes the coaching-sales, client-onboarding and client-profile features' coach blocks (among them the client-profile feature's shared measurements table and photo dialog); the coaching-sales feature's clients page imports only its own feature and so lives in that feature.

Boundaries are enforced by three tools. `tools/dependency-cruiser.config.cjs` declares 55 forbidden rules — package export maps and dependency-absence for the workspace packages, and named rules for every app-level boundary (feature internals, surface-to-feature and surface-to-surface, composition root, browser half, route thinness, guards, domain slices, infrastructure subpaths, the feature-flag override folder's single importer, a feature's shared UI never importing its own actor UI, the browser-only design system (a feature's `public/` and every `.server` module never import `packages/ui`), four feature-direction rules — the assessment-calls feature never reaching the coaching-sales feature, the coaching-sales feature never reaching the client-onboarding or the client-profile feature, and the client-profile feature never reaching the client-onboarding feature — Clerk confined to the accounts feature, the root and the identity adapter, `sharp` confined to the infrastructure images concern, `file-type` confined to the infrastructure documents concern, `@fastify/busboy` confined to the http concern's streaming form reader, UI layering, workspace-by-name, stability and five hygiene rules) — `knip.json` holds published surfaces at zero unused exports, files, dependencies and unlisted dependencies, and `tools/domain-layout.mjs` checks the domain package's per-entity folder layout. All three run in `pnpm check:boundaries`, directly inside `pnpm validate` and the Docker builder stage, so a crossing fails workspace validation and image builds. `tools/boundaries.test.mjs` proves the dependency-cruiser rules against `tools/boundary-fixtures/`: 52 of the 53 rules have a fixture (the ten generated `feature-order-*` rules share one backward and one forward fixture, and a schema file reaching a later feature's schema is the fixture that proves schema files sit outside them), and `stability` has none because `moreUnstable` needs dependent counts a fixture tree cannot express — the real-tree cruise is its only proof. `tools/domain-layout.test.mjs` exercises `tools/domain-layout.mjs` against `tools/domain-layout-fixtures/` and against the real domain package; all six of the tool's checks have a failing fixture. Two rules stay review-owned by decision: controller shape (no base controller, no per-request instance field) and failure mapping (an adapter never swallows an infrastructure failure into a result-union member; a named expected condition may be classified and everything else is rethrown). The classified conditions are ENOENT in the filesystem asset store; ENOENT in the encrypted progress-photo store (a missing photo opens as nothing and deletes as a no-op) and EEXIST on a folder it creates; Postgres `22P02` in the assessment-call repository (a malformed booking id is a mistyped URL) and Postgres `23P01` on the `coach_time_reservations_no_overlap` exclusion constraint in C23's `reserveCoachTime` (losing a race for the coach's time is a taken slot), both read through C2's `isCausedByDatabaseError`; the waitlist signup's unique and check violations on its three named constraints, which register at the regular price or refresh consent; Postgres `23505` on `clients_assessment_call_id_unique` in the coaching purchases repository (a second payment for one call) and on `clients_auth_subject_id_unique` in the client invitations repository (a lost acceptance race); Postgres `23505` on `client_onboarding_submissions_client_id_unique` in the client onboardings repository (a second submission is `already-submitted`) and on the partial `client_onboarding_detail_requests_open_per_client_unique` in the onboarding reviews repository (a request while one is open answers `not-in-review`); in the Clerk identity adapter, a revoke answered 404, or 400 with `invitation_revoked`, `invitation_already_revoked` or `invitation_cannot_be_revoked_code` (the earlier invitation is already settled, so the replacement goes on); in the Stripe adapters, a missing checkout session, an already-closed session on expiry, and an unverifiable webhook signature or body; and, in the progress-photo renditions adapter, any throw from `sharp` while reading or re-encoding an upload, answered `refused` like a format outside JPEG, PNG and WebP. Each is recorded in `decisions.md`. The component graph has no cycles at module, component, domain-slice or UI-subpath level. Deployment adds artifact controls outside the dependency rules: the platform package's `files` allowlist emits only `build`, the config, content, domain, infrastructure and UI packlists keep production source and artifacts while excluding colocated test/spec files, and the Docker builder asserts that the deployed artifact contains `build/server/index.js`, has no top-level `src` or `e2e`, has no test/spec file under `node_modules/@eli-coach-platform`, and omits the dev-only test-support package. `tools/check-deploy-resolves.mjs`, proven by `tools/check-deploy-resolves.test.mjs`, resolves every bare import of every emitted server module under `build/server/` (the entry, the PDF worker and the renderer chunk the worker imports) from the `pnpm --prod deploy` layout, in the Docker builder and in `pnpm check:deploy`, the last step of `pnpm validate`; because the server bundle inlines the workspace packages, a vendor their adapters import (`@clerk/backend`, `stripe`, `sharp`) is also declared by the platform package. Environment, Docker, CI, integration and Lighthouse wiring no longer carry `WAITLIST_MODE`; the seed folder `apps/platform/db/seeds/` inserts the persisted flag true after every migrate, and the Playwright suite leaves it alone, taking bookings out of waiting-list mode per browser through the public `ff.WAITLIST_MODE=false` override.

## Current shape (generated)

<!-- arch:summary -->
Components: 26, units: 1233, edges: 4310, component cycles: 1, uncovered modules: 0.

| Component | Units | Fan-in | Fan-out | I | A | D | Zone |
|---|---|---|---|---|---|---|---|
| C1 packages/domain | 344 | 261 | 0 | 0 | 0.58 | 0.42 | none |
| C2 packages/db | 6 | 74 | 0 | 0 | 0.15 | 0.85 | pain |
| C3 packages/config | 17 | 51 | 0 | 0 | 0.23 | 0.77 | none |
| C4 packages/content | 9 | 23 | 0 | 0 | 0.17 | 0.83 | pain |
| C5 packages/ui | 125 | 168 | 0 | 0 | 0.09 | 0.91 | pain |
| C6 packages/infrastructure | 105 | 146 | 35 | 0.19 | 0.17 | 0.64 | pain |
| C7 apps/platform/src/features/store | 50 | 10 | 38 | 0.79 | 0.15 | 0.06 | none |
| C8 apps/platform/src/features/waitlist | 22 | 10 | 15 | 0.6 | 0.2 | 0.2 | none |
| C9 apps/platform/src/features/accounts | 20 | 58 | 15 | 0.21 | 0.23 | 0.56 | none |
| C11 apps/platform/src/surfaces/public-site | 31 | 1 | 23 | 0.96 | 0.18 | 0.14 | none |
| C12 apps/platform/src/surfaces/client-portal | 13 | 1 | 9 | 0.9 | 0.09 | 0.01 | none |
| C13 apps/platform/src/surfaces/coach-portal | 11 | 1 | 9 | 0.9 | 0.03 | 0.07 | none |
| C14 apps/platform/src/server | 27 | 3 | 18 | 0.86 | 0.22 | 0.07 | none |
| C15 apps/platform | 5 | 0 | 4 | 1 | 0 | 0 | none |
| C16 packages/test-support | 4 | 0 | 0 | undefined | 0.12 | undefined | none |
| C17 apps/platform/src/features/assessment-calls | 46 | 32 | 38 | 0.54 | 0.2 | 0.26 | none |
| C18 apps/platform/src/features/coaching-sales | 76 | 10 | 65 | 0.87 | 0.14 | 0.01 | none |
| C19 apps/platform/src/features/client-onboarding | 52 | 6 | 46 | 0.88 | 0.21 | 0.1 | none |
| C20 apps/platform/src/features/client-profile | 41 | 16 | 37 | 0.7 | 0.14 | 0.16 | none |
| C21 apps/platform/src/features/client-resources | 41 | 9 | 36 | 0.8 | 0.14 | 0.06 | none |
| C22 apps/platform/src/features/check-ins | 73 | 12 | 57 | 0.83 | 0.17 | 0 | none |
| C23 apps/platform/src/features/coach-schedule | 16 | 9 | 12 | 0.57 | 0.12 | 0.31 | none |
| C24 apps/platform/src/features/clients | 47 | 32 | 39 | 0.55 | 0.18 | 0.27 | none |
| C25 apps/platform/src/features/exercise-library | 22 | 5 | 19 | 0.79 | 0.14 | 0.07 | none |
| C26 apps/platform/src/features/nutrition-library | 18 | 5 | 16 | 0.76 | 0.15 | 0.08 | none |
| C27 apps/platform/src/features/notifications | 12 | 6 | 9 | 0.6 | 0.22 | 0.18 | none |

| From | To | Importing modules |
|---|---|---|
| C6 | C1 | 25 |
| C6 | C2 | 4 |
| C6 | C3 | 10 |
| C7 | C1 | 18 |
| C7 | C2 | 6 |
| C7 | C3 | 5 |
| C7 | C4 | 3 |
| C7 | C5 | 6 |
| C7 | C6 | 17 |
| C8 | C1 | 8 |
| C8 | C2 | 3 |
| C8 | C3 | 2 |
| C8 | C4 | 3 |
| C8 | C5 | 2 |
| C8 | C6 | 8 |
| C9 | C1 | 10 |
| C9 | C2 | 3 |
| C9 | C3 | 2 |
| C9 | C5 | 3 |
| C9 | C6 | 3 |
| C9 | C7 | 2 |
| C11 | C1 | 1 |
| C11 | C3 | 4 |
| C11 | C4 | 4 |
| C11 | C5 | 16 |
| C11 | C6 | 4 |
| C11 | C7 | 5 |
| C11 | C8 | 7 |
| C11 | C9 | 5 |
| C11 | C14 | 1 |
| C11 | C17 | 4 |
| C11 | C18 | 2 |
| C11 | C24 | 4 |
| C12 | C3 | 1 |
| C12 | C5 | 4 |
| C12 | C6 | 3 |
| C12 | C9 | 5 |
| C12 | C18 | 3 |
| C12 | C19 | 2 |
| C12 | C20 | 4 |
| C12 | C21 | 3 |
| C12 | C22 | 3 |
| C12 | C24 | 4 |
| C12 | C27 | 1 |
| C13 | C5 | 7 |
| C13 | C9 | 4 |
| C13 | C17 | 4 |
| C13 | C18 | 2 |
| C13 | C19 | 1 |
| C13 | C20 | 1 |
| C13 | C21 | 3 |
| C13 | C22 | 5 |
| C13 | C23 | 2 |
| C13 | C24 | 5 |
| C13 | C25 | 2 |
| C13 | C26 | 2 |
| C13 | C27 | 1 |
| C14 | C1 | 9 |
| C14 | C2 | 1 |
| C14 | C3 | 7 |
| C14 | C4 | 1 |
| C14 | C6 | 8 |
| C14 | C7 | 2 |
| C14 | C8 | 2 |
| C14 | C9 | 2 |
| C14 | C17 | 2 |
| C14 | C18 | 2 |
| C14 | C19 | 2 |
| C14 | C20 | 2 |
| C14 | C21 | 2 |
| C14 | C22 | 2 |
| C14 | C23 | 2 |
| C14 | C24 | 2 |
| C14 | C25 | 2 |
| C14 | C26 | 2 |
| C14 | C27 | 2 |
| C15 | C3 | 1 |
| C15 | C5 | 2 |
| C15 | C7 | 1 |
| C15 | C8 | 1 |
| C15 | C9 | 3 |
| C15 | C11 | 1 |
| C15 | C12 | 1 |
| C15 | C13 | 1 |
| C15 | C14 | 2 |
| C15 | C17 | 1 |
| C15 | C18 | 1 |
| C15 | C19 | 1 |
| C15 | C20 | 1 |
| C15 | C21 | 1 |
| C15 | C22 | 1 |
| C15 | C23 | 1 |
| C15 | C24 | 1 |
| C15 | C25 | 1 |
| C15 | C26 | 1 |
| C15 | C27 | 1 |
| C17 | C1 | 13 |
| C17 | C2 | 3 |
| C17 | C3 | 4 |
| C17 | C4 | 3 |
| C17 | C5 | 17 |
| C17 | C6 | 12 |
| C17 | C9 | 1 |
| C17 | C23 | 1 |
| C18 | C1 | 31 |
| C18 | C2 | 7 |
| C18 | C3 | 6 |
| C18 | C5 | 25 |
| C18 | C6 | 21 |
| C18 | C9 | 4 |
| C18 | C17 | 5 |
| C18 | C24 | 8 |
| C19 | C1 | 29 |
| C19 | C2 | 5 |
| C19 | C3 | 2 |
| C19 | C4 | 1 |
| C19 | C5 | 15 |
| C19 | C6 | 12 |
| C19 | C9 | 5 |
| C19 | C17 | 1 |
| C19 | C20 | 8 |
| C19 | C24 | 2 |
| C20 | C1 | 27 |
| C20 | C2 | 7 |
| C20 | C3 | 1 |
| C20 | C5 | 12 |
| C20 | C6 | 7 |
| C20 | C9 | 5 |
| C20 | C17 | 2 |
| C20 | C24 | 1 |
| C21 | C1 | 17 |
| C21 | C2 | 3 |
| C21 | C3 | 1 |
| C21 | C5 | 13 |
| C21 | C6 | 11 |
| C21 | C9 | 4 |
| C21 | C24 | 2 |
| C22 | C1 | 21 |
| C22 | C2 | 5 |
| C22 | C3 | 2 |
| C22 | C4 | 7 |
| C22 | C5 | 19 |
| C22 | C6 | 18 |
| C22 | C9 | 6 |
| C22 | C17 | 9 |
| C22 | C23 | 3 |
| C22 | C24 | 2 |
| C22 | C27 | 1 |
| C23 | C1 | 6 |
| C23 | C2 | 6 |
| C23 | C5 | 2 |
| C23 | C6 | 2 |
| C23 | C9 | 2 |
| C23 | C17 | 1 |
| C23 | C22 | 1 |
| C24 | C1 | 21 |
| C24 | C2 | 11 |
| C24 | C3 | 2 |
| C24 | C4 | 1 |
| C24 | C5 | 13 |
| C24 | C6 | 7 |
| C24 | C9 | 5 |
| C24 | C17 | 3 |
| C25 | C1 | 10 |
| C25 | C2 | 3 |
| C25 | C3 | 1 |
| C25 | C5 | 7 |
| C25 | C6 | 7 |
| C25 | C9 | 3 |
| C26 | C1 | 9 |
| C26 | C2 | 4 |
| C26 | C5 | 4 |
| C26 | C6 | 3 |
| C26 | C9 | 3 |
| C27 | C1 | 6 |
| C27 | C2 | 3 |
| C27 | C5 | 1 |
| C27 | C6 | 3 |
| C27 | C9 | 1 |
| C27 | C24 | 1 |
<!-- /arch:summary -->

## Reading this folder

- `model/components.json`: the enforced components and the path globs that belong to each.
- `model/rules.json`: the rings and the glob rules that classify a path's ring, kind, and actors.
- `model/overrides.json`: per-path exceptions to the rules, by exact path.
- `model/boundaries.json`: the ports rules declare, their owners and humble sides, shared data shapes, and cohesion groups.
- `decisions.md`: deferred decisions, why each cohesion group exists, cohesion position per component, intended exceptions, open questions.
- `conventions.md`: where a file goes and what it may import; the folder layout the dependency rules assume.

Terms: a *unit* is a class, module, function, interface, or data structure. A *component* is a group of units behind one published interface that tooling enforces. An *edge* from A to B means A's source code names B. *Policy* is business rules; *detail* is databases, frameworks, transports, vendors, UI, and the data shapes they produce. A *ring* is a band of units at one level of distance from inputs and outputs; dependencies point inward.
