import type { ClientReach } from "./client-reach";
import type { Clock } from "../clock";

import type { ClientResource } from "./client-resource";
import {
  ClientResourceAccess,
  type ResourceRequester,
} from "./client-resource-access";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResources } from "./client-resources";

type MarkResourceOpenedCommand = {
  requester: ResourceRequester;
  resourceId: string;
};

type MarkResourceOpenedResult =
  { status: "opened" } | { status: "not-found" } | { status: "failed" };

type MarkResourceOpenedUseCaseOptions = {
  resources: ClientResources;
  clients: Pick<ClientReach, "findByAuthSubjectId" | "findById">;
  incidents: ClientResourceIncidents;
  clock: Clock;
};

const OPENED: MarkResourceOpenedResult = { status: "opened" };

export class MarkResourceOpenedUseCase {
  private readonly access: ClientResourceAccess;

  constructor(private readonly options: MarkResourceOpenedUseCaseOptions) {
    this.access = new ClientResourceAccess(options);
  }

  async execute(
    command: MarkResourceOpenedCommand,
  ): Promise<MarkResourceOpenedResult> {
    const resource = await this.access.ownResourceFor(
      command.requester,
      command.resourceId,
    );

    if (!resource) return { status: "not-found" };
    if (!resource.isUnopened()) return OPENED;

    return this.recordOpening(resource);
  }

  private async recordOpening(
    resource: ClientResource,
  ): Promise<MarkResourceOpenedResult> {
    try {
      await this.options.resources.recordOpened(
        resource.opened(this.options.clock.now()),
      );

      return OPENED;
    } catch (error) {
      this.options.incidents.resourceOpeningFailed({
        ...resource.storageOwner(),
        error,
      });

      return { status: "failed" };
    }
  }
}
