import type { ClientReach } from "../client";
import type { CoachAvailabilitySource } from "../coach-availability";
import type { Clock } from "../shared";

import { CheckIn } from "./check-in";
import type { CheckInIds } from "./check-in-ids";
import type { CheckInIncidents } from "./check-in-incidents";
import { CHECK_IN_RULES } from "./check-in-rules";
import { CheckInSeries } from "./check-in-series";
import type {
  CheckInSeriesOccurrence,
  CheckInSeriesRecords,
} from "./check-in-series-records";

export type ExtendCheckInSeriesResult =
  | { status: "extended"; created: number }
  | { status: "nothing_to_add" }
  | { status: "failed" };

type ExtendCheckInSeriesUseCaseOptions = {
  availability: CoachAvailabilitySource;
  clients: Pick<ClientReach, "findById">;
  clock: Clock;
  ids: CheckInIds;
  incidents: CheckInIncidents;
  series: Pick<CheckInSeriesRecords, "findActiveForClient" | "extend">;
};

type ExtensionAttempt =
  | Exclude<ExtendCheckInSeriesResult, { status: "failed" }>
  | { status: "changed_meanwhile" };

type MissingWeeks = {
  series: CheckInSeries;
  starts: readonly Date[];
  clientTimeZone: string;
  availability: CheckInSeriesOccurrence["availability"];
  at: Date;
};

export class ExtendCheckInSeriesUseCase {
  constructor(private readonly options: ExtendCheckInSeriesUseCaseOptions) {}

  async execute(command: {
    clientId: string;
  }): Promise<ExtendCheckInSeriesResult> {
    try {
      return await this.extendWithOneRetry(command.clientId);
    } catch (error) {
      this.options.incidents.checkInSeriesExtensionFailed({
        clientId: command.clientId,
        error,
      });

      return { status: "failed" };
    }
  }

  private async extendWithOneRetry(
    clientId: string,
  ): Promise<ExtendCheckInSeriesResult> {
    const first = await this.attempt(clientId);
    const result =
      first.status === "changed_meanwhile"
        ? await this.attempt(clientId)
        : first;

    if (result.status === "changed_meanwhile") {
      throw new Error(
        `The weekly check-in series of client ${clientId} kept changing while it was extended.`,
      );
    }

    return result;
  }

  private async attempt(clientId: string): Promise<ExtensionAttempt> {
    const current = await this.options.series.findActiveForClient(clientId);

    if (!current) {
      return { status: "nothing_to_add" };
    }

    const client = await this.options.clients.findById(clientId);

    if (
      client?.portal !== "reachable" ||
      client.programStartsAt === null ||
      client.paidThrough === null
    ) {
      return { status: "nothing_to_add" };
    }

    const now = this.options.clock.now();
    const bounds = CheckInSeries.boundsFor({
      now,
      lead: CHECK_IN_RULES,
      programStartsAt: client.programStartsAt,
      paidThrough: client.paidThrough,
      coachingEndsAt: client.coachingEndsAt,
    });

    if (bounds === "nothing_to_create") {
      return { status: "nothing_to_add" };
    }

    const { series, starts } = current.missingOccurrencesFor(bounds);

    if (starts.length === 0) {
      return { status: "nothing_to_add" };
    }

    const availability = await this.options.availability.current();
    const extended = await this.options.series.extend({
      series,
      expected: {
        coversFrom: current.coversFrom,
        coversUntil: current.coversUntil,
      },
      occurrences: this.weeksOf({
        series,
        starts,
        clientTimeZone: client.timeZone,
        availability: availability.holdsWeeklyHour(series) ? "open" : "closed",
        at: now,
      }),
      at: now,
    });

    return extended.status === "extended"
      ? { status: "extended", created: extended.occurrences.length }
      : extended;
  }

  private weeksOf(missing: MissingWeeks): CheckInSeriesOccurrence[] {
    const { series, availability } = missing;

    return missing.starts.map((startsAt) => ({
      checkIn: CheckIn.seriesOccurrence({
        id: this.options.ids.generate(),
        seriesId: series.id,
        clientId: series.clientId,
        startsAt,
        clientTimeZone: missing.clientTimeZone,
        coachTimeZone: series.timeZone,
        at: missing.at,
      }),
      availability,
    }));
  }
}
