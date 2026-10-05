import type { AccountRole } from "../account";

import type { ClientResource } from "./client-resource";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResources } from "./client-resources";
import type { ResourceClients } from "./resource-clients";

export type ResourceRequester = { role: AccountRole; authSubjectId: string };

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

  async reachesClient(
    requester: ResourceRequester,
    clientId: string,
  ): Promise<boolean> {
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
    if (requester.role === "COACH") return true;

    const client = await this.options.clients.findByAuthSubjectId(
      requester.authSubjectId,
    );

    return client !== null && isOwnedBy(client.clientId);
  }
}
