import type { ClientReachPort } from "../client-reach-port";
import type { ClockPort } from "../clock-port";
import {
  UnitPreference,
  type ClientSettingsSourcePort,
} from "../client-settings";
import type { ClientMeasurementRecordsPort } from "./client-measurement-records-port";
import type { ClientProfilesPort } from "./client-profiles-port";
import {
  MeasurementHistory,
  type MeasurementDueLine,
} from "./measurement-history";

type ReadOwnMeasurementHistoryCommand = { authSubjectId: string };

export type OwnMeasurementHistoryReading = {
  history: MeasurementHistory;
  consentedAt: Date | null;
  dueLine: MeasurementDueLine | null;
  units: UnitPreference;
};

type ReadOwnMeasurementHistoryUseCaseOptions = {
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId">;
  clockPort: ClockPort;
  clientProfilesPort: Pick<ClientProfilesPort, "findByClientId">;
  clientMeasurementRecordsPort: ClientMeasurementRecordsPort;
  clientSettingsSourcePort: ClientSettingsSourcePort;
};

export class ReadOwnMeasurementHistoryUseCase {
  constructor(
    private readonly options: ReadOwnMeasurementHistoryUseCaseOptions,
  ) {}

  async execute(
    command: ReadOwnMeasurementHistoryCommand,
  ): Promise<OwnMeasurementHistoryReading | null> {
    const client = await this.options.clientReachPort.findByAuthSubjectId(
      command.authSubjectId,
    );

    if (!client) {
      return null;
    }

    const [records, profile, settings] = await Promise.all([
      this.options.clientMeasurementRecordsPort.listByClientId(client.clientId),
      this.options.clientProfilesPort.findByClientId(client.clientId),
      this.options.clientSettingsSourcePort.findByClientId(client.clientId),
    ]);
    const history = MeasurementHistory.of(records);

    return {
      history,
      consentedAt: profile?.toSnapshot().progressPhotosConsentedAt ?? null,
      dueLine: history.dueLine(this.options.clockPort.now()),
      units: settings?.unitPreference() ?? UnitPreference.metric(),
    };
  }
}
