import type { ClientIntake } from "../client";

import type { PurchasedSubscription } from "./purchased-subscription";

export type CoachingPurchase = {
  eventId: string;
  intake: ClientIntake;
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
