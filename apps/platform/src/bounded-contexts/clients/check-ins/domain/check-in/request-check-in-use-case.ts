import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClientReachPort } from "./client-reach-port";
import type { ClockPort } from "../clock-port";

import { CheckIn, type CheckInSnapshot } from "./check-in";
import { CheckInAnnouncer } from "./check-in-announcer";
import { CheckInActorReach } from "./check-in-actor-reach";
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
  checkInsPort: CheckInsPort;
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId">;
  clockPort: ClockPort;
  coachTimePort: Pick<CoachTimePort, "reserve">;
  clientIdentitiesPort: Pick<ClientIdentitiesPort, "findByClientIds">;
  checkInIdsPort: CheckInIdsPort;
  checkInInboxPort: CheckInInboxPort;
  checkInIncidentsPort: CheckInIncidentsPort;
  checkInNotificationsPort: CheckInNotificationsPort;
  openSlotsPort: Pick<OpenSlotsPort, "coachWeek" | "offersStart">;
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

    const now = this.options.clockPort.now();
    const { openSlotsPort } = this.options;

    if (!(await openSlotsPort.offersStart({ start: command.startsAt, now }))) {
      return { status: "time_taken" };
    }

    const { timeZone: coachTimeZone } = await openSlotsPort.coachWeek();
    const requested = await this.placement.place({
      checkIn: CheckIn.requestedByClient({
        id: this.options.checkInIdsPort.generate(),
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
