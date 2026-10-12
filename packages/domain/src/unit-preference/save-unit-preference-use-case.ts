import type { ClientReach } from "../client";
import type { Clock } from "../shared";

import type { ClientUnitPreferences } from "./client-unit-preferences";
import { UnitPreference, type UnitPreferenceSnapshot } from "./unit-preference";

type SaveUnitPreferenceCommand = {
  authSubjectId: string;
  preference: UnitPreferenceSnapshot;
};

type SaveUnitPreferenceResult =
  { status: "saved" } | { status: "not-on-journey" } | { status: "ended" };

type SaveUnitPreferenceUseCaseOptions = {
  clients: Pick<ClientReach, "findByAuthSubjectId">;
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

    if (client.portal === "ended") {
      return { status: "ended" };
    }

    await this.options.preferences.save({
      clientId: client.clientId,
      preference: UnitPreference.from(command.preference),
      at: this.options.clock.now(),
    });

    return { status: "saved" };
  }
}
