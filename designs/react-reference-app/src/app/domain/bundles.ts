import type { SubscriptionBundle } from './coachingSubscription';
import type { JourneyPricing } from './journey';

export type BundleId = '1-month' | '3-months' | '6-months';

export type CoachingBundle = {
  id: BundleId;
  title: string;
  months: SubscriptionBundle;
  regularPerMonth: number;
  reducedPerMonth: number;
  popular: boolean;
};

export const COACHING_BUNDLES: readonly CoachingBundle[] = [
  {
    id: '1-month',
    title: '1 Month',
    months: 1,
    regularPerMonth: 159,
    reducedPerMonth: 139,
    popular: false,
  },
  {
    id: '3-months',
    title: '3 Months',
    months: 3,
    regularPerMonth: 149,
    reducedPerMonth: 125,
    popular: true,
  },
  {
    id: '6-months',
    title: '6 Months',
    months: 6,
    regularPerMonth: 139,
    reducedPerMonth: 119,
    popular: false,
  },
];

export const DEFAULT_BUNDLE_ID: BundleId = '3-months';

export function bundlePerMonth(
  bundle: CoachingBundle,
  pricing: JourneyPricing,
): number {
  return pricing === 'reduced' ? bundle.reducedPerMonth : bundle.regularPerMonth;
}

export function bundleTotal(
  bundle: CoachingBundle,
  pricing: JourneyPricing,
): number {
  return bundlePerMonth(bundle, pricing) * bundle.months;
}

export function bundleById(id: BundleId): CoachingBundle {
  return COACHING_BUNDLES.find((bundle) => bundle.id === id) ?? COACHING_BUNDLES[0];
}

export function bundleForMonths(months: SubscriptionBundle): CoachingBundle {
  return (
    COACHING_BUNDLES.find((bundle) => bundle.months === months) ??
    COACHING_BUNDLES[0]
  );
}

export function bundleLengthLabel(months: number): string {
  return months === 1 ? '1 month' : `${months} months`;
}

export function renewalLabel(months: number): string {
  return months === 1 ? 'Every month' : `Every ${months} months`;
}
