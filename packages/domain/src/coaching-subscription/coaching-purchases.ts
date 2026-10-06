import type { Client } from "../client";

import type { PurchasedSubscription } from "./purchased-subscription";

export type CoachingPurchase = {
  eventId: string;
  client: Client;
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
