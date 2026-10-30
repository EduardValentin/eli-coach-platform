import type { WaitlistOffer, WaitlistSignupPricing } from "./waitlist";

export type SendWaitlistConfirmationCommand = {
  email: string;
  offer: WaitlistOffer;
  pricing: WaitlistSignupPricing;
};

export type WaitlistConfirmationResult = { kind: "sent" } | { kind: "failed" };

export interface WaitlistConfirmationPort {
  sendConfirmation(
    command: SendWaitlistConfirmationCommand,
  ): Promise<WaitlistConfirmationResult>;
}
