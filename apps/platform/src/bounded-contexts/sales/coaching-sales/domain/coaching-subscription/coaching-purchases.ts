import type { Client } from "~/bounded-contexts/clients/clients/domain/client";

import type { PurchasedSubscription } from "./purchased-subscription";

export type CoachingPurchase = {
  eventId: string;
  receivedAt: Date;
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
