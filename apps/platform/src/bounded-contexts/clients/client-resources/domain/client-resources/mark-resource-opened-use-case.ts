import type { ClientReachPort } from "./client-reach-port";
import type { ClockPort } from "../clock-port";

import type { ClientResource } from "./client-resource";
import {
  ClientResourceAccess,
  type ResourceRequester,
} from "./client-resource-access";
import type { ClientResourceIncidentsPort } from "./client-resource-incidents-port";
import type { ClientResourcesPort } from "./client-resources-port";

type MarkResourceOpenedCommand = {
  requester: ResourceRequester;
  resourceId: string;
};

type MarkResourceOpenedResult =
  { status: "opened" } | { status: "not-found" } | { status: "failed" };

type MarkResourceOpenedUseCaseOptions = {
  clientResourcesPort: ClientResourcesPort;
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId" | "findById">;
  clientResourceIncidentsPort: ClientResourceIncidentsPort;
  clockPort: ClockPort;
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
      await this.options.clientResourcesPort.recordOpened(
        resource.opened(this.options.clockPort.now()),
      );

      return OPENED;
    } catch (error) {
      this.options.clientResourceIncidentsPort.resourceOpeningFailed({
        ...resource.storageOwner(),
        error,
      });

      return { status: "failed" };
    }
  }
}
