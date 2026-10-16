import type { ClientIdentities, ClientReach } from "../client";
import type { Clock } from "../shared";

import type {
  CheckIn,
  CheckInOutcome,
  CheckInRefusal,
  CheckInSnapshot,
} from "./check-in";
import { actingClientZoneOf, type CheckInActorCommand } from "./check-in-actor";
import { CheckInActorReach } from "./check-in-actor-reach";
import { CheckInAnnouncer } from "./check-in-announcer";
import type { CheckInInbox } from "./check-in-inbox";
import type { CheckInIncidents } from "./check-in-incidents";
import type {
  CheckInNotification,
  CheckInNotifications,
} from "./check-in-notifications";
import type { CheckInParty } from "./check-in-party";
import type { CheckIns } from "./check-ins";

type CheckInSettlerOptions = {
  checkIns: Pick<CheckIns, "find" | "settle">;
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  clock: Clock;
  identities: Pick<ClientIdentities, "findByClientIds">;
  inbox: CheckInInbox;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
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

    if (recorded === "changed_meanwhile") {
      return { status: "changed_meanwhile" };
    }

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
