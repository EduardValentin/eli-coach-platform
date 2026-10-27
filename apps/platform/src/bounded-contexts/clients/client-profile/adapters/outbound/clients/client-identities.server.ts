import type {
  ClientIdentities,
  ClientIdentity,
} from "~/bounded-contexts/clients/client-profile/domain/client-identities";
import type { ClientIdentities as PublishedClientIdentities } from "~/bounded-contexts/clients/clients/public";

export class ClientsClientIdentities implements ClientIdentities {
  constructor(private readonly identities: PublishedClientIdentities) {}

  findByClientId(clientId: string): Promise<ClientIdentity | null> {
    return this.identities.findByClientId(clientId);
  }

  findByClientIds(clientIds: readonly string[]): Promise<ClientIdentity[]> {
    return this.identities.findByClientIds(clientIds);
  }
}
