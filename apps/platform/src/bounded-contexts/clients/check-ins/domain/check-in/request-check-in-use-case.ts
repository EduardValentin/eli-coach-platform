import type { ClientIdentities } from "./client-identities";
import type { ClientReach } from "./client-reach";
import type { Clock } from "../clock";

import { CheckIn, type CheckInSnapshot } from "./check-in";
import { CheckInAnnouncer } from "./check-in-announcer";
import { CheckInActorReach } from "./check-in-actor-reach";
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

export type RequestCheckInCommand = {
  authSubjectId: string;
  startsAt: Date;
  clientTimeZone: string;
  note: string | null;
};

export type RequestCheckInResult =
  | { status: "requested"; checkIn: CheckInSnapshot }
  | { status: "request_waiting" }
  | { status: "time_taken" }
  | { status: "ended" }
  | { status: "note_too_long" }
  | { status: "invalid_time_zone" };

type RequestCheckInUseCaseOptions = {
  checkIns: CheckIns;
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  clock: Clock;
  coachTime: Pick<CoachTime, "reserve">;
  identities: Pick<ClientIdentities, "findByClientIds">;
  ids: CheckInIds;
  inbox: CheckInInbox;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
  openSlots: Pick<OpenSlots, "coachWeek" | "offersStart">;
};

export class RequestCheckInUseCase {
  private readonly announcer: CheckInAnnouncer;
  private readonly placement: CheckInRequestPlacement;
  private readonly reach: CheckInActorReach;

  constructor(private readonly options: RequestCheckInUseCaseOptions) {
    this.announcer = new CheckInAnnouncer(options);
    this.placement = new CheckInRequestPlacement(options);
    this.reach = new CheckInActorReach(options);
  }

  async execute(command: RequestCheckInCommand): Promise<RequestCheckInResult> {
    const written = CheckInNote.from(command.note);

    if (written.status === "too_long") {
      return { status: "note_too_long" };
    }

    const zone = CheckInTimeZone.from(command.clientTimeZone);

    if (zone.status === "invalid") {
      return { status: "invalid_time_zone" };
    }

    const client = await this.reach.reachableClientOf(command.authSubjectId);

    if (!client) {
      return { status: "ended" };
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
      checkIn: CheckIn.requestedByClient({
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
      return requested;
    }

    await this.announcer.announce("requested", requested.checkIn, "client");

    return { status: "requested", checkIn: requested.checkIn.toSnapshot() };
  }
}
