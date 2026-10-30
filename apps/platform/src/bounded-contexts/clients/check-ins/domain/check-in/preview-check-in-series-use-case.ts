import type { ClientReachPort } from "./client-reach-port";
import type { ClockPort } from "../clock-port";

import { CHECK_IN_RULES } from "./check-in-rules";
import { CheckInSeriesBounds } from "./check-in-series-bounds";
import type { CheckInSeriesRecordsPort } from "./check-in-series-records-port";
import {
  CheckInSeriesRule,
  type CheckInSeriesPreviewHour,
} from "./check-in-series-rule";
import type { CoachTimeSpan } from "./coach-time-port";
import type { OpenSlotsPort } from "./open-slots-port";
import type { Weekday } from "./weekdays";

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
  clientReachPort: Pick<ClientReachPort, "findById">;
  clockPort: ClockPort;
  openSlotsPort: Pick<OpenSlotsPort, "coachWeek" | "busyFrom">;
  checkInSeriesRecordsPort: Pick<
    CheckInSeriesRecordsPort,
    "findActiveForClient" | "listOccurrences"
  >;
};

type BusyOfClient = { clientId: string; now: Date };

export class PreviewCheckInSeriesUseCase {
  constructor(private readonly options: PreviewCheckInSeriesUseCaseOptions) {}

  async execute(
    command: PreviewCheckInSeriesCommand,
  ): Promise<PreviewCheckInSeriesResult> {
    const client = await this.options.clientReachPort.findById(
      command.clientId,
    );

    if (!client) {
      return { status: "unknown_client" };
    }

    const now = this.options.clockPort.now();
    const bounds = CheckInSeriesBounds.ofCoaching({
      client,
      now,
      lead: CHECK_IN_RULES,
    });

    if (bounds === "client_cannot_answer") {
      return { status: bounds };
    }

    if (bounds === "nothing_to_create") {
      const week = await this.options.openSlotsPort.coachWeek();

      return {
        status: "previewed",
        weekdays: [...week.weekdays],
        hours: week.hours.map((hour) => ({ hour, occurrences: 0, clashes: 0 })),
      };
    }

    const [week, busy] = await Promise.all([
      this.options.openSlotsPort.coachWeek(),
      this.busyBesideOwnWeeksOf({ clientId: client.clientId, now }),
    ]);

    return {
      status: "previewed",
      weekdays: [...week.weekdays],
      hours: CheckInSeriesRule.previewHoursOn({
        weekday: command.weekday,
        week,
        bounds,
        busy,
      }),
    };
  }

  private async busyBesideOwnWeeksOf({
    clientId,
    now,
  }: BusyOfClient): Promise<CoachTimeSpan[]> {
    const [busy, series] = await Promise.all([
      this.options.openSlotsPort.busyFrom(now),
      this.options.checkInSeriesRecordsPort.findActiveForClient(clientId),
    ]);

    if (!series) {
      return busy;
    }

    const weeks = await this.options.checkInSeriesRecordsPort.listOccurrences(
      series.id,
    );

    return series.busyBesideOwnWeeks({ busy, weeks, at: now });
  }
}
