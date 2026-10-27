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
import { CheckInSeries, type CheckInSeriesSnapshot } from "./check-in-series";
import { CheckInSeriesBounds } from "./check-in-series-bounds";
import type { CheckInSeriesRecords } from "./check-in-series-records";
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
  inbox: CheckInInbox;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
  series: Pick<CheckInSeriesRecords, "setUp">;
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

    const now = this.options.clock.now();
    const bounds = CheckInSeriesBounds.ofCoaching({
      client,
      now,
      lead: CHECK_IN_RULES,
    });

    if (bounds === "client_cannot_answer") {
      return { status: bounds };
    }

    const availability = await this.options.availability.current();

    if (!availability.holdsWeeklyHour(command)) {
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
      occurrences: series.occurrencesAt({
        starts,
        clientTimeZone: client.timeZone,
        availability: "open",
        at: now,
        newId: () => this.options.ids.generate(),
      }),
      at: now,
    });

    if (recorded.status !== "set_up") {
      return recorded;
    }

    await this.announcer.announceSeries("seriesSetUp", {
      series,
      weekStartsAt: starts[0],
      clientTimeZone: client.timeZone,
      firstWeekId: CheckIn.earliestOf(recorded.occurrences)?.id ?? null,
    });

    return {
      status: "set_up",
      series: series.toSnapshot(),
      occurrences: recorded.occurrences.map((checkIn) => checkIn.toSnapshot()),
    };
  }
}
