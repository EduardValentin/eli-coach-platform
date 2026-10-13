import type { ClientReach } from "../client";
import type {
  CoachAvailabilitySource,
  CoachCalendar,
  TimeInterval,
  Weekday,
} from "../coach-availability";
import type { Clock } from "../shared";

import type { CheckIn } from "./check-in";
import { CHECK_IN_RULES } from "./check-in-rules";
import { CheckInSeries } from "./check-in-series";
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

type OwnWeeksAt = { clientId: string; now: Date };

const HOUR_HOLDING_STATUSES: ReadonlySet<string> = new Set([
  "pending",
  "approved",
]);

export class PreviewCheckInSeriesUseCase {
  constructor(private readonly options: PreviewCheckInSeriesUseCaseOptions) {}

  async execute(
    command: PreviewCheckInSeriesCommand,
  ): Promise<PreviewCheckInSeriesResult> {
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

    const now = this.options.clock.now();
    const [availability, busy, ownWeeks] = await Promise.all([
      this.options.availability.current(),
      this.options.calendar.busyFrom(now),
      this.ownWeeksOf({ clientId: client.clientId, now }),
    ]);
    const busyElsewhere = busy.filter(
      (interval) => !this.isHeldByAny(interval, ownWeeks),
    );
    const bounds = CheckInSeries.boundsFor({
      now,
      lead: CHECK_IN_RULES,
      programStartsAt,
      paidThrough,
      coachingEndsAt: client.coachingEndsAt,
    });

    return {
      status: "previewed",
      weekdays: [...availability.weekdays],
      hours: availability.weeklyHours().map((hour) => {
        if (bounds === "nothing_to_create") {
          return { hour, occurrences: 0, clashes: 0 };
        }

        return CheckInSeriesRule.of({
          weekday: command.weekday,
          hour,
          timeZone: availability.timeZone,
        }).previewBetween({ bounds, busy: busyElsewhere });
      }),
    };
  }

  private async ownWeeksOf({ clientId, now }: OwnWeeksAt): Promise<CheckIn[]> {
    const series = await this.options.series.findActiveForClient(clientId);

    if (!series) {
      return [];
    }

    const weeks = await this.options.series.listOccurrences(series.id);

    return weeks.filter((week) =>
      HOUR_HOLDING_STATUSES.has(week.statusAt(now)),
    );
  }

  private isHeldByAny(
    interval: TimeInterval,
    weeks: readonly CheckIn[],
  ): boolean {
    return weeks.some((week) => {
      const held = CHECK_IN_RULES.coachTimeFrom(week.startsAt);

      return (
        held.start.getTime() === interval.start.getTime() &&
        held.end.getTime() === interval.end.getTime()
      );
    });
  }
}
