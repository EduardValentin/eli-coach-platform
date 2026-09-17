import {
  coachingBundles,
  resolveSavingsBadge,
  type CoachingBundle,
  type CoachingBundleId,
} from "./coaching-bundles";

export type CoachingBundleOffer = {
  prices: Record<
    CoachingBundleId,
    { pricePerMonth: number; totalPrice: number }
  >;
};

export type CoachingBundleWaitlistOfferPlan = "all-bundles";

export const WAITLIST_BUNDLE_OFFERS: Record<
  CoachingBundleWaitlistOfferPlan,
  CoachingBundleOffer
> = {
  "all-bundles": {
    prices: {
      "1-month": { pricePerMonth: 139, totalPrice: 139 },
      "3-months": { pricePerMonth: 125, totalPrice: 375 },
      "6-months": { pricePerMonth: 119, totalPrice: 714 },
    },
  },
};

export type ResolvedCoachingBundleDisplay = {
  badgeLabel?: string;
  isPopular: boolean;
  isWaitlistPrice: boolean;
  originalPricePerMonth?: number;
  originalTotalPrice?: number;
  pricePerMonth: number;
  totalPrice: number;
};

export function resolveCoachingBundleDisplay(input: {
  bundle: CoachingBundle;
  offer?: CoachingBundleOffer;
}): ResolvedCoachingBundleDisplay {
  const { bundle, offer } = input;
  const offerPrice = offer?.prices[bundle.id];
  const activePricePerMonth = offerPrice?.pricePerMonth ?? bundle.pricePerMonth;
  const badgeLabel = resolveSavingsBadge({
    baselinePerMonth: resolveBaselinePerMonth(offer),
    months: bundle.months,
    pricePerMonth: activePricePerMonth,
  });

  if (offerPrice) {
    return {
      ...(badgeLabel ? { badgeLabel } : {}),
      isPopular: bundle.isPopular === true,
      isWaitlistPrice: true,
      originalPricePerMonth: bundle.pricePerMonth,
      originalTotalPrice: bundle.totalPrice,
      pricePerMonth: offerPrice.pricePerMonth,
      totalPrice: offerPrice.totalPrice,
    };
  }

  return {
    ...(badgeLabel ? { badgeLabel } : {}),
    isPopular: bundle.isPopular === true,
    isWaitlistPrice: false,
    pricePerMonth: bundle.pricePerMonth,
    totalPrice: bundle.totalPrice,
  };
}

function resolveBaselinePerMonth(
  offer: CoachingBundleOffer | undefined,
): number {
  const oneMonthBundle = coachingBundles.find((bundle) => bundle.months === 1);

  if (oneMonthBundle === undefined) {
    return 0;
  }

  const offerPrice = offer?.prices[oneMonthBundle.id];

  return offerPrice?.pricePerMonth ?? oneMonthBundle.pricePerMonth;
}
