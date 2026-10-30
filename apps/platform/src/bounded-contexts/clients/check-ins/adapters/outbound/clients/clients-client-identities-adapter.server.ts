import type {
  ClientIdentitiesPort,
  ClientIdentity,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type { ClientIdentitiesPort as PublishedClientIdentities } from "~/bounded-contexts/clients/clients/public";

export class ClientsClientIdentitiesAdapter implements ClientIdentitiesPort {
  constructor(private readonly identities: PublishedClientIdentities) {}

  findByClientId(clientId: string): Promise<ClientIdentity | null> {
    return this.identities.findByClientId(clientId);
  }

  findByClientIds(clientIds: readonly string[]): Promise<ClientIdentity[]> {
    return this.identities.findByClientIds(clientIds);
  }
}
