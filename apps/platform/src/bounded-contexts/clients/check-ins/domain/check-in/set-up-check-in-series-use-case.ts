import type { ClientIdentities } from "./client-identities";
import type { ClientReach } from "./client-reach";
import type { Clock } from "../clock";

import { CheckIn, type CheckInSnapshot } from "./check-in";
import { CheckInAnnouncer } from "./check-in-announcer";
import type { CheckInIds } from "./check-in-ids";
import type { CheckInInbox } from "./check-in-inbox";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInNotifications } from "./check-in-notifications";
import { CHECK_IN_RULES } from "./check-in-rules";
import { CheckInSeries, type CheckInSeriesSnapshot } from "./check-in-series";
import { CheckInSeriesBounds } from "./check-in-series-bounds";
import type { CheckInSeriesRecords } from "./check-in-series-records";
import { CheckInSeriesRule } from "./check-in-series-rule";
import { CheckInWeekRecorder } from "./check-in-week-recorder";
import type { CoachTime } from "./coach-time";
import type { OpenSlots } from "./open-slots";
import type { Weekday } from "./weekdays";

export type SetUpCheckInSeriesCommand = {
  clientId: string;
  weekday: Weekday;
  hour: number;
};

export type SetUpCheckInSeriesResult =
  | {
      status: "set_up";
      series: CheckInSeriesSnapshot;
      occurrences: CheckInSnapshot[];
    }
  | {
      status:
        | "unknown_client"
        | "client_cannot_answer"
        | "series_exists"
        | "outside_availability"
        | "nothing_to_create";
    };

type SetUpCheckInSeriesUseCaseOptions = {
  clients: Pick<ClientReach, "findById">;
  clock: Clock;
  coachTime: Pick<CoachTime, "reserve">;
  identities: Pick<ClientIdentities, "findByClientIds">;
  ids: CheckInIds;
  inbox: CheckInInbox;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
  openSlots: Pick<OpenSlots, "coachWeek">;
  series: Pick<CheckInSeriesRecords, "start" | "recordWeeks">;
};

export class SetUpCheckInSeriesUseCase {
  private readonly announcer: CheckInAnnouncer;
  private readonly weeks: CheckInWeekRecorder;

  constructor(private readonly options: SetUpCheckInSeriesUseCaseOptions) {
    this.announcer = new CheckInAnnouncer(options);
    this.weeks = new CheckInWeekRecorder(options);
  }

  async execute(
    command: SetUpCheckInSeriesCommand,
  ): Promise<SetUpCheckInSeriesResult> {
    const client = await this.options.clients.findById(command.clientId);

    if (!client) {
      return { status: "unknown_client" };
    }

    const now = this.options.clock.now();
    const bounds = CheckInSeriesBounds.ofCoaching({
      client,
      now,
      lead: CHECK_IN_RULES,
    });

    if (bounds === "client_cannot_answer") {
      return { status: bounds };
    }

    const week = await this.options.openSlots.coachWeek();

    if (!week.holdsWeeklyHour(command)) {
      return { status: "outside_availability" };
    }

    if (bounds === "nothing_to_create") {
      return { status: bounds };
    }

    const { series, starts } = CheckInSeries.setUp({
      id: this.options.ids.generate(),
      clientId: client.clientId,
      rule: CheckInSeriesRule.of({
        weekday: command.weekday,
        hour: command.hour,
        timeZone: week.timeZone,
      }),
      bounds,
      at: now,
    });

    if (starts.length === 0) {
      return { status: "nothing_to_create" };
    }

    if ((await this.options.series.start(series)) === "series_exists") {
      return { status: "series_exists" };
    }

    const occurrences = await this.weeks.record(
      series.occurrencesAt({
        starts,
        clientTimeZone: client.timeZone,
        availability: "open",
        at: now,
        newId: () => this.options.ids.generate(),
      }),
    );

    await this.announcer.announceSeries("seriesSetUp", {
      series,
      weekStartsAt: starts[0],
      clientTimeZone: client.timeZone,
      firstWeekId: CheckIn.earliestOf(occurrences)?.id ?? null,
    });
    await this.announcer.announceExpiries(series, {
      current: occurrences,
      withdrawn: [],
    });

    return {
      status: "set_up",
      series: series.toSnapshot(),
      occurrences: occurrences.map((checkIn) => checkIn.toSnapshot()),
    };
  }
}
