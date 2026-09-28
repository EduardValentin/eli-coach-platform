import {
  rosterEntryStatus,
  type ClientRoster,
  type ClientRosterEntry,
  type ClientStatus,
} from "./client-roster";
import type { ClientRosterIncidents } from "./client-roster-incidents";

type ListedClient = ClientRosterEntry & { status: ClientStatus };

type ListClientsResult =
  { status: "listed"; clients: ListedClient[] } | { status: "unavailable" };

type ListClientsUseCaseOptions = {
  roster: ClientRoster;
  incidents: ClientRosterIncidents;
};

export class ListClientsUseCase {
  constructor(private readonly options: ListClientsUseCaseOptions) {}

  async execute(): Promise<ListClientsResult> {
    try {
      const entries = await this.options.roster.list();

      return {
        status: "listed",
        clients: entries.map((entry) => ({
          ...entry,
          status: rosterEntryStatus(entry),
        })),
      };
    } catch (error) {
      this.options.incidents.rosterReadFailed(error);

      return { status: "unavailable" };
    }
  }
}
