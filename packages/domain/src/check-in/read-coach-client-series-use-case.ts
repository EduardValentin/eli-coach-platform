import type { ClientIdentities } from "../client";
import type { Clock } from "../shared";

import type { CheckInSeriesSnapshot } from "./check-in-series";
import type { CheckInSeriesRecords } from "./check-in-series-records";
import {
  CoachCheckInViews,
  type CoachCheckInView,
} from "./coach-check-in-views";

export type CoachClientSeries = {
  series: CheckInSeriesSnapshot | null;
  occurrences: CoachCheckInView[];
};

type ReadCoachClientSeriesUseCaseOptions = {
  clock: Clock;
  identities: Pick<ClientIdentities, "findByClientIds">;
  series: Pick<CheckInSeriesRecords, "findActiveForClient" | "listOccurrences">;
};

export class ReadCoachClientSeriesUseCase {
  private readonly views: CoachCheckInViews;

  constructor(private readonly options: ReadCoachClientSeriesUseCaseOptions) {
    this.views = new CoachCheckInViews(options);
  }

  async execute(clientId: string): Promise<CoachClientSeries> {
    const series = await this.options.series.findActiveForClient(clientId);

    if (!series) {
      return { series: null, occurrences: [] };
    }

    const occurrences = await this.options.series.listOccurrences(series.id);
    const views = await this.views.viewsOf(occurrences);

    return {
      series: series.toSnapshot(),
      occurrences: views.filter((view) => view.tab !== "past"),
    };
  }
}
