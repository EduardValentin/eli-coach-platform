import type { FeatureFlagReader, FeatureFlagSet } from "../feature-flags";

export type Waitlist = {
  enabled: boolean;
  cap: number;
  spotsRemaining: number | null;
};

export type JoinWaitlistCommand = {
  email: string;
};

export type JoinWaitlistResult =
  | { status: "joined"; spotsRemaining: number }
  | { status: "notified"; spotsRemaining: number }
  | { status: "already_joined"; message: string }
  | { status: "spots_full"; message: string };

export type WaitlistReservationResult =
  | { status: "reserved"; spotsRemaining: number }
  | { status: "already_joined" }
  | { status: "spots_full" };

export type WaitlistNotificationResult =
  | { status: "registered" }
  | { status: "already_joined" };

export interface WaitlistRepository {
  countEntries(): Promise<number>;
  registerNotification(options: {
    normalizedEmail: string;
  }): Promise<WaitlistNotificationResult>;
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

    void this.options.confirmationSender
      .sendConfirmation({ email: normalizedEmail })
      .catch((error: unknown) => {
        console.error("Waitlist confirmation email failed.", error);
      });

    return {
      status: "joined",
      spotsRemaining: reservation.spotsRemaining,
    };
  }

  async notifyWhenSpotsOpen(command: JoinWaitlistCommand): Promise<JoinWaitlistResult> {
    const normalizedEmail = normalizeWaitlistEmail(command.email);
    const registration = await this.options.repository.registerNotification({
      normalizedEmail,
    });

    if (registration.status === "already_joined") {
      return {
        status: "already_joined",
        message: "Looks like you're already on the list.",
      };
    }

    const entryCount = await this.getEntryCountSafely();

    return {
      status: "notified",
      spotsRemaining: entryCount === null ? 0 : Math.max(this.options.cap - entryCount, 0),
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
