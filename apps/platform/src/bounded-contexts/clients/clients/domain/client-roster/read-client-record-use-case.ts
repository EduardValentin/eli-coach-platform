import {
  ClientJourney,
  type ClientCall,
  type ClientCalls,
} from "../client-journey";
import type { Clock } from "../clock";

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
  assessmentCall: ClientCall;
};

type ReadClientRecordUseCaseOptions = {
  calls: ClientCalls;
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

    const call = await this.options.calls.callOf(
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
      assessmentCall: call,
    };
  }
}
