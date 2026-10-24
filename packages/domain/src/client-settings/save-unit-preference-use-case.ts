import type { ClientReach } from "../client";
import type { Clock } from "../shared";

import { ClientSettings } from "./client-settings";
import type { ClientSettingsChanges } from "./client-settings-changes";
import type { ClientSettingsSource } from "./client-settings-source";
import { UnitPreference, type UnitPreferenceSnapshot } from "./unit-preference";

type SaveUnitPreferenceCommand = {
  authSubjectId: string;
  preference: UnitPreferenceSnapshot;
};

type SaveUnitPreferenceResult =
  { status: "saved" } | { status: "not-on-journey" } | { status: "ended" };

type SaveUnitPreferenceUseCaseOptions = {
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  settings: ClientSettingsSource;
  changes: ClientSettingsChanges;
  clock: Clock;
};

export class SaveUnitPreferenceUseCase {
  constructor(private readonly options: SaveUnitPreferenceUseCaseOptions) {}

  async execute(
    command: SaveUnitPreferenceCommand,
  ): Promise<SaveUnitPreferenceResult> {
    const client = await this.options.clients.findByAuthSubjectId(
      command.authSubjectId,
    );

    if (!client) {
      return { status: "not-on-journey" };
    }

    if (client.portal === "ended") {
      return { status: "ended" };
    }

    const now = this.options.clock.now();
    const settings =
      (await this.options.settings.findByClientId(client.clientId)) ??
      ClientSettings.opened({ clientId: client.clientId, now });

    await this.options.changes.saveUnits(
      settings.withUnits(UnitPreference.from(command.preference), now),
    );

    return { status: "saved" };
  }
}
