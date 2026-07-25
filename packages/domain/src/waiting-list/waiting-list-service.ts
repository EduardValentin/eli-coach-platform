import type { FeatureFlagReader, FeatureFlagSet } from "../feature-flags";
import {
  getWaitlistAvailabilityBucketStart,
  resolveWaitlistAvailability,
  type WaitlistAvailability,
} from "./waitlist-availability";

export type Waitlist = {
  enabled: boolean;
  cap: number;
  offer: WaitlistOffer;
  availability: WaitlistAvailability | null;
  spotsRemaining: number | null;
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

export type JoinWaitlistResult =
  | {
      offer: WaitlistOffer;
      pricing: WaitlistSignupPricing;
      status: "registered";
      spotsRemaining: number;
    }
  | {
      offer: WaitlistOffer;
      pricing: WaitlistSignupPricing;
      status: "already_registered";
      spotsRemaining: number;
    };

export type ReducedPricingSignupResult =
  | { status: "registered"; spotsRemaining: number }
  | { status: "already_registered"; pricing: WaitlistSignupPricing }
  | { status: "capacity_reached" };

export type RegularPricingSignupResult =
  | { status: "registered" }
  | { status: "already_registered"; pricing: WaitlistSignupPricing };

export interface WaitlistRepository {
  countReducedPricingSignups(options: { campaignSlug: string }): Promise<number>;
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

    const availability =
      reducedPricingSignupCount === null
        ? null
        : resolveWaitlistAvailability({
            cap: this.options.cap,
            reducedPricingSignupCount,
          });

    return {
      enabled: featureFlags?.[WAITLIST_MODE_FEATURE_FLAG] === true,
      cap: this.options.cap,
      offer: this.options.offer,
      availability,
      spotsRemaining:
        reducedPricingSignupCount === null
          ? null
          : Math.max(this.options.cap - reducedPricingSignupCount, 0),
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
      return this.createAlreadyRegisteredResult(reducedPricingSignup.pricing);
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
      offer: this.options.offer,
      pricing: "reduced",
      status: "registered",
      spotsRemaining: reducedPricingSignup.spotsRemaining,
    };
  }

  private async registerRegularPricingSignup(normalizedEmail: string): Promise<JoinWaitlistResult> {
    const registration = await this.options.repository.registerRegularPricingSignup({
      consentVersions: this.options.consentVersions,
      normalizedEmail,
      offer: this.options.offer,
    });

    if (registration.status === "already_registered") {
      return this.createAlreadyRegisteredResult(registration.pricing);
    }

    this.sendConfirmationWithoutBlocking({
      normalizedEmail,
      offer: this.options.offer,
      pricing: "regular",
    });

    const entryCount = await this.getEntryCountSafely();

    return {
      offer: this.options.offer,
      pricing: "regular",
      status: "registered",
      spotsRemaining: entryCount === null ? 0 : Math.max(this.options.cap - entryCount, 0),
    };
  }

  private async getEntryCountSafely(): Promise<number | null> {
    try {
      return await this.options.repository.countReducedPricingSignups({
        campaignSlug: this.options.offer.campaignSlug,
      });
    } catch {
      return null;
    }
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
      .catch((error: unknown) => {
        console.error("Waitlist confirmation email failed.", error);
      });
  }

  private async createAlreadyRegisteredResult(
    pricing: WaitlistSignupPricing,
  ): Promise<JoinWaitlistResult> {
    const entryCount = await this.options.repository.countReducedPricingSignups({
      campaignSlug: this.options.offer.campaignSlug,
    });

    return {
      offer: this.options.offer,
      pricing,
      status: "already_registered",
      spotsRemaining: Math.max(this.options.cap - entryCount, 0),
    };
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
