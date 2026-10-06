import type { ClientResource } from "./client-resource";
import {
  ClientResourceAccess,
  type ResourceRequester,
} from "./client-resource-access";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResources } from "./client-resources";
import type { ResourceClients } from "./resource-clients";

type ListClientResourcesCommand = {
  requester: ResourceRequester;
  clientId: string;
};

export type ListClientResourcesResult =
  | { status: "listed"; resources: ClientResource[] }
  | { status: "not-found" }
  | { status: "unavailable" };

type ListClientResourcesUseCaseOptions = {
  resources: ClientResources;
  clients: ResourceClients;
  incidents: ClientResourceIncidents;
};

export class ListClientResourcesUseCase {
  private readonly access: ClientResourceAccess;

  constructor(private readonly options: ListClientResourcesUseCaseOptions) {
    this.access = new ClientResourceAccess(options);
  }

  async execute(
    command: ListClientResourcesCommand,
  ): Promise<ListClientResourcesResult> {
    if (
      !(await this.access.reachesClient(command.requester, command.clientId))
    ) {
      return { status: "not-found" };
    }

    const resources = await this.readResources(command.clientId);

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
