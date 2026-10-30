import type { ClientReachPort } from "./client-reach-port";

import type { CheckInIncidentsPort } from "./check-in-incidents-port";
import type { CheckInSeriesSnapshot } from "./check-in-series";
import type { CheckInSeriesRecordsPort } from "./check-in-series-records-port";

export type CoachClientSeries = {
  series: CheckInSeriesSnapshot | null;
  coachingEnds: boolean;
};

type ReadCoachClientSeriesUseCaseOptions = {
  clientReachPort: Pick<ClientReachPort, "findById">;
  checkInIncidentsPort: Pick<CheckInIncidentsPort, "checkInSeriesReadFailed">;
  checkInSeriesRecordsPort: Pick<
    CheckInSeriesRecordsPort,
    "findActiveForClient"
  >;
};

export class ReadCoachClientSeriesUseCase {
  constructor(private readonly options: ReadCoachClientSeriesUseCaseOptions) {}

  async execute(clientId: string): Promise<CoachClientSeries> {
    try {
      return await this.seriesOf(clientId);
    } catch (error) {
      this.options.checkInIncidentsPort.checkInSeriesReadFailed({
        clientId,
        error,
      });

      return { series: null, coachingEnds: false };
    }
  }

  private async seriesOf(clientId: string): Promise<CoachClientSeries> {
    const [client, series] = await Promise.all([
      this.options.clientReachPort.findById(clientId),
      this.options.checkInSeriesRecordsPort.findActiveForClient(clientId),
    ]);

    return {
      series: series?.toSnapshot() ?? null,
      coachingEnds: client !== null && client.coachingEndsAt !== null,
    };
  }
}
