import type {
  ClientReachPort,
  ClientReachReading,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type { ClientReachPort as PublishedClientReach } from "~/bounded-contexts/clients/clients/public";

export class ClientsClientReachAdapter implements ClientReachPort {
  constructor(private readonly clientReachPort: PublishedClientReach) {}

  findByAuthSubjectId(
    authSubjectId: string,
  ): Promise<ClientReachReading | null> {
    return this.clientReachPort.findByAuthSubjectId(authSubjectId);
  }

  findById(clientId: string): Promise<ClientReachReading | null> {
    return this.clientReachPort.findById(clientId);
  }
}
