import {
  ClientResourceAccess,
  type ResourceRequester,
} from "./client-resource-access";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { BrowsedResources, ClientResources } from "./client-resources";
import {
  ResourceBrowse,
  type ResourceBrowseInput,
  type ResourceBrowseSnapshot,
} from "./resource-browse";
import type { ResourceClients } from "./resource-clients";

type ListOwnResourcesCommand = {
  requester: ResourceRequester;
  browse: ResourceBrowseInput;
};

type OwnResourceListing = {
  browsing: BrowsedResources;
  browse: ResourceBrowseSnapshot;
};

type ListOwnResourcesResult =
  | ({ status: "listed" } & OwnResourceListing)
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

  async execute(
    command: ListOwnResourcesCommand,
  ): Promise<ListOwnResourcesResult> {
    const clientId = await this.access.clientWithReachablePortalOf(
      command.requester,
    );

    if (!clientId) {
      return { status: "not-found" };
    }

    const listing = await this.readListing(clientId, command.browse);

    if (!listing) {
      return { status: "unavailable" };
    }

    return { status: "listed", ...listing };
  }

  private async readListing(
    clientId: string,
    input: ResourceBrowseInput,
  ): Promise<OwnResourceListing | null> {
    const { resources } = this.options;

    try {
      const browse = ResourceBrowse.from(input)
        .withTagAmong(await resources.tagsHeldBy(clientId))
        .toSnapshot();
      const browsing = await resources.browseForClient(clientId, browse);

      return { browsing, browse };
    } catch (error) {
      this.options.incidents.resourceListingFailed({ clientId, error });

      return null;
    }
  }
}
