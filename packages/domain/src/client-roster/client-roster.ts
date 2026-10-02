import type { VisitorGender } from "../assessment-call";
import {
  ClientJourney,
  type ClientJourneySnapshot,
  type ClientJourneyStep,
} from "../client-journey";
import {
  CoachingSubscription,
  RefundDue,
  type CoachingSubscriptionSnapshot,
  type CoachingSubscriptionStatus,
} from "../coaching-subscription";

export const CLIENT_STATUSES = [
  "invited",
  "onboarding",
  "awaiting-review",
  "in-review",
  "needs-details",
  "approved",
  "active",
  "cancelled",
  "inactive",
] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export type ClientRosterEntry = {
  journey: ClientJourneySnapshot;
  accountBound: boolean;
  booking: {
    email: string;
    gender: VisitorGender;
    assessmentCallId: string;
  };
  subscription: CoachingSubscriptionSnapshot | null;
};

export interface ClientRoster {
  list(): Promise<ClientRosterEntry[]>;
  findById(clientId: string): Promise<ClientRosterEntry | null>;
}

const JOURNEY_STATUSES: Record<ClientJourneyStep, ClientStatus> = {
  welcome: "onboarding",
  onboarding: "onboarding",
  submitted: "awaiting-review",
  "in-review": "in-review",
  "needs-details": "needs-details",
  approved: "approved",
};

const SUBSCRIPTION_STATUSES: Record<
  CoachingSubscriptionStatus,
  ClientStatus | null
> = {
  "not-started": null,
  active: "active",
  cancelled: "cancelled",
  ended: "inactive",
};

export function clientStatusOf(input: {
  accountBound: boolean;
  step: ClientJourneyStep;
  subscription: Pick<
    CoachingSubscriptionSnapshot,
    "status" | "accessEndsAt"
  > | null;
  now: Date;
}): ClientStatus {
  if (!input.accountBound) {
    return "invited";
  }

  const fromSubscription = input.subscription
    ? SUBSCRIPTION_STATUSES[
        CoachingSubscription.statusOf(input.subscription, input.now)
      ]
    : null;

  return fromSubscription ?? JOURNEY_STATUSES[input.step];
}

export function rosterEntryStatus(
  entry: ClientRosterEntry,
  now: Date,
): ClientStatus {
  return clientStatusOf({
    accountBound: entry.accountBound,
    step: ClientJourney.from(entry.journey).step(),
    subscription: entry.subscription,
    now,
  });
}

export function rosterEntryNeedsRefund(entry: ClientRosterEntry): boolean {
  const refund = entry.subscription?.refund;

  return refund ? RefundDue.isOutstanding(refund) : false;
}
