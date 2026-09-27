import type { Client } from "../client";

import type { CoachingSubscription } from "./coaching-subscription";

export type CoachingPurchase = {
  eventId: string;
  client: Client;
  subscription: CoachingSubscription;
};

export type CoachingPurchaseOutcome =
  | { outcome: "recorded" | "duplicate_event"; clientId: string }
  | { outcome: "call_already_paid" };

export interface CoachingPurchases {
  recordCompletion(
    purchase: CoachingPurchase,
  ): Promise<CoachingPurchaseOutcome>;
}
