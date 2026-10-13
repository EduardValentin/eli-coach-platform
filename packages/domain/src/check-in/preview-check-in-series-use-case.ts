import type { ClientReach } from "../client";
import type {
  CoachAvailabilitySource,
  CoachCalendar,
  Weekday,
} from "../coach-availability";
import type { Clock } from "../shared";

import { CHECK_IN_RULES } from "./check-in-rules";
import { CheckInSeries } from "./check-in-series";
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
};

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
    const [availability, busy] = await Promise.all([
      this.options.availability.current(),
      this.options.calendar.busyFrom(now),
    ]);
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
        }).previewBetween({ bounds, busy });
      }),
    };
  }
}
