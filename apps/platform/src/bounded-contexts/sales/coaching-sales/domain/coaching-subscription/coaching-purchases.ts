import type { PurchasedSubscription } from "./purchased-subscription";

export type CoachingPurchase = {
  assessmentCallId: string;
  clientId: string;
  subscription: PurchasedSubscription;
  receivedAt: Date;
};

export interface CoachingPurchases {
  insertSubscription(purchase: CoachingPurchase): Promise<void>;
  spendPaymentLink(checkoutSessionId: string): Promise<void>;
  findClientIdForCall(assessmentCallId: string): Promise<string>;
}
