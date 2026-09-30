import type { ClientMeasurementRecords } from "./client-measurement-records";
import type { ClientProfiles } from "./client-profiles";
import type { MeasurementClients } from "./measurement-clients";
import { MeasurementHistory } from "./measurement-history";

type ReadOwnMeasurementHistoryCommand = { authSubjectId: string };

export type OwnMeasurementHistoryReading = {
  history: MeasurementHistory;
  consentedAt: Date | null;
};

type ReadOwnMeasurementHistoryUseCaseOptions = {
  clients: MeasurementClients;
  profiles: ClientProfiles;
  records: ClientMeasurementRecords;
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

    const [records, profile] = await Promise.all([
      this.options.records.listByClientId(client.clientId),
      this.options.profiles.findByClientId(client.clientId),
    ]);

    return {
      history: MeasurementHistory.of(records),
      consentedAt: profile?.toSnapshot().progressPhotosConsentedAt ?? null,
    };
  }
}
