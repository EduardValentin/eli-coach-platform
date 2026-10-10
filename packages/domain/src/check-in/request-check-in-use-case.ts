import type { CoachAvailabilitySource } from "../coach-availability";
import type { Clock } from "../shared";

import { CheckIn, type CheckInSnapshot } from "./check-in";
import { CheckInAnnouncer } from "./check-in-announcer";
import { CheckInClientReach } from "./check-in-client-reach";
import type { CheckInClients } from "./check-in-clients";
import type { CheckInIds } from "./check-in-ids";
import type { CheckInIncidents } from "./check-in-incidents";
import { CheckInNote } from "./check-in-note";
import type { CheckInNotifications } from "./check-in-notifications";
import { CHECK_IN_RULES } from "./check-in-rules";
import type { CheckIns } from "./check-ins";

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
  availability: CoachAvailabilitySource;
  checkIns: CheckIns;
  clients: CheckInClients;
  clock: Clock;
  ids: CheckInIds;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
};

const OFFSET_ZONE_SIGNS = ["+", "-"];

export class RequestCheckInUseCase {
  private readonly announcer: CheckInAnnouncer;
  private readonly reach: CheckInClientReach;

  constructor(private readonly options: RequestCheckInUseCaseOptions) {
    this.announcer = new CheckInAnnouncer(options);
    this.reach = new CheckInClientReach(options);
  }

  async execute(command: RequestCheckInCommand): Promise<RequestCheckInResult> {
    const written = CheckInNote.from(command.note);

    if (written.status === "too_long") {
      return { status: "note_too_long" };
    }

    const clientTimeZone = this.namedTimeZoneOf(command.clientTimeZone);

    if (!clientTimeZone) {
      return { status: "invalid_time_zone" };
    }

    const clientId = await this.reach.reachableClientIdOf(
      command.authSubjectId,
    );

    if (!clientId) {
      return { status: "ended" };
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
      checkIn: CheckIn.requestedByClient({
        id: this.options.ids.generate(),
        clientId,
        startsAt: command.startsAt,
        clientTimeZone,
        coachTimeZone: availability.timeZone,
        note: written.note,
        requestedAt: now,
      }),
      at: now,
    });

    if (requested.status !== "requested") {
      return requested;
    }

    await this.announcer.announce("requested", requested.checkIn);

    return { status: "requested", checkIn: requested.checkIn.toSnapshot() };
  }

  private namedTimeZoneOf(candidate: string): string | null {
    try {
      const { timeZone } = new Intl.DateTimeFormat(undefined, {
        timeZone: candidate,
      }).resolvedOptions();

      return OFFSET_ZONE_SIGNS.includes(timeZone.charAt(0)) ? null : timeZone;
    } catch {
      return null;
    }
  }
}
