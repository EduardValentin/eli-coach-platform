import type {
  ClientIdentities,
  ClientReach,
} from "~/bounded-contexts/clients/clients/domain/client";
import type { Clock } from "../clock";

import { CheckIn, type CheckInSnapshot } from "./check-in";
import { CheckInAnnouncer } from "./check-in-announcer";
import type { CheckInIds } from "./check-in-ids";
import type { CheckInInbox } from "./check-in-inbox";
import type { CheckInIncidents } from "./check-in-incidents";
import { CheckInNote } from "./check-in-note";
import type { CheckInNotifications } from "./check-in-notifications";
import { CheckInRequestPlacement } from "./check-in-request-placement";
import { CheckInTimeZone } from "./check-in-time-zone";
import type { CheckIns } from "./check-ins";
import type { CoachTime } from "./coach-time";
import type { OpenSlots } from "./open-slots";

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
  checkIns: Pick<CheckIns, "listForClientLocked" | "add">;
  clients: Pick<ClientReach, "findById">;
  clock: Clock;
  coachTime: Pick<CoachTime, "reserve">;
  identities: Pick<ClientIdentities, "findByClientIds">;
  ids: CheckInIds;
  inbox: CheckInInbox;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
  openSlots: Pick<OpenSlots, "coachWeek" | "offersStart">;
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
