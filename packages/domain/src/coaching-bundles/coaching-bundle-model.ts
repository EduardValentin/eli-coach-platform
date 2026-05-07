export type CoachingBundleId = "3-months" | "6-months" | "12-months";

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
  waitlistBadge?: string;
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
    id: "3-months",
    title: "Quarterly",
    months: 3,
    pricePerMonth: 250,
    totalPrice: 750,
  },
  {
    id: "6-months",
    title: "Biannual",
    months: 6,
    pricePerMonth: 220,
    totalPrice: 1320,
    discountBadge: "Save 12%",
    isPopular: true,
  },
  {
    id: "12-months",
    title: "Annual",
    months: 12,
    pricePerMonth: 190,
    totalPrice: 2280,
    discountBadge: "Save 24%",
    waitlistPricePerMonth: 150,
    waitlistTotalPrice: 1800,
    waitlistBadge: "Waitlist price",
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
    waitlistPricePerMonth !== undefined &&
    waitlistTotalPrice !== undefined;

  if (hasWaitlistPrice) {
    return {
      ...(bundle.waitlistBadge ? { badgeLabel: bundle.waitlistBadge } : {}),
      isPopular: false,
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
