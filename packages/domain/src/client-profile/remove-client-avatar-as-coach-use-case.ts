import type { ClientReach } from "../client";

import {
  ClientAvatarIntake,
  type ClientAvatarIntakeOptions,
} from "./client-avatar-intake";

type RemoveClientAvatarAsCoachResult =
  { status: "removed" } | { status: "not-found" };

type RemoveClientAvatarAsCoachUseCaseOptions = ClientAvatarIntakeOptions & {
  clients: Pick<ClientReach, "findById">;
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

    await new ClientAvatarIntake(this.options).remove(client.clientId);

    return { status: "removed" };
  }
}
