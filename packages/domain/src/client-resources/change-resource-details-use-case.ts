import type { ClientResource } from "./client-resource";
import {
  ClientResourceAccess,
  type ResourceRequester,
} from "./client-resource-access";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResources } from "./client-resources";
import type { ResourceClients } from "./resource-clients";
import {
  ResourceDetails,
  type ResourceDetailsProblems,
  type ResourceDetailsSnapshot,
} from "./resource-details";

type ChangeResourceDetailsCommand = {
  requester: ResourceRequester;
  resourceId: string;
  details: ResourceDetailsSnapshot;
};

export type ChangeResourceDetailsResult =
  | { status: "changed"; resource: ClientResource }
  | { status: "invalid-details"; problems: ResourceDetailsProblems }
  | { status: "not-found" }
  | { status: "failed" };

type ChangeResourceDetailsUseCaseOptions = {
  resources: ClientResources;
  clients: ResourceClients;
  incidents: ClientResourceIncidents;
};

export class ChangeResourceDetailsUseCase {
  private readonly access: ClientResourceAccess;

  constructor(private readonly options: ChangeResourceDetailsUseCaseOptions) {
    this.access = new ClientResourceAccess(options);
  }

  async execute(
    command: ChangeResourceDetailsCommand,
  ): Promise<ChangeResourceDetailsResult> {
    const resource = await this.access.managedResourceFor(
      command.requester,
      command.resourceId,
    );

    if (!resource) return { status: "not-found" };

    const details = ResourceDetails.from(command.details);

    if (details.status === "invalid") {
      return { status: "invalid-details", problems: details.problems };
    }

    return this.save(resource.withDetails(details.details));
  }

  private async save(
    changed: ClientResource,
  ): Promise<ChangeResourceDetailsResult> {
    try {
      await this.options.resources.saveDetails(changed);

      return { status: "changed", resource: changed };
    } catch (error) {
      this.options.incidents.resourceChangeFailed({
        ...changed.storageOwner(),
        error,
      });

      return { status: "failed" };
    }
  }
}
