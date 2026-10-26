import type { ClientReach } from "../client";
import type { Clock } from "../shared";

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

    const settings = await this.options.settings.findByClientId(
      client.clientId,
    );

    if (!settings) {
      return { status: "not-on-journey" };
    }

    await this.options.changes.saveUnits(
      settings.withUnits(
        UnitPreference.from(command.preference),
        this.options.clock.now(),
      ),
    );

    return { status: "saved" };
  }
}
