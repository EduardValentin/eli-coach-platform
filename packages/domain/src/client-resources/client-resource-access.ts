import type { AccountRole } from "../account";

import type { ClientResource } from "./client-resource";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResources } from "./client-resources";
import type { ResourceClients } from "./resource-clients";

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
  resources: ClientResources;
  clients: ResourceClients;
  incidents: ClientResourceIncidents;
};

export class ClientResourceAccess {
  constructor(private readonly options: ClientResourceAccessOptions) {}

  async resourceFor(
    requester: ResourceRequester,
    resourceId: string,
  ): Promise<ClientResource | null> {
    if (reachOf(requester) === "none") return null;

    const resource = await this.options.resources.findById(resourceId);

    if (!resource) return null;
    if (await this.reaches(requester, (clientId) => resource.isFor(clientId))) {
      return resource;
    }

    this.options.incidents.resourceAccessRefused({
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

  async ownClientOf(requester: ResourceRequester): Promise<string | null> {
    if (reachOf(requester) !== "own-client") return null;

    const client = await this.options.clients.findByAuthSubjectId(
      requester.authSubjectId,
    );

    return client?.portal === "open" ? client.clientId : null;
  }

  mayAddFor(requester: ResourceRequester, clientId: string): boolean {
    if (reachOf(requester) === "every-client") return true;

    this.options.incidents.resourceAccessRefused({
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
    if (!(await this.options.clients.exists(clientId))) return false;
    if (await this.reaches(requester, (ownId) => ownId === clientId)) {
      return true;
    }

    this.options.incidents.resourceAccessRefused({
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

    const ownClientId = await this.ownClientOf(requester);

    return ownClientId !== null && isOwnedBy(ownClientId);
  }
}
