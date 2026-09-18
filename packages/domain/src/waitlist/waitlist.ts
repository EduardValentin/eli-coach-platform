type WaitlistOfferPlan = "all-bundles";

export type WaitlistOffer = {
  campaignSlug: string;
  plan: WaitlistOfferPlan;
};

export type WaitlistAvailability = "available" | "limited" | "closed";

export type WaitlistSnapshot = {
  enabled: boolean;
  offer: WaitlistOffer;
  availability: WaitlistAvailability | null;
};

export type WaitlistConsentVersions = {
  privacyPolicyVersion: string;
  marketingConsentVersion: string;
};

export type WaitlistSignupPricing = "reduced" | "regular";

type WaitlistProps = {
  cap: number;
  offer: WaitlistOffer;
};

export const WAITLIST_REDUCED_PRICING_CAP = 10;

const WAITLIST_AVAILABILITY_BUCKET_DURATION_MS = 30 * 60 * 1_000;

export class Waitlist {
  readonly cap: number;
  readonly offer: WaitlistOffer;

  private constructor(props: WaitlistProps) {
    this.cap = props.cap;
    this.offer = props.offer;
  }

  static configure(props: WaitlistProps): Waitlist {
    return new Waitlist(props);
  }

  availability(reducedPricingSignupCount: number): WaitlistAvailability {
    const remaining = Math.max(this.cap - reducedPricingSignupCount, 0);

    if (remaining === 0) {
      return "closed";
    }

    return remaining / this.cap <= 0.2 ? "limited" : "available";
  }

  static availabilityBucketStart(now: Date): Date {
    const elapsedInBucket =
      now.getTime() % WAITLIST_AVAILABILITY_BUCKET_DURATION_MS;

    return new Date(now.getTime() - elapsedInBucket);
  }
}
