import type { ClientReachPort } from "./client-reach-port";
import {
  ClientResourceAccess,
  type ResourceRequester,
} from "./client-resource-access";
import type { ClientResourceIncidentsPort } from "./client-resource-incidents-port";
import type { ClientResourcesPort } from "./client-resources-port";

type CountUnopenedResourcesUseCaseOptions = {
  resources: ClientResourcesPort;
  clients: Pick<ClientReachPort, "findByAuthSubjectId" | "findById">;
  incidents: ClientResourceIncidentsPort;
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
        ? await this.options.resources.countUnopenedForClient(clientId)
        : 0;
    } catch (error) {
      this.options.incidents.unopenedCountFailed({ clientId, error });

      return 0;
    }
  }
}
