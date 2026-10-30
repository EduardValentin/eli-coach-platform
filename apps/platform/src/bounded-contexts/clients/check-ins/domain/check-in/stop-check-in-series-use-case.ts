import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClientReachPort } from "./client-reach-port";
import type { ClockPort } from "../clock-port";

import { CheckInAnnouncer } from "./check-in-announcer";
import { releaseFreedHours } from "./check-in-hour-release";
import type { CheckInInboxPort } from "./check-in-inbox-port";
import type { CheckInIncidentsPort } from "./check-in-incidents-port";
import type { CheckInNotificationsPort } from "./check-in-notifications-port";
import type { CheckInSeriesSnapshot } from "./check-in-series";
import type { CheckInSeriesRecordsPort } from "./check-in-series-records-port";
import type { CoachTimePort } from "./coach-time-port";

export type StopCheckInSeriesResult =
  | { status: "stopped"; series: CheckInSeriesSnapshot }
  | { status: "unknown_series" | "changed_meanwhile" };

type StopCheckInSeriesUseCaseOptions = {
  clients: Pick<ClientReachPort, "findById">;
  clock: ClockPort;
  coachTime: Pick<CoachTimePort, "release">;
  identities: Pick<ClientIdentitiesPort, "findByClientIds">;
  inbox: CheckInInboxPort;
  incidents: CheckInIncidentsPort;
  notifications: CheckInNotificationsPort;
  series: Pick<CheckInSeriesRecordsPort, "find" | "stop">;
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
    await this.announcer.announceExpiries(stopped, {
      current: [],
      withdrawn: recorded.cancelledIds,
    });

    return { status: "stopped", series: stopped.toSnapshot() };
  }
}
