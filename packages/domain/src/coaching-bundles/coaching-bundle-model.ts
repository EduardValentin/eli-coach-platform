export type CoachingBundleId = "1-month" | "3-months" | "6-months";
export type CoachingBundleWaitlistOfferPlan = "all-bundles";

export type CoachingBundle = {
  id: CoachingBundleId;
  title: string;
  months: number;
  pricePerMonth: number;
  totalPrice: number;
  isPopular?: boolean;
  waitlistPricePerMonth?: number;
  waitlistTotalPrice?: number;
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

export const coachingBundles = [
  {
    id: "1-month",
    title: "1 Month",
    months: 1,
    pricePerMonth: 159,
    totalPrice: 159,
    waitlistPricePerMonth: 139,
    waitlistTotalPrice: 139,
  },
  {
    id: "3-months",
    title: "3 Months",
    months: 3,
    pricePerMonth: 149,
    totalPrice: 447,
    isPopular: true,
    waitlistPricePerMonth: 125,
    waitlistTotalPrice: 375,
  },
  {
    id: "6-months",
    title: "6 Months",
    months: 6,
    pricePerMonth: 139,
    totalPrice: 834,
    waitlistPricePerMonth: 119,
    waitlistTotalPrice: 714,
  },
] as const satisfies readonly CoachingBundle[];

export const coachingBundleBenefits = [
  "Personalized workout and nutrition program",
  "Periodic progress check-ins",
  "Uninterrupted support with your coach",
  "Video form review and correction",
  "Access to the private community",
] as const;

type ResolveCoachingBundleDisplayOptions = {
  bundle: CoachingBundle;
  waitlistOfferPlan?: CoachingBundleWaitlistOfferPlan;
  waitlistMode: boolean;
};

export function resolveCoachingBundleDisplay(
  options: ResolveCoachingBundleDisplayOptions,
): ResolvedCoachingBundleDisplay {
  const { bundle, waitlistMode } = options;
  const bundlePrice = resolveActiveBundlePrice(options);
  const badgeLabel = resolveSavingsBadge({
    bundle,
    pricePerMonth: bundlePrice.pricePerMonth,
    waitlistMode,
    waitlistOfferPlan: options.waitlistOfferPlan,
  });

  if (bundlePrice.isWaitlistPrice) {
    return {
      ...(badgeLabel ? { badgeLabel } : {}),
      isPopular: bundle.isPopular === true,
      isWaitlistPrice: true,
      originalPricePerMonth: bundle.pricePerMonth,
      originalTotalPrice: bundle.totalPrice,
      pricePerMonth: bundlePrice.pricePerMonth,
      totalPrice: bundlePrice.totalPrice,
    };
  }

  return {
    ...(badgeLabel ? { badgeLabel } : {}),
    isPopular: bundle.isPopular === true,
    isWaitlistPrice: false,
    pricePerMonth: bundlePrice.pricePerMonth,
    totalPrice: bundlePrice.totalPrice,
  };
}

function resolveActiveBundlePrice(
  options: ResolveCoachingBundleDisplayOptions,
): {
  isWaitlistPrice: boolean;
  pricePerMonth: number;
  totalPrice: number;
} {
  const waitlistPricePerMonth = options.bundle.waitlistPricePerMonth;
  const waitlistTotalPrice = options.bundle.waitlistTotalPrice;
  const hasWaitlistPrice =
    options.waitlistMode &&
    (options.waitlistOfferPlan === undefined || options.waitlistOfferPlan === "all-bundles") &&
    waitlistPricePerMonth !== undefined &&
    waitlistTotalPrice !== undefined;

  if (hasWaitlistPrice) {
    return {
      isWaitlistPrice: true,
      pricePerMonth: waitlistPricePerMonth,
      totalPrice: waitlistTotalPrice,
    };
  }

  return {
    isWaitlistPrice: false,
    pricePerMonth: options.bundle.pricePerMonth,
    totalPrice: options.bundle.totalPrice,
  };
}

function resolveSavingsBadge(options: {
  bundle: CoachingBundle;
  pricePerMonth: number;
  waitlistOfferPlan?: CoachingBundleWaitlistOfferPlan;
  waitlistMode: boolean;
}): string | undefined {
  const baselinePerMonth = resolveSavingsBaselinePerMonth(options);

  if (
    baselinePerMonth === undefined ||
    options.bundle.months === 1 ||
    options.pricePerMonth >= baselinePerMonth
  ) {
    return undefined;
  }

  const savingsPct = Math.floor(
    ((baselinePerMonth - options.pricePerMonth) / baselinePerMonth) * 100,
  );

  return savingsPct > 0 ? `Save ${savingsPct}%` : undefined;
}

function resolveSavingsBaselinePerMonth(options: {
  waitlistOfferPlan?: CoachingBundleWaitlistOfferPlan;
  waitlistMode: boolean;
}): number | undefined {
  const oneMonthBundle = coachingBundles.find((bundle) => bundle.months === 1);

  if (oneMonthBundle === undefined) {
    return undefined;
  }

  return resolveActiveBundlePrice({
    bundle: oneMonthBundle,
    waitlistMode: options.waitlistMode,
    waitlistOfferPlan: options.waitlistOfferPlan,
  }).pricePerMonth;
}
