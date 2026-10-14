import type { ClientIdentities, ClientReach } from "../client";
import type { Clock } from "../shared";

import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInSeriesSnapshot } from "./check-in-series";
import type { CheckInSeriesRecords } from "./check-in-series-records";
import {
  CoachCheckInViews,
  type CoachCheckInView,
} from "./coach-check-in-views";

export type CoachClientSeries = {
  series: CheckInSeriesSnapshot | null;
  occurrences: CoachCheckInView[];
  coachingEnds: boolean;
};

type ReadCoachClientSeriesUseCaseOptions = {
  clients: Pick<ClientReach, "findById">;
  clock: Clock;
  identities: Pick<ClientIdentities, "findByClientIds">;
  incidents: Pick<CheckInIncidents, "checkInSeriesReadFailed">;
  series: Pick<CheckInSeriesRecords, "findActiveForClient" | "listOccurrences">;
};

export class ReadCoachClientSeriesUseCase {
  private readonly views: CoachCheckInViews;

  constructor(private readonly options: ReadCoachClientSeriesUseCaseOptions) {
    this.views = new CoachCheckInViews(options);
  }

  async execute(clientId: string): Promise<CoachClientSeries> {
    try {
      return await this.seriesOf(clientId);
    } catch (error) {
      this.options.incidents.checkInSeriesReadFailed({ clientId, error });

      return { series: null, occurrences: [], coachingEnds: false };
    }
  }

  private async seriesOf(clientId: string): Promise<CoachClientSeries> {
    const [client, series] = await Promise.all([
      this.options.clients.findById(clientId),
      this.options.series.findActiveForClient(clientId),
    ]);
    const coachingEnds = client !== null && client.coachingEndsAt !== null;

    if (!series) {
      return { series: null, occurrences: [], coachingEnds };
    }

    const occurrences = await this.options.series.listOccurrences(series.id);
    const views = await this.views.viewsOf(occurrences);

    return {
      series: series.toSnapshot(),
      occurrences: views.filter((view) => view.tab !== "past"),
      coachingEnds,
    };
  }
}
