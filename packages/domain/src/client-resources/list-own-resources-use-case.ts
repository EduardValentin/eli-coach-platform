import type { ClientResource } from "./client-resource";
import {
  ClientResourceAccess,
  type ResourceRequester,
} from "./client-resource-access";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResources } from "./client-resources";
import type { ResourceClients } from "./resource-clients";

type ListOwnResourcesResult =
  | { status: "listed"; resources: ClientResource[] }
  | { status: "not-found" }
  | { status: "unavailable" };

type ListOwnResourcesUseCaseOptions = {
  resources: ClientResources;
  clients: ResourceClients;
  incidents: ClientResourceIncidents;
};

export class ListOwnResourcesUseCase {
  private readonly access: ClientResourceAccess;

  constructor(private readonly options: ListOwnResourcesUseCaseOptions) {
    this.access = new ClientResourceAccess(options);
  }

  async execute(requester: ResourceRequester): Promise<ListOwnResourcesResult> {
    const clientId = await this.access.clientWithReachablePortalOf(requester);

    if (!clientId) {
      return { status: "not-found" };
    }

    const resources = await this.readResources(clientId);

    if (!resources) {
      return { status: "unavailable" };
    }

    return { status: "listed", resources };
  }

  private async readResources(
    clientId: string,
  ): Promise<ClientResource[] | null> {
    try {
      return await this.options.resources.listForClient(clientId);
    } catch (error) {
      this.options.incidents.resourceListingFailed({ clientId, error });

      return null;
    }
  }
}
