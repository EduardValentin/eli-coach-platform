import { ClientJourney } from "../client-journey";
import type { ClockPort } from "../clock-port";

import {
  rosterEntryNeedsRefund,
  rosterEntryStatus,
  type ClientRosterEntry,
  type ClientStatus,
} from "./client-roster";
import { type ClientRosterPort } from "./client-roster-port";
import type { ClientRosterIncidentsPort } from "./client-roster-incidents-port";

type ListedClient = ClientRosterEntry & {
  status: ClientStatus;
  needsRefund: boolean;
};

type ListClientsResult =
  { status: "listed"; clients: ListedClient[] } | { status: "unavailable" };

type ListClientsUseCaseOptions = {
  clockPort: ClockPort;
  clientRosterIncidentsPort: ClientRosterIncidentsPort;
  clientRosterPort: ClientRosterPort;
};

export class ListClientsUseCase {
  constructor(private readonly options: ListClientsUseCaseOptions) {}

  async execute(): Promise<ListClientsResult> {
    try {
      const entries = await this.options.clientRosterPort.list();
      const now = this.options.clockPort.now();

      return {
        status: "listed",
        clients: entries.map((entry) => ({
          ...entry,
          status: rosterEntryStatus({
            accountBound: entry.accountBound,
            journey: ClientJourney.from(entry.journey),
            now,
          }),
          needsRefund: rosterEntryNeedsRefund(entry),
        })),
      };
    } catch (error) {
      this.options.clientRosterIncidentsPort.rosterReadFailed(error);

      return { status: "unavailable" };
    }
  }
}
