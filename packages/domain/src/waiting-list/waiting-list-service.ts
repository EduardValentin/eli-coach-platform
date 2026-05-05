import type { FeatureFlagReader, FeatureFlagSet } from "../feature-flags";

export type Waitlist = {
  enabled: boolean;
  cap: number;
  spotsRemaining: number | null;
};

export type JoinWaitlistCommand = {
  email: string;
};

export type WaitlistSignupPricing = "reduced" | "regular";

export type JoinWaitlistResult =
  | { pricing: WaitlistSignupPricing; status: "registered"; spotsRemaining: number }
  | { status: "already_registered"; message: string };

export type ReducedPricingSignupResult =
  | { status: "registered"; spotsRemaining: number }
  | { status: "already_registered" }
  | { status: "capacity_reached" };

export type RegularPricingSignupResult =
  | { status: "registered" }
  | { status: "already_registered" };

export interface WaitlistRepository {
  countReducedPricingSignups(): Promise<number>;
  registerReducedPricingSignup(options: {
    cap: number;
    normalizedEmail: string;
  }): Promise<ReducedPricingSignupResult>;
  registerRegularPricingSignup(options: {
    normalizedEmail: string;
  }): Promise<RegularPricingSignupResult>;
}

export interface WaitlistConfirmationSender {
  sendConfirmation(command: { email: string }): Promise<void>;
}

type WaitingListServiceOptions = {
  cap: number;
  confirmationSender: WaitlistConfirmationSender;
  featureFlagReader: FeatureFlagReader;
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
      enabled: featureFlags?.[WAITLIST_MODE_FEATURE_FLAG] !== false,
      cap: this.options.cap,
      spotsRemaining: entryCount === null ? null : Math.max(this.options.cap - entryCount, 0),
    };
  }

  async joinWaitlist(command: JoinWaitlistCommand): Promise<JoinWaitlistResult> {
    const normalizedEmail = normalizeWaitlistEmail(command.email);

    const reducedPricingSignup = await this.options.repository.registerReducedPricingSignup({
      cap: this.options.cap,
      normalizedEmail,
    });

    if (reducedPricingSignup.status === "already_registered") {
      return {
        status: "already_registered",
        message: "Looks like you're already on the list.",
      };
    }

    if (reducedPricingSignup.status === "capacity_reached") {
      return this.registerRegularPricingSignup(normalizedEmail);
    }

    void this.options.confirmationSender
      .sendConfirmation({ email: normalizedEmail })
      .catch((error: unknown) => {
        console.error("Waitlist confirmation email failed.", error);
      });

    return {
      pricing: "reduced",
      status: "registered",
      spotsRemaining: reducedPricingSignup.spotsRemaining,
    };
  }

  private async registerRegularPricingSignup(normalizedEmail: string): Promise<JoinWaitlistResult> {
    const registration = await this.options.repository.registerRegularPricingSignup({
      normalizedEmail,
    });

    if (registration.status === "already_registered") {
      return {
        status: "already_registered",
        message: "Looks like you're already on the list.",
      };
    }

    const entryCount = await this.getEntryCountSafely();

    return {
      pricing: "regular",
      status: "registered",
      spotsRemaining: entryCount === null ? 0 : Math.max(this.options.cap - entryCount, 0),
    };
  }

  private async getEntryCountSafely(): Promise<number | null> {
    try {
      return await this.options.repository.countReducedPricingSignups();
    } catch {
      return null;
    }
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
