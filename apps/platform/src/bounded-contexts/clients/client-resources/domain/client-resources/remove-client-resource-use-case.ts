import type { ClientReachPort } from "./client-reach-port";
import type { ClientResourceOwner } from "./client-resource";
import {
  ClientResourceAccess,
  type ResourceRequester,
} from "./client-resource-access";
import type { ClientResourceIncidentsPort } from "./client-resource-incidents-port";
import type { ClientResourceStorePort } from "./client-resource-store-port";
import type { ClientResourcesPort } from "./client-resources-port";

type RemoveClientResourceCommand = {
  requester: ResourceRequester;
  resourceId: string;
};

export type RemoveClientResourceResult =
  { status: "removed" } | { status: "not-found" } | { status: "failed" };

type RemoveClientResourceUseCaseOptions = {
  resources: ClientResourcesPort;
  clients: Pick<ClientReachPort, "findByAuthSubjectId" | "findById">;
  store: ClientResourceStorePort;
  incidents: ClientResourceIncidentsPort;
};

export class RemoveClientResourceUseCase {
  private readonly access: ClientResourceAccess;

  constructor(private readonly options: RemoveClientResourceUseCaseOptions) {
    this.access = new ClientResourceAccess(options);
  }

  async execute(
    command: RemoveClientResourceCommand,
  ): Promise<RemoveClientResourceResult> {
    const resource = await this.access.managedResourceFor(
      command.requester,
      command.resourceId,
    );

    if (!resource) return { status: "not-found" };

    const owner = resource.storageOwner();

    try {
      await this.options.resources.remove(owner.resourceId);
    } catch (error) {
      this.options.incidents.resourceChangeFailed({ ...owner, error });

      return { status: "failed" };
    }

    await this.removeFiles(owner);

    return { status: "removed" };
  }

  private async removeFiles(owner: ClientResourceOwner): Promise<void> {
    try {
      await this.options.store.remove(owner);
    } catch (error) {
      this.options.incidents.resourceFilesOrphaned({ ...owner, error });
    }
  }
}
