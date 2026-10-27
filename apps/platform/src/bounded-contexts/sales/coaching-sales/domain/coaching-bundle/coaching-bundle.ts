export const COACHING_BUNDLE_IDS = ["1-month", "3-months", "6-months"] as const;

export type CoachingBundleId = (typeof COACHING_BUNDLE_IDS)[number];

export const COACHING_BUNDLE_MONTHS = [1, 3, 6] as const;

type CoachingBundleMonths = (typeof COACHING_BUNDLE_MONTHS)[number];

export const PRICE_TIERS = ["regular", "reduced"] as const;

export type PriceTier = (typeof PRICE_TIERS)[number];

const COACHING_CURRENCY = "eur";

type CoachingBundleProps = {
  id: CoachingBundleId;
  title: string;
  months: CoachingBundleMonths;
  regularPerMonth: number;
  reducedPerMonth: number;
  popular: boolean;
};

const CENTS_PER_EURO = 100;

export class CoachingBundle {
  readonly id: CoachingBundleId;
  readonly title: string;
  readonly months: CoachingBundleMonths;
  readonly regularPerMonth: number;
  readonly reducedPerMonth: number;
  readonly popular: boolean;
  readonly currency = COACHING_CURRENCY;

  private constructor(props: CoachingBundleProps) {
    this.id = props.id;
    this.title = props.title;
    this.months = props.months;
    this.regularPerMonth = props.regularPerMonth;
    this.reducedPerMonth = props.reducedPerMonth;
    this.popular = props.popular;
  }

  static reconstitute(props: CoachingBundleProps): CoachingBundle {
    return new CoachingBundle(props);
  }

  perMonth(tier: PriceTier): number {
    return tier === "reduced" ? this.reducedPerMonth : this.regularPerMonth;
  }

  total(tier: PriceTier): number {
    return this.perMonth(tier) * this.months;
  }

  totalCents(tier: PriceTier): number {
    return this.total(tier) * CENTS_PER_EURO;
  }
}

const COACHING_BUNDLES_BY_ID: Readonly<
  Record<CoachingBundleId, CoachingBundle>
> = {
  "1-month": CoachingBundle.reconstitute({
    id: "1-month",
    title: "1 Month",
    months: 1,
    regularPerMonth: 159,
    reducedPerMonth: 139,
    popular: false,
  }),
  "3-months": CoachingBundle.reconstitute({
    id: "3-months",
    title: "3 Months",
    months: 3,
    regularPerMonth: 149,
    reducedPerMonth: 125,
    popular: true,
  }),
  "6-months": CoachingBundle.reconstitute({
    id: "6-months",
    title: "6 Months",
    months: 6,
    regularPerMonth: 139,
    reducedPerMonth: 119,
    popular: false,
  }),
};

export const COACHING_BUNDLES: readonly CoachingBundle[] = Object.values(
  COACHING_BUNDLES_BY_ID,
);

export function getCoachingBundle(id: CoachingBundleId): CoachingBundle {
  return COACHING_BUNDLES_BY_ID[id];
}

export function findCoachingBundle(id: string): CoachingBundle | null {
  return COACHING_BUNDLES.find((bundle) => bundle.id === id) ?? null;
}
