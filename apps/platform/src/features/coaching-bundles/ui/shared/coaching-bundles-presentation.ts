import {
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
}): readonly CoachingBundleCard[] {
  const offer = input.offerPlan ? WAITLIST_BUNDLE_OFFERS[input.offerPlan] : undefined;

  return coachingBundles.map((bundle) => {
    const display = resolveCoachingBundleDisplay({ bundle, offer });
    const totalLabel = formatPrice(display.totalPrice);

    return {
      ...(display.badgeLabel ? { badgeLabel: display.badgeLabel } : {}),
      billingLabel: bundle.months === 1 ? "Billed monthly" : `Billed as ${totalLabel}`,
      id: bundle.id,
      isPopular: display.isPopular,
      isWaitlistPrice: display.isWaitlistPrice,
      ...(display.originalPricePerMonth !== undefined
        ? { originalPriceLabel: formatPrice(display.originalPricePerMonth) }
        : {}),
      ...(display.originalTotalPrice !== undefined
        ? { originalTotalLabel: formatPrice(display.originalTotalPrice) }
        : {}),
      priceLabel: formatPrice(display.pricePerMonth),
      title: bundle.title,
      totalLabel,
    };
  });
}

function formatPrice(value: number): string {
  return `€${value}`;
}
