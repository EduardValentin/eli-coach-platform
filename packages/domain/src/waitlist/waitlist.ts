export type WaitlistOfferPlan = "all-bundles";

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

export type ReducedPricingRegistrationDecision =
  "already_registered" | "capacity_reached" | "register";

type WaitlistProps = {
  cap: number;
  enabled: boolean;
  offer: WaitlistOffer;
};

const WAITLIST_AVAILABILITY_BUCKET_DURATION_MS = 30 * 60 * 1_000;

export class Waitlist {
  readonly cap: number;
  readonly enabled: boolean;
  readonly offer: WaitlistOffer;

  private constructor(props: WaitlistProps) {
    this.cap = props.cap;
    this.enabled = props.enabled;
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

  snapshot(availability: WaitlistAvailability | null): WaitlistSnapshot {
    return {
      enabled: this.enabled,
      offer: this.offer,
      availability,
    };
  }

  static availabilityBucketStart(now: Date): Date {
    const elapsedInBucket =
      now.getTime() % WAITLIST_AVAILABILITY_BUCKET_DURATION_MS;

    return new Date(now.getTime() - elapsedInBucket);
  }

  static decideReducedPricingRegistration(input: {
    alreadyRegistered: boolean;
    cap: number;
    reducedPricingCount: number;
  }): ReducedPricingRegistrationDecision {
    if (input.alreadyRegistered) {
      return "already_registered";
    }

    if (input.reducedPricingCount >= input.cap) {
      return "capacity_reached";
    }

    return "register";
  }
}
