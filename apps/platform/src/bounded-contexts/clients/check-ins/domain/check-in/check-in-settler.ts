import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClientReachPort } from "./client-reach-port";
import type { ClockPort } from "../clock-port";

import type {
  CheckIn,
  CheckInOutcome,
  CheckInRefusal,
  CheckInSnapshot,
} from "./check-in";
import { actingClientZoneOf, type CheckInActorCommand } from "./check-in-actor";
import { CheckInActorReach } from "./check-in-actor-reach";
import { CheckInAnnouncer } from "./check-in-announcer";
import { releaseFreedHours } from "./check-in-hour-release";
import type { CheckInInboxPort } from "./check-in-inbox-port";
import type { CheckInIncidentsPort } from "./check-in-incidents-port";
import type {
  CheckInNotification,
  CheckInNotificationsPort,
} from "./check-in-notifications-port";
import type { CheckInParty } from "./check-in-party";
import type { CheckInsPort } from "./check-ins-port";
import type { CoachTimePort } from "./coach-time-port";

type CheckInSettlerOptions = {
  checkIns: Pick<CheckInsPort, "find" | "settle">;
  clients: Pick<ClientReachPort, "findByAuthSubjectId">;
  clock: ClockPort;
  coachTime: Pick<CoachTimePort, "release">;
  identities: Pick<ClientIdentitiesPort, "findByClientIds">;
  inbox: CheckInInboxPort;
  incidents: CheckInIncidentsPort;
  notifications: CheckInNotificationsPort;
};

type CheckInTurn = { party: CheckInParty; at: Date };

type CheckInSettling<Refusal extends CheckInRefusal> = {
  command: CheckInActorCommand;
  refusalOf: (checkIn: CheckIn, turn: CheckInTurn) => Refusal | null;
  outcome: CheckInOutcome;
  notificationOf: (checkIn: CheckIn) => CheckInNotification;
};

export type SettledCheckIn<Refusal extends CheckInRefusal> =
  | { status: "settled"; checkIn: CheckInSnapshot }
  | { status: "unknown" }
  | { status: "ended" }
  | { status: "invalid_time_zone" }
  | { status: Refusal | "changed_meanwhile" };

export class CheckInSettler {
  private readonly announcer: CheckInAnnouncer;
  private readonly reach: CheckInActorReach;

  constructor(private readonly options: CheckInSettlerOptions) {
    this.announcer = new CheckInAnnouncer(options);
    this.reach = new CheckInActorReach(options);
  }

  async settle<Refusal extends CheckInRefusal>(
    settling: CheckInSettling<Refusal>,
  ): Promise<SettledCheckIn<Refusal>> {
    const { command, outcome } = settling;
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
    const refusal = settling.refusalOf(checkIn, { party, at });

    if (refusal) {
      return { status: refusal };
    }

    const recorded = await this.options.checkIns.settle({
      id: checkIn.id,
      outcome,
      at,
      expectedStatus: checkIn.recordedStatus,
      ...(zone.timeZone && { clientTimeZone: zone.timeZone.name }),
    });

    if (recorded.status === "changed_meanwhile") {
      return recorded;
    }

    await releaseFreedHours(this.options.coachTime, [
      recorded.freedReservationId,
    ]);

    const settled = checkIn.settled({
      outcome,
      at,
      clientTimeZone: zone.timeZone,
    });

    await this.announcer.announce(
      settling.notificationOf(checkIn),
      settled,
      party,
    );

    return { status: "settled", checkIn: settled.toSnapshot() };
  }
}
