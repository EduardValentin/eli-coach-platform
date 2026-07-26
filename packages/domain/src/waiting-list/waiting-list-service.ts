import type { FeatureFlagReader, FeatureFlagSet } from "../feature-flags";
import {
  getWaitlistAvailabilityBucketStart,
  resolveWaitlistAvailability,
  type WaitlistAvailability,
} from "./waitlist-availability";

export type Waitlist = {
  enabled: boolean;
  offer: WaitlistOffer;
  availability: WaitlistAvailability | null;
};

export type JoinWaitlistCommand = {
  email: string;
};

export type WaitlistOfferPlan = "all-bundles";

export type WaitlistOffer = {
  campaignSlug: string;
  plan: WaitlistOfferPlan;
};

export type WaitlistConsentVersions = {
  privacyPolicyVersion: string;
  marketingConsentVersion: string;
};

export type WaitlistSignupPricing = "reduced" | "regular";

export type JoinWaitlistResult = {
  status: "registered" | "already_registered";
};

export type ReducedPricingSignupResult =
  | { status: "registered" }
  | { status: "already_registered" }
  | { status: "capacity_reached" };

export type RegularPricingSignupResult =
  | { status: "registered" }
  | { status: "already_registered" };

export interface WaitlistRepository {
  countReducedPricingSignupsCreatedBefore(options: {
    campaignSlug: string;
    createdBefore: Date;
  }): Promise<number>;
  registerReducedPricingSignup(options: {
    cap: number;
    consentVersions: WaitlistConsentVersions;
    normalizedEmail: string;
    offer: WaitlistOffer;
  }): Promise<ReducedPricingSignupResult>;
  registerRegularPricingSignup(options: {
    consentVersions: WaitlistConsentVersions;
    normalizedEmail: string;
    offer: WaitlistOffer;
  }): Promise<RegularPricingSignupResult>;
}

export type SendWaitlistConfirmationCommand = {
  email: string;
  offer: WaitlistOffer;
  pricing: WaitlistSignupPricing;
};

export interface WaitlistConfirmationSender {
  sendConfirmation(command: SendWaitlistConfirmationCommand): Promise<void>;
}

type WaitingListServiceOptions = {
  cap: number;
  confirmationSender: WaitlistConfirmationSender;
  consentVersions: WaitlistConsentVersions;
  featureFlagReader: FeatureFlagReader;
  offer: WaitlistOffer;
  repository: WaitlistRepository;
};

const WAITLIST_MODE_FEATURE_FLAG = "WAITLIST_MODE";

export class WaitingListService {
  constructor(private readonly options: WaitingListServiceOptions) {}

  async getWaitlist(): Promise<Waitlist> {
    const [featureFlags, reducedPricingSignupCount] = await Promise.all([
      this.getFeatureFlagsSafely(),
      this.getReducedPricingSignupCountForAvailabilitySafely(),
    ]);
    const enabled = featureFlags?.[WAITLIST_MODE_FEATURE_FLAG] !== false;

    return {
      enabled,
      offer: this.options.offer,
      availability:
        featureFlags === null || reducedPricingSignupCount === null
          ? null
          : resolveWaitlistAvailability({
              cap: this.options.cap,
              reducedPricingSignupCount,
            }),
    };
  }

  async joinWaitlist(command: JoinWaitlistCommand): Promise<JoinWaitlistResult> {
    const normalizedEmail = normalizeWaitlistEmail(command.email);

    const reducedPricingSignup = await this.options.repository.registerReducedPricingSignup({
      cap: this.options.cap,
      consentVersions: this.options.consentVersions,
      normalizedEmail,
      offer: this.options.offer,
    });

    if (reducedPricingSignup.status === "already_registered") {
      return { status: "already_registered" };
    }

    if (reducedPricingSignup.status === "capacity_reached") {
      return this.registerRegularPricingSignup(normalizedEmail);
    }

    this.sendConfirmationWithoutBlocking({
      normalizedEmail,
      offer: this.options.offer,
      pricing: "reduced",
    });

    return {
      status: "registered",
    };
  }

  private async registerRegularPricingSignup(normalizedEmail: string): Promise<JoinWaitlistResult> {
    const registration = await this.options.repository.registerRegularPricingSignup({
      consentVersions: this.options.consentVersions,
      normalizedEmail,
      offer: this.options.offer,
    });

    if (registration.status === "already_registered") {
      return { status: "already_registered" };
    }

    this.sendConfirmationWithoutBlocking({
      normalizedEmail,
      offer: this.options.offer,
      pricing: "regular",
    });

    return {
      status: "registered",
    };
  }

  private async getReducedPricingSignupCountForAvailabilitySafely(): Promise<number | null> {
    try {
      return await this.options.repository.countReducedPricingSignupsCreatedBefore({
        campaignSlug: this.options.offer.campaignSlug,
        createdBefore: getWaitlistAvailabilityBucketStart(new Date()),
      });
    } catch {
      return null;
    }
  }

  private sendConfirmationWithoutBlocking(command: {
    normalizedEmail: string;
    offer: WaitlistOffer;
    pricing: WaitlistSignupPricing;
  }): void {
    void this.options.confirmationSender
      .sendConfirmation({
        email: command.normalizedEmail,
        offer: command.offer,
        pricing: command.pricing,
      })
      .catch(() => {
        console.error("Waitlist confirmation email failed.", {
          errorCategory: "waitlist_confirmation_failure",
        });
      });
  }

  private async getFeatureFlagsSafely(): Promise<FeatureFlagSet | null> {
    try {
      return await this.options.featureFlagReader.getFeatureFlags({});
    } catch {
      return null;
    }
  }
}

function normalizeWaitlistEmail(email: string): string {
  return email.trim().toLowerCase();
}
