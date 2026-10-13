import type { ClientIdentities, ClientReach } from "../client";
import type { Clock } from "../shared";

import { CheckInAnnouncer } from "./check-in-announcer";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInNotifications } from "./check-in-notifications";
import type { CheckInSeriesSnapshot } from "./check-in-series";
import type { CheckInSeriesRecords } from "./check-in-series-records";

export type StopCheckInSeriesResult =
  | { status: "stopped"; series: CheckInSeriesSnapshot }
  | { status: "unknown_series" | "changed_meanwhile" };

type StopCheckInSeriesUseCaseOptions = {
  clients: Pick<ClientReach, "findById">;
  clock: Clock;
  identities: Pick<ClientIdentities, "findByClientIds">;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
  series: Pick<CheckInSeriesRecords, "find" | "stop">;
};

export class StopCheckInSeriesUseCase {
  private readonly announcer: CheckInAnnouncer;

  constructor(private readonly options: StopCheckInSeriesUseCaseOptions) {
    this.announcer = new CheckInAnnouncer(options);
  }

  async execute(command: {
    seriesId: string;
  }): Promise<StopCheckInSeriesResult> {
    const current = await this.options.series.find(command.seriesId);

    if (!current || current.isStopped()) {
      return { status: "unknown_series" };
    }

    const now = this.options.clock.now();
    const recorded = await this.options.series.stop({
      seriesId: current.id,
      expected: { changedAt: current.changedAt },
      at: now,
    });

    if (recorded !== "stopped") {
      return { status: recorded };
    }

    const stopped = current.stop(now);
    const client = await this.options.clients.findById(current.clientId);

    await this.announcer.announceSeries("seriesStopped", {
      series: stopped,
      weekStartsAt: stopped.nextWeekStartFrom(now),
      clientTimeZone: client?.timeZone ?? stopped.timeZone,
    });

    return { status: "stopped", series: stopped.toSnapshot() };
  }
}
