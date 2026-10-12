import type {
  AssessmentCallReader,
  VisitorGender,
  VisitorPrimaryGoal,
} from "../assessment-call";
import { ClientJourney } from "../client-journey";
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
  coachingCancelledOrEnded: boolean;
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

    const journey = ClientJourney.from(entry.journey);

    return {
      ...entry,
      status: rosterEntryStatus({
        accountBound: entry.accountBound,
        journey,
        now: this.options.clock.now(),
      }),
      needsRefund: rosterEntryNeedsRefund(entry),
      coachingCancelledOrEnded: journey.standing.isCancelledOrEnded(),
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
