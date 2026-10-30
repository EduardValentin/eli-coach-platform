import type { ClientReachPort } from "./client-reach-port";
import {
  ClientResourceAccess,
  type ResourceRequester,
} from "./client-resource-access";
import type { ClientResourceIncidentsPort } from "./client-resource-incidents-port";
import type {
  BrowsedResources,
  ClientResourcesPort,
} from "./client-resources-port";
import {
  ResourceBrowse,
  type ResourceBrowseInput,
  type ResourceBrowseSnapshot,
} from "./resource-browse";

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
  clientResourcesPort: ClientResourcesPort;
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId" | "findById">;
  clientResourceIncidentsPort: ClientResourceIncidentsPort;
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
    const { clientResourcesPort } = this.options;

    try {
      const browse = ResourceBrowse.from(input)
        .withTagAmong(await clientResourcesPort.tagsHeldBy(clientId))
        .toSnapshot();
      const browsing = await clientResourcesPort.browseForClient(
        clientId,
        browse,
      );

      return { browsing, browse };
    } catch (error) {
      this.options.clientResourceIncidentsPort.resourceListingFailed({
        clientId,
        error,
      });

      return null;
    }
  }
}
