export type ProductSurface = "marketing" | "client" | "coach" | "design-reference";

export type UserRole = "public" | "client" | "coach";

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
  type WaitlistConfirmationSender,
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
  type StoreDeliveryEmailSender,
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

export const appDisplayNames: Record<ProductSurface, string> = {
  marketing: "Eli Coach Platform",
  client: "Eli Client Portal",
  coach: "Eli Coach Portal",
  "design-reference": "Design Reference",
};

export const pwaSurfaceDefinitions = {
  client: {
    name: "Eli Client Portal",
    shortName: "Eli Client",
    description: "Client-facing coaching portal for workouts, progress, check-ins, and messaging.",
    themeColor: "#17212f",
  },
  coach: {
    name: "Eli Coach Portal",
    shortName: "Eli Coach",
    description: "Coach-facing workspace for client management, planning, scheduling, and communication.",
    themeColor: "#17212f",
  },
} as const;
