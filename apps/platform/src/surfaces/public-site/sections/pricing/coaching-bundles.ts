const BUNDLES = [
  {
    id: "1-month",
    title: "1 Month",
    months: 1,
    regular: { perMonth: 159, total: 159 },
    waitlist: { perMonth: 139, total: 139 },
    isPopular: false,
  },
  {
    id: "3-months",
    title: "3 Months",
    months: 3,
    regular: { perMonth: 149, total: 447 },
    waitlist: { perMonth: 125, total: 375 },
    isPopular: true,
  },
  {
    id: "6-months",
    title: "6 Months",
    months: 6,
    regular: { perMonth: 139, total: 834 },
    waitlist: { perMonth: 119, total: 714 },
    isPopular: false,
  },
] as const;

const BENEFITS = [
  "Personalized workout and nutrition program",
  "Periodic progress check-ins",
  "Uninterrupted support with your coach",
  "Video form review and correction",
  "Access to the private community",
] as const;

type Bundle = (typeof BUNDLES)[number];
type Tier = "regular" | "waitlist";

export type CoachingBundleCard = {
  billedMonthly: boolean;
  id: Bundle["id"];
  isPopular: boolean;
  isWaitlistPrice: boolean;
  originalPricePerMonth?: number;
  originalTotal?: number;
  pricePerMonth: number;
  savingsPercent?: number;
  title: string;
  total: number;
};

export function presentCoachingBundles(input: { waitlistPricing: boolean }): {
  benefits: readonly string[];
  cards: readonly CoachingBundleCard[];
  showsWaitlistPricing: boolean;
} {
  const tier: Tier = input.waitlistPricing ? "waitlist" : "regular";
  const baselineBundle =
    BUNDLES.find((bundle) => bundle.months === 1) ?? BUNDLES[0];
  const baselinePerMonth = baselineBundle[tier].perMonth;

  return {
    benefits: BENEFITS,
    cards: BUNDLES.map((bundle) => toCard(bundle, tier, baselinePerMonth)),
    showsWaitlistPricing: input.waitlistPricing,
  };
}

function toCard(
  bundle: Bundle,
  tier: Tier,
  baselinePerMonth: number,
): CoachingBundleCard {
  const price = bundle[tier];
  const billedMonthly = bundle.months === 1;
  const savingsPercent = savingsPercentOf(
    bundle.months,
    price.perMonth,
    baselinePerMonth,
  );

  return {
    billedMonthly,
    id: bundle.id,
    isPopular: bundle.isPopular,
    isWaitlistPrice: tier === "waitlist",
    ...(tier === "waitlist"
      ? { originalPricePerMonth: bundle.regular.perMonth }
      : {}),
    ...(tier === "waitlist" && !billedMonthly
      ? { originalTotal: bundle.regular.total }
      : {}),
    pricePerMonth: price.perMonth,
    ...(savingsPercent ? { savingsPercent } : {}),
    title: bundle.title,
    total: price.total,
  };
}

function savingsPercentOf(
  months: number,
  perMonth: number,
  baselinePerMonth: number,
): number | undefined {
  if (months === 1 || perMonth >= baselinePerMonth) {
    return undefined;
  }
  const percent = Math.floor(
    ((baselinePerMonth - perMonth) / baselinePerMonth) * 100,
  );
  return percent > 0 ? percent : undefined;
}
