import type { ClientReachPort } from "../client-reach-port";

import type { ClientAvatarSnapshot } from "./client-avatar";
import type { ClientAvatarsPort } from "./client-avatars-port";

type ReadOwnClientAvatarUseCaseOptions = {
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId">;
  clientAvatarsPort: Pick<ClientAvatarsPort, "findByClientId">;
};

export class ReadOwnClientAvatarUseCase {
  constructor(private readonly options: ReadOwnClientAvatarUseCaseOptions) {}

  async execute(authSubjectId: string): Promise<ClientAvatarSnapshot | null> {
    const client =
      await this.options.clientReachPort.findByAuthSubjectId(authSubjectId);

    if (!client) {
      return null;
    }

    const avatar = await this.options.clientAvatarsPort.findByClientId(
      client.clientId,
    );

    return avatar?.toSnapshot() ?? null;
  }
}
