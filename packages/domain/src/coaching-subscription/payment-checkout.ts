import type { CoachingBundleId, PriceTier } from "../coaching-bundle";

import type { CheckoutCompletion, StartChoice } from "./coaching-subscription";

export type CreateCheckoutSessionCommand = {
  customerId: string;
  bundle: {
    id: CoachingBundleId;
    title: string;
    months: number;
    amountCents: number;
  };
  currency: string;
  metadata: {
    assessmentCallId: string;
    bundleId: CoachingBundleId;
    tier: PriceTier;
    startChoice: StartChoice;
  };
  successUrl: string;
  cancelUrl: string;
};

export interface PaymentCheckout {
  createCustomer(command: {
    email: string;
    assessmentCallId: string;
  }): Promise<{ id: string }>;
  createSession(
    command: CreateCheckoutSessionCommand,
  ): Promise<{ id: string; url: string }>;
  expireSession(id: string): Promise<void>;
  findCompletedSession(id: string): Promise<CheckoutCompletion | null>;
}
