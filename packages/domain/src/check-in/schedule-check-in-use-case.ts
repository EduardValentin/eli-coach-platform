import type { CoachAvailabilitySource } from "../coach-availability";
import type { Clock } from "../shared";

import { CheckIn, type CheckInSnapshot } from "./check-in";
import { CheckInAnnouncer } from "./check-in-announcer";
import type { CheckInClients } from "./check-in-clients";
import type { CheckInIds } from "./check-in-ids";
import type { CheckInIncidents } from "./check-in-incidents";
import { CheckInNote } from "./check-in-note";
import type { CheckInNotifications } from "./check-in-notifications";
import { CHECK_IN_RULES } from "./check-in-rules";
import { CheckInTimeZone } from "./check-in-time-zone";
import type { CheckIns } from "./check-ins";

export type ScheduleCheckInCommand = {
  clientId: string;
  startsAt: Date;
  note: string | null;
};

export type ScheduleCheckInResult =
  | { status: "scheduled"; checkIn: CheckInSnapshot }
  | { status: "unknown_client" }
  | { status: "client_cannot_answer" }
  | { status: "time_taken" }
  | { status: "note_too_long" }
  | { status: "invalid_time_zone" };

type ScheduleCheckInUseCaseOptions = {
  availability: CoachAvailabilitySource;
  checkIns: Pick<CheckIns, "request">;
  clients: Pick<CheckInClients, "findById" | "identitiesOf">;
  clock: Clock;
  ids: CheckInIds;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
};

export class ScheduleCheckInUseCase {
  private readonly announcer: CheckInAnnouncer;

  constructor(private readonly options: ScheduleCheckInUseCaseOptions) {
    this.announcer = new CheckInAnnouncer(options);
  }

  async execute(
    command: ScheduleCheckInCommand,
  ): Promise<ScheduleCheckInResult> {
    const written = CheckInNote.from(command.note);

    if (written.status === "too_long") {
      return { status: "note_too_long" };
    }

    const client = await this.options.clients.findById(command.clientId);

    if (!client) {
      return { status: "unknown_client" };
    }

    if (client.portal !== "reachable") {
      return { status: "client_cannot_answer" };
    }

    const zone = CheckInTimeZone.from(client.bookingTimeZone);

    if (zone.status === "invalid") {
      return { status: "invalid_time_zone" };
    }

    const now = this.options.clock.now();
    const availability = await this.options.availability.current();

    if (
      !availability.isOpenStart({
        start: command.startsAt,
        now,
        policy: CHECK_IN_RULES,
      })
    ) {
      return { status: "time_taken" };
    }

    const requested = await this.options.checkIns.request({
      checkIn: CheckIn.scheduledByCoach({
        id: this.options.ids.generate(),
        clientId: client.clientId,
        startsAt: command.startsAt,
        clientTimeZone: zone.timeZone,
        coachTimeZone: availability.timeZone,
        note: written.note,
        requestedAt: now,
      }),
      at: now,
    });

    if (requested.status !== "requested") {
      return { status: "time_taken" };
    }

    await this.announcer.announce("requested", requested.checkIn, "coach");

    return { status: "scheduled", checkIn: requested.checkIn.toSnapshot() };
  }
}
