import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClientReachPort } from "./client-reach-port";
import type { ClockPort } from "../clock-port";

import { CheckIn, type CheckInSnapshot } from "./check-in";
import { CheckInAnnouncer } from "./check-in-announcer";
import { releaseFreedHours } from "./check-in-hour-release";
import type { CheckInIdsPort } from "./check-in-ids-port";
import type { CheckInInboxPort } from "./check-in-inbox-port";
import type { CheckInIncidentsPort } from "./check-in-incidents-port";
import type { CheckInNotificationsPort } from "./check-in-notifications-port";
import { CHECK_IN_RULES } from "./check-in-rules";
import type { CheckInSeriesSnapshot } from "./check-in-series";
import { CheckInSeriesBounds } from "./check-in-series-bounds";
import type { CheckInSeriesRecordsPort } from "./check-in-series-records-port";
import { CheckInSeriesRule } from "./check-in-series-rule";
import { CheckInWeekRecorder } from "./check-in-week-recorder";
import type { CoachTimePort } from "./coach-time-port";
import type { OpenSlotsPort } from "./open-slots-port";
import type { Weekday } from "./weekdays";

export type ChangeCheckInSeriesCommand = {
  seriesId: string;
  weekday: Weekday;
  hour: number;
};

export type ChangeCheckInSeriesResult =
  | {
      status: "changed";
      series: CheckInSeriesSnapshot;
      occurrences: CheckInSnapshot[];
    }
  | {
      status:
        | "unknown_series"
        | "outside_availability"
        | "client_cannot_answer"
        | "changed_meanwhile";
    };

type ChangeCheckInSeriesUseCaseOptions = {
  clients: Pick<ClientReachPort, "findById">;
  clock: ClockPort;
  coachTime: CoachTimePort;
  identities: Pick<ClientIdentitiesPort, "findByClientIds">;
  ids: CheckInIdsPort;
  inbox: CheckInInboxPort;
  incidents: CheckInIncidentsPort;
  notifications: CheckInNotificationsPort;
  openSlots: Pick<OpenSlotsPort, "coachWeek">;
  series: Pick<CheckInSeriesRecordsPort, "find" | "change" | "recordWeeks">;
};

export class ChangeCheckInSeriesUseCase {
  private readonly announcer: CheckInAnnouncer;
  private readonly weeks: CheckInWeekRecorder;

  constructor(private readonly options: ChangeCheckInSeriesUseCaseOptions) {
    this.announcer = new CheckInAnnouncer(options);
    this.weeks = new CheckInWeekRecorder(options);
  }

  async execute(
    command: ChangeCheckInSeriesCommand,
  ): Promise<ChangeCheckInSeriesResult> {
    const current = await this.options.series.find(command.seriesId);

    if (!current || current.isStopped()) {
      return { status: "unknown_series" };
    }

    const client = await this.options.clients.findById(current.clientId);

    if (!client || !CheckInSeriesBounds.admits(client)) {
      return { status: "client_cannot_answer" };
    }

    const week = await this.options.openSlots.coachWeek();

    if (!week.holdsWeeklyHour(command)) {
      return { status: "outside_availability" };
    }

    const now = this.options.clock.now();
    const { series, starts } = current.changedTo({
      rule: CheckInSeriesRule.of({
        weekday: command.weekday,
        hour: command.hour,
        timeZone: week.timeZone,
      }),
      now,
      lead: CHECK_IN_RULES,
    });
    const changed = await this.options.series.change({
      series,
      expected: {
        changedAt: current.changedAt,
        weekday: current.weekday,
        hour: current.hour,
      },
      startsFrom: now,
      at: now,
    });

    if (changed.status === "changed_meanwhile") {
      return changed;
    }

    await releaseFreedHours(
      this.options.coachTime,
      changed.freedReservationIds,
    );

    const occurrences = await this.weeks.record(
      series.occurrencesAt({
        starts,
        clientTimeZone: client.timeZone,
        availability: "open",
        at: now,
        newId: () => this.options.ids.generate(),
      }),
    );

    await this.announcer.announceSeries("seriesChanged", {
      series,
      weekStartsAt: starts[0] ?? series.nextWeekStartFrom(now),
      clientTimeZone: client.timeZone,
      firstWeekId: CheckIn.earliestOf(occurrences)?.id ?? null,
    });
    await this.announcer.announceExpiries(series, {
      current: occurrences,
      withdrawn: changed.cancelledIds,
    });

    return {
      status: "changed",
      series: series.toSnapshot(),
      occurrences: occurrences.map((checkIn) => checkIn.toSnapshot()),
    };
  }
}
