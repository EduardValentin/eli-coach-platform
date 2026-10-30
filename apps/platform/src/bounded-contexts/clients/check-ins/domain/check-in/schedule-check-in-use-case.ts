import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClientReachPort } from "./client-reach-port";
import type { ClockPort } from "../clock-port";

import { CheckIn, type CheckInSnapshot } from "./check-in";
import { CheckInAnnouncer } from "./check-in-announcer";
import type { CheckInIdsPort } from "./check-in-ids-port";
import type { CheckInInboxPort } from "./check-in-inbox-port";
import type { CheckInIncidentsPort } from "./check-in-incidents-port";
import { CheckInNote } from "./check-in-note";
import type { CheckInNotificationsPort } from "./check-in-notifications-port";
import { CheckInRequestPlacement } from "./check-in-request-placement";
import { CheckInTimeZone } from "./check-in-time-zone";
import type { CheckInsPort } from "./check-ins-port";
import type { CoachTimePort } from "./coach-time-port";
import type { OpenSlotsPort } from "./open-slots-port";

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
  checkIns: Pick<CheckInsPort, "listForClientLocked" | "add">;
  clients: Pick<ClientReachPort, "findById">;
  clock: ClockPort;
  coachTime: Pick<CoachTimePort, "reserve">;
  identities: Pick<ClientIdentitiesPort, "findByClientIds">;
  ids: CheckInIdsPort;
  inbox: CheckInInboxPort;
  incidents: CheckInIncidentsPort;
  notifications: CheckInNotificationsPort;
  openSlots: Pick<OpenSlotsPort, "coachWeek" | "offersStart">;
};

export class ScheduleCheckInUseCase {
  private readonly announcer: CheckInAnnouncer;
  private readonly placement: CheckInRequestPlacement;

  constructor(private readonly options: ScheduleCheckInUseCaseOptions) {
    this.announcer = new CheckInAnnouncer(options);
    this.placement = new CheckInRequestPlacement(options);
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

    const zone = CheckInTimeZone.from(client.timeZone);

    if (zone.status === "invalid") {
      return { status: "invalid_time_zone" };
    }

    if (
      !CheckIn.startsBeforeCoachingEnd({
        startsAt: command.startsAt,
        coachingEndsAt: client.coachingEndsAt,
      })
    ) {
      return { status: "time_taken" };
    }

    const now = this.options.clock.now();
    const { openSlots } = this.options;

    if (!(await openSlots.offersStart({ start: command.startsAt, now }))) {
      return { status: "time_taken" };
    }

    const { timeZone: coachTimeZone } = await openSlots.coachWeek();
    const requested = await this.placement.place({
      checkIn: CheckIn.scheduledByCoach({
        id: this.options.ids.generate(),
        clientId: client.clientId,
        startsAt: command.startsAt,
        clientTimeZone: zone.timeZone,
        coachTimeZone,
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
