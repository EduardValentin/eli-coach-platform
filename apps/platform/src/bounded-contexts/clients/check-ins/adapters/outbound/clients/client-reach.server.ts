import type {
  ClientReach,
  ClientReachReading,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type { ClientReach as PublishedClientReach } from "~/bounded-contexts/clients/clients/public";

export class ClientsClientReach implements ClientReach {
  constructor(private readonly reach: PublishedClientReach) {}

  findByAuthSubjectId(
    authSubjectId: string,
  ): Promise<ClientReachReading | null> {
    return this.reach.findByAuthSubjectId(authSubjectId);
  }

  findById(clientId: string): Promise<ClientReachReading | null> {
    return this.reach.findById(clientId);
  }
}
