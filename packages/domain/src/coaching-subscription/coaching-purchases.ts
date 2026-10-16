import type { Client } from "../client";

import type { PurchasedSubscription } from "./purchased-subscription";

export type CoachingPurchase = {
  eventId: string;
  receivedAt: Date;
  client: Client;
  subscriptionId: string;
  subscription: PurchasedSubscription;
};

export type CoachingPurchaseOutcome =
  | { outcome: "recorded" | "duplicate_event"; clientId: string }
  | { outcome: "call_already_paid" };

export interface CoachingPurchases {
  recordCompletion(
    purchase: CoachingPurchase,
  ): Promise<CoachingPurchaseOutcome>;
}
