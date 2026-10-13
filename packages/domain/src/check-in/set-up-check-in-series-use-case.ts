import type {
  ClientIdentities,
  ClientReach,
  ClientReachReading,
} from "../client";
import type { CoachAvailabilitySource, Weekday } from "../coach-availability";
import type { Clock } from "../shared";

import { CheckIn, type CheckInSnapshot } from "./check-in";
import { CheckInAnnouncer } from "./check-in-announcer";
import type { CheckInIds } from "./check-in-ids";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInNotifications } from "./check-in-notifications";
import { CHECK_IN_RULES } from "./check-in-rules";
import { CheckInSeries, type CheckInSeriesSnapshot } from "./check-in-series";
import type {
  CheckInSeriesOccurrence,
  CheckInSeriesRecords,
} from "./check-in-series-records";
import { CheckInSeriesRule } from "./check-in-series-rule";

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
  availability: CoachAvailabilitySource;
  clients: Pick<ClientReach, "findById">;
  clock: Clock;
  identities: Pick<ClientIdentities, "findByClientIds">;
  ids: CheckInIds;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
  series: Pick<CheckInSeriesRecords, "setUp">;
};

type WeeksOfSeries = {
  series: CheckInSeries;
  starts: readonly Date[];
  client: ClientReachReading;
  at: Date;
};

export class SetUpCheckInSeriesUseCase {
  private readonly announcer: CheckInAnnouncer;

  constructor(private readonly options: SetUpCheckInSeriesUseCaseOptions) {
    this.announcer = new CheckInAnnouncer(options);
  }

  async execute(
    command: SetUpCheckInSeriesCommand,
  ): Promise<SetUpCheckInSeriesResult> {
    const client = await this.options.clients.findById(command.clientId);

    if (!client) {
      return { status: "unknown_client" };
    }

    const { programStartsAt, paidThrough } = client;

    if (
      client.portal !== "reachable" ||
      programStartsAt === null ||
      paidThrough === null
    ) {
      return { status: "client_cannot_answer" };
    }

    const availability = await this.options.availability.current();

    if (!availability.holdsWeeklyHour(command)) {
      return { status: "outside_availability" };
    }

    const now = this.options.clock.now();
    const bounds = CheckInSeries.boundsFor({
      now,
      lead: CHECK_IN_RULES,
      programStartsAt,
      paidThrough,
      coachingEndsAt: client.coachingEndsAt,
    });

    if (bounds === "nothing_to_create") {
      return { status: "nothing_to_create" };
    }

    const { series, starts } = CheckInSeries.setUp({
      id: this.options.ids.generate(),
      clientId: client.clientId,
      rule: CheckInSeriesRule.of({
        weekday: command.weekday,
        hour: command.hour,
        timeZone: availability.timeZone,
      }),
      bounds,
      at: now,
    });

    if (starts.length === 0) {
      return { status: "nothing_to_create" };
    }

    const recorded = await this.options.series.setUp({
      series,
      occurrences: this.weeksOf({ series, starts, client, at: now }),
      at: now,
    });

    if (recorded.status !== "set_up") {
      return recorded;
    }

    await this.announcer.announceSeries("seriesSetUp", series, starts[0]);

    return {
      status: "set_up",
      series: series.toSnapshot(),
      occurrences: recorded.occurrences.map((checkIn) => checkIn.toSnapshot()),
    };
  }

  private weeksOf({
    series,
    starts,
    client,
    at,
  }: WeeksOfSeries): CheckInSeriesOccurrence[] {
    return starts.map((startsAt) => ({
      checkIn: CheckIn.seriesOccurrence({
        id: this.options.ids.generate(),
        seriesId: series.id,
        clientId: series.clientId,
        startsAt,
        clientTimeZone: client.timeZone,
        coachTimeZone: series.timeZone,
        at,
      }),
      availability: "open",
    }));
  }
}
