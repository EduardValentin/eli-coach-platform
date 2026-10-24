import type { ClientReach } from "../client";
import type { Clock } from "../shared";

import { ClientSettings, type ClientSettingsSnapshot } from "./client-settings";
import type { ClientSettingsSource } from "./client-settings-source";

type ReadOwnClientSettingsUseCaseOptions = {
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  settings: ClientSettingsSource;
  clock: Clock;
};

export class ReadOwnClientSettingsUseCase {
  constructor(private readonly options: ReadOwnClientSettingsUseCaseOptions) {}

  async execute(authSubjectId: string): Promise<ClientSettingsSnapshot | null> {
    const client =
      await this.options.clients.findByAuthSubjectId(authSubjectId);

    if (!client) {
      return null;
    }

    const settings =
      (await this.options.settings.findByClientId(client.clientId)) ??
      ClientSettings.opened({
        clientId: client.clientId,
        now: this.options.clock.now(),
      });

    return settings.toSnapshot();
  }
}
