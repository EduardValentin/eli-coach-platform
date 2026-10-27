import type {
  ClientIdentities,
  ClientReach,
} from "~/bounded-contexts/clients/clients/domain/client";
import type { Clock } from "../clock";

import { CheckIn, type CheckInSnapshot } from "./check-in";
import { CheckInAnnouncer } from "./check-in-announcer";
import { releaseFreedHours } from "./check-in-hour-release";
import type { CheckInIds } from "./check-in-ids";
import type { CheckInInbox } from "./check-in-inbox";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInNotifications } from "./check-in-notifications";
import { CHECK_IN_RULES } from "./check-in-rules";
import type { CheckInSeriesSnapshot } from "./check-in-series";
import { CheckInSeriesBounds } from "./check-in-series-bounds";
import type { CheckInSeriesRecords } from "./check-in-series-records";
import { CheckInSeriesRule } from "./check-in-series-rule";
import { CheckInWeekRecorder } from "./check-in-week-recorder";
import type { CoachTime } from "./coach-time";
import type { OpenSlots } from "./open-slots";
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
  clients: Pick<ClientReach, "findById">;
  clock: Clock;
  coachTime: CoachTime;
  identities: Pick<ClientIdentities, "findByClientIds">;
  ids: CheckInIds;
  inbox: CheckInInbox;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
  openSlots: Pick<OpenSlots, "coachWeek">;
  series: Pick<CheckInSeriesRecords, "find" | "change" | "recordWeeks">;
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

    return {
      status: "changed",
      series: series.toSnapshot(),
      occurrences: occurrences.map((checkIn) => checkIn.toSnapshot()),
    };
  }
}
