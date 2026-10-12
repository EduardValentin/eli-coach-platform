import type { ClientReach } from "../client";
import type { Clock } from "../shared";
import {
  UnitPreference,
  type ClientUnitPreferencesSource,
} from "../unit-preference";
import type { ClientMeasurementRecords } from "./client-measurement-records";
import type { ClientProfiles } from "./client-profiles";
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
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  clock: Clock;
  profiles: ClientProfiles;
  records: ClientMeasurementRecords;
  unitPreferences: ClientUnitPreferencesSource;
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

    const [records, profile, unitPreference] = await Promise.all([
      this.options.records.listByClientId(client.clientId),
      this.options.profiles.findByClientId(client.clientId),
      this.options.unitPreferences.findByClientId(client.clientId),
    ]);
    const history = MeasurementHistory.of(records);

    return {
      history,
      consentedAt: profile?.toSnapshot().progressPhotosConsentedAt ?? null,
      dueLine: history.dueLine(this.options.clock.now()),
      units: unitPreference ?? UnitPreference.metric(),
    };
  }
}
