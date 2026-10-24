import type { ClientReach } from "../client";

import type { ClientAvatarSnapshot } from "./client-avatar";
import type { ClientAvatars } from "./client-avatars";

type ReadOwnClientAvatarUseCaseOptions = {
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  avatars: Pick<ClientAvatars, "findByClientId">;
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
