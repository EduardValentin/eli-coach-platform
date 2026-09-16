# Units

Header: date 2026-09-17, commit dbe88053, scope apps/platform/src, apps/platform/db, packages/{config,content,db,domain,infrastructure,test-support,ui}/src plus the enforcement layer (tools/dependency-cruiser.config.cjs, tools/dependency-cruiser.tsconfig.json, tools/boundaries.test.mjs, tools/boundary-fixtures/, knip.json, eslint.config.mjs, workspace package.json export maps, tsconfigs, vite/react-router/vitest configs), mode change review (run 7).

One row per module by default; ports, entity/model sets, and separate implementations get their own rows. Test files (`*.test.*`) are the outermost ring and are not mapped as units; the tests that import each module are listed in the slice returns under `.architecture/slices/`. Component IDs refer to `components.md`. "Published" means the symbol is reachable from outside its component through an export map, a route registration or a rule-sanctioned folder (`contracts/`, `ui/shared/`, `server/guards/`, `routes.ts`).

| ID | Path:symbol | Component | Kind | Ring | Visibility | Actors | Status |
|---|---|---|---|---|---|---|---|
| U100 | store/api/acquisitions-controller.server.ts:StoreAcquisitionController | C7 | adapter | adapters | public | visitor, vendor:cloudflare-turnstile | present |
| U101 | store/api/acquisitions.ts:module | C7 | framework-glue | frameworks | published (routed) | visitor | present |
| U102 | store/api/catalog-controller.server.ts:StoreCatalogController | C7 | adapter | adapters | public | visitor | present |
| U103 | store/api/catalog.ts:module | C7 | framework-glue | frameworks | published (routed) | visitor | present |
| U104 | store/api/covers-controller.server.ts:StoreCoverAssetController | C7 | adapter | adapters | public | visitor | present |
| U105 | store/api/covers.ts:module | C7 | framework-glue | frameworks | published (routed) | visitor | present |
| U106 | store/api/download-recovery.html:module | C7 | boundary-data | adapters | private | visitor | present |
| U107 | store/api/downloads-controller.server.ts:StoreDownloadController | C7 | adapter | adapters | public | visitor | present |
| U108 | store/api/downloads.ts:module | C7 | framework-glue | frameworks | published (routed) | visitor | present |
| U109 | store/api/management-controller.server.ts:StoreProductManagementController | C7 | adapter | adapters | public | operator/platform, management API caller | present |
| U110 | store/api/management-product-validations.ts:module | C7 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U111 | store/api/management-product-versions.ts:module | C7 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U112 | store/api/management-product.ts:module | C7 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U113 | store/api/management-products.ts:module | C7 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U114 | store/api/zip-stream.server.ts:ZipDeliveryStream | C7 | adapter | adapters | public | visitor | present |
| U115 | store/contracts/store-management.ts:module | C7 | boundary-data | adapters | published (contracts) | operator/platform | present |
| U116 | store/contracts/store.ts:module | C7 | boundary-data | adapters | published (contracts) | visitor | present |
| U117 | store/data/acquisition-repository.server.ts:PostgresStoreAcquisitionRepository | C7 | adapter | adapters | public | visitor, operator/platform | present |
| U118 | store/data/asset-digest.server.ts:ProductAssetSha256Digest | C7 | adapter | adapters | public | operator/platform | present |
| U119 | store/data/asset-store.server.ts:FilesystemProductAssetStore | C7 | adapter | adapters | public | visitor, operator/platform | present |
| U120 | store/data/catalog-repository.server.ts:PostgresStoreCatalogRepository | C7 | adapter | adapters | public | visitor | present |
| U121 | store/data/download-grant-repository.server.ts:PostgresDownloadGrantRepository | C7 | adapter | adapters | public | visitor | present |
| U122 | store/data/download-token.server.ts:RandomDownloadTokenGenerator | C7 | adapter | adapters | public | visitor | present |
| U123 | store/data/download-token.server.ts:DownloadTokenSha256 | C7 | adapter | adapters | public | visitor | present |
| U124 | store/data/download-token.server.ts:PayloadSha256Digest | C7 | adapter | adapters | public | visitor | present |
| U125 | store/data/publication-repository.server.ts:PostgresStoreProductPublicationRepository | C7 | adapter | adapters | public | operator/platform | present |
| U126 | store/data/schema.server.ts:module | C7 | framework-glue | frameworks | published (drizzle-kit glob) | operator/platform | present |
| U127 | store/email/create-store-delivery-service.server.ts:createStoreDeliveryService | C7 | adapter factory | adapters | public | operator/platform, vendor:resend | present |
| U129 | store/email/email-store-delivery-service.server.ts:EmailStoreDeliveryService | C7 | adapter | adapters | public | visitor, vendor:resend | present |
| U130 | store/email/store-delivery-email-template.server.tsx:StoreDeliveryEmailTemplate | C7 | view | adapters | public | visitor | present |
| U131 | store/email/store-delivery-email.server.ts:createStoreDeliveryEmailContent | C7 | adapter | adapters | public | visitor | present |
| U132 | store/contracts/paths.ts:module (STORE_ROUTE_SEGMENT, STORE_PATH, STORE_DOWNLOAD_PATH, storeProductPath, STORE_API_PATHS) | C7 | boundary-data | adapters | published (contracts) | visitor, operator/platform | present |
| U133 | store/routes.ts:storePublicRoutes, storeApiRoutes | C7 | framework-glue | frameworks | published (registry) | operator/platform | present |
| U134 | store/server/store-composition.server.ts:composeStoreFeature (+StoreFeature, StoreFeatureHandles) | C7 | composition | composition | published (container only) | operator/platform | present |
| U135 | store/server/guards/store-context.server.ts:storeContext | C7 | framework-glue | frameworks | published (routes and loaders) | operator/platform | present |
| U136 | store/data/asset-confinement.server.ts:module (isPathWithinRoot, isConfinedAsset, matchesAssetIdentity, matchesAssetDigest) | C7 | entity rule (pure) | entities | public | operator/platform | present |
| U200 | store/ui/public/api-client.ts:STORE_CATALOG_API_URL | C7 | boundary-data | adapters | public | visitor | present |
| U201 | store/ui/public/api-client.ts:STORE_ACQUISITIONS_API_PATH/URL | C7 | boundary-data | adapters | public | visitor | present |
| U202 | store/ui/public/api-client.ts:useStoreCatalogFetcher | C7 | adapter | adapters | public | visitor | present |
| U203 | store/ui/public/api-client.ts:useStoreAcquisitionFetcher | C7 | adapter | adapters | public | visitor | present |
| U204 | store/ui/public/cart.ts:StoreCartState | C7 | boundary-data | adapters | published | visitor | present |
| U205 | store/ui/public/cart.ts:createStoreCartStore | C7 | adapter (calls reconcileCart from C1) | adapters | published | visitor | present |
| U206 | store/ui/public/cart.ts:useHydrateStoreCart | C7 | adapter | adapters | public | visitor | present |
| U207 | store/ui/public/cart.ts:useReconcileStoreCartCatalog | C7 | adapter | adapters | public | visitor | present |
| U208 | store/ui/public/cart.ts:selectStoreCartProducts | C7 | adapter | adapters | public | visitor | present |
| U209 | store/ui/public/cart-storage.ts:module (STORE_CART_STORAGE_KEY, PersistedStoreCart, STORE_CART_PERSIST_OPTIONS) | C7 | adapter | adapters | public | visitor | present |
| U210 | store/ui/public/cart-provider.tsx:StoreCartProvider | C7 | framework-glue | frameworks | published | visitor | present |
| U211 | store/ui/public/cart-provider.tsx:useStoreCart | C7 | framework-glue | frameworks | published | visitor | present |
| U212 | store/ui/public/cart-drawer.tsx:StoreCartButton | C7 | view | frameworks | published | visitor | present |
| U213 | store/ui/public/cart-drawer.tsx:StoreCartDrawer | C7 | mixed | frameworks | published | visitor | present |
| U214 | store/ui/public/cart-focus.ts:createFocusRestoreTracker | C7 | adapter (pure, tested) | adapters | public | visitor accessibility | present |
| U218 | store/ui/public/acquisition-form.ts:useStoreAcquisition | C7 | hook over the step machine | adapters | public | visitor | present |
| U219 | store/ui/public/acquisition-flow.ts:module (reduceAcquisitionFlow, resolveAcquisitionError, flow types) | C7 | step machine (pure, tested) | adapters | public | visitor | present |
| U221 | store/ui/public/catalog-filters.ts:STORE_FILTER_DIMENSIONS and the filter functions (collectFilterDimensions, offersAnyFilter, resolveFilterSelection, canonicalizeFilterSearchParams, resolveCanonicalFilterTarget, filterProducts, removeFilterParams, haveOnlyFilterParamsChanged) | C7 | mixed | adapters | public | visitor | present |
| U229 | store/ui/public/catalog-filter-controls.tsx:useStoreCatalogFilterFocus, StoreCatalogFilters | C7 | view | frameworks | public | visitor | present |
| U231 | store/ui/public/catalog-page.server.ts:loader | C7 | adapter | adapters | published (routed) | visitor | present |
| U233 | store/ui/public/catalog-page.tsx:module (CatalogRoute, meta, shouldRevalidate, ErrorBoundary) | C7 | view | frameworks | published (routed) | visitor | present |
| U237 | store/ui/public/catalog-view.tsx:CatalogView, CatalogUnavailableView | C7 | view | frameworks | public | visitor | present |
| U240 | store/ui/public/catalog-presenter.ts:presentCatalog (+CatalogPresentation) | C7 | presenter | adapters | private to the feature | visitor | present |
| U241 | store/ui/public/download-page.tsx:module (DownloadRoute, meta) | C7 | view | frameworks | published (routed) | visitor | present |
| U244 | store/ui/public/download-state.ts:module (DOWNLOAD_API_URL, resolvePrivateDownloadToken, usePrivateDownloadToken) | C7 | adapter | adapters | public | visitor | present |
| U247 | store/ui/public/product-page.server.ts:loader | C7 | adapter | adapters | published (routed) | visitor | present |
| U248 | store/ui/public/product-page.tsx:module (ProductDetailsRoute, meta) | C7 | view | frameworks | published (routed) | visitor | present |
| U300 | waitlist/api/waitlist.ts:action | C8 | framework-glue | frameworks | published (routed) | visitor, operator/platform | present |
| U301 | waitlist/api/waitlist-controller.server.ts:WaitlistController | C8 | adapter | adapters | public | visitor, operator/platform | present |
| U302 | waitlist/contracts/waitlist.ts:module | C8 | boundary-data | adapters | published (contracts) | visitor | present |
| U303 | waitlist/data/repository.server.ts:PostgresWaitlistRepository | C8 | adapter | adapters | public | operator/platform | present |
| U304 | waitlist/data/schema.server.ts:waitlistEntriesTable | C8 | boundary-data | adapters | public | operator/platform | present |
| U305 | waitlist/email/create-waitlist-confirmation-service.server.ts:createWaitlistConfirmationService | C8 | adapter factory | adapters | public | operator/platform, vendor:resend | present |
| U307 | waitlist/email/email-waitlist-confirmation-service.server.ts:EmailWaitlistConfirmationService | C8 | adapter | adapters | public | operator/platform, vendor:resend | present |
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
| U316 | coaching-bundles/ui/public/bundle-selector.tsx:BundleSelector | C10 | view | adapters | published | visitor | present |
| U323 | coaching-bundles/ui/shared/coaching-bundles-presentation.ts:presentCoachingBundles (+CoachingBundleCard) | C10 | presenter | adapters | published (ui/shared) | visitor | present |
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
| U415 | accounts/ui/public/sign-in-failed-page.server.ts:loader | C9 | adapter | adapters | published (routed) | visitor | present |
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
| U511 | server/api/app-metadata-controller.server.ts:AppMetadataController | C14 | adapter | adapters | published | operator/platform | present |
| U512 | server/api/service-metadata.ts:appMetadataSchema | C14 | boundary-data | adapters | published | operator/platform | present |
| U513 | server/api/feature-flags.ts:module (action, loader) | C14 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U514 | server/api/meta.ts:loader | C14 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U515 | server/api/readyz.ts:loader | C14 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U516 | server/api/readyz-controller.server.ts:ReadyzController | C14 | adapter | adapters | published | operator/platform | present |
| U517 | server/feature-contexts.server.ts:createFeatureContextMiddleware | C14 | composition | composition | published (root.server.ts) | operator/platform | present |
| U518 | server/platform-composition.server.ts:composePlatformFeature (+PlatformFeature, PlatformControllers, RuntimeConfig, PlatformFeatureHandles) | C14 | composition | composition | published (container only) | operator/platform | present |
| U519 | server/logger.server.ts:createConsoleLogger | C14 | adapter (implements the C1 `Logger` port) | adapters | published (container only) | operator/platform | present |
| U530 | server/guards/platform-context.server.ts:platformContext | C14 | framework-glue | frameworks | published (server/api only) | operator/platform | present |
| U531 | server/guards/runtime-config-context.server.ts:runtimeConfigContext | C14 | framework-glue | frameworks | published (public-site layout loader) | operator/platform | present |
| U532 | server/api/routes.ts:platformApiRoutes | C14 | framework-glue | frameworks | published (registry) | operator/platform | present |
| U533 | server/api/feature-flags-contract.ts:module (featureFlagContextSchema, featureFlagSnapshotSchema, FeatureFlagContext, FeatureFlagSnapshot) | C14 | boundary-data | adapters | published | operator/platform | present |
| U534 | server/api/feature-flags-controller.server.ts:FeatureFlagController | C14 | adapter | adapters | published | operator/platform | present |
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
| U830 | packages/ui/src/layout/portal-shell.tsx:PortalShell (+PortalNavigationLink) — calls `resolveFocusTrapTarget` | C5 | view | frameworks | published (`./layout`) | coach, client | present |
| U832 | packages/ui/src/layout/sidebar-surface-layout.tsx:SidebarSurfaceLayout | C5 | view | frameworks | published (`./layout`) | operator/platform | present |
| U833 | packages/ui/src/overlays/sheet.tsx:Sheet, SheetTitle, SheetDescription, SheetContent | C5 | view | frameworks | published (`./overlays`) | operator/platform | present |
| U850 | packages/ui/src/lib/focus-trap.ts:resolveFocusTrapTarget | C5 | entity rule (pure, tested) | entities | package-private | coach, client | present |
| U851 | packages/ui/src/{filters,layout,lib,motion,overlays,primitives}/index.ts:module | C5 | framework-glue | frameworks | published (six subpath entries) | operator/platform | present |
| U900 | domain/accounts/account-model.ts:module (Account, AccountRole, AccountSnapshot, isActiveAccount, toAccountSnapshot, canAccessClientPortal, canAccessCoachPortal) | C1 | entity | entities | published | operator/platform, coach, client | present |
| U901 | domain/accounts/accounts.ts:Accounts | C1 | port | use-cases | published | operator/platform | present |
| U902 | domain/accounts/account-provisioning-service.ts:AccountProvisioningService (+AccountProvisioningResult carrying `AccountSnapshot`) | C1 | use-case | use-cases | published | operator/platform, vendor:clerk | present |
| U903 | domain/accounts/index.ts:module | C1 | framework-glue | adapters | published (`./accounts`) | operator/platform | present |
| U948 | domain/accounts/account-deletion-service.ts:AccountDeletionService | C1 | use-case | use-cases | published | operator/platform, vendor:clerk | present |
| U904 | domain/coaching-bundles/coaching-bundles.ts:module (coachingBundles, coachingBundleBenefits, resolveSavingsBadge, CoachingBundle, CoachingBundleId) | C1 | entity | entities | published | operator/platform (pricing) | present |
| U949 | domain/coaching-bundles/bundle-offers.ts:module (WAITLIST_BUNDLE_OFFERS, CoachingBundleWaitlistOfferPlan, resolveCoachingBundleDisplay) | C1 | entity | entities | published | operator/platform, visitor | present |
| U905 | domain/coaching-bundles/index.ts:module | C1 | framework-glue | adapters | published (`./coaching-bundles`) | operator/platform | present |
| U906 | domain/feature-flags/feature-flag-model.ts:FeatureFlags | C1 | port | use-cases | published | operator/platform | present |
| U907 | domain/feature-flags/feature-flag-model.ts:FeatureFlagReader | C1 | port | use-cases | published | operator/platform | present |
| U908 | domain/feature-flags/feature-flag-model.ts:PersistedFeatureFlag (+FeatureFlagSet, FeatureFlagEvaluationContext) | C1 | boundary-data | use-cases | published | operator/platform | present |
| U909 | domain/feature-flags/feature-flag-service.ts:FeatureFlagService | C1 | use-case | use-cases | published | operator/platform | present |
| U910 | domain/feature-flags/index.ts:module | C1 | framework-glue | adapters | published (`./feature-flags`) | operator/platform | present |
| U911 | domain/waitlist/waitlist-availability.ts:module (resolveWaitlistAvailability, getWaitlistAvailabilityBucketStart, WaitlistAvailability) | C1 | entity | entities | published | operator/platform, visitor | present |
| U912 | domain/waitlist/waitlist-service.ts:WaitlistEntries | C1 | port | use-cases | published | operator/platform | present |
| U913 | domain/waitlist/waitlist-service.ts:WaitlistConfirmationService (+WaitlistConfirmationResult = sent \| failed) | C1 | port | use-cases | published | operator/platform, vendor:resend | present |
| U914 | domain/waitlist/waitlist-service.ts:WaitlistService (takes `clock: Clock`, `logger: Logger`) | C1 | use-case | use-cases | published | visitor, operator/platform | present |
| U915 | domain/waitlist/waitlist-service.ts:module (Waitlist, JoinWaitlistCommand, WaitlistOffer, WaitlistConsentVersions, JoinWaitlistResult, ReducedPricingSignupResult, RegularPricingSignupResult, SendWaitlistConfirmationCommand, WaitlistSignupPricing) | C1 | boundary-data | use-cases | published | operator/platform | present |
| U916 | domain/waitlist/index.ts:module | C1 | framework-glue | adapters | published (`./waitlist`) | operator/platform | present |
| U950 | domain/waitlist/waitlist-registration.ts:decideReducedPricingRegistration (+ReducedPricingRegistrationDecision) | C1 | entity rule (pure, tested; called inside the repository transaction) | entities | published | visitor, operator/platform | present |
| U917 | domain/store/models.ts:module (ProductAsset, PublishedStoreProduct, PublishedProductCover, DownloadGrantItem, DownloadGrant, StoreTaxonomyValue) | C1 | boundary-data | use-cases | published | operator/platform, visitor | present |
| U918 | domain/store/models.ts:isStoreCoverMimeType (+STORE_COVER_MIME_TYPES) | C1 | entity (allowlist rule) | entities | published | operator/platform | present |
| U919 | domain/store/store-catalog-service.ts:StoreCatalog | C1 | port | use-cases | published | operator/platform | present |
| U920 | domain/store/store-catalog-service.ts:StoreCatalogService | C1 | use-case | use-cases | published | visitor, operator/platform | present |
| U921 | domain/store/store-catalog-service.ts:module (PublishedCatalogResult, PublishedProductResult, PublishedCoverResult) | C1 | boundary-data | use-cases | published | visitor | present |
| U922 | domain/store/store-acquisition-service.ts:StoreAcquisitions | C1 | port | use-cases | published | operator/platform | present |
| U923 | domain/store/store-acquisition-service.ts:StoreDeliveryService (+StoreDeliveryResult = delivered \| rejected \| unconfirmed) | C1 | port | use-cases | published | vendor:resend | present |
| U925 | domain/store/store-acquisition-service.ts:PayloadDigestGenerator | C1 | port | use-cases | published | operator/platform | present |
| U927 | domain/store/store-acquisition-service.ts:StoreAcquisitionService (takes `clock: Clock`, `logger: Logger`) | C1 | use-case | use-cases | published | visitor, operator/platform | present |
| U928 | domain/store/delivery-limit-key.ts:resolveDeliveryLimitKey | C1 | entity (sub-address normalisation rule) | entities | slice-private | operator/platform | present |
| U929 | domain/store/store-acquisition-service.ts:module (AcquireStoreProductsCommand, StoreAcquisitionResult, PrepareAcquisitionCommand, AcquisitionPreparation, ResolvedPriorAcquisition, CreateDownloadTokenResult) | C1 | boundary-data | use-cases | published | visitor, operator/platform | present |
| U951 | domain/store/delivery-limits.ts:module (STORE_DELIVERY_LIMIT_POLICY, resolveDeliveryWindows, evaluateDeliveryLimit, StoreDeliveryLimitWindow) | C1 | entity rule (pure, tested) | entities | published | visitor, operator/platform | present |
| U952 | domain/store/purchasability.ts:evaluatePurchasability (+PinnedProductSelection, LockedProductState, PurchasabilityDecision) | C1 | entity rule (pure, tested; called inside the acquisition transaction) | entities | published | visitor, operator/platform | present |
| U953 | domain/store/cart.ts:reconcileCart | C1 | entity rule (pure, tested) | entities | published | visitor | present |
| U954 | domain/store/download-grant.ts:module (isDownloadGrantActive, resolveGrantDelivery, GrantDelivery, DownloadGrantResolution) | C1 | entity rule (pure, tested) | entities | published | visitor | present |
| U955 | domain/store/product-publication-rules.ts:module (validateSlugFormat, resolveTaxonomy, checkPayloadSize, buildPublicationDigest, resolvePublicationTarget) | C1 | entity rule (pure, tested) | entities | published | operator/platform | present |
| U931 | domain/store/download-grant-service.ts:DownloadTokenHasher | C1 | port | use-cases | published | operator/platform | present |
| U932 | domain/store/download-grant-service.ts:DownloadGrants | C1 | port | use-cases | published | operator/platform | present |
| U933 | domain/store/download-grant-service.ts:DownloadGrantService (takes `clock: Clock`) | C1 | use-case | use-cases | published | visitor | present |
| U935 | domain/store/product-assets.ts:ProductAssets (+ProductAssetOpenResult = opened(bytes: AsyncIterable<Uint8Array>) \| unavailable) | C1 | port | use-cases | published | operator/platform | present |
| U937 | domain/store/product-asset-writer.ts:ProductAssetWriter (+ProductAssetContent) | C1 | port | use-cases | published | operator/platform | present |
| U938 | domain/store/product-asset-writer.ts:ProductAssetDigest | C1 | port | use-cases | published | operator/platform | present |
| U939 | domain/store/product-asset-writer.ts:buildCoverAssetKey / buildDownloadAssetKey | C1 | entity (content-addressing rule) | entities | slice-private | operator/platform | present |
| U940 | domain/store/product-file-formats.ts:resolveDownloadFormat / resolveCoverFormat | C1 | entity (format-by-signature rule) | entities | published | operator/platform | present |
| U941 | domain/store/product-file-formats.ts:module (STORE_DOWNLOAD_EXTENSIONS, STORE_COVER_EXTENSIONS, resolution types) | C1 | boundary-data | entities | slice-private | operator/platform | present |
| U942 | domain/store/product-publication-models.ts:module (publication commands/results + MAX_PUBLICATION_BYTES) | C1 | boundary-data + policy constant | use-cases | published | operator/platform | present |
| U943 | domain/store/store-product-publication-service.ts:StoreProductPublications | C1 | port | use-cases | published | operator/platform | present |
| U944 | domain/store/store-product-publication-service.ts:StoreProductPublicationService | C1 | use-case | use-cases | published | operator/platform | present |
| U945 | domain/store/store-product-publication-service.ts:module (PublishableProduct, StoreTaxonomySnapshot, StoredPublicationRecord, Persist/Plan/Publish commands) | C1 | boundary-data | use-cases | published | operator/platform | present |
| U946 | domain/store/index.ts:module | C1 | framework-glue | adapters | published (`./store`) | operator/platform | present |
| U956 | domain/email-address/normalize-email.ts:normalizeEmail (+index.ts) | C1 | entity rule (pure, tested) | entities | published (`./email-address`) | operator/platform | present |
| U957 | domain/shared/clock.ts:Clock | C1 | port | use-cases | published (`./shared`) | operator/platform | present |
| U958 | domain/shared/logger.ts:Logger | C1 | port | use-cases | published (`./shared`) | operator/platform | present |
| U959 | domain/shared/bot-verifier.ts:BotVerifier (+BotVerificationRequest, BotVerificationResult) | C1 | port | use-cases | published (`./shared`) | visitor, vendor:cloudflare-turnstile | present |
| U960 | domain/shared/product-email.ts:ProductEmail (+ProductEmailCommand, ProductEmailResult = sent \| rejected \| unconfirmed) | C1 | port | use-cases | published (`./shared`) | operator/platform, vendor:resend | present |
| U961 | domain/shared/management-authenticator.ts:ManagementAuthenticator (+ManagementCredentials, ManagementAuthenticationResult) | C1 | port | use-cases | published (`./shared`) | operator/platform, coach (future) | present |
| U962 | domain/shared/index.ts:module | C1 | framework-glue | adapters | published (`./shared`) | operator/platform | present |
| U1000 | bot-detection/bot-detection-contract.ts:botDetectionConfigSchema (+BotDetectionConfig) | C6 | boundary-data | adapters | published | vendor:cloudflare-turnstile | present |
| U1001 | bot-detection/bot-detection-contract.ts:TURNSTILE_RESPONSE_FIELD, STORE_ACQUISITION_TURNSTILE_ACTION, WAITLIST_TURNSTILE_ACTION | C6 | boundary-data | adapters | published | visitor, vendor:cloudflare-turnstile | present |
| U1002 | bot-detection/bot-detection-config.server.ts:createBotDetectionConfig (takes `BotDetectionSettings`) | C6 | adapter | adapters | published | operator/platform | present |
| U1004 | bot-detection/bot-detection-widget.tsx:BotDetectionWidget | C6 | view | adapters | published | visitor | present |
| U1007 | bot-detection/bot-verifier.server.ts:StaticTokenBotVerifier | C6 | adapter (un-exported; built by the factory) | adapters | package-private | operator/platform | present |
| U1008 | bot-detection/bot-verifier.server.ts:resolveRequestRemoteIp | C6 | utility | adapters | published | vendor:cloudflare | present |
| U1009 | bot-detection/create-bot-verifier.server.ts:createBotVerifier (selects on `BOT_DETECTION_PROVIDER`) | C6 | adapter factory | adapters | published | operator/platform | present |
| U1010 | bot-detection/index.server.ts:module | C6 | framework-glue | frameworks | published (`./bot-detection/server`) | - | present |
| U1011 | bot-detection/index.ts:module | C6 | framework-glue | frameworks | published (`./bot-detection`) | - | present |
| U1012 | bot-detection/turnstile-bot-verifier.server.ts:TurnstileBotVerifier | C6 | adapter (un-exported; built by the factory) | adapters | package-private | vendor:cloudflare-turnstile | present |
| U1013 | bot-detection/turnstile-client.ts:useTurnstileWidget (+TurnstileChallengeHandle) | C6 | view | adapters | package-private | visitor | present |
| U1015 | bot-detection/turnstile-widget.tsx:TurnstileWidget | C6 | view | adapters | package-private | visitor | present |
| U1016 | bot-detection/use-bot-detection-submission.ts:useBotDetectionSubmission | C6 | hook over the step machine | adapters | published | visitor | present |
| U1037 | bot-detection/bot-detection-flow.ts:module (reduceBotDetectionFlow, flow state and events) | C6 | step machine (pure, tested) | adapters | package-private | visitor | present |
| U1018 | email/email-primitives.server.tsx:Email* (10 components) | C6 | view | adapters | published | operator/platform | present |
| U1019 | email/index.server.ts:module | C6 | framework-glue | frameworks | published (`./email/server`) | - | present |
| U1023 | email/resend-product-email.server.ts:ResendProductEmail (implements `ProductEmail`, returns `ProductEmailResult`) | C6 | adapter | adapters | package-private (built by the factory) | vendor:resend | present |
| U1038 | email/in-memory-product-email.server.ts:InMemoryProductEmail | C6 | adapter (recording double) | adapters | published | operator/platform | present |
| U1039 | email/create-product-email.server.ts:createProductEmail (selects on `PRODUCT_EMAIL_PROVIDER` = memory \| resend) | C6 | adapter factory | adapters | published | operator/platform | present |
| U1026 | feature-flags/index.server.ts:module | C6 | framework-glue | frameworks | published (`./feature-flags/server`) | - | present |
| U1027 | feature-flags/repository.server.ts:PostgresFeatureFlagRepository (implements the C1 `FeatureFlags` port) | C6 | adapter | adapters | published | operator/platform | present |
| U1028 | feature-flags/schema.server.ts:featureFlagsTable | C6 | boundary-data | frameworks | package-private | operator/platform | present |
| U1029 | management-auth/bearer-secret-authenticator.server.ts:BearerSecretManagementAuthenticator (`authenticate({ authorizationHeader })`) | C6 | adapter (un-exported; built by the factory) | adapters | package-private | operator/platform | present |
| U1030 | management-auth/index.server.ts:module | C6 | framework-glue | frameworks | published (`./management-auth/server`) | - | present |
| U1031 | management-auth/management-auth-config.server.ts:createManagementAuthConfig, isSecureManagementTransport, MANAGEMENT_AGENT_PRINCIPAL_ID | C6 | adapter | adapters | published | operator/platform | present |
| U1033 | management-auth/management-auth-contract.server.ts:ManagementAuthConfig (+ManagementTransportPolicy) | C6 | boundary-data | adapters | published | operator/platform | present |
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
| U1191 | packages/test-support/src/index.ts:CLERK_TEST_ENVIRONMENT | C16 | boundary-data | tests | published (`.`, devDependency only) | operator/platform | present |
