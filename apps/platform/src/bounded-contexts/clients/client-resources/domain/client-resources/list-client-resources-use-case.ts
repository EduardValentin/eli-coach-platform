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
  clientResourcesPort: ClientResourcesPort;
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId" | "findById">;
  clientResourceIncidentsPort: ClientResourceIncidentsPort;
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
    const { clientResourcesPort } = this.options;

    try {
      const browse = ResourceBrowse.from(input)
        .withTagAmong(await clientResourcesPort.tagsHeldBy(clientId))
        .toSnapshot();
      const [browsing, vocabulary] = await Promise.all([
        clientResourcesPort.browseForClient(clientId, browse),
        clientResourcesPort.tagVocabulary(),
      ]);

      return { browsing, browse, vocabulary };
    } catch (error) {
      this.options.clientResourceIncidentsPort.resourceListingFailed({
        clientId,
        error,
      });

      return null;
    }
  }
}
