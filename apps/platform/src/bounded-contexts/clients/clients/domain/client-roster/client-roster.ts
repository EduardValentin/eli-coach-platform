import type { ClientGender, CoachingStanding, CoachingStatus } from "../client";
import type {
  ClientJourney,
  ClientJourneySnapshot,
  ClientJourneyStep,
} from "../client-journey";

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
    gender: ClientGender;
    assessmentCallId: string;
  };
  joinedAt: Date;
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

const CLIENT_STATUS_BY_COACHING_STATUS: Record<
  CoachingStatus,
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
  standing: CoachingStanding;
  now: Date;
}): ClientStatus {
  if (!input.accountBound && !input.standing.isCancelledOrEnded()) {
    return "invited";
  }

  return (
    CLIENT_STATUS_BY_COACHING_STATUS[input.standing.at(input.now)] ??
    JOURNEY_STATUSES[input.step]
  );
}

export function rosterEntryStatus(input: {
  accountBound: boolean;
  journey: ClientJourney;
  now: Date;
}): ClientStatus {
  return clientStatusOf({
    accountBound: input.accountBound,
    step: input.journey.step(),
    standing: input.journey.standing,
    now: input.now,
  });
}

export function rosterEntryNeedsRefund(entry: ClientRosterEntry): boolean {
  return entry.journey.standing.refundDue;
}
