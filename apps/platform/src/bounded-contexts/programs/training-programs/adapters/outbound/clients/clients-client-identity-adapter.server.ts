import type {
  ClientIdentity,
  ClientIdentityPort,
} from "~/bounded-contexts/programs/training-programs/domain/program";
import type { ClientLookupFacade } from "~/bounded-contexts/clients/public/client-lookup-facade";

export class ClientsClientIdentityAdapter implements ClientIdentityPort {
  constructor(
    private readonly clientLookupFacade: Pick<ClientLookupFacade, "identityOf">,
  ) {}

  async find(clientId: string): Promise<ClientIdentity | null> {
    const identity = await this.clientLookupFacade.identityOf(clientId);

    return (
      identity && {
        clientId: identity.clientId,
        firstName: identity.firstName,
        lastName: identity.lastName,
        gender: identity.gender,
      }
    );
  }
}
