import {
  coachingBundleBenefits,
  coachingBundles,
  resolveCoachingBundleDisplay,
  WAITLIST_BUNDLE_OFFERS,
  type CoachingBundleId,
  type CoachingBundleWaitlistOfferPlan,
} from "@eli-coach-platform/domain/coaching-bundles";

export type CoachingBundleCard = {
  badgeLabel?: string;
  billingLabel: string;
  id: CoachingBundleId;
  isPopular: boolean;
  isWaitlistPrice: boolean;
  originalPriceLabel?: string;
  originalTotalLabel?: string;
  priceLabel: string;
  title: string;
  totalLabel: string;
};

export function presentCoachingBundles(input: {
  offerPlan: CoachingBundleWaitlistOfferPlan | null;
}): {
  benefits: readonly string[];
  cards: readonly CoachingBundleCard[];
  showsWaitlistPricing: boolean;
} {
  const offer = input.offerPlan
    ? WAITLIST_BUNDLE_OFFERS[input.offerPlan]
    : undefined;

  const cards = coachingBundles.map((bundle) => {
    const display = resolveCoachingBundleDisplay({ bundle, offer });
    const totalLabel = formatPrice(display.totalPrice);
    const isBilledMonthly = bundle.months === 1;
    const originalTotalPrice = isBilledMonthly
      ? undefined
      : display.originalTotalPrice;

    return {
      ...(display.badgeLabel ? { badgeLabel: display.badgeLabel } : {}),
      billingLabel: isBilledMonthly
        ? "Billed monthly"
        : `Billed as ${totalLabel}`,
      id: bundle.id,
      isPopular: display.isPopular,
      isWaitlistPrice: display.isWaitlistPrice,
      ...(display.originalPricePerMonth !== undefined
        ? { originalPriceLabel: formatPrice(display.originalPricePerMonth) }
        : {}),
      ...(originalTotalPrice !== undefined
        ? { originalTotalLabel: formatPrice(originalTotalPrice) }
        : {}),
      priceLabel: formatPrice(display.pricePerMonth),
      title: bundle.title,
      totalLabel,
    };
  });

  return {
    benefits: coachingBundleBenefits,
    cards,
    showsWaitlistPricing: offer !== undefined,
  };
}

function formatPrice(value: number): string {
  return `€${value}`;
}
