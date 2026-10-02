import type { ClientMeasurementRecords } from "./client-measurement-records";
import { MeasurementHistory } from "./measurement-history";

type ReadClientMeasurementHistoryCommand = { clientId: string };

type ReadClientMeasurementHistoryUseCaseOptions = {
  records: ClientMeasurementRecords;
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
