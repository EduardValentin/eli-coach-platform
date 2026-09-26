import type {
  CoachingBundle,
  CoachingBundleId,
  PriceTier,
} from "@eli-coach-platform/domain/coaching-bundle";
import { z } from "zod";

export const COACHING_BUNDLE_IDS = [
  "1-month",
  "3-months",
  "6-months",
] as const satisfies readonly CoachingBundleId[];

export const PRICE_TIERS = [
  "regular",
  "reduced",
] as const satisfies readonly PriceTier[];

export const coachingBundleIdSchema = z.enum(COACHING_BUNDLE_IDS);

export const priceTierSchema = z.enum(PRICE_TIERS);

export const coachingBundleCardSchema = z.object({
  billedMonthly: z.boolean(),
  id: coachingBundleIdSchema,
  isPopular: z.boolean(),
  isReducedPrice: z.boolean(),
  originalPricePerMonth: z.number().int().positive().optional(),
  originalTotal: z.number().int().positive().optional(),
  pricePerMonth: z.number().int().positive(),
  savingsPercent: z.number().int().positive().optional(),
  title: z.string().min(1),
  total: z.number().int().positive(),
});

export type CoachingBundleCard = z.infer<typeof coachingBundleCardSchema>;

export function presentBundleCards(
  bundles: readonly CoachingBundle[],
  tier: PriceTier,
): CoachingBundleCard[] {
  const baseline = bundles.find((bundle) => bundle.months === 1) ?? bundles[0];
  const baselinePerMonth = baseline?.perMonth(tier) ?? 0;

  return bundles.map((bundle) => toCard(bundle, { tier, baselinePerMonth }));
}

export function renewalLabel(months: number): string {
  return months === 1 ? "Every month" : `Every ${months} months`;
}

export function formatEuros(amount: number): string {
  return `€${amount}`;
}

function toCard(
  bundle: CoachingBundle,
  pricing: { tier: PriceTier; baselinePerMonth: number },
): CoachingBundleCard {
  const isReducedPrice = pricing.tier === "reduced";
  const billedMonthly = bundle.months === 1;
  const pricePerMonth = bundle.perMonth(pricing.tier);
  const savingsPercent = savingsPercentOf(bundle, {
    baselinePerMonth: pricing.baselinePerMonth,
    pricePerMonth,
  });

  return {
    billedMonthly,
    id: bundle.id,
    isPopular: bundle.popular,
    isReducedPrice,
    ...(isReducedPrice
      ? { originalPricePerMonth: bundle.perMonth("regular") }
      : {}),
    ...(isReducedPrice && !billedMonthly
      ? { originalTotal: bundle.total("regular") }
      : {}),
    pricePerMonth,
    ...(savingsPercent ? { savingsPercent } : {}),
    title: bundle.title,
    total: bundle.total(pricing.tier),
  };
}

function savingsPercentOf(
  bundle: CoachingBundle,
  prices: { baselinePerMonth: number; pricePerMonth: number },
): number | undefined {
  if (bundle.months === 1 || prices.pricePerMonth >= prices.baselinePerMonth) {
    return undefined;
  }

  const percent = Math.floor(
    ((prices.baselinePerMonth - prices.pricePerMonth) /
      prices.baselinePerMonth) *
      100,
  );

  return percent > 0 ? percent : undefined;
}
