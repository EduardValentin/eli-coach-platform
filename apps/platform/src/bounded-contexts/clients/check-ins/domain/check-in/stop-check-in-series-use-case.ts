import type {
  ClientIdentities,
  ClientReach,
} from "~/bounded-contexts/clients/clients/domain/client";
import type { Clock } from "../clock";

import { CheckInAnnouncer } from "./check-in-announcer";
import { releaseFreedHours } from "./check-in-hour-release";
import type { CheckInInbox } from "./check-in-inbox";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInNotifications } from "./check-in-notifications";
import type { CheckInSeriesSnapshot } from "./check-in-series";
import type { CheckInSeriesRecords } from "./check-in-series-records";
import type { CoachTime } from "./coach-time";

export type StopCheckInSeriesResult =
  | { status: "stopped"; series: CheckInSeriesSnapshot }
  | { status: "unknown_series" | "changed_meanwhile" };

type StopCheckInSeriesUseCaseOptions = {
  clients: Pick<ClientReach, "findById">;
  clock: Clock;
  coachTime: Pick<CoachTime, "release">;
  identities: Pick<ClientIdentities, "findByClientIds">;
  inbox: CheckInInbox;
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

    const client = await this.options.clients.findById(current.clientId);
    const now = this.options.clock.now();
    const recorded = await this.options.series.stop({
      seriesId: current.id,
      expected: { changedAt: current.changedAt },
      at: now,
    });

    if (recorded.status === "changed_meanwhile") {
      return recorded;
    }

    await releaseFreedHours(
      this.options.coachTime,
      recorded.freedReservationIds,
    );

    const stopped = current.stop(now);

    await this.announcer.announceSeries("seriesStopped", {
      series: stopped,
      weekStartsAt: stopped.nextWeekStartFrom(now),
      clientTimeZone: client?.timeZone ?? stopped.timeZone,
      firstWeekId: null,
    });

    return { status: "stopped", series: stopped.toSnapshot() };
  }
}
