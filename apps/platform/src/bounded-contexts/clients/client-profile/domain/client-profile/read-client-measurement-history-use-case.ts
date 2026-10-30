import type { ClientMeasurementRecordsPort } from "./client-measurement-records-port";
import { MeasurementHistory } from "./measurement-history";

type ReadClientMeasurementHistoryCommand = { clientId: string };

type ReadClientMeasurementHistoryUseCaseOptions = {
  records: ClientMeasurementRecordsPort;
};

export class ReadClientMeasurementHistoryUseCase {
  constructor(
    private readonly options: ReadClientMeasurementHistoryUseCaseOptions,
  ) {}

  async execute(
    command: ReadClientMeasurementHistoryCommand,
  ): Promise<MeasurementHistory> {
    return MeasurementHistory.of(
      await this.options.records.listByClientId(command.clientId),
    );
  }
}
