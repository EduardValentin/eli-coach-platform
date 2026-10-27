import type { ClientIdentities } from "./client-identities";
import type { ClientReach } from "./client-reach";
import type { Clock } from "../clock";

import {
  CheckIn,
  type CheckInLaterWeekRefusal,
  type CheckInProposalRefusal,
  type CheckInSnapshot,
} from "./check-in";
import { actingClientZoneOf, type CheckInActorCommand } from "./check-in-actor";
import { CheckInActorReach } from "./check-in-actor-reach";
import { CheckInAnnouncer } from "./check-in-announcer";
import { releaseFreedHours } from "./check-in-hour-release";
import type { CheckInInbox } from "./check-in-inbox";
import type { CheckInIncidents } from "./check-in-incidents";
import { CheckInNote } from "./check-in-note";
import type { CheckInNotifications } from "./check-in-notifications";
import { CHECK_IN_RULES } from "./check-in-rules";
import type { CheckInMove, CheckInMoveCommand, CheckIns } from "./check-ins";
import type { CoachTime } from "./coach-time";
import type { OpenSlots } from "./open-slots";

export type ProposeCheckInTimeCommand = CheckInActorCommand & {
  startsAt: Date;
  note: string | null;
};

export type ProposeCheckInTimeResult =
  | { status: "proposed"; checkIn: CheckInSnapshot }
  | { status: "unknown" }
  | { status: "ended" }
  | { status: "invalid_time_zone" }
  | { status: "note_too_long" }
  | { status: "time_taken" }
  | { status: "changed_meanwhile" }
  | { status: CheckInProposalRefusal }
  | { status: CheckInLaterWeekRefusal };

type OpenStartCheck = {
  startsAt: Date;
  coachingEndsAt: Date | null;
  at: Date;
};

type ProposeCheckInTimeUseCaseOptions = {
  checkIns: Pick<CheckIns, "find" | "listForClient" | "move">;
  clients: Pick<ClientReach, "findByAuthSubjectId" | "findById">;
  clock: Clock;
  coachTime: CoachTime;
  identities: Pick<ClientIdentities, "findByClientIds">;
  inbox: CheckInInbox;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
  openSlots: Pick<OpenSlots, "offersStart">;
};

export class ProposeCheckInTimeUseCase {
  private readonly announcer: CheckInAnnouncer;
  private readonly reach: CheckInActorReach;

  constructor(private readonly options: ProposeCheckInTimeUseCaseOptions) {
    this.announcer = new CheckInAnnouncer(options);
    this.reach = new CheckInActorReach(options);
  }

  async execute(
    command: ProposeCheckInTimeCommand,
  ): Promise<ProposeCheckInTimeResult> {
    const written = CheckInNote.from(command.note);

    if (written.status === "too_long") {
      return { status: "note_too_long" };
    }

    const zone = actingClientZoneOf(command);

    if (zone.status === "invalid") {
      return { status: "invalid_time_zone" };
    }

    const reached = await this.reach.checkInReachedBy(command);

    if (reached.status !== "reached") {
      return reached;
    }

    const { checkIn } = reached;
    const party = command.actor.party;
    const at = this.options.clock.now();
    const proposal = checkIn.proposeNewTime({
      party,
      startsAt: command.startsAt,
      note: written.note,
      at,
      clientTimeZone: zone.timeZone,
    });

    if (proposal.status !== "proposed") {
      return proposal;
    }

    const laterWeek = checkIn.laterWeekRefusalFor({
      party,
      at,
      clientCheckIns: await this.options.checkIns.listForClient(
        checkIn.clientId,
      ),
    });

    if (laterWeek) {
      return { status: laterWeek };
    }

    const client = await this.options.clients.findById(checkIn.clientId);

    if (!client) {
      return { status: "unknown" };
    }

    const open = await this.isOpenStart({
      startsAt: command.startsAt,
      coachingEndsAt: client.coachingEndsAt,
      at,
    });

    if (!open) {
      return { status: "time_taken" };
    }

    const move = {
      checkIn: proposal.checkIn,
      expected: {
        recordedStatus: checkIn.recordedStatus,
        startsAt: checkIn.startsAt,
      },
      at,
    };
    const moved = checkIn.keepsItsHourAt({ startsAt: command.startsAt, at })
      ? await this.options.checkIns.move(move)
      : await this.moveToANewHour(move);

    if (moved.status !== "moved") {
      return moved;
    }

    await this.announcer.announce("newTimeProposed", proposal.checkIn, party);

    return { status: "proposed", checkIn: proposal.checkIn.toSnapshot() };
  }

  private async moveToANewHour(
    move: CheckInMoveCommand,
  ): Promise<CheckInMove | { status: "time_taken" }> {
    const { coachTime } = this.options;
    const held = await coachTime.reserve(
      CHECK_IN_RULES.coachTimeFrom(move.checkIn.startsAt),
    );

    if (held.status === "taken") {
      return { status: "time_taken" };
    }

    const moved = await this.options.checkIns.move({
      ...move,
      reservationId: held.reservationId,
    });

    if (moved.status === "changed_meanwhile") {
      await coachTime.release(held.reservationId);

      return moved;
    }

    await releaseFreedHours(coachTime, [moved.freedReservationId]);

    return moved;
  }

  private async isOpenStart({
    startsAt,
    coachingEndsAt,
    at,
  }: OpenStartCheck): Promise<boolean> {
    if (!CheckIn.startsBeforeCoachingEnd({ startsAt, coachingEndsAt })) {
      return false;
    }

    return this.options.openSlots.offersStart({ start: startsAt, now: at });
  }
}
