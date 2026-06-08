import type { FeatureFlagReader, FeatureFlagSet } from "../feature-flags";

export type Waitlist = {
  enabled: boolean;
  cap: number;
  offer: WaitlistOffer;
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
  registerReducedPricingSignup(options: {
    cap: number;
    normalizedEmail: string;
    offer: WaitlistOffer;
  }): Promise<ReducedPricingSignupResult>;
  registerRegularPricingSignup(options: {
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
  featureFlagReader: FeatureFlagReader;
  offer: WaitlistOffer;
  repository: WaitlistRepository;
};

const WAITLIST_MODE_FEATURE_FLAG = "WAITLIST_MODE";

export class WaitingListService {
  constructor(private readonly options: WaitingListServiceOptions) {}

  async getWaitlist(): Promise<Waitlist> {
    const [featureFlags, entryCount] = await Promise.all([
      this.getFeatureFlagsSafely(),
      this.getEntryCountSafely(),
    ]);

    return {
      enabled: featureFlags?.[WAITLIST_MODE_FEATURE_FLAG] === true,
      cap: this.options.cap,
      offer: this.options.offer,
      spotsRemaining: entryCount === null ? null : Math.max(this.options.cap - entryCount, 0),
    };
  }

  async joinWaitlist(command: JoinWaitlistCommand): Promise<JoinWaitlistResult> {
    const normalizedEmail = normalizeWaitlistEmail(command.email);

    const reducedPricingSignup = await this.options.repository.registerReducedPricingSignup({
      cap: this.options.cap,
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

    if (pricing === "regular" || entryCount >= this.options.cap) {
      return {
        offer: this.options.offer,
        pricing,
        status: "already_registered",
        spotsRemaining: 0,
      };
    }

    return {
      offer: this.options.offer,
      pricing: "reduced",
      status: "already_registered",
      spotsRemaining: Math.max(this.options.cap - entryCount - 1, 0),
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
