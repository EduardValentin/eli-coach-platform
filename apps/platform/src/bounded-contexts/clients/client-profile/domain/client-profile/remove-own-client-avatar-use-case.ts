import type { ClientReachPort } from "../client-reach-port";

import {
  ClientAvatarRemoval,
  type ClientAvatarRemovalOptions,
} from "./client-avatar-removal";

type RemoveOwnClientAvatarResult =
  { status: "removed" } | { status: "not-on-journey" } | { status: "ended" };

type RemoveOwnClientAvatarUseCaseOptions = ClientAvatarRemovalOptions & {
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId">;
};

export class RemoveOwnClientAvatarUseCase {
  constructor(private readonly options: RemoveOwnClientAvatarUseCaseOptions) {}

  async execute(authSubjectId: string): Promise<RemoveOwnClientAvatarResult> {
    const client =
      await this.options.clientReachPort.findByAuthSubjectId(authSubjectId);

    if (!client) {
      return { status: "not-on-journey" };
    }

    if (client.portal === "ended") {
      return { status: "ended" };
    }

    await new ClientAvatarRemoval(this.options).remove(client.clientId);

    return { status: "removed" };
  }
}
