import type { ClientReach } from "~/bounded-contexts/clients/clients/domain/client";
import type { Clock } from "../clock";
import { UnitPreference, type ClientSettingsSource } from "../client-settings";
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
  profiles: Pick<ClientProfiles, "findByClientId">;
  records: ClientMeasurementRecords;
  settings: ClientSettingsSource;
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
