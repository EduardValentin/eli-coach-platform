# Units

Header: date 2026-09-15, commit 148d594f, scope apps/platform/src, apps/platform/db, packages/{config,content,db,domain,infrastructure,ui}/src plus the enforcement layer (eslint.config.mjs, tools/lint-boundaries.test.mjs, workspace package.json export maps, tsconfigs, vite/react-router/vitest configs), mode audit.

One row per module by default; ports, entity/model sets, and separate implementations get their own rows. Test files (`*.test.*`) are the outermost ring and are not mapped as units; the tests that import each module are listed in the slice returns under `.architecture/slices/`. Component IDs refer to `components.md`.

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
| U115 | store/contracts/store-management.ts:module | C7 | boundary-data | adapters | published (R3 contracts carve-out) | operator/platform | present |
| U116 | store/contracts/store.ts:module | C7 | boundary-data | adapters | published (R3 contracts carve-out) | visitor | present |
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
| U127 | store/email/create-store-delivery-service.server.ts:createStoreDeliveryService | C7 | mixed | adapters | public | operator/platform, vendor:resend | present |
| U128 | store/email/disabled-store-delivery-service.server.ts:DisabledStoreDeliveryService | C7 | adapter | adapters | public | operator/platform | present |
| U129 | store/email/email-store-delivery-service.server.ts:EmailStoreDeliveryService | C7 | adapter | adapters | public | visitor, vendor:resend | present |
| U130 | store/email/store-delivery-email-template.server.tsx:StoreDeliveryEmailTemplate | C7 | view | adapters | public | visitor | present |
| U131 | store/email/store-delivery-email.server.ts:createStoreDeliveryEmailContent | C7 | adapter | adapters | public | visitor | present |
| U200 | store/ui/public/api-client.ts:STORE_CATALOG_API_URL | C7 | boundary-data | adapters | public | visitor | present |
| U201 | store/ui/public/api-client.ts:STORE_ACQUISITIONS_API_PATH/URL | C7 | boundary-data | adapters | public | visitor | present |
| U202 | store/ui/public/api-client.ts:useStoreCatalogFetcher | C7 | adapter | adapters | public | visitor | present |
| U203 | store/ui/public/api-client.ts:useStoreAcquisitionFetcher | C7 | adapter | adapters | public | visitor | present |
| U204 | store/ui/public/cart.ts:StoreCartState | C7 | boundary-data | adapters | published | visitor | present |
| U205 | store/ui/public/cart.ts:createStoreCartStore | C7 | mixed | adapters | published | visitor (cart rule), operator/platform (storage format), visitor accessibility (focus restore) | present |
| U206 | store/ui/public/cart.ts:useHydrateStoreCart | C7 | adapter | adapters | public | visitor | present |
| U207 | store/ui/public/cart.ts:useReconcileStoreCartCatalog | C7 | mixed | adapters | public | visitor | present |
| U208 | store/ui/public/cart.ts:selectStoreCartProducts | C7 | mixed | adapters | public | visitor | present |
| U209 | store/ui/public/cart.ts:storeCartStorage | C7 | adapter | adapters | private | visitor | present |
| U210 | store/ui/public/cart-provider.tsx:StoreCartProvider | C7 | framework-glue | frameworks | published | visitor | present |
| U211 | store/ui/public/cart-provider.tsx:useStoreCart | C7 | framework-glue | frameworks | published | visitor | present |
| U212 | store/ui/public/cart-drawer.tsx:StoreCartButton | C7 | view | frameworks | published | visitor | present |
| U213 | store/ui/public/cart-drawer.tsx:StoreCartDrawer | C7 | mixed | frameworks | published | visitor | present |
| U214 | store/ui/public/cart-drawer.tsx:CartReview | C7 | view | frameworks | private | visitor | present |
| U215 | store/ui/public/cart-drawer.tsx:CartProduct | C7 | view | frameworks | private | visitor | present |
| U216 | store/ui/public/cart-drawer.tsx:AcquisitionDetails | C7 | mixed | frameworks | private | visitor | present |
| U217 | store/ui/public/cart-drawer.tsx:ConsentRow/StoreAcquisitionError/AcquisitionSuccess | C7 | view | frameworks | private | visitor | present |
| U218 | store/ui/public/acquisition-form.ts:useStoreAcquisition | C7 | mixed | adapters | public | visitor | present |
| U219 | store/ui/public/acquisition-form.ts:resolveAcquisitionError | C7 | adapter | adapters | private | visitor | present |
| U220 | store/ui/public/acquisition-form.ts:createIdempotencyKey | C7 | utility | adapters | private | visitor | present |
| U221 | store/ui/public/catalog-filters.ts:STORE_FILTER_DIMENSIONS | C7 | boundary-data | adapters | public | visitor | present |
| U222 | store/ui/public/catalog-filters.ts:collectFilterDimensions | C7 | mixed | adapters | public | visitor | present |
| U223 | store/ui/public/catalog-filters.ts:offersAnyFilter | C7 | utility | adapters | public | visitor | present |
| U224 | store/ui/public/catalog-filters.ts:resolveFilterSelection | C7 | mixed | adapters | public | visitor | present |
| U225 | store/ui/public/catalog-filters.ts:canonicalizeFilterSearchParams | C7 | mixed | adapters | public | visitor | present |
| U226 | store/ui/public/catalog-filters.ts:filterProducts | C7 | mixed | adapters | public | visitor | present |
| U227 | store/ui/public/catalog-filters.ts:removeFilterParams | C7 | utility | adapters | public | visitor | present |
| U228 | store/ui/public/catalog-filters.ts:haveOnlyFilterParamsChanged | C7 | utility | adapters | public | visitor | present |
| U229 | store/ui/public/catalog-filter-controls.tsx:useStoreCatalogFilterFocus | C7 | adapter | frameworks | public | visitor | present |
| U230 | store/ui/public/catalog-filter-controls.tsx:StoreCatalogFilters | C7 | view | frameworks | public | visitor | present |
| U231 | store/ui/public/catalog-page.server.ts:loader | C7 | mixed | adapters | published (routed) | visitor | present |
| U232 | store/ui/public/catalog-page.server.ts:throwWhenFiltersAreNotCanonical | C7 | mixed | adapters | private | visitor | present |
| U233 | store/ui/public/catalog-page.tsx:CatalogRoute | C7 | view | frameworks | published (routed) | visitor | present |
| U234 | store/ui/public/catalog-page.tsx:shouldRevalidate | C7 | mixed | adapters | published (routed) | visitor | present |
| U235 | store/ui/public/catalog-page.tsx:meta | C7 | view | frameworks | published (routed) | visitor | present |
| U236 | store/ui/public/catalog-page.tsx:ErrorBoundary | C7 | view | frameworks | published (routed) | visitor | present |
| U237 | store/ui/public/catalog-view.tsx:CatalogView | C7 | mixed | frameworks | public | visitor | present |
| U238 | store/ui/public/catalog-view.tsx:CatalogUnavailableView | C7 | view | frameworks | public | visitor | present |
| U239 | store/ui/public/catalog-view.tsx:CatalogShell/CatalogContent/CatalogResults/EmptyCatalogView/describeMatchCount | C7 | mixed | frameworks | private | visitor | present |
| U240 | store/ui/public/catalog-view.tsx:CatalogProductCard | C7 | view | frameworks | private | visitor | present |
| U241 | store/ui/public/download-page.tsx:DownloadRoute | C7 | view | frameworks | published (routed) | visitor | present |
| U242 | store/ui/public/download-page.tsx:meta | C7 | view | frameworks | published (routed) | visitor | present |
| U243 | store/ui/public/download-page.tsx:UnavailableDownload | C7 | view | frameworks | private | visitor | present |
| U244 | store/ui/public/download-state.ts:DOWNLOAD_API_URL | C7 | boundary-data | adapters | public | visitor | present |
| U245 | store/ui/public/download-state.ts:resolvePrivateDownloadToken | C7 | mixed | adapters | public | visitor | present |
| U246 | store/ui/public/download-state.ts:usePrivateDownloadToken | C7 | adapter | adapters | public | visitor | present |
| U247 | store/ui/public/product-page.server.ts:loader | C7 | adapter | adapters | published (routed) | visitor | present |
| U248 | store/ui/public/product-page.tsx:ProductDetailsRoute | C7 | view | frameworks | published (routed) | visitor | present |
| U249 | store/ui/public/product-page.tsx:meta | C7 | view | frameworks | published (routed) | visitor | present |
| U300 | features/waitlist/api/waitlist.ts:action | C8 | framework-glue | frameworks | published | visitor, operator/platform | present |
| U301 | features/waitlist/api/waitlist-controller.server.ts:WaitlistController | C8 | adapter | adapters | public | visitor, operator/platform | present |
| U302 | features/waitlist/contracts/waitlist.ts:module | C8 | boundary-data | adapters | published | visitor | present |
| U303 | features/waitlist/data/repository.server.ts:PostgresWaitlistRepository | C8 | adapter | adapters | public | operator/platform | present |
| U304 | features/waitlist/data/schema.server.ts:waitlistEntriesTable | C8 | boundary-data | adapters | public | operator/platform | present |
| U305 | features/waitlist/email/create-waitlist-confirmation-service.server.ts:createWaitlistConfirmationService | C8 | composition-root | composition | public | operator/platform, vendor:resend | present |
| U306 | features/waitlist/email/disabled-waitlist-confirmation-service.server.ts:DisabledWaitlistConfirmationService | C8 | adapter | adapters | public | operator/platform | present |
| U307 | features/waitlist/email/email-waitlist-confirmation-service.server.ts:EmailWaitlistConfirmationService | C8 | adapter | adapters | public | operator/platform, vendor:resend | present |
| U308 | features/waitlist/email/waitlist-confirmation-email-template.server.tsx:WaitlistConfirmationEmailTemplate | C8 | view | adapters | public | operator/platform | present |
| U309 | features/waitlist/email/waitlist-confirmation-email.server.ts:createWaitlistConfirmationEmailContent | C8 | adapter | adapters | public | operator/platform | present |
| U310 | features/waitlist/ui/public/api-client.ts:useJoinWaitlistFetcher | C8 | adapter | adapters | public | visitor | present |
| U311 | features/waitlist/ui/public/availability-status.tsx:WaitlistAvailabilityStatus | C8 | view | adapters | published | visitor | present |
| U312 | features/waitlist/ui/public/confetti.ts:launchWaitlistConfetti | C8 | adapter | adapters | public | visitor | present |
| U313 | features/waitlist/ui/public/email-form.tsx:WaitlistEmailForm | C8 | mixed | adapters | published | visitor | present |
| U314 | features/waitlist/ui/public/errors.ts:module | C8 | mixed | adapters | public | visitor | present |
| U315 | features/waitlist/ui/public/submission.ts:useWaitlistSubmission | C8 | mixed | adapters | public | visitor | present |
| U316 | features/coaching-bundles/ui/public/bundle-selector.tsx:BundleSelector | C10 | view | adapters | published | visitor | present |
| U400 | accounts/api/account-controller.server.ts:AccountController | C9 | adapter | adapters | published | client, coach | present |
| U401 | accounts/api/account.ts:loader | C9 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U402 | accounts/api/clerk-webhooks.ts:action | C9 | framework-glue | frameworks | published (routed) | vendor:clerk, operator/platform | present |
| U403 | accounts/api/webhook-controller.server.ts:AccountWebhookController | C9 | mixed | adapters | public | vendor:clerk, operator/platform | present |
| U404 | accounts/contracts/account.ts:accountResponseSchema | C9 | boundary-data | adapters | published | client, coach | present |
| U405 | accounts/contracts/account.ts:PublicSessionState | C9 | boundary-data | adapters | published | visitor, client, coach | present |
| U406 | accounts/data/account-repository.server.ts:PostgresAccountRepository | C9 | adapter | adapters | public | operator/platform | present |
| U407 | accounts/data/schema.server.ts:module (accountsTable, accountRoleEnum) | C9 | adapter | adapters | public | operator/platform | present |
| U408 | accounts/server/account-context.server.ts:accountContext | C9 | framework-glue | frameworks | published (S6, S7) | operator/platform | present |
| U409 | accounts/server/account-context.server.ts:ResolvedSession | C9 | boundary-data | adapters | published (S6) | operator/platform | present |
| U410 | accounts/server/account-resolution-middleware.server.ts:createAccountResolutionMiddleware | C9 | mixed | adapters | published (S5 root.server.ts) | operator/platform, vendor:clerk | present |
| U411 | accounts/server/require-account.server.ts:requirePortalAccess | C9 | adapter | adapters | published (S7 layouts) | client, coach | present |
| U412 | accounts/server/require-account.server.ts:requireApiAccount | C9 | adapter | adapters | published (U400) | client, coach | present |
| U413 | accounts/ui/public/auth-nav-actions.tsx:AuthNavActions | C9 | view | frameworks | published (S6) | visitor, client, coach | present |
| U414 | accounts/ui/public/sign-in-failed-page.tsx:SignInFailedRoute | C9 | view | frameworks | published (routed) | visitor | present |
| U415 | accounts/ui/public/sign-in-failed-page.server.ts:loader | C9 | framework-glue | frameworks | public | visitor | present |
| U416 | accounts/ui/shared/access-denied-page.tsx:AccessDeniedPage | C9 | view | frameworks | published (S5 root.tsx) | client, coach | present |
| U417 | accounts/ui/shared/access-denied-page.tsx:resolveAccessDeniedRecovery | C9 | adapter | adapters | published (S5 root.tsx) | client, coach | present |
| U500 | server/container.server.ts:createPlatformContainer | C14 | composition-root | composition | published | operator/platform | present |
| U501 | server/container.server.ts:getPlatformContainer | C14 | composition-root | composition | published | operator/platform | present |
| U502 | server/container.server.ts:PlatformContainer | C14 | boundary-data | composition | published | operator/platform | present |
| U503 | server/database.server.ts:createPlatformDatabase | C14 | adapter | frameworks | published | operator/platform | present |
| U504 | server/database.server.ts:DatabaseClosedError | C14 | adapter | frameworks | published | operator/platform | present |
| U505 | server/database.server.ts:PlatformDatabase | C14 | boundary-data | frameworks | published | operator/platform | present |
| U506 | server/http.server.ts:HttpJsonError | C14 | adapter | adapters | published | operator/platform | present |
| U507 | server/http.server.ts:HttpResponseError | C14 | adapter | adapters | published | operator/platform | present |
| U508 | server/http.server.ts:handleHttpErrorResponse | C14 | adapter | adapters | published | operator/platform | present |
| U509 | server/http.server.ts:module (createMethodNotAllowedResponse, throwMethodNotAllowedResponse, createBadRequestResponse, readJsonRequestBody, readFormDataRequestBody) | C14 | adapter | adapters | published | operator/platform | present |
| U510 | server/runtime-environment.server.ts:getRuntimeEnvironment | C14 | adapter | frameworks | published | operator/platform | present |
| U511 | server/api/app-metadata-controller.server.ts:AppMetadataController | C14 | adapter | adapters | published | operator/platform | present |
| U512 | server/api/service-metadata.ts:appMetadataSchema | C14 | boundary-data | adapters | published | operator/platform | present |
| U513 | server/api/feature-flags.ts:module (action, loader) | C14 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U514 | server/api/meta.ts:module (loader) | C14 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U515 | server/api/readyz.ts:module (loader) | C14 | framework-glue | frameworks | published (routed) | operator/platform | present |
| U516 | server/api/readyz-controller.server.ts:ReadyzController | C14 | adapter | adapters | published | operator/platform | present |
| U520 | root.tsx:module (Root, Layout, ErrorBoundary, meta, links) | C15 | mixed | frameworks | published (routed) | visitor, client, coach | present |
| U521 | root.server.ts:module (middleware, loader) | C15 | composition-root | composition | published | operator/platform | present |
| U522 | root-error-page.tsx:RootErrorPage | C15 | view | frameworks | published | visitor, client, coach | present |
| U523 | routes.ts:module | C15 | framework-glue | frameworks | published | operator/platform | present |
| U524 | app.css:module | C15 | framework-glue | frameworks | published | operator/platform | present |
| U525 | types/canvas-confetti.d.ts:module | C15 | framework-glue | frameworks | private | operator/platform | present |
| U526 | apps/platform/db/drizzle.config.ts:module | C15 | framework-glue | frameworks | published (CLI) | operator/platform | present |
| U527 | apps/platform/vite.config.ts:module | C15 | framework-glue | frameworks | published (build) | operator/platform | present |
| U528 | apps/platform/react-router.config.ts:module | C15 | framework-glue | frameworks | published (build) | operator/platform | present |
| U600 | public-site/shell/logo.tsx:Logo | C11 | view | frameworks | public | operator/platform | present |
| U601 | public-site/shell/public-navigation.tsx:PublicNavigation (+PublicNavigationLink types) | C11 | view | frameworks | public | visitor | present |
| U602 | public-site/shell/public-footer.tsx:PublicFooter | C11 | view | frameworks | public | visitor | present |
| U603 | public-site/shell/public-layout.tsx:PublicLayout | C11 | mixed | frameworks | public | visitor, operator/platform | present |
| U604 | public-site/shell/layout.server.ts:loader | C11 | adapter | adapters | published (routed via layout.tsx) | visitor, operator/platform | present |
| U605 | public-site/shell/layout.server.ts:PublicLayoutLoaderData (+session mapping helper) | C11 | boundary-data | adapters | public | visitor | present |
| U606 | public-site/shell/layout.tsx:PublicLayoutRoute | C11 | mixed | frameworks | published (routed) | visitor | present |
| U607 | public-site/shell/layout.tsx:shouldRevalidate | C11 | mixed | adapters | published (routed) | visitor, operator/platform | present |
| U608 | public-site/shell/layout.tsx:PublicOutletContext | C11 | boundary-data | adapters | public | visitor | present |
| U609 | public-site/sections/about/about-content.ts:module | C11 | boundary-data | adapters | public | operator/platform | present |
| U610 | public-site/sections/about/instagram-story-widget.tsx:InstagramStoryWidget | C11 | view | frameworks | public | visitor | present |
| U611 | public-site/sections/about/about.tsx:PublicAbout | C11 | mixed | frameworks | public | visitor, operator/platform | present |
| U612 | public-site/sections/cycle-nutrition/cycle-nutrition-content.ts:module | C11 | mixed | adapters | public | operator/platform | present |
| U613 | public-site/sections/cycle-nutrition/cycle-nutrition.css:module | C11 | framework-glue | frameworks | private | operator/platform | present |
| U614 | public-site/sections/cycle-nutrition/cycle-nutrition.tsx:PublicCycleNutrition | C11 | view | frameworks | public | visitor | present |
| U615 | public-site/sections/footer-cta/footer-cta.tsx:PublicFooterCta | C11 | mixed | frameworks | public | visitor, operator/platform | present |
| U616 | public-site/sections/footer-cta/footer-cta.tsx:FooterCtaShell | C11 | view | frameworks | public | visitor | present |
| U617 | public-site/sections/hero/hero.tsx:PublicHero | C11 | mixed | frameworks | public | visitor, operator/platform | present |
| U618 | public-site/sections/hero/hero.tsx:(private helpers) | C11 | view | frameworks | private | visitor | present |
| U619 | public-site/sections/legal/legal-document-view.tsx:LegalDocumentView | C11 | mixed (view + date formatting) | frameworks | public | visitor | present |
| U620 | public-site/sections/legal/legal-nav.tsx:LegalNav | C11 | view | frameworks | public | visitor | present |
| U621 | public-site/sections/my-method/my-method.tsx:PublicMyMethod | C11 | view | frameworks | public | visitor | present |
| U622 | public-site/sections/platform/platform-content.ts:module | C11 | boundary-data | adapters | public | operator/platform | present |
| U623 | public-site/sections/platform/platform.tsx:PublicPlatform | C11 | view | frameworks | public | visitor | present |
| U624 | public-site/sections/workouts/workouts.tsx:PublicWorkouts | C11 | view | frameworks | public | visitor | present |
| U625 | public-site/pages/home.tsx:HomeRoute (+meta) | C11 | view | frameworks | published (routed) | visitor | present |
| U626 | public-site/pages/pricing.tsx:PricingRoute (+meta) | C11 | mixed | frameworks | published (routed) | visitor, operator/platform | present |
| U627 | public-site/pages/pricing.tsx:WaitlistPricingCta | C11 | mixed | frameworks | private | visitor | present |
| U628 | public-site/pages/pricing.tsx:(private helpers) | C11 | view | frameworks | private | visitor | present |
| U629 | public-site/pages/blog.tsx:BlogRoute (+meta) | C11 | view | frameworks | published (routed) | visitor | present |
| U630 | public-site/pages/privacy.tsx:PrivacyRoute (+meta) | C11 | view | frameworks | published (routed) | visitor | present |
| U631 | public-site/pages/terms.tsx:TermsRoute (+meta) | C11 | view | frameworks | published (routed) | visitor | present |
| U700 | client-portal/api/manifest.ts:loader | C12 | adapter | adapters | published (routed) | client, operator/platform | present |
| U701 | client-portal/api/readyz.ts:loader | C12 | adapter | adapters | published (routed) | operator/platform | present |
| U702 | client-portal/api/sw.ts:loader | C12 | adapter | adapters | published (routed) | client, operator/platform | present |
| U703 | client-portal/api/service-worker.js:module | C12 | framework-glue | frameworks | private (loaded via `?raw` import) | client, operator/platform | present |
| U704 | client-portal/pages/home.tsx:ClientHomeRoute | C12 | view | frameworks | published (routed) | client | present |
| U705 | client-portal/shell/layout.server.ts:middleware | C12 | framework-glue | frameworks | published (re-exported by `layout.tsx`, routed) | client, coach (guard shape shared), operator/platform | present |
| U706 | client-portal/shell/layout.tsx:ClientLayoutRoute | C12 | mixed | frameworks | published (routed) | client | present |
| U707 | client-portal/shell/layout.tsx:middleware (re-export) | C12 | framework-glue | frameworks | published (routed) | client | present |
| U708 | client-portal/shell/navigation-links.ts:clientSurfaceLinks | C12 | boundary-data | adapters | public | client | present |
| U709 | coach-portal/api/readyz.ts:loader | C13 | adapter | adapters | published (routed) | operator/platform | present |
| U710 | coach-portal/pages/home.tsx:CoachHomeRoute | C13 | view | frameworks | published (routed) | coach | present |
| U711 | coach-portal/shell/layout.server.ts:middleware | C13 | framework-glue | frameworks | published (re-exported by `layout.tsx`, routed) | coach, operator/platform | present |
| U712 | coach-portal/shell/layout.tsx:CoachLayoutRoute | C13 | mixed | frameworks | published (routed) | coach | present |
| U713 | coach-portal/shell/layout.tsx:CoachBrand | C13 | view | frameworks | private | coach | present |
| U714 | coach-portal/shell/layout.tsx:CoachTopBarBrand | C13 | view | frameworks | private | coach | present |
| U715 | coach-portal/shell/layout.tsx:middleware (re-export) | C13 | framework-glue | frameworks | published (routed) | coach | present |
| U716 | coach-portal/shell/navigation-links.tsx:coachSurfaceLinks | C13 | boundary-data | adapters | public | coach | present |
| U800 | packages/ui/src/index.ts:module | C5 | framework-glue | frameworks | published | operator/platform | present |
| U801 | packages/ui/src/constants.ts:MAIN_CONTENT_ID | C5 | utility | frameworks | private | operator/platform | present |
| U802 | packages/ui/src/styles.css:module | C5 | boundary-data | frameworks | published | operator/platform | present |
| U803 | packages/ui/src/lib/cn.ts:cn | C5 | utility | frameworks | published | operator/platform | present |
| U804 | packages/ui/src/lib/motion.ts:module (createFadeUpVariants, publicEase, publicEaseOut, publicViewportOnce, useClientReducedMotionPreference) | C5 | mixed | frameworks | published | operator/platform, visitor | present |
| U805 | packages/ui/src/lib/use-search-params-writer.ts:useSearchParamsWriter | C5 | mixed | adapters | published | operator/platform | present |
| U806 | components/app-shell.tsx:AppShell | C5 | view | frameworks | published | operator/platform | present |
| U807 | components/app-shell.tsx:Panel | C5 | view | frameworks | published (no outside consumer) | operator/platform | present |
| U808-U810 | components/avatar.tsx:Avatar, AvatarImage, AvatarFallback | C5 | view | frameworks | published (no outside consumer) | operator/platform | present |
| U811 | components/badge.tsx:Badge (+badgeVariants) | C5 | view | frameworks | published (no outside consumer) | operator/platform | present |
| U812 | components/button.tsx:Button (+buttonVariants) | C5 | view | frameworks | published | operator/platform | present |
| U813 | components/card.tsx:Card | C5 | view | frameworks | published | operator/platform | present |
| U814 | components/card.tsx:cardClasses | C5 | view | frameworks | private | operator/platform | present |
| U815 | components/checkbox.tsx:Checkbox | C5 | view | frameworks | published | operator/platform | present |
| U816-U822 | components/dialog.tsx:Dialog, DialogTrigger, DialogClose, DialogOverlay, DialogContent, DialogTitle, DialogDescription | C5 | view | frameworks | published (no outside consumer; internal reuse by sheet.tsx) | operator/platform | present |
| U823 | components/filter-chip-group.tsx:FilterChipGroup (+filterChipVariants, FilterChipTone) | C5 | mixed | adapters | published | visitor (store catalog filtering) | present |
| U824 | components/filter-chip-group.tsx:FilterChip | C5 | view | frameworks | published | operator/platform | present |
| U825 | components/icon-button.tsx:IconButton | C5 | view | frameworks | published | operator/platform | present |
| U826 | components/input.tsx:Input (+inputClasses) | C5 | view | frameworks | published | operator/platform | present |
| U827 | components/link.tsx:Link (+linkVariants) | C5 | view | frameworks | published | operator/platform | present |
| U828 | components/phone-frame.tsx:PhoneFrame | C5 | view | frameworks | published | operator/platform | present |
| U829 | components/section-eyebrow.tsx:SectionEyebrow | C5 | view | frameworks | published | operator/platform | present |
| U830 | components/portal-shell.tsx:PortalShell (+PortalNavigationLink) | C5 | mixed | adapters | published | coach, client | present |
| U831 | components/portal-shell.tsx:PortalSidebarContent | C5 | view | frameworks | private | coach, client | present |
| U832 | components/sidebar-surface-layout.tsx:SidebarSurfaceLayout | C5 | view | frameworks | published | operator/platform | present |
| U833-U838 | components/sheet.tsx:Sheet, SheetTrigger, SheetClose, SheetTitle, SheetDescription, SheetContent | C5 | view | frameworks | published | operator/platform | present |
| U839-U848 | components/select.tsx:Select* (10 symbols) | C5 | view | frameworks | published (no outside consumer) | operator/platform | present |
| U849 | components/text-area.tsx:TextArea (+textAreaClasses) | C5 | view | frameworks | published (no outside consumer) | operator/platform | present |
| U900 | domain/accounts/account-model.ts:Account (+AccountRole, canAccessClientPortal, canAccessCoachPortal) | C1 | entity | entities | published | operator/platform, coach, client | present |
| U901 | domain/accounts/account-repository.ts:AccountRepository | C1 | port | use-cases | published | operator/platform | present |
| U902 | domain/accounts/account-provisioning-service.ts:AccountProvisioningService (+AccountProvisioningResult) | C1 | use-case | use-cases | published | operator/platform, vendor:clerk | present |
| U903 | domain/accounts/index.ts:module | C1 | framework-glue | adapters | public | operator/platform | present |
| U904 | domain/coaching-bundles/coaching-bundle-model.ts:module (coachingBundles, coachingBundleBenefits, resolveCoachingBundleDisplay, types) | C1 | mixed | entities | published | operator/platform (pricing), waitlist campaign | present |
| U905 | domain/coaching-bundles/index.ts:module | C1 | framework-glue | adapters | public | operator/platform | present |
| U906 | domain/feature-flags/feature-flag-model.ts:FeatureFlagRepository | C1 | port | use-cases | published | operator/platform | present |
| U907 | domain/feature-flags/feature-flag-model.ts:FeatureFlagReader | C1 | port | use-cases | published | operator/platform | present |
| U908 | domain/feature-flags/feature-flag-model.ts:PersistedFeatureFlag (+FeatureFlagSet, FeatureFlagEvaluationContext, FeatureFlagName) | C1 | boundary-data | use-cases | published | operator/platform | present |
| U909 | domain/feature-flags/feature-flag-service.ts:FeatureFlagService | C1 | use-case | use-cases | published | operator/platform | present |
| U910 | domain/feature-flags/index.ts:module | C1 | framework-glue | adapters | public | operator/platform | present |
| U911 | domain/waitlist/waitlist-availability.ts:module (resolveWaitlistAvailability, getWaitlistAvailabilityBucketStart, WaitlistAvailability, WAITLIST_AVAILABILITY_BUCKET_DURATION_MS) | C1 | entity | entities | published | operator/platform, visitor | present |
| U912 | domain/waitlist/waitlist-service.ts:WaitlistRepository | C1 | port | use-cases | published | operator/platform | present |
| U913 | domain/waitlist/waitlist-service.ts:WaitlistConfirmationService | C1 | port | use-cases | published | operator/platform, vendor:resend | present |
| U914 | domain/waitlist/waitlist-service.ts:WaitlistService | C1 | use-case | use-cases | published | visitor, operator/platform | present |
| U915 | domain/waitlist/waitlist-service.ts:module (Waitlist, JoinWaitlistCommand, WaitlistOffer, WaitlistConsentVersions, JoinWaitlistResult, ReducedPricingSignupResult, RegularPricingSignupResult, SendWaitlistConfirmationCommand, WaitlistSignupPricing) | C1 | boundary-data | use-cases | published | operator/platform | present |
| U916 | domain/waitlist/index.ts:module | C1 | framework-glue | adapters | public | operator/platform | present |
| U917 | domain/store/models.ts:module (ProductAsset, PublishedProductVersion, PublishedStoreProduct, PublishedProductCover, DownloadGrantItem, DownloadGrant, StoreTaxonomyValue) | C1 | boundary-data | use-cases | published | operator/platform, visitor | present |
| U918 | domain/store/models.ts:isStoreCoverMimeType (+STORE_COVER_MIME_TYPES) | C1 | mixed (allowlist rule) | entities | published | operator/platform | present |
| U919 | domain/store/store-catalog-service.ts:StoreCatalogRepository | C1 | port | use-cases | published | operator/platform | present |
| U920 | domain/store/store-catalog-service.ts:StoreCatalogService | C1 | use-case | use-cases | published | visitor, operator/platform | present |
| U921 | domain/store/store-catalog-service.ts:module (PublishedCatalogResult, PublishedProductResult, PublishedCoverResult) | C1 | boundary-data | use-cases | published | visitor | present |
| U922 | domain/store/store-acquisition-service.ts:StoreAcquisitionRepository | C1 | port | use-cases | published | operator/platform | present |
| U923 | domain/store/store-acquisition-service.ts:StoreDeliveryService | C1 | port | use-cases | published | vendor:resend | present |
| U924 | domain/store/store-acquisition-service.ts:DownloadTokenGenerator | C1 | port | use-cases | published | operator/platform | present |
| U925 | domain/store/store-acquisition-service.ts:PayloadDigestGenerator | C1 | port | use-cases | published | operator/platform | present |
| U926 | domain/store/store-acquisition-service.ts:StoreClock | C1 | port | use-cases | published | operator/platform | present |
| U927 | domain/store/store-acquisition-service.ts:StoreAcquisitionService | C1 | mixed (use-case + rate-limit window arithmetic + grant-expiry arithmetic) | use-cases | published | visitor, operator/platform | present |
| U928 | domain/store/store-acquisition-service.ts:resolveDeliveryLimitKey (+normalizeStoreEmail) | C1 | mixed (sub-address normalization rule) | entities | public | operator/platform | present |
| U929 | domain/store/store-acquisition-service.ts:module (AcquireStoreProductsCommand, StoreAcquisitionResult, PrepareAcquisitionCommand, AcquisitionPreparation, ResolvedPriorAcquisition, StoreConsentVersions, CreateDownloadTokenResult, StoreDeliveryResource, StoreDeliveryLimitWindow) | C1 | boundary-data | use-cases | published | visitor, operator/platform | present |
| U930 | domain/store/store-acquisition-service.ts:StoreDeliveryRejectedError | C1 | boundary-data (typed error) | use-cases | published | vendor:delivery | present |
| U931 | domain/store/download-grant-service.ts:DownloadTokenHasher | C1 | port | use-cases | published | operator/platform | present |
| U932 | domain/store/download-grant-service.ts:DownloadGrantRepository | C1 | port | use-cases | published | operator/platform | present |
| U933 | domain/store/download-grant-service.ts:DownloadGrantService | C1 | mixed (use-case + grant-expiry arithmetic) | use-cases | published | visitor | present |
| U934 | domain/store/download-grant-service.ts:DownloadGrantResolution | C1 | boundary-data | use-cases | published | visitor | present |
| U935 | domain/store/product-asset-store.ts:ProductAssetStore | C1 | port (signature carries NodeJS.ReadableStream) | use-cases | published | operator/platform | present |
| U936 | domain/store/product-asset-store.ts:ProductAssetUnavailableError | C1 | boundary-data (typed error) | use-cases | published | operator/platform | present |
| U937 | domain/store/product-asset-writer.ts:ProductAssetWriter (+ProductAssetContent, Uint8Array) | C1 | port | use-cases | public (not in src/index.ts) | operator/platform | present |
| U938 | domain/store/product-asset-writer.ts:ProductAssetDigest | C1 | port | use-cases | public (not in src/index.ts) | operator/platform | present |
| U939 | domain/store/product-asset-writer.ts:buildCoverAssetKey / buildDownloadAssetKey | C1 | entity (content-addressing rule) | entities | public | operator/platform | present |
| U940 | domain/store/product-file-formats.ts:resolveDownloadFormat / resolveCoverFormat | C1 | entity (format-by-signature rule) | entities | public | operator/platform | present |
| U941 | domain/store/product-file-formats.ts:module (StoreFileFormat, resolutions, STORE_DOWNLOAD_EXTENSIONS, STORE_COVER_EXTENSIONS) | C1 | boundary-data | entities | published (constants) / public (types) | operator/platform | present |
| U942 | domain/store/product-publication-models.ts:module (publication commands/results + MAX_PUBLICATION_BYTES) | C1 | mixed (boundary-data + policy constant) | use-cases | published | operator/platform | present |
| U943 | domain/store/store-product-publication-service.ts:StoreProductPublicationRepository | C1 | port | use-cases | published | operator/platform | present |
| U944 | domain/store/store-product-publication-service.ts:StoreProductPublicationService | C1 | mixed (use-case sequencing + idempotency-digest canonicalization + size threshold + slug/taxonomy validation) | use-cases | published | operator/platform | present |
| U945 | domain/store/store-product-publication-service.ts:module (PublishableProduct, StoreTaxonomySnapshot, StoredPublicationRecord, Persist/Plan/Publish commands) | C1 | boundary-data | use-cases | published | operator/platform | present |
| U946 | domain/store/index.ts:module | C1 | framework-glue | adapters | public | operator/platform | present |
| U947 | domain/index.ts:module | C1 | framework-glue | adapters | published | operator/platform | present |
| U1000 | bot-detection/bot-detection-contract.ts:botDetectionConfigSchema | C6 | boundary-data | adapters | published | vendor:cloudflare-turnstile | present |
| U1001 | bot-detection/bot-detection-contract.ts:TURNSTILE_RESPONSE_FIELD, STORE_ACQUISITION_TURNSTILE_ACTION, WAITLIST_TURNSTILE_ACTION | C6 | boundary-data | adapters | published | visitor, vendor:cloudflare-turnstile | present |
| U1002 | bot-detection/bot-detection-config.server.ts:createBotDetectionConfig | C6 | adapter | adapters | published | operator/platform | present |
| U1003 | bot-detection/bot-detection-config.server.ts:usesStaticBotDetection | C6 | utility | adapters | public | operator/platform | present |
| U1004 | bot-detection/bot-detection-widget.tsx:BotDetectionWidget | C6 | view | adapters | published | visitor | present |
| U1005 | bot-detection/bot-detection-widget.tsx:StaticBotDetectionWidget | C6 | view | adapters | private | operator/platform | present |
| U1006 | bot-detection/bot-verifier.server.ts:BotVerifier | C6 | port | use-cases | published | visitor, vendor:cloudflare-turnstile | present |
| U1007 | bot-detection/bot-verifier.server.ts:StaticTokenBotVerifier | C6 | adapter | adapters | published | operator/platform | present |
| U1008 | bot-detection/bot-verifier.server.ts:resolveRequestRemoteIp | C6 | utility | adapters | published | vendor:cloudflare | present |
| U1009 | bot-detection/create-bot-verifier.server.ts:createBotVerifier | C6 | adapter | adapters | published | operator/platform | present |
| U1010 | bot-detection/index.server.ts:module | C6 | framework-glue | frameworks | published | - | present |
| U1011 | bot-detection/index.ts:module | C6 | framework-glue | frameworks | published | - | present |
| U1012 | bot-detection/turnstile-bot-verifier.server.ts:TurnstileBotVerifier | C6 | adapter | adapters | published | vendor:cloudflare-turnstile | present |
| U1013 | bot-detection/turnstile-client.ts:useTurnstileWidget | C6 | view | adapters | published (no outside consumer) | visitor | present |
| U1014 | bot-detection/turnstile-client.ts:TurnstileChallengeHandle | C6 | boundary-data | adapters | public | visitor | present |
| U1015 | bot-detection/turnstile-widget.tsx:TurnstileWidget | C6 | view | adapters | published (no outside consumer) | visitor | present |
| U1016 | bot-detection/use-bot-detection-submission.ts:useBotDetectionSubmission | C6 | mixed | adapters | published | visitor | present |
| U1017 | email/create-product-email-sender.server.ts:createProductEmailSender | C6 | adapter | adapters | published | operator/platform, vendor:resend | present |
| U1018 | email/email-primitives.server.tsx:Email* (10 components) | C6 | view | adapters | published | operator/platform | present |
| U1019 | email/index.server.ts:module | C6 | framework-glue | frameworks | published | - | present |
| U1020 | email/product-email-sender.server.ts:ProductEmailSender | C6 | port | use-cases | published | operator/platform, vendor:resend | present |
| U1021 | email/product-email-sender.server.ts:SendProductEmailCommand, SendProductEmailResult | C6 | boundary-data | use-cases | published | operator/platform | present |
| U1022 | email/product-email-sender.server.ts:ProductEmailRejectedError, ProductEmailDeliveryUnconfirmedError | C6 | boundary-data (typed errors) | use-cases | published | operator/platform | present |
| U1023 | email/resend-product-email-sender.server.ts:ResendProductEmailSender | C6 | adapter | adapters | published (constructed via factory) | vendor:resend | present |
| U1024 | feature-flags/contracts.ts:featureFlagContextSchema, featureFlagSnapshotSchema | C6 | boundary-data | adapters | published (snapshot) | operator/platform | present |
| U1025 | feature-flags/controller.server.ts:FeatureFlagController | C6 | mixed | adapters | published | operator/platform | present |
| U1026 | feature-flags/index.server.ts:module | C6 | framework-glue | frameworks | published | - | present |
| U1027 | feature-flags/repository.server.ts:PostgresFeatureFlagRepository | C6 | adapter | adapters | published | operator/platform | present |
| U1028 | feature-flags/schema.server.ts:featureFlagsTable | C6 | boundary-data | frameworks | published | operator/platform | present |
| U1029 | management-auth/bearer-secret-authenticator.server.ts:BearerSecretManagementAuthenticator | C6 | adapter | adapters | published | operator/platform | present |
| U1030 | management-auth/index.server.ts:module | C6 | framework-glue | frameworks | published | - | present |
| U1031 | management-auth/management-auth-config.server.ts:createManagementAuthConfig, isSecureManagementTransport, MANAGEMENT_AGENT_PRINCIPAL_ID | C6 | adapter | adapters | published | operator/platform | present |
| U1032 | management-auth/management-auth-contract.server.ts:ManagementAuthenticator | C6 | port | use-cases | published | operator/platform, coach (future) | present |
| U1033 | management-auth/management-auth-contract.server.ts:ManagementPrincipal, ManagementAuthenticationResult, ManagementTransportPolicy, ManagementAuthConfig | C6 | boundary-data | use-cases | published | operator/platform | present |
| U1034 | pwa/index.ts:module | C6 | framework-glue | frameworks | published | - | present |
| U1035 | pwa/pwa-registration.ts:createPwaRegistration | C6 | adapter | adapters | published | operator/platform | present |
| U1036 | pwa/pwa-surfaces.ts:pwaSurfaceDefinitions | C6 | boundary-data | adapters | published | operator/platform, client | present |
| U1100 | content/legal-document.ts:module (LegalDocument, LegalDocumentBlock, LegalDocumentSection, LegalLink, LegalText, ELI_COACH_CONTACT_EMAIL) | C4 | boundary-data | entities | published | operator/platform | present |
| U1101 | content/legal-document-hash.ts:legalDocumentSha256 | C4 | utility | adapters | public | operator/platform | present |
| U1102 | content/legal-document-hash.ts:canonicalizeLegalDocument | C4 | utility | adapters | private | operator/platform | present |
| U1103 | content/privacy-policy.ts:PRIVACY_POLICY | C4 | boundary-data | entities | published | operator/platform, vendor:clerk, vendor:stripe, vendor:resend | present |
| U1104 | content/privacy-policy.ts:PRIVACY_POLICY_VERSION | C4 | boundary-data | entities | published | operator/platform | present |
| U1105 | content/privacy-policy.ts:EVOA_FITNESS_PRIVACY_EMAIL | C4 | boundary-data | entities | published | operator/platform | present |
| U1106 | content/privacy-policy.ts:WAITLIST_MARKETING_CONSENT | C4 | boundary-data | entities | published | operator/platform, visitor | present |
| U1107 | content/privacy-policy.ts:WAITLIST_MARKETING_CONSENT_VERSION | C4 | boundary-data | entities | published | operator/platform | present |
| U1108 | content/store-marketing-consent.ts:STORE_MARKETING_CONSENT | C4 | boundary-data | entities | published | operator/platform, visitor | present |
| U1109 | content/store-marketing-consent.ts:STORE_MARKETING_CONSENT_VERSION | C4 | boundary-data | entities | published | operator/platform | present |
| U1110 | content/index.ts:module | C4 | framework-glue | frameworks | published | operator/platform | present |
| U1111-U1113 | content/website-and-store-terms/types.ts:PaidDigitalDeliveryConsent, WebsiteAndStoreTermsPdfArtifact, PublishedWebsiteAndStoreTerms | C4 | boundary-data | entities | published (unused outside) | operator/platform | present |
| U1114 | content/website-and-store-terms/current.ts:WEBSITE_AND_STORE_TERMS_DOCUMENT | C4 | boundary-data | entities | published | operator/platform | present |
| U1115 | content/website-and-store-terms/current.ts:PAID_DIGITAL_DELIVERY_CONSENT | C4 | boundary-data | entities | published (unused outside) | operator/platform | present |
| U1116 | content/website-and-store-terms/index.ts:websiteAndStoreTermsPdfArtifactPath | C4 | utility | adapters | published (unused outside) | operator/platform | present |
| U1117 | content/website-and-store-terms/index.ts:CURRENT_WEBSITE_AND_STORE_TERMS | C4 | boundary-data | entities | published (unused outside) | operator/platform | present |
| U1150 | db/database-client.ts:createDatabaseClient | C2 | adapter | adapters | published | operator/platform | present |
| U1151 | db/database-client.ts:DatabaseClient (NodePgDatabase<typeof schema>) | C2 | port (detail-typed) | adapters | published | operator/platform | present |
| U1152 | db/database-pool.ts:createManagedDatabasePool | C2 | adapter | frameworks | published | operator/platform | present |
| U1153 | db/index.ts:module | C2 | framework-glue | frameworks | published | operator/platform | present |
| U1154 | db/schema/app-schema.ts:appSchema | C2 | adapter | frameworks | published | operator/platform | present |
| U1155 | db/schema/index.ts:module | C2 | framework-glue | frameworks | published | operator/platform | present |
| U1170 | config/index.ts:runtimeEnvironmentSchema | C3 | mixed (port-like schema + superRefine deployment gating rules) | frameworks | private | operator/platform, vendor:clerk, vendor:resend, vendor:stripe | present |
| U1171 | config/index.ts:loadRuntimeEnvironment | C3 | adapter | frameworks | published | operator/platform | present |
| U1172 | config/index.ts:RuntimeEnvironment | C3 | boundary-data | frameworks | published | operator/platform | present |
| U1173 | config/index.ts:databaseBootstrapEnvironmentSchema | C3 | port | frameworks | private | operator/platform | present |
| U1174 | config/index.ts:loadDatabaseBootstrapEnvironment | C3 | adapter | frameworks | published | operator/platform | present |
| U1175 | config/index.ts:DatabaseBootstrapEnvironment | C3 | boundary-data | frameworks | published | operator/platform | present |
| U1176-U1178 | config/index.ts:getApplicationDatabaseUser, getBootstrapDatabaseUser, getMigrationDatabaseUser | C3 | utility | frameworks | published | operator/platform | present |
| U1179 | config/index.ts:buildPostgresConnectionString | C3 | utility | frameworks | published | operator/platform | present |
| U1180 | config/index.ts:hasCompleteDatabaseConfiguration | C3 | utility | frameworks | published | operator/platform | present |
| U1181 | config/index.ts:resolveRuntimeDatabaseConnection | C3 | utility | frameworks | published | operator/platform | present |
| U1182 | config/index.ts:normalizeBasePath | C3 | utility | frameworks | published | operator/platform | present |
| U1183 | config/index.ts:joinBasePath | C3 | utility | frameworks | published | operator/platform | present |
| U1184 | config/index.ts:buildRedirectPath | C3 | utility | frameworks | published | operator/platform | present |
| U1185-U1186 | config/index.ts:DatabaseUserCredentials, DatabaseConnection | C3 | boundary-data | frameworks | published | operator/platform | present |
| U1187-U1190 | config/index.ts:TURNSTILE_TEST_SITE_KEY, TURNSTILE_TEST_SECRET_KEY, TURNSTILE_TEST_RESPONSE_TOKEN, TURNSTILE_SITEVERIFY_URL | C3 | boundary-data | frameworks | published | operator/platform | present |
| U1191 | config/test-support.ts:CLERK_TEST_ENVIRONMENT | C3 | boundary-data | tests | published (test-only subpath) | operator/platform | present |
