import type { AssessmentCallReader } from "../payment-link";

import {
  rosterEntryStatus,
  type ClientRoster,
  type ClientRosterEntry,
  type ClientStatus,
} from "./client-roster";

type ClientRecord = ClientRosterEntry & {
  status: ClientStatus;
  bookingNotes: string | null;
};

type ReadClientRecordUseCaseOptions = {
  roster: ClientRoster;
  calls: AssessmentCallReader;
};

export class ReadClientRecordUseCase {
  constructor(private readonly options: ReadClientRecordUseCaseOptions) {}

  async execute(clientId: string): Promise<ClientRecord | null> {
    const entry = await this.options.roster.findById(clientId);

    if (!entry) {
      return null;
    }

    const call = await this.options.calls.findById(
      entry.profile.assessmentCallId,
    );

    return {
      ...entry,
      status: rosterEntryStatus(entry),
      bookingNotes: call?.visitorNotes ?? null,
    };
  }
}
