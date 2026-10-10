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
import type { ResourceTagSnapshot } from "./resource-tags";

type ListClientResourcesCommand = {
  requester: ResourceRequester;
  clientId: string;
  browse: ResourceBrowseInput;
};

type ClientResourceListing = {
  browsing: BrowsedResources;
  browse: ResourceBrowseSnapshot;
  vocabulary: ResourceTagSnapshot[];
};

export type ListClientResourcesResult =
  | ({ status: "listed" } & ClientResourceListing)
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

    const listing = await this.readListing(command);

    if (!listing) {
      return { status: "unavailable" };
    }

    return { status: "listed", ...listing };
  }

  private async readListing({
    clientId,
    browse: input,
  }: ListClientResourcesCommand): Promise<ClientResourceListing | null> {
    const { resources } = this.options;

    try {
      const browse = ResourceBrowse.from(input)
        .withTagAmong(await resources.tagsHeldBy(clientId))
        .toSnapshot();
      const [browsing, vocabulary] = await Promise.all([
        resources.browseForClient(clientId, browse),
        resources.tagVocabulary(),
      ]);

      return { browsing, browse, vocabulary };
    } catch (error) {
      this.options.incidents.resourceListingFailed({ clientId, error });

      return null;
    }
  }
}
