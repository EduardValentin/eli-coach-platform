import type { PriceTier } from "~/features/coaching-sales/contracts/coaching-sales";

export const PRICING_DETAIL_LABEL = "Pricing";

const PRICING_TIER_LABELS: Readonly<Record<PriceTier, string>> = {
  reduced: "Reduced (waitlist)",
  regular: "Regular",
};

const SHORT_PRICING_TIER_LABELS: Readonly<Record<PriceTier, string>> = {
  reduced: "Reduced",
  regular: "Regular",
};

export function pricingTierLabel(tier: PriceTier): string {
  return PRICING_TIER_LABELS[tier];
}

export function shortPricingTierLabel(tier: PriceTier): string {
  return SHORT_PRICING_TIER_LABELS[tier];
}
