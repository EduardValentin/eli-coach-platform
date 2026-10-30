import {
  ClientJourney,
  type ClientCall,
  type ClientCallsPort,
} from "../client-journey";
import type { ClockPort } from "../clock-port";

import {
  rosterEntryNeedsRefund,
  rosterEntryStatus,
  type ClientRosterEntry,
  type ClientStatus,
} from "./client-roster";
import { type ClientRosterPort } from "./client-roster-port";

type ClientRecord = ClientRosterEntry & {
  status: ClientStatus;
  needsRefund: boolean;
  coachingCancelledOrEnded: boolean;
  assessmentCall: ClientCall;
};

type ReadClientRecordUseCaseOptions = {
  clientCallsPort: ClientCallsPort;
  clockPort: ClockPort;
  clientRosterPort: ClientRosterPort;
};

export class ReadClientRecordUseCase {
  constructor(private readonly options: ReadClientRecordUseCaseOptions) {}

  async execute(clientId: string): Promise<ClientRecord | null> {
    const entry = await this.options.clientRosterPort.findById(clientId);

    if (!entry) {
      return null;
    }

    const call = await this.options.clientCallsPort.callOf(
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
        now: this.options.clockPort.now(),
      }),
      needsRefund: rosterEntryNeedsRefund(entry),
      coachingCancelledOrEnded: journey.standing.isCancelledOrEnded(),
      assessmentCall: call,
    };
  }
}
