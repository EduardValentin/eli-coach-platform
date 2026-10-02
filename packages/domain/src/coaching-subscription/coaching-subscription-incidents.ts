import type { CancellationRule, StartChoice } from "./coaching-subscription";
import type { SubscriptionEventKind } from "./subscription-event";

type PaymentEventRejection =
  "call_not_found" | "call_already_paid" | "unreadable_checkout";

type SubscriptionEventOutcome =
  "recorded" | "duplicate" | "unknown-subscription";

export interface CoachingSubscriptionIncidents {
  subscriptionCancelled(incident: {
    subscriptionId: string;
    startChoice: StartChoice;
    rule: Exclude<CancellationRule, "none">;
    refundDueCents: number;
  }): void;
  subscriptionCancellationFailed(incident: {
    subscriptionId: string;
    rule: Exclude<CancellationRule, "none">;
    error: unknown;
  }): void;
  programStartedNow(incident: { subscriptionId: string }): void;
  subscriptionEventReconciled(incident: {
    eventId: string;
    eventKind: SubscriptionEventKind;
    paymentReference: string;
    outcome: SubscriptionEventOutcome;
  }): void;
  refundSettled(incident: {
    subscriptionId: string;
    refundedCents: number;
  }): void;
  paymentMethodSessionOpened(incident: { subscriptionId: string }): void;
  renewalHoldApplied(incident: { paymentSubscriptionId: string }): void;
  renewalHoldFailed(incident: {
    paymentSubscriptionId: string;
    error: unknown;
  }): void;
  refundNotificationFailed(incident: { subscriptionId: string }): void;
  paymentEventRejected(incident: {
    eventId: string;
    reason: PaymentEventRejection;
  }): void;
}
