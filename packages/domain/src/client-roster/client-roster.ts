import type { VisitorGender } from "../assessment-call";
import {
  ClientJourney,
  type ClientJourneySnapshot,
  type ClientJourneyStep,
} from "../client-journey";
import type { CoachingBundleId, PriceTier } from "../coaching-bundle";
import type {
  CoachingSubscriptionStatus,
  StartChoice,
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
  profile: {
    email: string;
    dateOfBirth: string;
    gender: VisitorGender;
    country: string;
    phone: string | null;
    assessmentCallId: string;
  };
  subscription: {
    bundleId: CoachingBundleId;
    months: number;
    tier: PriceTier;
    paidAt: Date;
    startChoice: StartChoice;
    status: CoachingSubscriptionStatus;
  } | null;
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
};

export function clientStatusOf(input: {
  accountBound: boolean;
  step: ClientJourneyStep;
  subscriptionStatus: CoachingSubscriptionStatus | null;
}): ClientStatus {
  if (!input.accountBound) {
    return "invited";
  }

  const fromSubscription = input.subscriptionStatus
    ? SUBSCRIPTION_STATUSES[input.subscriptionStatus]
    : null;

  return fromSubscription ?? JOURNEY_STATUSES[input.step];
}

export function rosterEntryStatus(entry: ClientRosterEntry): ClientStatus {
  return clientStatusOf({
    accountBound: entry.accountBound,
    step: ClientJourney.from(entry.journey).step(),
    subscriptionStatus: entry.subscription?.status ?? null,
  });
}
