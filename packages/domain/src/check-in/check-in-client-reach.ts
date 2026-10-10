import type { CheckInClients } from "./check-in-clients";

export class CheckInClientReach {
  constructor(private readonly options: { clients: CheckInClients }) {}

  async reachableClientIdOf(authSubjectId: string): Promise<string | null> {
    const client =
      await this.options.clients.findByAuthSubjectId(authSubjectId);

    return client?.portal === "reachable" ? client.clientId : null;
  }
}
