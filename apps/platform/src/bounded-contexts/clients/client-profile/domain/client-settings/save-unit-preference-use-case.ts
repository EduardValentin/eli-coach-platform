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
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId">;
  clientSettingsSourcePort: ClientSettingsSourcePort;
  clientSettingsChangesPort: ClientSettingsChangesPort;
  clockPort: ClockPort;
};

export class SaveUnitPreferenceUseCase {
  constructor(private readonly options: SaveUnitPreferenceUseCaseOptions) {}

  async execute(
    command: SaveUnitPreferenceCommand,
  ): Promise<SaveUnitPreferenceResult> {
    const client = await this.options.clientReachPort.findByAuthSubjectId(
      command.authSubjectId,
    );

    if (!client) {
      return { status: "not-on-journey" };
    }

    if (client.portal === "ended") {
      return { status: "ended" };
    }

    const settings = await this.options.clientSettingsSourcePort.findByClientId(
      client.clientId,
    );

    if (!settings) {
      return { status: "not-on-journey" };
    }

    await this.options.clientSettingsChangesPort.saveUnits(
      settings.withUnits(
        UnitPreference.from(command.preference),
        this.options.clockPort.now(),
      ),
    );

    return { status: "saved" };
  }
}
