import type { VisitorGender, VisitorPrimaryGoal } from "../assessment-call";
import {
  CoachingSubscription,
  type CoachingSubscriptionStatus,
} from "../coaching-subscription";
import type { AssessmentCallReader } from "../payment-link";
import type { Clock } from "../shared";

import {
  rosterEntryNeedsRefund,
  rosterEntryStatus,
  type ClientRoster,
  type ClientRosterEntry,
  type ClientStatus,
} from "./client-roster";

type ClientRecord = ClientRosterEntry & {
  status: ClientStatus;
  needsRefund: boolean;
  subscriptionStatus: CoachingSubscriptionStatus | null;
  subscriptionCancelledOrEnded: boolean;
  refundOutstandingCents: number | null;
  workStartsOn: Date | null;
  assessmentCall: {
    startsAt: Date;
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth: string;
    gender: VisitorGender;
    country: string;
    phone: string | null;
    primaryGoal: VisitorPrimaryGoal;
    notes: string | null;
  };
};

type ReadClientRecordUseCaseOptions = {
  calls: AssessmentCallReader;
  clock: Clock;
  roster: ClientRoster;
};

export class ReadClientRecordUseCase {
  constructor(private readonly options: ReadClientRecordUseCaseOptions) {}

  async execute(clientId: string): Promise<ClientRecord | null> {
    const entry = await this.options.roster.findById(clientId);

    if (!entry) {
      return null;
    }

    const call = await this.options.calls.findById(
      entry.booking.assessmentCallId,
    );

    if (!call) {
      return null;
    }

    const now = this.options.clock.now();
    const subscription = entry.subscription
      ? CoachingSubscription.reconstitute(entry.subscription)
      : null;

    return {
      ...entry,
      status: rosterEntryStatus(entry, now),
      needsRefund: rosterEntryNeedsRefund(entry),
      subscriptionStatus: subscription?.statusAt(now) ?? null,
      subscriptionCancelledOrEnded: CoachingSubscription.isCancelledOrEnded(
        subscription?.status ?? null,
      ),
      refundOutstandingCents: subscription?.refund?.outstandingCents() ?? null,
      workStartsOn: subscription?.programWorkStart() ?? null,
      assessmentCall: {
        startsAt: call.startsAt,
        firstName: call.firstName,
        lastName: call.lastName,
        email: call.visitorEmail,
        dateOfBirth: call.dateOfBirth,
        gender: call.gender,
        country: call.country,
        phone: call.phone,
        primaryGoal: call.primaryGoal,
        notes: call.visitorNotes,
      },
    };
  }
}
