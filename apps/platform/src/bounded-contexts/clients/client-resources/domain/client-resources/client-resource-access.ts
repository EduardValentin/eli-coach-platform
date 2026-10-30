import type { AccountRole } from "./account-role";
import type { ClientReachPort } from "./client-reach-port";

import type { ClientResource } from "./client-resource";
import type { ClientResourceIncidentsPort } from "./client-resource-incidents-port";
import type { ClientResourcesPort } from "./client-resources-port";

export type ResourceRequester = { role: AccountRole; authSubjectId: string };

type ResourceReach = "every-client" | "own-client" | "none";

function reachOf(requester: ResourceRequester): ResourceReach {
  switch (requester.role) {
    case "COACH":
      return "every-client";
    case "CLIENT":
      return "own-client";
    default:
      return "none";
  }
}

type ClientResourceAccessOptions = {
  clientResourcesPort: ClientResourcesPort;
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId" | "findById">;
  clientResourceIncidentsPort: ClientResourceIncidentsPort;
};

export class ClientResourceAccess {
  constructor(private readonly options: ClientResourceAccessOptions) {}

  async resourceFor(
    requester: ResourceRequester,
    resourceId: string,
  ): Promise<ClientResource | null> {
    if (reachOf(requester) === "none") return null;

    const resource =
      await this.options.clientResourcesPort.findById(resourceId);

    if (!resource) return null;
    if (await this.reaches(requester, (clientId) => resource.isFor(clientId))) {
      return resource;
    }

    this.options.clientResourceIncidentsPort.resourceAccessRefused({
      requesterRole: requester.role,
      ...resource.storageOwner(),
    });

    return null;
  }

  async ownResourceFor(
    requester: ResourceRequester,
    resourceId: string,
  ): Promise<ClientResource | null> {
    if (reachOf(requester) !== "own-client") return null;

    return this.resourceFor(requester, resourceId);
  }

  async managedResourceFor(
    requester: ResourceRequester,
    resourceId: string,
  ): Promise<ClientResource | null> {
    const resource =
      await this.options.clientResourcesPort.findById(resourceId);

    if (!resource) return null;
    if (reachOf(requester) === "every-client") return resource;

    this.options.clientResourceIncidentsPort.resourceAccessRefused({
      requesterRole: requester.role,
      ...resource.storageOwner(),
    });

    return null;
  }

  async clientWithReachablePortalOf(
    requester: ResourceRequester,
  ): Promise<string | null> {
    if (reachOf(requester) !== "own-client") return null;

    const client = await this.options.clientReachPort.findByAuthSubjectId(
      requester.authSubjectId,
    );

    return client?.portal === "reachable" ? client.clientId : null;
  }

  mayAddFor(requester: ResourceRequester, clientId: string): boolean {
    if (reachOf(requester) === "every-client") return true;

    this.options.clientResourceIncidentsPort.resourceAccessRefused({
      requesterRole: requester.role,
      clientId,
      resourceId: null,
    });

    return false;
  }

  async reachesClient(
    requester: ResourceRequester,
    clientId: string,
  ): Promise<boolean> {
    if (reachOf(requester) === "none") return false;
    if ((await this.options.clientReachPort.findById(clientId)) === null)
      return false;
    if (await this.reaches(requester, (ownId) => ownId === clientId)) {
      return true;
    }

    this.options.clientResourceIncidentsPort.resourceAccessRefused({
      requesterRole: requester.role,
      clientId,
      resourceId: null,
    });

    return false;
  }

  private async reaches(
    requester: ResourceRequester,
    isOwnedBy: (clientId: string) => boolean,
  ): Promise<boolean> {
    if (reachOf(requester) === "every-client") return true;

    const ownClientId = await this.clientWithReachablePortalOf(requester);

    return ownClientId !== null && isOwnedBy(ownClientId);
  }
}
