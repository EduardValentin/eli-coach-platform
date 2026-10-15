import type { ClientIdentities, ClientReach } from "../client";
import type { CoachAvailabilitySource } from "../coach-availability";
import type { Clock } from "../shared";

import type { CheckIn } from "./check-in";
import { CheckInAnnouncer } from "./check-in-announcer";
import type { CheckInIds } from "./check-in-ids";
import type { CheckInInbox } from "./check-in-inbox";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInNotifications } from "./check-in-notifications";
import { CHECK_IN_RULES } from "./check-in-rules";
import type { CheckInSeries } from "./check-in-series";
import { CheckInSeriesBounds } from "./check-in-series-bounds";
import type { CheckInSeriesRecords } from "./check-in-series-records";

export type ExtendCheckInSeriesResult =
  | { status: "extended"; created: number }
  | { status: "nothing_to_add" }
  | { status: "failed" };

type ExtendCheckInSeriesUseCaseOptions = {
  availability: CoachAvailabilitySource;
  clients: Pick<ClientReach, "findById">;
  clock: Clock;
  identities: Pick<ClientIdentities, "findByClientIds">;
  ids: CheckInIds;
  inbox: CheckInInbox;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
  series: Pick<CheckInSeriesRecords, "findActiveForClient" | "extend">;
};

type Extension =
  | { status: "extended"; series: CheckInSeries; occurrences: CheckIn[] }
  | { status: "nothing_to_add" };

type ExtensionAttempt = Extension | { status: "changed_meanwhile" };

type ExtensionFailure = { clientId: string; error: unknown };

export class ExtendCheckInSeriesUseCase {
  private readonly announcer: CheckInAnnouncer;

  constructor(private readonly options: ExtendCheckInSeriesUseCaseOptions) {
    this.announcer = new CheckInAnnouncer(options);
  }

  async execute(command: {
    clientId: string;
  }): Promise<ExtendCheckInSeriesResult> {
    try {
      const extension = await this.extendWithOneRetry(command.clientId);

      if (extension.status !== "extended") {
        return extension;
      }

      await this.announcer.announceClashes(
        extension.series,
        extension.occurrences.filter(
          (occurrence) => occurrence.recordedStatus === "clash",
        ),
      );

      return { status: "extended", created: extension.occurrences.length };
    } catch (error) {
      return this.failed({ clientId: command.clientId, error });
    }
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
    const current = await this.options.series.findActiveForClient(clientId);

    if (!current) {
      return { status: "nothing_to_add" };
    }

    const client = await this.options.clients.findById(clientId);

    if (!client) {
      return { status: "nothing_to_add" };
    }

    const now = this.options.clock.now();
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

    const availability = await this.options.availability.current();
    const extended = await this.options.series.extend({
      series,
      expected: {
        coversFrom: current.coversFrom,
        coversUntil: current.coversUntil,
      },
      occurrences: series.occurrencesAt({
        starts,
        clientTimeZone: client.timeZone,
        availability: availability.holdsWeeklyHour(series) ? "open" : "closed",
        at: now,
        newId: () => this.options.ids.generate(),
      }),
      at: now,
    });

    return extended.status === "extended"
      ? { status: "extended", series, occurrences: extended.occurrences }
      : extended;
  }

  private failed(failure: ExtensionFailure): { status: "failed" } {
    this.options.incidents.checkInSeriesExtensionFailed(failure);

    return { status: "failed" };
  }
}
