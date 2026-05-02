import type { FeatureFlagReader, FeatureFlagSet } from "../feature-flags";

export type Waitlist = {
  enabled: boolean;
  cap: number;
  prospects: readonly unknown[];
  spotsRemaining: number | null;
};

export type JoinWaitlistCommand = {
  email: string;
};

export type JoinWaitlistResult =
  | { status: "joined"; spotsRemaining: number }
  | { status: "invalid_email"; message: string }
  | { status: "email_too_long"; message: string }
  | { status: "already_joined"; message: string }
  | { status: "spots_full"; message: string };

export type WaitlistReservationResult =
  | { status: "reserved"; spotsRemaining: number }
  | { status: "already_joined" }
  | { status: "spots_full" };

export interface WaitlistRepository {
  countEntries(): Promise<number>;
  reserveSpot(options: {
    cap: number;
    normalizedEmail: string;
  }): Promise<WaitlistReservationResult>;
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
const MAX_EMAIL_LENGTH = 320;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      prospects: [],
      spotsRemaining: entryCount === null ? null : Math.max(this.options.cap - entryCount, 0),
    };
  }

  async joinWaitlist(command: JoinWaitlistCommand): Promise<JoinWaitlistResult> {
    const normalizedEmail = normalizeWaitlistEmail(command.email);

    if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
      return {
        status: "email_too_long",
        message: "Please enter an email address under 320 characters.",
      };
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return {
        status: "invalid_email",
        message: "Please enter a valid email address.",
      };
    }

    const reservation = await this.options.repository.reserveSpot({
      cap: this.options.cap,
      normalizedEmail,
    });

    if (reservation.status === "already_joined") {
      return {
        status: "already_joined",
        message: "Looks like you're already on the list.",
      };
    }

    if (reservation.status === "spots_full") {
      return {
        status: "spots_full",
        message: `All ${this.options.cap} spots have been claimed.`,
      };
    }

    await this.options.confirmationSender.sendConfirmation({ email: normalizedEmail });

    return {
      status: "joined",
      spotsRemaining: reservation.spotsRemaining,
    };
  }

  private async getEntryCountSafely(): Promise<number | null> {
    try {
      return await this.options.repository.countEntries();
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
