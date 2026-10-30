import type { ClientReachPort } from "../client-reach-port";

import type { ClientAvatarSnapshot } from "./client-avatar";
import type { ClientAvatarsPort } from "./client-avatars-port";

type ReadOwnClientAvatarUseCaseOptions = {
  clients: Pick<ClientReachPort, "findByAuthSubjectId">;
  avatars: Pick<ClientAvatarsPort, "findByClientId">;
};

export class ReadOwnClientAvatarUseCase {
  constructor(private readonly options: ReadOwnClientAvatarUseCaseOptions) {}

  async execute(authSubjectId: string): Promise<ClientAvatarSnapshot | null> {
    const client =
      await this.options.clients.findByAuthSubjectId(authSubjectId);

    if (!client) {
      return null;
    }

    const avatar = await this.options.avatars.findByClientId(client.clientId);

    return avatar?.toSnapshot() ?? null;
  }
}
