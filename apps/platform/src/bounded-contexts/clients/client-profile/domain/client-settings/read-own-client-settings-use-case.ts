import type { ClientReachPort } from "../client-reach-port";

import type { ClientSettingsSnapshot } from "./client-settings";
import type { ClientSettingsSourcePort } from "./client-settings-source-port";

type ReadOwnClientSettingsUseCaseOptions = {
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId">;
  clientSettingsSourcePort: ClientSettingsSourcePort;
};

export class ReadOwnClientSettingsUseCase {
  constructor(private readonly options: ReadOwnClientSettingsUseCaseOptions) {}

  async execute(authSubjectId: string): Promise<ClientSettingsSnapshot | null> {
    const client =
      await this.options.clientReachPort.findByAuthSubjectId(authSubjectId);

    if (!client) {
      return null;
    }

    const settings = await this.options.clientSettingsSourcePort.findByClientId(
      client.clientId,
    );

    return settings?.toSnapshot() ?? null;
  }
}
