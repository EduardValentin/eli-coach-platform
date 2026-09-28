import type { Clock } from "../shared";

import type { ClientUnitPreferences } from "./client-unit-preferences";
import type { UnitPreference } from "./unit-preference";
import type { UnitPreferenceClients } from "./unit-preference-clients";

type SaveUnitPreferenceCommand = {
  authSubjectId: string;
  preference: UnitPreference;
};

type SaveUnitPreferenceResult =
  { status: "saved" } | { status: "not-on-journey" };

type SaveUnitPreferenceUseCaseOptions = {
  clients: UnitPreferenceClients;
  preferences: ClientUnitPreferences;
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

    await this.options.preferences.save({
      clientId: client.clientId,
      preference: command.preference,
      at: this.options.clock.now(),
    });

    return { status: "saved" };
  }
}
