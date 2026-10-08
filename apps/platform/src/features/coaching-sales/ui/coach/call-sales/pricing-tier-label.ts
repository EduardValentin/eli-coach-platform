import type { PriceTier } from "~/features/coaching-sales/public/coaching-sales";

export const PRICING_DETAIL_LABEL = "Pricing";

const PRICING_TIER_LABELS: Readonly<Record<PriceTier, string>> = {
  reduced: "Reduced (waitlist)",
  regular: "Regular",
};

export function pricingTierLabel(tier: PriceTier): string {
  return PRICING_TIER_LABELS[tier];
}
