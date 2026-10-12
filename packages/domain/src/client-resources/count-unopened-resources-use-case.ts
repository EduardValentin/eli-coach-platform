import type { ClientReach } from "../client";
import {
  ClientResourceAccess,
  type ResourceRequester,
} from "./client-resource-access";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResources } from "./client-resources";

type CountUnopenedResourcesUseCaseOptions = {
  resources: ClientResources;
  clients: Pick<ClientReach, "findByAuthSubjectId" | "findById">;
  incidents: ClientResourceIncidents;
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
