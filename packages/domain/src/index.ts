export {
  FeatureFlagService,
  type FeatureFlagEvaluationContext,
  type FeatureFlagName,
  type FeatureFlagReader,
  type FeatureFlagRepository,
  type FeatureFlagSet,
  type PersistedFeatureFlag,
} from "./feature-flags";
export {
  coachingBundleBenefits,
  coachingBundles,
  resolveCoachingBundleDisplay,
  type CoachingBundle,
  type CoachingBundleId,
  type CoachingBundleWaitlistOfferPlan,
  type ResolvedCoachingBundleDisplay,
} from "./coaching-bundles";
export {
  WaitingListService,
  type JoinWaitlistCommand,
  type JoinWaitlistResult,
  type ReducedPricingSignupResult,
  type RegularPricingSignupResult,
  type SendWaitlistConfirmationCommand,
  type Waitlist,
  type WaitlistConfirmationService,
  type WaitlistConsentVersions,
  type WaitlistOffer,
  type WaitlistOfferPlan,
  type WaitlistRepository,
  type WaitlistSignupPricing,
  type WaitlistAvailability,
  getWaitlistAvailabilityBucketStart,
  resolveWaitlistAvailability,
  WAITLIST_AVAILABILITY_BUCKET_DURATION_MS,
} from "./waiting-list";
export {
  DownloadGrantService,
  StoreAcquisitionService,
  StoreDeliveryRejectedError,
  StoreCatalogService,
  isStoreCoverMimeType,
  STORE_COVER_MIME_TYPES,
  type AcquireStoreProductsCommand,
  type AcquisitionPreparation,
  type CreateDownloadTokenResult,
  type DownloadGrant,
  type DownloadGrantItem,
  type DownloadGrantRepository,
  type DownloadGrantResolution,
  type DownloadTokenGenerator,
  type DownloadTokenHasher,
  type PayloadDigestGenerator,
  type PrepareAcquisitionCommand,
  type ProductAsset,
  ProductAssetUnavailableError,
  type ProductAssetStore,
  type PublishedCatalogResult,
  type PublishedCoverResult,
  type PublishedProductCover,
  type PublishedProductResult,
  type PublishedProductVersion,
  type PublishedStoreProduct,
  type StoreAcquisitionRepository,
  type StoreAcquisitionResult,
  type StoreCatalogRepository,
  type StoreClock,
  type StoreConsentVersions,
  type StoreDeliveryService,
  type StoreDeliveryResource,
  type StoreTaxonomyValue,
} from "./store";

export const marketingSurfaceLinks = [
  { href: "/", label: "Landing" },
  { href: "/blog", label: "Blog" },
  { href: "/store", label: "Store" },
] as const;

export const clientSurfaceLinks = [
  { href: "/client", label: "Dashboard" },
  { href: "/", label: "Public Site" },
] as const;

export const coachSurfaceLinks = [
  { href: "/coach", label: "Workspace" },
  { href: "/", label: "Public Site" },
] as const;
