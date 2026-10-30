import type { EmailAcceptancePort } from "../email-acceptance-port";

import type { ConsentVersionsPort } from "./consent-versions-port";
import type {
  Waitlist,
  WaitlistOffer,
  WaitlistSignupPricing,
} from "./waitlist";
import type { WaitlistConfirmationPort } from "./waitlist-confirmation-port";
import type { WaitlistEntriesPort } from "./waitlist-entries-port";
import type { WaitlistIncidentsPort } from "./waitlist-incidents-port";

export type JoinWaitlistCommand = {
  email: string;
};

export type JoinWaitlistResult = {
  status: "registered" | "already_registered" | "subaddress_refused";
};

type JoinWaitlistUseCaseOptions = {
  waitlistConfirmationPort: WaitlistConfirmationPort;
  consentVersionsPort: ConsentVersionsPort;
  emailAcceptancePort: EmailAcceptancePort;
  waitlistIncidentsPort: WaitlistIncidentsPort;
  waitlist: Waitlist;
  waitlistEntriesPort: WaitlistEntriesPort;
};

export class JoinWaitlistUseCase {
  constructor(private readonly options: JoinWaitlistUseCaseOptions) {}

  async execute(command: JoinWaitlistCommand): Promise<JoinWaitlistResult> {
    const normalizedEmail = this.options.emailAcceptancePort.normalize(
      command.email,
    );

    if (!this.options.emailAcceptancePort.accepts(normalizedEmail)) {
      return { status: "subaddress_refused" };
    }

    const reducedPricingSignup =
      await this.options.waitlistEntriesPort.registerReducedPricingSignup({
        consentVersions: this.options.consentVersionsPort.current(),
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
      await this.options.waitlistEntriesPort.registerRegularPricingSignup({
        consentVersions: this.options.consentVersionsPort.current(),
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
      const confirmation =
        await this.options.waitlistConfirmationPort.sendConfirmation({
          email: command.normalizedEmail,
          offer: command.offer,
          pricing: command.pricing,
        });

      if (confirmation.kind === "failed") {
        this.options.waitlistIncidentsPort.confirmationDeliveryFailed();
      }
    } catch {
      this.options.waitlistIncidentsPort.confirmationDeliveryFailed();
    }
  }
}
