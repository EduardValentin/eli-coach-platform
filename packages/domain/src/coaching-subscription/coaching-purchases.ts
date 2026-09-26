import type { Client } from "../client";

import type { CoachingSubscription } from "./coaching-subscription";

export type CoachingPurchase = {
  eventId: string;
  client: Client;
  subscription: CoachingSubscription;
};

export interface CoachingPurchases {
  recordCompletion(
    purchase: CoachingPurchase,
  ): Promise<"recorded" | "duplicate_event" | "call_already_paid">;
}
