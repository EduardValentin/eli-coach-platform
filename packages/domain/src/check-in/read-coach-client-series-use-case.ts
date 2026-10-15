import type { ClientReach } from "../client";

import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInSeriesSnapshot } from "./check-in-series";
import type { CheckInSeriesRecords } from "./check-in-series-records";

export type CoachClientSeries = {
  series: CheckInSeriesSnapshot | null;
  coachingEnds: boolean;
};

type ReadCoachClientSeriesUseCaseOptions = {
  clients: Pick<ClientReach, "findById">;
  incidents: Pick<CheckInIncidents, "checkInSeriesReadFailed">;
  series: Pick<CheckInSeriesRecords, "findActiveForClient">;
};

export class ReadCoachClientSeriesUseCase {
  constructor(private readonly options: ReadCoachClientSeriesUseCaseOptions) {}

  async execute(clientId: string): Promise<CoachClientSeries> {
    try {
      return await this.seriesOf(clientId);
    } catch (error) {
      this.options.incidents.checkInSeriesReadFailed({ clientId, error });

      return { series: null, coachingEnds: false };
    }
  }

  private async seriesOf(clientId: string): Promise<CoachClientSeries> {
    const [client, series] = await Promise.all([
      this.options.clients.findById(clientId),
      this.options.series.findActiveForClient(clientId),
    ]);

    return {
      series: series?.toSnapshot() ?? null,
      coachingEnds: client !== null && client.coachingEndsAt !== null,
    };
  }
}
