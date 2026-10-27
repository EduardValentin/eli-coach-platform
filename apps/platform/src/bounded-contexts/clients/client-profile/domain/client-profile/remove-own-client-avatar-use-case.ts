import type { ClientReach } from "../client-reach";

import {
  ClientAvatarRemoval,
  type ClientAvatarRemovalOptions,
} from "./client-avatar-removal";

type RemoveOwnClientAvatarResult =
  { status: "removed" } | { status: "not-on-journey" } | { status: "ended" };

type RemoveOwnClientAvatarUseCaseOptions = ClientAvatarRemovalOptions & {
  clients: Pick<ClientReach, "findByAuthSubjectId">;
};

export class RemoveOwnClientAvatarUseCase {
  constructor(private readonly options: RemoveOwnClientAvatarUseCaseOptions) {}

  async execute(authSubjectId: string): Promise<RemoveOwnClientAvatarResult> {
    const client =
      await this.options.clients.findByAuthSubjectId(authSubjectId);

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
