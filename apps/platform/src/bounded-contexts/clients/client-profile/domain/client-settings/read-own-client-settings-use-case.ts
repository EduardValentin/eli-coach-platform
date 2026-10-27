import type { ClientReach } from "../client-reach";

import type { ClientSettingsSnapshot } from "./client-settings";
import type { ClientSettingsSource } from "./client-settings-source";

type ReadOwnClientSettingsUseCaseOptions = {
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  settings: ClientSettingsSource;
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
