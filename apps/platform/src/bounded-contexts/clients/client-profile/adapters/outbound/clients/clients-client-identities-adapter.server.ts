import type {
  ClientIdentitiesPort,
  ClientIdentity,
} from "~/bounded-contexts/clients/client-profile/domain/client-identities-port";
import type { ClientIdentitiesPort as PublishedClientIdentities } from "~/bounded-contexts/clients/clients/public";

export class ClientsClientIdentitiesAdapter implements ClientIdentitiesPort {
  constructor(
    private readonly clientIdentitiesPort: PublishedClientIdentities,
  ) {}

  findByClientId(clientId: string): Promise<ClientIdentity | null> {
    return this.clientIdentitiesPort.findByClientId(clientId);
  }

  findByClientIds(clientIds: readonly string[]): Promise<ClientIdentity[]> {
    return this.clientIdentitiesPort.findByClientIds(clientIds);
  }
}
