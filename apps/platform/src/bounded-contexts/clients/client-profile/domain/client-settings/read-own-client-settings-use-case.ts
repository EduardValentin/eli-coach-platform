import type { ClientReachPort } from "../client-reach-port";

import type { ClientSettingsSnapshot } from "./client-settings";
import type { ClientSettingsSourcePort } from "./client-settings-source-port";

type ReadOwnClientSettingsUseCaseOptions = {
  clients: Pick<ClientReachPort, "findByAuthSubjectId">;
  settings: ClientSettingsSourcePort;
};

export class ReadOwnClientSettingsUseCase {
  constructor(private readonly options: ReadOwnClientSettingsUseCaseOptions) {}

  async execute(authSubjectId: string): Promise<ClientSettingsSnapshot | null> {
    const client =
      await this.options.clients.findByAuthSubjectId(authSubjectId);

    if (!client) {
      return null;
    }

    const settings = await this.options.settings.findByClientId(
      client.clientId,
    );

    return settings?.toSnapshot() ?? null;
  }
}
