import type { PriceTier } from "~/features/coaching-sales/contracts/coaching-sales";

export const PRICING_DETAIL_LABEL = "Pricing";

const PRICING_TIER_LABELS: Readonly<Record<PriceTier, string>> = {
  reduced: "Reduced (waitlist)",
  regular: "Regular",
};

const REDUCED_PRICE_LABELS: Readonly<Record<PriceTier, string>> = {
  reduced: "Yes",
  regular: "No",
};

export function pricingTierLabel(tier: PriceTier): string {
  return PRICING_TIER_LABELS[tier];
}

export function reducedPriceLabel(tier: PriceTier): string {
  return REDUCED_PRICE_LABELS[tier];
}
