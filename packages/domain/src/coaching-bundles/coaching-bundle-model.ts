export type CoachingBundleId = "1-month" | "3-months" | "6-months";
export type CoachingBundleWaitlistOfferPlan = "all-bundles";

export type CoachingBundle = {
  id: CoachingBundleId;
  title: string;
  months: number;
  pricePerMonth: number;
  totalPrice: number;
  discountBadge?: string;
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
    discountBadge: "Save 6%",
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
    discountBadge: "Save 12%",
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
  const waitlistPricePerMonth = bundle.waitlistPricePerMonth;
  const waitlistTotalPrice = bundle.waitlistTotalPrice;
  const hasWaitlistPrice =
    waitlistMode &&
    (options.waitlistOfferPlan === undefined || options.waitlistOfferPlan === "all-bundles") &&
    waitlistPricePerMonth !== undefined &&
    waitlistTotalPrice !== undefined;

  if (hasWaitlistPrice) {
    return {
      isPopular: bundle.isPopular === true,
      isWaitlistPrice: true,
      originalPricePerMonth: bundle.pricePerMonth,
      originalTotalPrice: bundle.totalPrice,
      pricePerMonth: waitlistPricePerMonth,
      totalPrice: waitlistTotalPrice,
    };
  }

  return {
    ...(bundle.discountBadge ? { badgeLabel: bundle.discountBadge } : {}),
    isPopular: bundle.isPopular === true,
    isWaitlistPrice: false,
    pricePerMonth: bundle.pricePerMonth,
    totalPrice: bundle.totalPrice,
  };
}
