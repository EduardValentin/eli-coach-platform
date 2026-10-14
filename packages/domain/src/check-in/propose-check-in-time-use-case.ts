import type { ClientIdentities, ClientReach } from "../client";
import type { CoachAvailabilitySource } from "../coach-availability";
import type { Clock } from "../shared";

import {
  CheckIn,
  type CheckInLaterWeekRefusal,
  type CheckInProposalRefusal,
  type CheckInSnapshot,
} from "./check-in";
import { actingClientZoneOf, type CheckInActorCommand } from "./check-in-actor";
import { CheckInActorReach } from "./check-in-actor-reach";
import { CheckInAnnouncer } from "./check-in-announcer";
import type { CheckInIncidents } from "./check-in-incidents";
import { CheckInNote } from "./check-in-note";
import type { CheckInNotifications } from "./check-in-notifications";
import { CHECK_IN_RULES } from "./check-in-rules";
import type { CheckIns } from "./check-ins";

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
  availability: CoachAvailabilitySource;
  checkIns: Pick<CheckIns, "find" | "listForClient" | "move">;
  clients: Pick<ClientReach, "findByAuthSubjectId" | "findById">;
  clock: Clock;
  identities: Pick<ClientIdentities, "findByClientIds">;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
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

    const moved = await this.options.checkIns.move({
      checkIn: proposal.checkIn,
      expected: {
        recordedStatus: checkIn.recordedStatus,
        startsAt: checkIn.startsAt,
      },
      at,
    });

    if (moved !== "moved") {
      return { status: moved };
    }

    await this.announcer.announce("newTimeProposed", proposal.checkIn, party);

    return { status: "proposed", checkIn: proposal.checkIn.toSnapshot() };
  }

  private async isOpenStart({
    startsAt,
    coachingEndsAt,
    at,
  }: OpenStartCheck): Promise<boolean> {
    if (!CheckIn.startsBeforeCoachingEnd({ startsAt, coachingEndsAt })) {
      return false;
    }

    const availability = await this.options.availability.current();

    return availability.isOpenStart({
      start: startsAt,
      now: at,
      policy: CHECK_IN_RULES,
    });
  }
}
