import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClientReachPort } from "./client-reach-port";
import type { ClockPort } from "../clock-port";

import type { CheckIn } from "./check-in";
import { CheckInAnnouncer } from "./check-in-announcer";
import type { CheckInIdsPort } from "./check-in-ids-port";
import type { CheckInInboxPort } from "./check-in-inbox-port";
import type { CheckInIncidentsPort } from "./check-in-incidents-port";
import type { CheckInNotificationsPort } from "./check-in-notifications-port";
import { CHECK_IN_RULES } from "./check-in-rules";
import type { CheckInSeries } from "./check-in-series";
import { CheckInSeriesBounds } from "./check-in-series-bounds";
import type { CheckInSeriesRecordsPort } from "./check-in-series-records-port";
import { CheckInWeekRecorder } from "./check-in-week-recorder";
import type { CoachTimePort } from "./coach-time-port";
import type { OpenSlotsPort } from "./open-slots-port";

export type ExtendCheckInSeriesResult =
  | { status: "extended"; created: number }
  | { status: "nothing_to_add" }
  | { status: "failed" };

type ExtendCheckInSeriesUseCaseOptions = {
  clientReachPort: Pick<ClientReachPort, "findById">;
  clockPort: ClockPort;
  coachTimePort: Pick<CoachTimePort, "reserve">;
  clientIdentitiesPort: Pick<ClientIdentitiesPort, "findByClientIds">;
  checkInIdsPort: CheckInIdsPort;
  checkInInboxPort: CheckInInboxPort;
  checkInIncidentsPort: CheckInIncidentsPort;
  checkInNotificationsPort: CheckInNotificationsPort;
  openSlotsPort: Pick<OpenSlotsPort, "coachWeek">;
  checkInSeriesRecordsPort: Pick<
    CheckInSeriesRecordsPort,
    "findActiveForClient" | "widen" | "recordWeeks"
  >;
};

type Extension =
  | { status: "extended"; series: CheckInSeries; occurrences: CheckIn[] }
  | { status: "nothing_to_add" };

type ExtensionAttempt = Extension | { status: "changed_meanwhile" };

type ExtensionFailure = { clientId: string; error: unknown };

export class ExtendCheckInSeriesUseCase {
  private readonly announcer: CheckInAnnouncer;
  private readonly weeks: CheckInWeekRecorder;

  constructor(private readonly options: ExtendCheckInSeriesUseCaseOptions) {
    this.announcer = new CheckInAnnouncer(options);
    this.weeks = new CheckInWeekRecorder(options);
  }

  async execute(command: {
    clientId: string;
  }): Promise<ExtendCheckInSeriesResult> {
    const extension = await this.extendWithOneRetry(command.clientId);

    if (extension.status !== "extended") {
      return extension;
    }

    await this.announcer.announceClashes(
      extension.series,
      extension.occurrences.filter((occurrence) => occurrence.isClash()),
    );
    await this.announcer.announceExpiries(extension.series, {
      current: extension.occurrences,
      withdrawn: [],
    });

    return { status: "extended", created: extension.occurrences.length };
  }

  private async extendWithOneRetry(
    clientId: string,
  ): Promise<Extension | { status: "failed" }> {
    const first = await this.attempt(clientId);
    const result =
      first.status === "changed_meanwhile"
        ? await this.attempt(clientId)
        : first;

    if (result.status !== "changed_meanwhile") {
      return result;
    }

    return this.failed({
      clientId,
      error: new Error(
        `The weekly check-in series of client ${clientId} kept changing while it was extended.`,
      ),
    });
  }

  private async attempt(clientId: string): Promise<ExtensionAttempt> {
    const current =
      await this.options.checkInSeriesRecordsPort.findActiveForClient(clientId);

    if (!current) {
      return { status: "nothing_to_add" };
    }

    const client = await this.options.clientReachPort.findById(clientId);

    if (!client) {
      return { status: "nothing_to_add" };
    }

    const now = this.options.clockPort.now();
    const bounds = CheckInSeriesBounds.ofCoaching({
      client,
      now,
      lead: CHECK_IN_RULES,
    });

    if (bounds === "client_cannot_answer" || bounds === "nothing_to_create") {
      return { status: "nothing_to_add" };
    }

    const { series, starts } = current.missingOccurrencesFor(bounds);

    if (starts.length === 0) {
      return { status: "nothing_to_add" };
    }

    const week = await this.options.openSlotsPort.coachWeek();
    const widened = await this.options.checkInSeriesRecordsPort.widen({
      series,
      expected: {
        coversFrom: current.coversFrom,
        coversUntil: current.coversUntil,
      },
    });

    if (widened === "changed_meanwhile") {
      return { status: widened };
    }

    const occurrences = await this.weeks.record(
      series.occurrencesAt({
        starts,
        clientTimeZone: client.timeZone,
        availability: week.holdsWeeklyHour(series) ? "open" : "closed",
        at: now,
        newId: () => this.options.checkInIdsPort.generate(),
      }),
    );

    return { status: "extended", series, occurrences };
  }

  private failed(failure: ExtensionFailure): { status: "failed" } {
    this.options.checkInIncidentsPort.checkInSeriesExtensionFailed(failure);

    return { status: "failed" };
  }
}
