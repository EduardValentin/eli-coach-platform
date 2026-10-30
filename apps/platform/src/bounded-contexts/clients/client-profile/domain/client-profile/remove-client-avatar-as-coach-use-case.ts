import type { ClientReachPort } from "../client-reach-port";

import {
  ClientAvatarRemoval,
  type ClientAvatarRemovalOptions,
} from "./client-avatar-removal";

type RemoveClientAvatarAsCoachResult =
  { status: "removed" } | { status: "not-found" };

type RemoveClientAvatarAsCoachUseCaseOptions = ClientAvatarRemovalOptions & {
  clients: Pick<ClientReachPort, "findById">;
};

export class RemoveClientAvatarAsCoachUseCase {
  constructor(
    private readonly options: RemoveClientAvatarAsCoachUseCaseOptions,
  ) {}

  async execute(clientId: string): Promise<RemoveClientAvatarAsCoachResult> {
    const client = await this.options.clients.findById(clientId);

    if (!client) {
      return { status: "not-found" };
    }

    await new ClientAvatarRemoval(this.options).remove(client.clientId);

    return { status: "removed" };
  }
}
