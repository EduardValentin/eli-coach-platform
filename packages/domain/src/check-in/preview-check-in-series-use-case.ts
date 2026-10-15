import type { ClientReach } from "../client";
import type {
  CoachAvailabilitySource,
  CoachCalendar,
  TimeInterval,
  Weekday,
} from "../coach-availability";
import type { Clock } from "../shared";

import { CHECK_IN_RULES } from "./check-in-rules";
import { CheckInSeriesBounds } from "./check-in-series-bounds";
import type { CheckInSeriesRecords } from "./check-in-series-records";
import {
  CheckInSeriesRule,
  type CheckInSeriesPreviewHour,
} from "./check-in-series-rule";

export type PreviewCheckInSeriesCommand = {
  clientId: string;
  weekday: Weekday;
};

export type PreviewCheckInSeriesResult =
  | {
      status: "previewed";
      weekdays: Weekday[];
      hours: CheckInSeriesPreviewHour[];
    }
  | { status: "unknown_client" | "client_cannot_answer" };

type PreviewCheckInSeriesUseCaseOptions = {
  availability: CoachAvailabilitySource;
  calendar: CoachCalendar;
  clients: Pick<ClientReach, "findById">;
  clock: Clock;
  series: Pick<CheckInSeriesRecords, "findActiveForClient" | "listOccurrences">;
};

type BusyOfClient = { clientId: string; now: Date };

export class PreviewCheckInSeriesUseCase {
  constructor(private readonly options: PreviewCheckInSeriesUseCaseOptions) {}

  async execute(
    command: PreviewCheckInSeriesCommand,
  ): Promise<PreviewCheckInSeriesResult> {
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

    if (bounds === "nothing_to_create") {
      const availability = await this.options.availability.current();

      return {
        status: "previewed",
        weekdays: [...availability.weekdays],
        hours: availability
          .weeklyHours()
          .map((hour) => ({ hour, occurrences: 0, clashes: 0 })),
      };
    }

    const [availability, busy] = await Promise.all([
      this.options.availability.current(),
      this.busyBesideOwnWeeksOf({ clientId: client.clientId, now }),
    ]);

    return {
      status: "previewed",
      weekdays: [...availability.weekdays],
      hours: CheckInSeriesRule.previewHoursOn({
        weekday: command.weekday,
        availability,
        bounds,
        busy,
      }),
    };
  }

  private async busyBesideOwnWeeksOf({
    clientId,
    now,
  }: BusyOfClient): Promise<TimeInterval[]> {
    const [busy, series] = await Promise.all([
      this.options.calendar.busyFrom(now),
      this.options.series.findActiveForClient(clientId),
    ]);

    if (!series) {
      return busy;
    }

    const weeks = await this.options.series.listOccurrences(series.id);

    return series.busyBesideOwnWeeks({ busy, weeks, at: now });
  }
}
