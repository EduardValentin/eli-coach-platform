# Units

Header: date 2026-09-18, commits 7d92dc22 (PR #229, reviewed at a79f507d, base 79fa1e95) and 6c043f97, 63100724 and eced8490 (PR #230, base 843d8261), scope 43 changed implementation files in C1, C6, C7, C8 and C14 plus direct neighbors, and the C5 mobile-navigation modules with their public-site and portal consumers, mode partial change review (run 8 baseline e8690f45).

One row per module by default; ports, entity/model sets, and separate implementations get their own rows. Test files (`*.test.*`) are the outermost ring and are not mapped as units; the tests that import each module are listed in the slice returns under `.architecture/slices/`. Component IDs refer to `components.md`. "Published" means the symbol is reachable from outside its component through an export map, a route registration or a rule-sanctioned folder (`contracts/`, `ui/shared/`, `server/guards/`, `routes.ts`).

| ID | Path:symbol | Component | Kind | Ring | Visibility | Actors | Status |
|---|---|---|---|---|---|---|---|
| U100 | store/api/acquisitions/acquisitions-controller.server.ts:StoreAcquisitionController | C7 | adapter | adapters | public | visitor, vendor:cloudflare-turnstile | present |
| U101 | store/api/acquisitions/acquisitions.ts:module | C7 | framework-glue | frameworks | published (routed) | visitor | present |
| U102 | store/api/catalog/catalog-controller.server.ts:StoreCatalogController | C7 | adapter | adapters | public | visitor | present |
| U103 | store/api/catalog/catalog.ts:module | C7 | framework-glue | frameworks | published (routed) | visitor | present |
| U104 | store/api/covers/covers-controller.server.ts:StoreCoverAssetController | C7 | adapter | adapters | public | visitor | present |
| U105 | store/api/covers/covers.ts:module | C7 | framework-glue | frameworks | published (routed) | visitor | present |
| U106 | store/api/downloads/download-recovery.html:module | C7 | boundary-data | adapters | private | visitor | present |
| U107 | store/api/downloads/downloads-controller.server.ts:StoreDownloadController | C7 | adapter | adapters | public | visitor | present |
| U108 | store/api/downloads/downloads.ts:module | C7 | framework-glue | frameworks | published (routed) | visitor | present |
| U109 | store/api/management/management-controller.server.ts:StoreProductManagementController | C7 | adapter | adapters | public | operator/platform, management API caller | present |
| U110 | store/api/management/management-product-validations.ts:module | C7 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U111 | store/api/management/management-product-versions.ts:module | C7 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U112 | store/api/management/management-product.ts:module | C7 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U113 | store/api/management/management-products.ts:module | C7 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U114 | store/api/downloads/zip-stream.server.ts:ZipDeliveryStream | C7 | adapter | adapters | public | visitor | present |
| U115 | store/contracts/store-management.ts:module | C7 | boundary-data | adapters | published (contracts) | operator/platform | present |
| U116 | store/contracts/store.ts:module | C7 | boundary-data | adapters | published (contracts) | visitor | present |
| U117 | store/data/acquisitions/acquisition-repository.server.ts:PostgresStoreAcquisitionRepository | C7 | adapter | adapters | public | visitor, operator/platform | present |
| U118 | store/data/assets/asset-digest.server.ts:ProductAssetSha256Digest | C7 | adapter | adapters | public | operator/platform | present |
| U119 | store/data/assets/asset-store.server.ts:FilesystemProductAssetStore | C7 | adapter | adapters | public | visitor, operator/platform | present |
| U120 | store/data/catalog/catalog-repository.server.ts:PostgresStoreCatalogRepository | C7 | adapter | adapters | public | visitor | present |
| U121 | store/data/download-grants/download-grant-repository.server.ts:PostgresDownloadGrantRepository | C7 | adapter | adapters | public | visitor | present |
| U122 | store/data/download-grants/download-token.server.ts:RandomDownloadTokenGenerator | C7 | adapter | adapters | public | visitor | present |
| U123 | store/data/download-grants/download-token.server.ts:DownloadTokenSha256 | C7 | adapter | adapters | public | visitor | present |
| U124 | store/data/download-grants/download-token.server.ts:PayloadSha256Digest | C7 | adapter | adapters | public | visitor | present |
| U125 | store/data/publications/publication-repository.server.ts:PostgresStoreProductPublicationRepository | C7 | adapter | adapters | public | operator/platform | present |
| U126 | store/data/schema.server.ts:module | C7 | framework-glue | frameworks | published (drizzle-kit glob) | operator/platform | present |
| U127 | store/email/create-product-delivery.server.ts:createProductDelivery | C7 | adapter factory | adapters | public | operator/platform, vendor:resend | renamed from createStoreDeliveryService (D3) |
| U129 | store/email/email-product-delivery.server.ts:EmailProductDelivery | C7 | adapter | adapters | public | visitor, vendor:resend | renamed from EmailStoreDeliveryService (D3) |
| U130 | store/email/store-delivery-email-template.server.tsx:StoreDeliveryEmailTemplate | C7 | view | adapters | public | visitor | present |
| U131 | store/email/store-delivery-email.server.ts:createStoreDeliveryEmailContent | C7 | adapter | adapters | public | visitor | present |
| U132 | store/contracts/paths.ts:module (STORE_ROUTE_SEGMENT, STORE_PATH, STORE_DOWNLOAD_PATH, storeProductPath, STORE_API_PATHS) | C7 | boundary-data | adapters | published (contracts) | visitor, operator/platform | present |
| U133 | store/routes.ts:storePublicRoutes, storeApiRoutes | C7 | framework-glue | frameworks | published (registry) | operator/platform | present |
| U134 | store/server/store-composition.server.ts:composeStoreFeature (+StoreFeature, StoreFeatureHandles) | C7 | composition | composition | published (container only) | operator/platform | present |
| U135 | store/server/guards/store-context.server.ts:storeContext | C7 | framework-glue | frameworks | published (routes and loaders) | operator/platform | present |
| U136 | store/data/assets/asset-confinement.server.ts:module (isPathWithinRoot, isConfinedAsset, matchesAssetIdentity, matchesAssetDigest) | C7 | entity rule (pure) | entities | public | operator/platform | present |
| U200 | store/ui/public/api-client.ts:STORE_CATALOG_API_URL | C7 | boundary-data | adapters | public | visitor | present |
| U201 | store/ui/public/api-client.ts:STORE_ACQUISITIONS_API_PATH/URL | C7 | boundary-data | adapters | public | visitor | present |
| U202 | store/ui/public/api-client.ts:useStoreCatalogFetcher | C7 | adapter | adapters | public | visitor | present |
| U203 | store/ui/public/api-client.ts:useStoreAcquisitionFetcher | C7 | adapter | adapters | public | visitor | present |
| U204 | store/ui/public/cart/cart.ts:StoreCartState | C7 | boundary-data | adapters | published | visitor | present |
| U205 | store/ui/public/cart/cart.ts:createStoreCartStore | C7 | adapter (calls reconcileCart from C1) | adapters | published | visitor | present |
| U206 | store/ui/public/cart/cart.ts:useHydrateStoreCart | C7 | adapter | adapters | public | visitor | present |
| U207 | store/ui/public/cart/cart.ts:useReconcileStoreCartCatalog | C7 | adapter | adapters | public | visitor | present |
| U208 | store/ui/public/cart/cart.ts:selectStoreCartProducts | C7 | adapter | adapters | public | visitor | present |
| U209 | store/ui/public/cart/cart-storage.ts:module (STORE_CART_STORAGE_KEY, PersistedStoreCart, STORE_CART_PERSIST_OPTIONS) | C7 | adapter | adapters | public | visitor | present |
| U210 | store/ui/public/cart/cart-provider.tsx:StoreCartProvider | C7 | framework-glue | frameworks | published | visitor | present |
| U211 | store/ui/public/cart/cart-provider.tsx:useStoreCart | C7 | framework-glue | frameworks | published | visitor | present |
| U212 | store/ui/public/cart/cart-drawer.tsx:StoreCartButton | C7 | view | frameworks | published | visitor | present |
| U213 | store/ui/public/cart/cart-drawer.tsx:StoreCartDrawer | C7 | mixed | frameworks | published | visitor | present |
| U214 | store/ui/public/cart/cart-focus.ts:createFocusRestoreTracker | C7 | adapter (pure, tested) | adapters | public | visitor accessibility | present |
| U218 | store/ui/public/acquisition/acquisition-form.ts:useStoreAcquisition | C7 | hook over the step machine | adapters | public | visitor | present |
| U219 | store/ui/public/acquisition/acquisition-flow.ts:module (reduceAcquisitionFlow, resolveAcquisitionError, flow types) | C7 | step machine (pure, tested) | adapters | public | visitor | present |
| U221 | store/ui/public/catalog/catalog-filters.ts:STORE_FILTER_DIMENSIONS and the filter functions (collectFilterDimensions, offersAnyFilter, resolveFilterSelection, canonicalizeFilterSearchParams, resolveCanonicalFilterTarget, filterProducts, removeFilterParams, haveOnlyFilterParamsChanged) | C7 | mixed | adapters | public | visitor | present |
| U229 | store/ui/public/catalog/catalog-filter-controls.tsx:useStoreCatalogFilterFocus, StoreCatalogFilters | C7 | view | frameworks | public | visitor | present |
| U231 | store/ui/public/catalog/catalog-page.tsx:loader | C7 | adapter | adapters | published (routed) | visitor | present |
| U233 | store/ui/public/catalog/catalog-page.tsx:module (CatalogRoute, meta, shouldRevalidate, ErrorBoundary) | C7 | view | frameworks | published (routed) | visitor | present |
| U237 | store/ui/public/catalog/catalog-view.tsx:CatalogView, CatalogUnavailableView | C7 | view | frameworks | public | visitor | present |
| U240 | store/ui/public/catalog/catalog-presenter.ts:presentCatalog (+CatalogPresentation) | C7 | presenter | adapters | private to the feature | visitor | present |
| U241 | store/ui/public/download/download-page.tsx:module (DownloadRoute, meta) | C7 | view | frameworks | published (routed) | visitor | present |
| U244 | store/ui/public/download/download-state.ts:module (DOWNLOAD_API_URL, resolvePrivateDownloadToken, usePrivateDownloadToken) | C7 | adapter | adapters | public | visitor | present |
| U247 | store/ui/public/product/product-page.tsx:loader | C7 | adapter | adapters | published (routed) | visitor | present |
| U248 | store/ui/public/product/product-page.tsx:module (ProductDetailsRoute, meta) | C7 | view | frameworks | published (routed) | visitor | present |
| U300 | waitlist/api/waitlist.ts:action | C8 | framework-glue | frameworks | published (routed) | visitor, operator/platform | present |
| U301 | waitlist/api/waitlist-controller.server.ts:WaitlistController | C8 | adapter | adapters | public | visitor, operator/platform | present |
| U302 | waitlist/contracts/waitlist.ts:module | C8 | boundary-data | adapters | published (contracts) | visitor | present |
| U303 | waitlist/data/repository.server.ts:PostgresWaitlistRepository | C8 | adapter | adapters | public | operator/platform | present |
| U304 | waitlist/data/schema.server.ts:waitlistEntriesTable | C8 | boundary-data | adapters | public | operator/platform | present |
| U305 | waitlist/email/create-waitlist-confirmation.server.ts:createWaitlistConfirmation | C8 | adapter factory | adapters | public | operator/platform, vendor:resend | renamed from createWaitlistConfirmationService (D3) |
| U307 | waitlist/email/email-waitlist-confirmation.server.ts:EmailWaitlistConfirmation | C8 | adapter | adapters | public | operator/platform, vendor:resend | renamed from EmailWaitlistConfirmationService (D3) |
| U308 | waitlist/email/waitlist-confirmation-email-template.server.tsx:WaitlistConfirmationEmailTemplate | C8 | view | adapters | public | operator/platform | present |
| U309 | waitlist/email/waitlist-confirmation-email.server.ts:createWaitlistConfirmationEmailContent | C8 | adapter | adapters | public | operator/platform | present |
| U310 | waitlist/ui/public/api-client.ts:useJoinWaitlistFetcher (+WAITLIST_API_URL) | C8 | adapter | adapters | public | visitor | present |
| U311 | waitlist/ui/public/availability-status.tsx:WaitlistAvailabilityStatus | C8 | view | adapters | published | visitor | present |
| U312 | waitlist/ui/public/confetti.ts:launchWaitlistConfetti | C8 | adapter | adapters | public | visitor | present |
| U313 | waitlist/ui/public/email-form.tsx:WaitlistEmailForm | C8 | view over WaitlistPresentation | adapters | published | visitor | present |
| U314 | waitlist/ui/public/errors.ts:module | C8 | adapter | adapters | public | visitor | present |
| U315 | waitlist/ui/public/submission.ts:useWaitlistSubmission | C8 | hook over the step machine | adapters | public | visitor | present |
| U317 | waitlist/ui/public/submission-flow.ts:resolveSubmissionState | C8 | step machine (pure, tested) | adapters | public | visitor | present |
| U318 | waitlist/ui/shared/waitlist-presentation.ts:presentWaitlist (+WaitlistPresentation) | C8 | presenter | adapters | published (ui/shared) | visitor | present |
| U319 | waitlist/contracts/paths.ts:WAITLIST_API_PATH | C8 | boundary-data | adapters | published (contracts) | visitor | present |
| U320 | waitlist/routes.ts:waitlistApiRoutes | C8 | framework-glue | frameworks | published (registry) | operator/platform | present |
| U321 | waitlist/server/waitlist-composition.server.ts:composeWaitlistFeature (+WaitlistFeature, WaitlistFeatureHandles) | C8 | composition | composition | published (container only) | operator/platform | present |
| U322 | waitlist/server/guards/waitlist-context.server.ts:waitlistContext | C8 | framework-glue | frameworks | published (route and layout loader) | operator/platform | present |
| U316 | public-site/sections/pricing/bundle-selector.tsx:BundleSelector | C11 | view | frameworks | section-private | visitor | moved from features/coaching-bundles/ui/public/ with C10 dissolved (D5) |
| U323 | public-site/sections/pricing/coaching-bundles.ts:presentCoachingBundles (+CoachingBundleCard, the module-private BUNDLES and BENEFITS literals, toCard, savingsBadge, formatPrice) | C11 | presenter over a literal | adapters | section-private | visitor, operator/platform (pricing) | moved from features/coaching-bundles/ui/shared/ with C10 dissolved (D5); the three bundles, their benefits and both price tiers are now a module literal |
| U400 | accounts/api/account-controller.server.ts:AccountController | C9 | adapter | adapters | published | client, coach | present |
| U401 | accounts/api/account.ts:loader | C9 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U402 | accounts/api/clerk-webhooks.ts:action | C9 | framework-glue | frameworks | published (routed) | vendor:clerk, operator/platform | present |
| U403 | accounts/api/webhook-controller.server.ts:AccountWebhookController | C9 | adapter | adapters | public | vendor:clerk, operator/platform | present |
| U404 | accounts/contracts/account.ts:accountResponseSchema | C9 | boundary-data | adapters | published (contracts) | client, coach | present |
| U405 | accounts/contracts/account.ts:PublicSessionState | C9 | boundary-data | adapters | published (contracts) | visitor, client, coach | present |
| U406 | accounts/data/account-repository.server.ts:PostgresAccountRepository | C9 | adapter | adapters | public | operator/platform | present |
| U407 | accounts/data/schema.server.ts:module (accountsTable, accountRoleEnum) | C9 | adapter | adapters | public | operator/platform | present |
| U408 | accounts/server/guards/session-context.server.ts:sessionContext | C9 | framework-glue | frameworks | published (guards) | operator/platform | present |
| U409 | accounts/server/guards/session-context.server.ts:ResolvedSession (account: AccountSnapshot; default `{ kind: "anonymous" }`) | C9 | boundary-data | adapters | published (guards) | operator/platform | present |
| U410 | accounts/server/account-resolution-middleware.server.ts:createAccountResolutionMiddleware | C9 | adapter | adapters | published (root.server.ts) | operator/platform, vendor:clerk | present |
| U411 | accounts/server/guards/require-portal-access.server.ts:requirePortalAccess | C9 | adapter | adapters | published (portal layouts) | client, coach | present |
| U412 | accounts/server/guards/require-account.server.ts:requireApiAccount | C9 | adapter | adapters | published (U400) | client, coach | present |
| U413 | accounts/ui/public/auth-nav-actions.tsx:AuthNavActions | C9 | view | frameworks | published (C11) | visitor, client, coach | present |
| U414 | accounts/ui/public/sign-in-failed-page.tsx:module (SignInFailedRoute, meta) | C9 | view | frameworks | published (routed) | visitor | present |
| U415 | accounts/ui/public/sign-in-failed-page.tsx:loader | C9 | adapter | adapters | published (routed) | visitor | present |
| U416 | accounts/ui/shared/access-denied-page.tsx:AccessDeniedPage | C9 | view | frameworks | published (root.tsx) | client, coach | present |
| U417 | accounts/ui/shared/access-denied-page.tsx:resolveAccessDeniedRecovery | C9 | adapter | adapters | published (root.tsx) | client, coach | present |
| U418 | accounts/contracts/paths.ts:module (SIGN_IN_FAILED_PATH, CLIENT_PORTAL_ROUTE_SEGMENT, COACH_PORTAL_ROUTE_SEGMENT, the portal paths, PORTAL_PATH_BY_ROLE) | C9 | boundary-data | adapters | published (contracts) | client, coach, visitor | present |
| U419 | accounts/routes.ts:accountsPublicRoutes, accountsApiRoutes | C9 | framework-glue | frameworks | published (registry) | operator/platform | present |
| U420 | accounts/server/accounts-composition.server.ts:composeAccountsFeature (+AccountsFeature, AccountsFeatureHandles) | C9 | composition | composition | published (container only) | operator/platform | present |
| U421 | accounts/server/guards/accounts-context.server.ts:accountsContext | C9 | framework-glue | frameworks | published (guards) | operator/platform | present |
| U500 | server/container.server.ts:createPlatformContainer | C14 | composition-root | composition | published (root.server.ts) | operator/platform | present |
| U501 | server/container.server.ts:getPlatformContainer | C14 | composition-root | composition | published (root.server.ts) | operator/platform | present |
| U502 | server/container.server.ts:PlatformContainer (`{ accounts, closeDatabase, platform, store, waitlist }`) | C14 | boundary-data | composition | published | operator/platform | present |
| U503 | server/database.server.ts:createPlatformDatabase | C14 | adapter | frameworks | published | operator/platform | present |
| U504 | server/database.server.ts:DatabaseClosedError | C14 | adapter | frameworks | published | operator/platform | present |
| U505 | server/database.server.ts:PlatformDatabase | C14 | boundary-data | frameworks | published | operator/platform | present |
| U510 | server/runtime-environment.server.ts:getRuntimeEnvironment | C14 | adapter | frameworks | published (container only) | operator/platform | present |
| U511 | server/api/meta/app-metadata-controller.server.ts:AppMetadataController | C14 | adapter | adapters | published | operator/platform | present |
| U512 | server/api/meta/service-metadata.ts:appMetadataSchema | C14 | boundary-data | adapters | published | operator/platform | present |
| U513 | server/api/feature-flags/feature-flags.ts:module (action, loader) | C14 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U514 | server/api/meta/meta.ts:loader | C14 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U515 | server/api/readyz/readyz.ts:loader | C14 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U516 | server/api/readyz/readyz-controller.server.ts:ReadyzController | C14 | adapter | adapters | published | operator/platform | present |
| U517 | server/feature-contexts.server.ts:createFeatureContextMiddleware | C14 | composition | composition | published (root.server.ts) | operator/platform | present |
| U518 | server/platform-composition.server.ts:composePlatformFeature (+PlatformFeature, PlatformControllers, RuntimeConfig, PlatformFeatureHandles) | C14 | composition | composition | published (container only) | operator/platform | present |
| U519 | server/logger.server.ts:createConsoleLogger (+private ConsoleLogger) | C14 | adapter | adapters | container-only | operator/platform | altered in a79f507d; structurally implements U1193 and U1194 |
| U530 | server/guards/platform-context.server.ts:platformContext | C14 | framework-glue | frameworks | published (server/api only) | operator/platform | present |
| U531 | server/guards/runtime-config-context.server.ts:runtimeConfigContext | C14 | framework-glue | frameworks | published (public-site layout loader) | operator/platform | present |
| U532 | server/api/routes.ts:platformApiRoutes | C14 | framework-glue | frameworks | published (registry) | operator/platform | present |
| U533 | server/api/feature-flags/feature-flags-contract.ts:module (featureFlagContextSchema, featureFlagSnapshotSchema, FeatureFlagContext, FeatureFlagSnapshot) | C14 | boundary-data | adapters | published | operator/platform | present |
| U534 | server/api/feature-flags/feature-flags-controller.server.ts:FeatureFlagController | C14 | adapter | adapters | published | operator/platform | present |
| U535 | server/test-support/request-args.ts:createRequestArgs (+contextEntry, ContextEntry) | C14 | test helper | tests | test-only (no production importer; excluded from `no-orphans` by exact path) | operator/platform | present |
| U520 | root.tsx:module (Root, Layout, ErrorBoundary, meta, links) | C15 | mixed | frameworks | published (routed) | visitor, client, coach | present |
| U521 | root.server.ts:module (middleware, loader) — Clerk, `createFeatureContextMiddleware(getPlatformContainer)`, `createAccountResolutionMiddleware()`; the container's only importer | C15 | composition-root | composition | published | operator/platform | present |
| U522 | root-error-page.tsx:RootErrorPage | C15 | view | frameworks | published | visitor, client, coach | present |
| U523 | routes.ts:module — a concatenation of seven route fragments, no path literals | C15 | framework-glue | frameworks | published | operator/platform | present |
| U524 | app.css:module | C15 | framework-glue | frameworks | published | operator/platform | present |
| U525 | types/canvas-confetti.d.ts:module | C15 | framework-glue | frameworks | private | operator/platform | present |
| U526 | apps/platform/db/drizzle.config.ts:module | C15 | framework-glue | frameworks | published (CLI) | operator/platform | present |
| U527 | apps/platform/vite.config.ts:module | C15 | framework-glue | frameworks | published (build) | operator/platform | present |
| U528 | apps/platform/react-router.config.ts:module | C15 | framework-glue | frameworks | published (build) | operator/platform | present |
| U600 | public-site/shell/logo.tsx:Logo | C11 | view | frameworks | public | operator/platform | present |
| U601 | public-site/shell/public-navigation.tsx:PublicNavigation | C11 | view | frameworks | public | visitor | present |
| U602 | public-site/shell/public-footer.tsx:PublicFooter | C11 | view | frameworks | public | visitor | present |
| U603 | public-site/shell/public-layout.tsx:PublicLayout (takes `WaitlistPresentation`) | C11 | view | frameworks | public | visitor, operator/platform | present |
| U604 | public-site/shell/layout.server.ts:loader — `presentWaitlist(...)`; bot detection and appBasePath from `runtimeConfigContext`, session from `sessionContext`, waitlist from `waitlistContext` | C11 | adapter | adapters | published (routed via layout.tsx) | visitor, operator/platform | present |
| U605 | public-site/shell/layout.server.ts:PublicLayoutLoaderData | C11 | boundary-data | adapters | public | visitor | present |
| U606 | public-site/shell/layout.tsx:module (PublicLayoutRoute, shouldRevalidate, PublicOutletContext) | C11 | mixed | frameworks | published (routed) | visitor | present |
| U609 | public-site/sections/about/about-content.ts:module | C11 | boundary-data | adapters | public | operator/platform | present |
| U610 | public-site/sections/about/instagram-story-widget.tsx:InstagramStoryWidget | C11 | view | frameworks | public | visitor | present |
| U611 | public-site/sections/about/about.tsx:PublicAbout | C11 | view | frameworks | public | visitor, operator/platform | present |
| U612 | public-site/sections/cycle-nutrition/cycle-nutrition-content.ts:module | C11 | mixed | adapters | public | operator/platform | present |
| U613 | public-site/sections/cycle-nutrition/cycle-nutrition.css:module | C11 | framework-glue | frameworks | private | operator/platform | present |
| U614 | public-site/sections/cycle-nutrition/cycle-nutrition.tsx:PublicCycleNutrition | C11 | view | frameworks | public | visitor | present |
| U615 | public-site/sections/footer-cta/footer-cta.tsx:PublicFooterCta, FooterCtaShell | C11 | view (re-derives the closed/unavailable/open copy branch) | frameworks | public | visitor, operator/platform | present |
| U617 | public-site/sections/hero/hero.tsx:PublicHero | C11 | view (re-derives the copy branch) | frameworks | public | visitor, operator/platform | present |
| U619 | public-site/sections/legal/legal-document-view.tsx:LegalDocumentView (renders `effectiveDateLabel` inside a `<time dateTime=…>`) | C11 | view | frameworks | public | visitor | present |
| U620 | public-site/sections/legal/legal-nav.tsx:LegalNav | C11 | view | frameworks | public | visitor | present |
| U621 | public-site/sections/my-method/my-method.tsx:PublicMyMethod | C11 | view | frameworks | public | visitor | present |
| U622 | public-site/sections/platform/platform-content.ts:module | C11 | boundary-data | adapters | public | operator/platform | present |
| U623 | public-site/sections/platform/platform.tsx:PublicPlatform | C11 | view | frameworks | public | visitor | present |
| U624 | public-site/sections/workouts/workouts.tsx:PublicWorkouts (calls `resolveSwipeIntent`) | C11 | view | frameworks | public | visitor | present |
| U625 | public-site/pages/home.tsx:HomeRoute (+meta) | C11 | view | frameworks | published (routed) | visitor | present |
| U626 | public-site/pages/pricing.tsx:PricingRoute (+meta) — calls `presentCoachingBundles` and passes cards, benefits and `showsWaitlistPricing` to `BundleSelector` | C11 | view | frameworks | published (routed) | visitor, operator/platform | present |
| U629 | public-site/pages/blog.tsx:BlogRoute (+meta) | C11 | view | frameworks | published (routed) | visitor | present |
| U630 | public-site/pages/privacy.tsx:PrivacyRoute (+meta) | C11 | view | frameworks | published (routed) | visitor | present |
| U631 | public-site/pages/terms.tsx:TermsRoute (+meta) | C11 | view | frameworks | published (routed) | visitor | present |
| U632 | public-site/paths.ts:PRICING_PATH | C11 | boundary-data | adapters | public | visitor | present |
| U633 | public-site/routes.ts:publicSiteRoutes | C11 | framework-glue | frameworks | published (registry) | operator/platform | present |
| U634 | public-site/sections/workouts/swipe-intent.ts:resolveSwipeIntent | C11 | entity rule (pure, tested) | entities | public | visitor | present |
| U700 | client-portal/api/manifest.ts:loader | C12 | adapter | adapters | published (routed) | client, operator/platform | present |
| U701 | client-portal/api/readyz.ts:loader | C12 | adapter | adapters | published (routed) | operator/platform | present |
| U702 | client-portal/api/sw.ts:loader | C12 | adapter | adapters | published (routed) | client, operator/platform | present |
| U703 | client-portal/api/service-worker.js:module | C12 | framework-glue | frameworks | private (loaded via `?raw` import) | client, operator/platform | present |
| U704 | client-portal/pages/home.tsx:ClientHomeRoute | C12 | view | frameworks | published (routed) | client | present |
| U705 | client-portal/shell/layout.server.ts:middleware | C12 | framework-glue | frameworks | published (re-exported by `layout.tsx`, routed) | client, operator/platform | present |
| U706 | client-portal/shell/layout.tsx:ClientLayoutRoute (+middleware re-export) | C12 | mixed | frameworks | published (routed) | client | present |
| U708 | client-portal/shell/navigation-links.ts:clientSurfaceLinks | C12 | boundary-data | adapters | public | client | present |
| U717 | client-portal/routes.ts:clientPortalRoutes | C12 | framework-glue | frameworks | published (registry) | operator/platform | present |
| U709 | coach-portal/api/readyz.ts:loader | C13 | adapter | adapters | published (routed) | operator/platform | present |
| U710 | coach-portal/pages/home.tsx:CoachHomeRoute | C13 | view | frameworks | published (routed) | coach | present |
| U711 | coach-portal/shell/layout.server.ts:middleware | C13 | framework-glue | frameworks | published (re-exported by `layout.tsx`, routed) | coach, operator/platform | present |
| U712 | coach-portal/shell/layout.tsx:CoachLayoutRoute (+middleware re-export) | C13 | mixed | frameworks | published (routed) | coach | present |
| U716 | coach-portal/shell/navigation-links.tsx:coachSurfaceLinks | C13 | boundary-data | adapters | public | coach | present |
| U718 | coach-portal/routes.ts:coachPortalRoutes | C13 | framework-glue | frameworks | published (registry) | operator/platform | present |
| U801 | packages/ui/src/lib/constants.ts:MAIN_CONTENT_ID | C5 | utility | frameworks | published (`./lib`) | operator/platform | present |
| U802 | packages/ui/src/styles.css:module | C5 | boundary-data | frameworks | published (`./styles.css`) | operator/platform | present |
| U803 | packages/ui/src/lib/cn.ts:cn | C5 | utility | frameworks | published (`./lib`) | operator/platform | present |
| U804 | packages/ui/src/motion/motion.ts:module (createFadeUpVariants, publicEase, publicEaseOut, publicViewportOnce, useClientReducedMotionPreference) | C5 | mixed | frameworks | published (`./motion`) | operator/platform, visitor | present |
| U805 | packages/ui/src/lib/use-search-params-writer.ts:useSearchParamsWriter | C5 | adapter | adapters | published (`./lib`) | operator/platform | present |
| U806 | packages/ui/src/layout/app-shell.tsx:AppShell | C5 | view | frameworks | published (`./layout`) | operator/platform | present |
| U812 | packages/ui/src/primitives/button.tsx:Button (+buttonVariants) | C5 | view | frameworks | published (`./primitives`) | operator/platform | present |
| U813 | packages/ui/src/primitives/card.tsx:Card | C5 | view | frameworks | published (`./primitives`) | operator/platform | present |
| U815 | packages/ui/src/primitives/checkbox.tsx:Checkbox | C5 | view | frameworks | published (`./primitives`) | operator/platform | present |
| U823 | packages/ui/src/filters/filter-chip-group.tsx:FilterChipGroup, FilterChip (+FilterChipTone) | C5 | mixed | adapters | published (`./filters`) | visitor (store catalog filtering) | present |
| U825 | packages/ui/src/primitives/icon-button.tsx:IconButton | C5 | view | frameworks | published (`./primitives`) | operator/platform | present |
| U826 | packages/ui/src/primitives/input.tsx:Input (+inputClasses) | C5 | view | frameworks | published (`./primitives`) | operator/platform | present |
| U827 | packages/ui/src/primitives/link.tsx:Link (+linkVariants) | C5 | view | frameworks | published (`./primitives`) | operator/platform | present |
| U828 | packages/ui/src/layout/phone-frame.tsx:PhoneFrame | C5 | view | frameworks | published (`./layout`) | operator/platform | present |
| U829 | packages/ui/src/primitives/section-eyebrow.tsx:SectionEyebrow | C5 | view | frameworks | published (`./primitives`) | operator/platform | present |
| U830 | packages/ui/src/layout/portal-shell.tsx:PortalShell (+PortalNavigationLink) — composes the Radix-backed NavigationDialog for mobile navigation | C5 | view | frameworks | published (`./layout`) | coach, client | present |
| U832 | packages/ui/src/layout/sidebar-surface-layout.tsx:SidebarSurfaceLayout | C5 | view | frameworks | published (`./layout`) | operator/platform | present |
| U833 | packages/ui/src/overlays/sheet.tsx:Sheet, SheetTitle, SheetDescription, SheetContent | C5 | view | frameworks | published (`./overlays`) | operator/platform | present |
| U850 | packages/ui/src/lib/focus-trap.ts:resolveFocusTrapTarget | C5 | entity rule (pure, tested) | entities | package-private | coach, client | removed (Radix NavigationDialog owns focus containment) |
| U851 | packages/ui/src/{filters,layout,lib,motion,overlays,primitives}/index.ts:module | C5 | framework-glue | frameworks | published (six subpath entries) | operator/platform | present |
| U852 | packages/ui/src/layout/navigation-dialog.tsx:NavigationDialog (+NavigationMenu) — owns the mobile navigation pattern: persistent top bar with one stable menu button, top-bar actions that close the menu, first-link focus, the animated panel whose `open`/`closed` variants end the closing state, and the desktop-breakpoint close | C5 | view | frameworks | published (`./layout`) | visitor, client, coach | present |
| U853 | packages/ui/src/layout/use-close-mobile-navigation-on-desktop.ts:useCloseMobileNavigationOnDesktop | C5 | adapter | adapters | package-private | visitor, client, coach | present |
| U900 | domain/account/account.ts:Account (+AccountRole, AccountSnapshot; `isActive()`, `toSnapshot()`, statics `canAccessClientPortal(snapshot)` / `canAccessCoachPortal(snapshot)`) | C1 | entity | entities | published | operator/platform, coach, client | moved from domain/accounts/account-model.ts, rules became methods |
| U901 | domain/account/accounts.ts:Accounts | C1 | port | use-cases | published | operator/platform | present (moved) |
| U902 | domain/account/provision-account-use-case.ts:ProvisionAccountUseCase (+ProvisionAccountResult carrying `AccountSnapshot`) | C1 | use-case | use-cases | published | operator/platform, vendor:clerk | renamed from AccountProvisioningService |
| U903 | domain/account/index.ts:module | C1 | framework-glue | adapters | published (`./account`) | operator/platform | moved from domain/accounts/index.ts |
| U948 | domain/account/delete-account-use-case.ts:DeleteAccountUseCase | C1 | use-case | use-cases | published | operator/platform, vendor:clerk | renamed from AccountDeletionService |
| U904 | domain/coaching-bundles/coaching-bundles.ts:module | C1 | entity | entities | — | — | removed (e8690f45; the literal is now C11 `sections/pricing/coaching-bundles.ts`, decision D5) |
| U949 | domain/coaching-bundles/bundle-offers.ts:module | C1 | entity | entities | — | — | removed (e8690f45; `WaitlistOfferPlan` moved to U911) |
| U905 | domain/coaching-bundles/index.ts:module | C1 | framework-glue | adapters | — | — | removed (e8690f45; the `./coaching-bundles` subpath is gone) |
| U906 | domain/feature-flag/feature-flags.ts:FeatureFlags | C1 | port | use-cases | published | operator/platform | present (moved) |
| U907 | domain/feature-flag/get-feature-flags-use-case.ts:FeatureFlagReader | C1 | port (input boundary) | use-cases | published | operator/platform | moved from the entity module to the use-case module that implements it |
| U908 | domain/feature-flag/feature-flag.ts:FeatureFlag (+FeatureFlagSet, static `toSet(flags)`) | C1 | entity | entities | published | operator/platform | boundary-data `PersistedFeatureFlag` became an entity class |
| U909 | domain/feature-flag/get-feature-flags-use-case.ts:GetFeatureFlagsUseCase (implements U907) | C1 | use-case | use-cases | published | operator/platform | renamed from FeatureFlagService |
| U910 | domain/feature-flag/index.ts:module | C1 | framework-glue | adapters | published (`./feature-flag`) | operator/platform | moved from domain/feature-flags/index.ts |
| U911 | domain/waitlist/waitlist.ts:Waitlist (+WaitlistOffer, WaitlistOfferPlan = "all-bundles", WaitlistAvailability, WaitlistSnapshot, WaitlistConsentVersions, WaitlistSignupPricing; `availability(count)`, `snapshot(availability)`, statics `availabilityBucketStart(now)` / `decideReducedPricingRegistration(...)`) | C1 | entity | entities | published | operator/platform, visitor | absorbs waitlist-availability.ts, waitlist-registration.ts and the entity half of waitlist-service.ts; owns the offer-plan literal U949 used to hold |
| U912 | domain/waitlist/waitlist-entries.ts:WaitlistEntries (+ReducedPricingSignupResult, RegularPricingSignupResult) | C1 | port | use-cases | published | operator/platform | moved out of waitlist-service.ts |
| U913 | domain/waitlist/waitlist-confirmation.ts:WaitlistConfirmation (+SendWaitlistConfirmationCommand, WaitlistConfirmationResult = sent \| failed) | C1 | port | use-cases | published | operator/platform, vendor:resend | renamed from WaitlistConfirmationService (D3) |
| U914 | domain/waitlist/join-waitlist-use-case.ts:JoinWaitlistUseCase (+JoinWaitlistResult; takes `incidents: WaitlistIncidents`, uses `EmailAddress`) | C1 | use-case | use-cases | published | visitor, operator/platform | altered in a79f507d; generic logging replaced by waitlist-owned incident operations |
| U963 | domain/waitlist/get-waitlist-use-case.ts:GetWaitlistUseCase (takes `clock: Clock`) | C1 | use-case | use-cases | published | visitor, operator/platform | split out of WaitlistService |
| U915 | domain/waitlist/waitlist-service.ts:module | C1 | boundary-data | use-cases | — | — | removed (e8690f45; the types moved onto U911, U912, U913) |
| U916 | domain/waitlist/index.ts:module | C1 | framework-glue | adapters | published (`./waitlist`) | operator/platform | altered in a79f507d; publishes U1194 |
| U950 | domain/waitlist/waitlist-registration.ts:decideReducedPricingRegistration | C1 | entity rule | entities | — | — | removed (e8690f45; now the static `Waitlist.decideReducedPricingRegistration`, still called inside the repository transaction) |
| U956 | domain/email-address/email-address.ts:EmailAddress (`static normalize(raw)`, `value`, `deliveryLimitKey`) | C1 | entity (value object) | entities | published (`./email-address`) — no consumer outside the package, see the ledger's run-8 F242 | operator/platform, visitor | function `normalizeEmail` became a value object; absorbs the store's plus-tag stripping (old U928) |
| U964 | domain/email-address/index.ts:module | C1 | framework-glue | adapters | published (`./email-address`) | operator/platform | new |
| U953 | domain/cart/cart.ts:Cart (`static of(slugs)`, `reconcile(availableSlugs)`, `slugs`) | C1 | entity (value object) | entities | published (`./cart`) | visitor | function `reconcileCart` became a value object; runs in the browser, no ports |
| U965 | domain/cart/index.ts:module | C1 | framework-glue | adapters | published (`./cart`) | visitor | new |
| U966 | domain/product/product.ts:Product (id, slug, displayOrder, lifecycleStatus, latestVersionSequence; `canBeRevised()`, `nextVersionSequence()`, `revisionPlacement()`, static `evaluatePurchasability(selections, locked)`) | C1 | entity | entities | published | operator/platform, coach, visitor | new: the publication lifecycle record, absorbing old U952's purchasability rule |
| U917 | domain/product/product.ts:PublishedProduct (id, slug, displayOrder, version; `deliveryResource()`) plus ProductAsset, PublishedProductCover, StoreTaxonomyValue, PublicationOperation, PublicationPlacement | C1 | entity (catalog read model) + boundary-data | entities | published | operator/platform, visitor | boundary-data `PublishedStoreProduct` became a class; moved from domain/store/models.ts |
| U918 | domain/product/product.ts:isStoreCoverMimeType (+STORE_COVER_MIME_TYPES) | C1 | entity (allowlist rule) | entities | published | operator/platform | present (moved) |
| U919 | domain/product/store-catalog.ts:StoreCatalog | C1 | port | use-cases | published | operator/platform | present (moved); returns `PublishedProduct` instances (D1) |
| U920 | domain/store/catalog/store-catalog-service.ts:StoreCatalogService | C1 | use-case | use-cases | — | — | removed (e8690f45; split into U967, U968, U969) |
| U967 | domain/product/list-published-products-use-case.ts:ListPublishedProductsUseCase | C1 | use-case | use-cases | published | visitor, operator/platform | new |
| U968 | domain/product/find-published-product-use-case.ts:FindPublishedProductUseCase | C1 | use-case | use-cases | published | visitor, operator/platform | new |
| U969 | domain/product/find-published-cover-use-case.ts:FindPublishedCoverUseCase | C1 | use-case | use-cases | published | visitor, operator/platform | new |
| U921 | domain/product/{list-published-products,find-published-product,find-published-cover}-use-case.ts:module (PublishedCatalogResult, PublishedProductResult, PublishedCoverResult) | C1 | boundary-data | use-cases | published | visitor | split out of store-catalog-service.ts. Two of the three carry `PublishedProduct` instances rather than plain data; the ledger's run-8 F239 and F240 dispute that, so this row records the shapes without endorsing the crossing |
| U935 | domain/product/product-assets.ts:ProductAssets (+ProductAssetOpenResult = opened(bytes: `AsyncIterable<Uint8Array>`) \| unavailable) | C1 | port | use-cases | published | operator/platform | present (moved) |
| U937 | domain/product/product-assets.ts:ProductAssetWriter (+ProductAssetContent) | C1 | port | use-cases | published | operator/platform | present (moved) |
| U938 | domain/product/product-assets.ts:ProductAssetDigest | C1 | port | use-cases | published | operator/platform | present (moved) |
| U939 | domain/product/product-asset-keys.ts:buildCoverAssetKey / buildDownloadAssetKey | C1 | entity (content-addressing rule) | entities | folder-private | operator/platform | present (moved) |
| U940 | domain/product/product-file-formats.ts:resolveDownloadFormat / resolveCoverFormat | C1 | entity (format-by-signature rule) | entities | folder-private | operator/platform | present (moved) |
| U941 | domain/product/product-file-formats.ts:module (STORE_DOWNLOAD_EXTENSIONS, STORE_COVER_EXTENSIONS, resolution types) | C1 | boundary-data | entities | folder-private | operator/platform | present (moved) |
| U970 | domain/product/product-publication.ts:ProductPublicationDraft (`static from`; `requestDigest`, `settle`, `planCreation`, `planRevision`, `plan`, `persistCommand`, `plannedAssetContents`) | C1 | mixed (value object holding the submitted draft + the publication orchestration the five publication use cases share) | use-cases | folder-private (not exported from `./product`) | operator/platform, coach | new. Ring is use-cases, not entities: it holds the request's uploaded bytes and names the `ProductAssetDigest` port. `settle` and `persistCommand` read no instance state |
| U942 | domain/product/product-publication.ts:module (MAX_PUBLICATION_BYTES, validateSlugFormat, resolvePublicationTarget, and the publication command/plan/issue/result types) | C1 | boundary-data + policy constant + pure rules | use-cases | published (except `validateSlugFormat`) | operator/platform | merges old U942 and U955 |
| U955 | domain/store/publication/product-publication-rules.ts:module | C1 | entity rule | entities | — | — | removed (e8690f45; the rules are methods on U970 and the two functions in U942) |
| U943 | domain/product/store-product-publications.ts:StoreProductPublications | C1 | port | use-cases | published | operator/platform | present (moved); returns `Product` instances (D1) |
| U944 | domain/store/publication/store-product-publication-service.ts:StoreProductPublicationService | C1 | use-case | use-cases | — | — | removed (e8690f45; split into U971-U975) |
| U971 | domain/product/plan-new-product-use-case.ts:PlanNewProductUseCase | C1 | use-case | use-cases | published | operator/platform, coach | new |
| U972 | domain/product/plan-product-revision-use-case.ts:PlanProductRevisionUseCase | C1 | use-case | use-cases | published | operator/platform, coach | new |
| U973 | domain/product/publish-new-product-use-case.ts:PublishNewProductUseCase | C1 | use-case | use-cases | published | operator/platform, coach | new; keeps a private `commit` shared in shape with U974 (owner ruling, T7) |
| U974 | domain/product/publish-product-version-use-case.ts:PublishProductVersionUseCase | C1 | use-case | use-cases | published | operator/platform, coach | new; same private `commit` |
| U975 | domain/product/retire-product-use-case.ts:RetireProductUseCase (+RetireProductResult) | C1 | use-case | use-cases | published | operator/platform, coach | new |
| U945 | domain/store/publication/store-product-publication-service.ts:module | C1 | boundary-data | use-cases | — | — | removed (e8690f45; the types are in U942) |
| U946 | domain/store/index.ts:module | C1 | framework-glue | adapters | — | — | removed (e8690f45; the `./store` subpath is gone) |
| U976 | domain/product/index.ts:module | C1 | framework-glue | adapters | published (`./product`) | operator/platform | new |
| U977 | domain/acquisition/acquisition.ts:AcquisitionRequest (`static from(command, requestedAt)`; normalised email, deduplicated sorted slugs, canonical payload, delivery windows, delivery-limit key; `selectProducts(catalog)`) | C1 | entity (value object) | entities | published | visitor | new; absorbs the request-shaping the old service held |
| U951 | domain/acquisition/acquisition.ts:module (STORE_DELIVERY_LIMIT_POLICY, DeliveryLimitPolicy, evaluateDeliveryLimit, StoreDeliveryLimitWindow) | C1 | entity rule (pure, tested; called inside the repository transaction) | entities | published | visitor, operator/platform | present (moved from domain/store/delivery/) |
| U952 | domain/store/acquisition/purchasability.ts:evaluatePurchasability | C1 | entity rule | entities | — | — | removed (e8690f45; now the static `Product.evaluatePurchasability` on U966) |
| U928 | domain/store/delivery/delivery-limit-key.ts:resolveDeliveryLimitKey | C1 | entity rule | entities | — | — | removed (e8690f45; now `EmailAddress.deliveryLimitKey` on U956) |
| U922 | domain/acquisition/store-acquisitions.ts:StoreAcquisitions (+PrepareAcquisitionCommand, AcquisitionPreparation, ResolvedPriorAcquisition) | C1 | port | use-cases | published | operator/platform | present (moved). `PrepareAcquisitionCommand.products` is typed `readonly PublishedProduct[]`; the ledger's run-8 F245 disputes whether the record's D6 wording covers an entity entering a port, so this row records the port without endorsing that shape |
| U923 | domain/acquisition/product-delivery.ts:ProductDelivery (+ProductDeliveryResult = delivered \| rejected \| unconfirmed) | C1 | port | use-cases | published | vendor:resend | renamed from StoreDeliveryService (D3) |
| U978 | domain/acquisition/product-delivery.ts:DownloadTokenGenerator (+CreateDownloadTokenResult) | C1 | port | use-cases | declared, deliberately unpublished; the adapter satisfies it structurally | operator/platform | new as a named port |
| U925 | domain/acquisition/product-delivery.ts:PayloadDigestGenerator | C1 | port | use-cases | published | operator/platform | present (moved) |
| U927 | domain/store/acquisition/store-acquisition-service.ts:StoreAcquisitionService | C1 | use-case | use-cases | — | — | removed (e8690f45; now U979) |
| U979 | domain/acquisition/acquire-products-use-case.ts:AcquireProductsUseCase (+AcquireProductsResult; takes `clock: Clock`, `incidents: AcquisitionIncidents`) | C1 | use-case | use-cases | published | visitor, operator/platform | altered in a79f507d; generic logging replaced by acquisition-owned incident operations |
| U929 | domain/acquisition/acquire-products-use-case.ts:module (AcquireProductsCommand, ProductSelection) | C1 | boundary-data | use-cases | published | visitor, operator/platform | present (moved) |
| U980 | domain/acquisition/index.ts:module | C1 | framework-glue | adapters | published (`./acquisition`) | operator/platform | altered in a79f507d; publishes U1193 |
| U954 | domain/download-grant/download-grant.ts:DownloadGrant (+DownloadGrantItem, GrantDelivery; `isActive(now)`, `delivery()`) | C1 | entity | entities | published | visitor | boundary-data plus free rules became a class |
| U931 | domain/download-grant/download-grants.ts:DownloadTokenHasher | C1 | port | use-cases | published | operator/platform | present (moved) |
| U932 | domain/download-grant/download-grants.ts:DownloadGrants | C1 | port | use-cases | published | operator/platform | present (moved); returns a `DownloadGrant` instance (D1) |
| U933 | domain/store/download-grants/download-grant-service.ts:DownloadGrantService | C1 | use-case | use-cases | — | — | removed (e8690f45; now U981) |
| U981 | domain/download-grant/resolve-download-grant-use-case.ts:ResolveDownloadGrantUseCase (+DownloadGrantResolution; takes `clock: Clock`) | C1 | use-case | use-cases | published | visitor | new. `DownloadGrantResolution.grant` carries a `DownloadGrant` instance out to C7 adapters; the ledger's run-8 F241 disputes that crossing, so this row records the type without endorsing it |
| U982 | domain/download-grant/index.ts:module | C1 | framework-glue | adapters | published (`./download-grant`) | operator/platform | new |
| U957 | domain/shared/clock.ts:Clock | C1 | port | use-cases | published (`./shared`) | operator/platform | present |
| U958 | domain/shared/logger.ts:Logger | C1 | port | use-cases | — | operator/platform | removed in a79f507d (replaced by the slice-owned U1193 and U1194 incident interfaces) |
| U959 | domain/shared/bot-verifier.ts:BotVerifier (+BotVerificationRequest, BotVerificationResult) | C1 | port | use-cases | — | visitor, vendor:cloudflare-turnstile | removed in a79f507d (contract relocated to U1195) |
| U960 | domain/shared/product-email.ts:ProductEmail (+ProductEmailCommand, ProductEmailResult) | C1 | port | use-cases | — | operator/platform, vendor:resend | removed in a79f507d (contract relocated to U1196) |
| U961 | domain/shared/management-authenticator.ts:ManagementAuthenticator (+ManagementCredentials, ManagementAuthenticationResult) | C1 | port | use-cases | — | operator/platform, coach (future) | removed in a79f507d (contract relocated to U1197) |
| U962 | domain/shared/index.ts:module | C1 | framework-glue | adapters | published (`./shared`, Clock only) | operator/platform | altered in a79f507d |
| U1000 | bot-detection/bot-detection-contract.ts:botDetectionConfigSchema (+BotDetectionConfig) | C6 | boundary-data | adapters | published | vendor:cloudflare-turnstile | present |
| U1001 | bot-detection/bot-detection-contract.ts:TURNSTILE_RESPONSE_FIELD, STORE_ACQUISITION_TURNSTILE_ACTION, WAITLIST_TURNSTILE_ACTION | C6 | boundary-data | adapters | published | visitor, vendor:cloudflare-turnstile | present |
| U1002 | bot-detection/bot-detection-config.server.ts:createBotDetectionConfig (takes `BotDetectionSettings`) | C6 | adapter | adapters | published | operator/platform | present |
| U1004 | bot-detection/submission/bot-detection-widget.tsx:BotDetectionWidget | C6 | view | adapters | published | visitor | present |
| U1007 | bot-detection/verifier/bot-verifier.server.ts:StaticTokenBotVerifier | C6 | adapter (un-exported; built by the factory) | adapters | package-private | operator/platform | present |
| U1008 | bot-detection/verifier/bot-verifier.server.ts:resolveRequestRemoteIp | C6 | utility | adapters | published | vendor:cloudflare | present |
| U1009 | bot-detection/verifier/create-bot-verifier.server.ts:createBotVerifier (selects on `BOT_DETECTION_PROVIDER`) | C6 | adapter factory | adapters | published | operator/platform | present |
| U1010 | bot-detection/index.server.ts:module | C6 | framework-glue | frameworks | published (`./bot-detection/server`, including BotVerifier) | - | altered in a79f507d |
| U1011 | bot-detection/index.ts:module | C6 | framework-glue | frameworks | published (`./bot-detection`) | - | present |
| U1012 | bot-detection/turnstile/turnstile-bot-verifier.server.ts:TurnstileBotVerifier | C6 | adapter (un-exported; built by the factory) | adapters | package-private | vendor:cloudflare-turnstile | present |
| U1013 | bot-detection/turnstile/turnstile-client.ts:useTurnstileWidget (+TurnstileChallengeHandle) | C6 | view | adapters | package-private | visitor | present |
| U1015 | bot-detection/turnstile/turnstile-widget.tsx:TurnstileWidget | C6 | view | adapters | package-private | visitor | present |
| U1016 | bot-detection/submission/use-bot-detection-submission.ts:useBotDetectionSubmission | C6 | hook over the step machine | adapters | published | visitor | present |
| U1037 | bot-detection/submission/bot-detection-flow.ts:module (reduceBotDetectionFlow, flow state and events) | C6 | step machine (pure, tested) | adapters | package-private | visitor | present |
| U1018 | email/email-primitives.server.tsx:Email* (10 components) | C6 | view | adapters | published | operator/platform | present |
| U1019 | email/index.server.ts:module | C6 | framework-glue | frameworks | published (`./email/server`, including ProductEmail) | - | altered in a79f507d |
| U1023 | email/resend-product-email.server.ts:ResendProductEmail (implements `ProductEmail`, returns `ProductEmailResult`) | C6 | adapter | adapters | package-private (built by the factory) | vendor:resend | present |
| U1038 | email/in-memory-product-email.server.ts:InMemoryProductEmail | C6 | adapter (recording double) | adapters | published | operator/platform | present |
| U1039 | email/create-product-email.server.ts:createProductEmail (selects on `PRODUCT_EMAIL_PROVIDER` = memory \| resend) | C6 | adapter factory | adapters | published | operator/platform | present |
| U1026 | feature-flags/index.server.ts:module | C6 | framework-glue | frameworks | published (`./feature-flags/server`) | - | present |
| U1027 | feature-flags/repository.server.ts:PostgresFeatureFlagRepository (implements the C1 `FeatureFlags` port) | C6 | adapter | adapters | published | operator/platform | present |
| U1028 | feature-flags/schema.server.ts:featureFlagsTable | C6 | boundary-data | frameworks | package-private | operator/platform | present |
| U1029 | management-auth/bearer-secret-authenticator.server.ts:BearerSecretManagementAuthenticator (`authenticate({ authorizationHeader })`) | C6 | adapter (un-exported; built by the factory) | adapters | package-private | operator/platform | present |
| U1030 | management-auth/index.server.ts:module | C6 | framework-glue | frameworks | published (`./management-auth/server`, including ManagementAuthenticator and ManagementAuthenticationResult) | - | altered in a79f507d |
| U1031 | management-auth/management-auth-config.server.ts:createManagementAuthConfig, isSecureManagementTransport, MANAGEMENT_AGENT_PRINCIPAL_ID | C6 | adapter | adapters | published | operator/platform | present |
| U1033 | management-auth/management-authenticator-contract.server.ts:ManagementAuthConfig (+ManagementTransportPolicy) | C6 | boundary-data | adapters | published | operator/platform | present |
| U1040 | management-auth/create-management-authenticator.server.ts:createManagementAuthenticator (takes `ManagementApiConfig`) | C6 | adapter factory | adapters | published | operator/platform | present |
| U1041 | http/http.server.ts:module (HttpJsonError, handleHttpErrorResponse, throwMethodNotAllowedResponse, createBadRequestResponse, readFormDataRequestBody) + http/index.server.ts | C6 | adapter | adapters | published (`./http/server`) | operator/platform | present |
| U1034 | pwa/index.ts:module | C6 | framework-glue | frameworks | published (`./pwa`) | - | present |
| U1035 | pwa/pwa-registration.ts:createPwaRegistration | C6 | adapter | adapters | published | operator/platform | present |
| U1036 | pwa/pwa-surfaces.ts:pwaSurfaceDefinitions | C6 | boundary-data | adapters | published | operator/platform, client | present |
| U1100 | content/legal-document.ts:module (LegalDocument with `effectiveDateLabel`, LegalDocumentBlock, LegalDocumentSection, LegalLink, LegalText, formatEffectiveDate, ELI_COACH_CONTACT_EMAIL) | C4 | boundary-data | entities | published | operator/platform | present |
| U1101 | content/legal-document-hash.ts:legalDocumentSha256 (+canonicalizeLegalDocument) | C4 | utility | adapters | package-private | operator/platform | present |
| U1103 | content/privacy-policy.ts:PRIVACY_POLICY (+_VERSION, EVOA_FITNESS_PRIVACY_EMAIL, WAITLIST_MARKETING_CONSENT(+_VERSION)) | C4 | boundary-data | entities | published | operator/platform, visitor | present |
| U1108 | content/store-marketing-consent.ts:STORE_MARKETING_CONSENT (+_VERSION) | C4 | boundary-data | entities | published | operator/platform, visitor | present |
| U1110 | content/index.ts:module | C4 | framework-glue | frameworks | published | operator/platform | present |
| U1114 | content/website-and-store-terms/{current,index,types}.ts:module (WEBSITE_AND_STORE_TERMS_DOCUMENT, PAID_DIGITAL_DELIVERY_CONSENT, the PDF artifact helpers) | C4 | boundary-data | entities | published through `.` (the `./website-and-store-terms/publication` subpath is removed) | operator/platform | present |
| U1150 | db/database-client.ts:createDatabaseClient | C2 | adapter | adapters | published | operator/platform | present |
| U1151 | db/database-client.ts:DatabaseClient (NodePgDatabase<typeof schema>) | C2 | port (detail-typed) | adapters | published | operator/platform | present |
| U1152 | db/database-pool.ts:createManagedDatabasePool | C2 | adapter | frameworks | published | operator/platform | present |
| U1153 | db/index.ts:module | C2 | framework-glue | frameworks | published | operator/platform | present |
| U1154 | db/schema/app-schema.ts:appSchema (+schema/index.ts) | C2 | adapter | frameworks | published | operator/platform | present |
| U1160 | config/concerns/app.ts:appShape, AppConfig, isProductionRuntime | C3 | boundary-data + refinement | frameworks | published (type through `.`) | operator/platform | present |
| U1161 | config/concerns/bot-detection.ts:botDetectionShape, BotDetectionSettings, refineBotDetection, TURNSTILE_TEST_RESPONSE_TOKEN | C3 | boundary-data + refinement | frameworks | published (type through `.`) | operator/platform | present |
| U1162 | config/concerns/clerk.ts:clerkShape, ClerkConfig, refineClerk | C3 | boundary-data + refinement | frameworks | package-private | operator/platform, vendor:clerk | present |
| U1163 | config/concerns/database.ts:databaseShape, DatabaseConfig, databaseBootstrapEnvironmentSchema, DatabaseBootstrapEnvironment, DatabaseUserCredentials, DatabaseConnection | C3 | boundary-data | frameworks | published (types through `.`) | operator/platform | present |
| U1164 | config/concerns/management-api.ts:managementApiShape, ManagementApiConfig, refineManagementApi | C3 | boundary-data + refinement | frameworks | published (type through `.`) | operator/platform | present |
| U1165 | config/concerns/product-email.ts:productEmailShape, ProductEmailConfig, refineProductEmail | C3 | boundary-data + refinement | frameworks | published (type through `.`) | operator/platform, vendor:resend | present |
| U1166 | config/concerns/store-assets.ts:storeAssetsShape, StoreAssetsConfig, refineStoreAssets | C3 | boundary-data + refinement | frameworks | published (type through `.`) | operator/platform | present |
| U1167 | config/concerns/waitlist.ts:waitlistShape, WaitlistConfig | C3 | boundary-data | frameworks | published (type through `.`) | operator/platform | present |
| U1170 | config/runtime-environment.ts:runtimeEnvironmentSchema, RuntimeEnvironment (the eight concern shapes composed, five refinements) | C3 | boundary-data | frameworks | package-internal (the type is published through `.`) | operator/platform | present |
| U1171 | config/runtime.ts:loadRuntimeEnvironment (the only module that takes a process environment) | C3 | adapter | frameworks | published (`./runtime`) | operator/platform | present |
| U1174 | config/runtime.ts:loadDatabaseBootstrapEnvironment, the database user helpers, buildPostgresConnectionString, hasCompleteDatabaseConfiguration, resolveRuntimeDatabaseConnection | C3 | utility | frameworks | published (`./runtime`) | operator/platform | present |
| U1183 | config/base-path.ts:joinBasePath, buildRedirectPath | C3 | utility | frameworks | published (`.`) | operator/platform | present |
| U1192 | config/index.ts:module | C3 | framework-glue | frameworks | published (`.`) | operator/platform | present |
| U1193 | domain/acquisition/acquisition-incidents.ts:AcquisitionIncidents (+private AcquisitionIncident) | C1 | port + boundary-data | use-cases | published (`./acquisition`; incident shape private) | operator/platform | added in a79f507d |
| U1194 | domain/waitlist/waitlist-incidents.ts:WaitlistIncidents | C1 | port | use-cases | published (`./waitlist`) | operator/platform | added in a79f507d |
| U1195 | bot-detection/verifier/bot-verifier-contract.server.ts:BotVerifier (+BotVerificationRequest, BotVerificationResult) | C6 | port + boundary-data | adapters | published (`./bot-detection/server`) | visitor, operator/platform, vendor:cloudflare-turnstile | added in a79f507d; relocated contract, new unit ID |
| U1196 | email/product-email-contract.server.ts:ProductEmail (+ProductEmailCommand, ProductEmailResult) | C6 | port + boundary-data | adapters | published (`./email/server`) | operator/platform, visitor, vendor:resend | added in a79f507d; relocated contract, new unit ID |
| U1197 | management-auth/management-authenticator-contract.server.ts:ManagementAuthenticator (+ManagementCredentials, ManagementAuthenticationResult, ManagementPrincipal) | C6 | port + boundary-data | adapters | published (`./management-auth/server`; credentials/principal signature-visible) | operator/platform, coach (future) | added in a79f507d; relocated contract, new unit ID |
| U1191 | packages/test-support/src/index.ts:CLERK_TEST_ENVIRONMENT | C16 | boundary-data | tests | published (`.`, devDependency only) | operator/platform | present |
