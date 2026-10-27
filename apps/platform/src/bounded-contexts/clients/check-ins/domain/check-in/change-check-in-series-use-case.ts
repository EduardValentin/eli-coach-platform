import type {
  ClientIdentities,
  ClientReach,
} from "~/bounded-contexts/clients/clients/domain/client";
import type {
  CoachAvailabilitySource,
  Weekday,
} from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import type { Clock } from "../clock";

import { CheckIn, type CheckInSnapshot } from "./check-in";
import { CheckInAnnouncer } from "./check-in-announcer";
import type { CheckInIds } from "./check-in-ids";
import type { CheckInInbox } from "./check-in-inbox";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInNotifications } from "./check-in-notifications";
import { CHECK_IN_RULES } from "./check-in-rules";
import type { CheckInSeriesSnapshot } from "./check-in-series";
import { CheckInSeriesBounds } from "./check-in-series-bounds";
import type { CheckInSeriesRecords } from "./check-in-series-records";
import { CheckInSeriesRule } from "./check-in-series-rule";

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
  availability: CoachAvailabilitySource;
  clients: Pick<ClientReach, "findById">;
  clock: Clock;
  identities: Pick<ClientIdentities, "findByClientIds">;
  ids: CheckInIds;
  inbox: CheckInInbox;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
  series: Pick<CheckInSeriesRecords, "find" | "change">;
};

export class ChangeCheckInSeriesUseCase {
  private readonly announcer: CheckInAnnouncer;

  constructor(private readonly options: ChangeCheckInSeriesUseCaseOptions) {
    this.announcer = new CheckInAnnouncer(options);
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

    const availability = await this.options.availability.current();

    if (!availability.holdsWeeklyHour(command)) {
      return { status: "outside_availability" };
    }

    const now = this.options.clock.now();
    const { series, starts } = current.changedTo({
      rule: CheckInSeriesRule.of({
        weekday: command.weekday,
        hour: command.hour,
        timeZone: availability.timeZone,
      }),
      now,
      lead: CHECK_IN_RULES,
    });
    const recorded = await this.options.series.change({
      series,
      expected: {
        changedAt: current.changedAt,
        weekday: current.weekday,
        hour: current.hour,
      },
      startsFrom: now,
      occurrences: series.occurrencesAt({
        starts,
        clientTimeZone: client.timeZone,
        availability: "open",
        at: now,
        newId: () => this.options.ids.generate(),
      }),
      at: now,
    });

    if (recorded.status !== "changed") {
      return recorded;
    }

    await this.announcer.announceSeries("seriesChanged", {
      series,
      weekStartsAt: starts[0] ?? series.nextWeekStartFrom(now),
      clientTimeZone: client.timeZone,
      firstWeekId: CheckIn.earliestOf(recorded.occurrences)?.id ?? null,
    });

    return {
      status: "changed",
      series: series.toSnapshot(),
      occurrences: recorded.occurrences.map((checkIn) => checkIn.toSnapshot()),
    };
  }
}
