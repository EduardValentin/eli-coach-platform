import type { PaidClientIntake } from "./paid-client-admission";
import type { PurchasedSubscription } from "./purchased-subscription";

export type CheckoutPurchase = {
  eventId: string;
  receivedAt: Date;
  client: PaidClientIntake;
  subscription: PurchasedSubscription;
  paymentCustomerId: string;
};

export type RecordedCheckoutPurchase = {
  status: "recorded" | "duplicate";
  clientId: string;
  subscription: PurchasedSubscription;
  paymentCustomerId: string;
};

export class CallAlreadyPaid extends Error {}
