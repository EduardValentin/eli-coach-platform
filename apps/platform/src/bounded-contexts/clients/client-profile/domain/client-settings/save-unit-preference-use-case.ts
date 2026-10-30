import type { ClientReachPort } from "../client-reach-port";
import type { ClockPort } from "../clock-port";

import type { ClientSettingsChangesPort } from "./client-settings-changes-port";
import type { ClientSettingsSourcePort } from "./client-settings-source-port";
import { UnitPreference, type UnitPreferenceSnapshot } from "./unit-preference";

type SaveUnitPreferenceCommand = {
  authSubjectId: string;
  preference: UnitPreferenceSnapshot;
};

type SaveUnitPreferenceResult =
  { status: "saved" } | { status: "not-on-journey" } | { status: "ended" };

type SaveUnitPreferenceUseCaseOptions = {
  clients: Pick<ClientReachPort, "findByAuthSubjectId">;
  settings: ClientSettingsSourcePort;
  changes: ClientSettingsChangesPort;
  clock: ClockPort;
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
