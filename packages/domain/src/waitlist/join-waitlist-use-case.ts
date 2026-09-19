import { EmailAddress } from "../email-address";

import type {
  Waitlist,
  WaitlistConsentVersions,
  WaitlistOffer,
  WaitlistSignupPricing,
} from "./waitlist";
import type { WaitlistConfirmation } from "./waitlist-confirmation";
import type { WaitlistEntries } from "./waitlist-entries";
import type { WaitlistIncidents } from "./waitlist-incidents";

export type JoinWaitlistCommand = {
  email: string;
};

export type JoinWaitlistResult = {
  status: "registered" | "already_registered";
};

type JoinWaitlistUseCaseOptions = {
  confirmation: WaitlistConfirmation;
  consentVersions: WaitlistConsentVersions;
  incidents: WaitlistIncidents;
  waitlist: Waitlist;
  waitlistEntries: WaitlistEntries;
};

export class JoinWaitlistUseCase {
  constructor(private readonly options: JoinWaitlistUseCaseOptions) {}

  async execute(command: JoinWaitlistCommand): Promise<JoinWaitlistResult> {
    const normalizedEmail = EmailAddress.normalize(command.email).value;

    const reducedPricingSignup =
      await this.options.waitlistEntries.registerReducedPricingSignup({
        consentVersions: this.options.consentVersions,
        normalizedEmail,
        offer: this.options.waitlist.offer,
      });

    if (reducedPricingSignup.status === "already_registered") {
      return { status: "already_registered" };
    }

    if (reducedPricingSignup.status === "capacity_reached") {
      return this.registerRegularPricingSignup(normalizedEmail);
    }

    this.sendConfirmationWithoutBlocking({
      normalizedEmail,
      offer: this.options.waitlist.offer,
      pricing: "reduced",
    });

    return {
      status: "registered",
    };
  }

  private async registerRegularPricingSignup(
    normalizedEmail: string,
  ): Promise<JoinWaitlistResult> {
    const registration =
      await this.options.waitlistEntries.registerRegularPricingSignup({
        consentVersions: this.options.consentVersions,
        normalizedEmail,
        offer: this.options.waitlist.offer,
      });

    if (registration.status === "already_registered") {
      return { status: "already_registered" };
    }

    this.sendConfirmationWithoutBlocking({
      normalizedEmail,
      offer: this.options.waitlist.offer,
      pricing: "regular",
    });

    return {
      status: "registered",
    };
  }

  private sendConfirmationWithoutBlocking(command: {
    normalizedEmail: string;
    offer: WaitlistOffer;
    pricing: WaitlistSignupPricing;
  }): void {
    void this.deliverConfirmation(command);
  }

  private async deliverConfirmation(command: {
    normalizedEmail: string;
    offer: WaitlistOffer;
    pricing: WaitlistSignupPricing;
  }): Promise<void> {
    try {
      const confirmation = await this.options.confirmation.sendConfirmation({
        email: command.normalizedEmail,
        offer: command.offer,
        pricing: command.pricing,
      });

      if (confirmation.kind === "failed") {
        this.options.incidents.confirmationDeliveryFailed();
      }
    } catch {
      this.options.incidents.confirmationDeliveryFailed();
    }
  }
}
