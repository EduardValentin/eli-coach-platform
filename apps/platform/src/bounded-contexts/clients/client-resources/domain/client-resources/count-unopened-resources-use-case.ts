import type { ClientReachPort } from "./client-reach-port";
import {
  ClientResourceAccess,
  type ResourceRequester,
} from "./client-resource-access";
import type { ClientResourceIncidentsPort } from "./client-resource-incidents-port";
import type { ClientResourcesPort } from "./client-resources-port";

type CountUnopenedResourcesUseCaseOptions = {
  clientResourcesPort: ClientResourcesPort;
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId" | "findById">;
  clientResourceIncidentsPort: ClientResourceIncidentsPort;
};

export class CountUnopenedResourcesUseCase {
  private readonly access: ClientResourceAccess;

  constructor(private readonly options: CountUnopenedResourcesUseCaseOptions) {
    this.access = new ClientResourceAccess(options);
  }

  async execute(requester: ResourceRequester): Promise<number> {
    let clientId: string | null = null;

    try {
      clientId = await this.access.clientWithReachablePortalOf(requester);

      return clientId
        ? await this.options.clientResourcesPort.countUnopenedForClient(
            clientId,
          )
        : 0;
    } catch (error) {
      this.options.clientResourceIncidentsPort.unopenedCountFailed({
        clientId,
        error,
      });

      return 0;
    }
  }
}
