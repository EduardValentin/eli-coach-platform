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
  clients: Pick<ClientReachPort, "findByAuthSubjectId">;
  clock: ClockPort;
  profiles: Pick<ClientProfilesPort, "findByClientId">;
  records: ClientMeasurementRecordsPort;
  settings: ClientSettingsSourcePort;
};

export class ReadOwnMeasurementHistoryUseCase {
  constructor(
    private readonly options: ReadOwnMeasurementHistoryUseCaseOptions,
  ) {}

  async execute(
    command: ReadOwnMeasurementHistoryCommand,
  ): Promise<OwnMeasurementHistoryReading | null> {
    const client = await this.options.clients.findByAuthSubjectId(
      command.authSubjectId,
    );

    if (!client) {
      return null;
    }

    const [records, profile, settings] = await Promise.all([
      this.options.records.listByClientId(client.clientId),
      this.options.profiles.findByClientId(client.clientId),
      this.options.settings.findByClientId(client.clientId),
    ]);
    const history = MeasurementHistory.of(records);

    return {
      history,
      consentedAt: profile?.toSnapshot().progressPhotosConsentedAt ?? null,
      dueLine: history.dueLine(this.options.clock.now()),
      units: settings?.unitPreference() ?? UnitPreference.metric(),
    };
  }
}
