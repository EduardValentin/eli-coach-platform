import type { Clock } from "../shared";

import {
  rosterEntryNeedsRefund,
  rosterEntryStatus,
  type ClientRoster,
  type ClientRosterEntry,
  type ClientStatus,
} from "./client-roster";
import type { ClientRosterIncidents } from "./client-roster-incidents";

type ListedClient = ClientRosterEntry & {
  status: ClientStatus;
  needsRefund: boolean;
};

type ListClientsResult =
  { status: "listed"; clients: ListedClient[] } | { status: "unavailable" };

type ListClientsUseCaseOptions = {
  clock: Clock;
  incidents: ClientRosterIncidents;
  roster: ClientRoster;
};

export class ListClientsUseCase {
  constructor(private readonly options: ListClientsUseCaseOptions) {}

  async execute(): Promise<ListClientsResult> {
    try {
      const entries = await this.options.roster.list();
      const now = this.options.clock.now();

      return {
        status: "listed",
        clients: entries.map((entry) => ({
          ...entry,
          status: rosterEntryStatus(entry, now),
          needsRefund: rosterEntryNeedsRefund(entry),
        })),
      };
    } catch (error) {
      this.options.incidents.rosterReadFailed(error);

      return { status: "unavailable" };
    }
  }
}
