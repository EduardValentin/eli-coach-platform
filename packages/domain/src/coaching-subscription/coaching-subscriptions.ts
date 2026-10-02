import type { CoachingSubscription } from "./coaching-subscription";

export type SubscriptionChange = {
  subscription: CoachingSubscription;
  previous: CoachingSubscription;
};

export type SubscriptionEventChange = SubscriptionChange & { eventId: string };

export interface CoachingSubscriptions {
  findCurrentForClient(clientId: string): Promise<CoachingSubscription | null>;
  findCurrentForAuthSubject(
    authSubjectId: string,
  ): Promise<CoachingSubscription | null>;
  findByPaymentSubscriptionId(
    paymentSubscriptionId: string,
  ): Promise<CoachingSubscription | null>;
  findLatestByPaymentCustomerId(
    paymentCustomerId: string,
  ): Promise<CoachingSubscription | null>;
  save(change: SubscriptionChange): Promise<"saved" | "stale">;
  saveForEvent(
    change: SubscriptionEventChange,
  ): Promise<"recorded" | "duplicate" | "stale">;
}
