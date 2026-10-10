import type { Clock } from "../shared";

import type {
  CheckIn,
  CheckInOutcome,
  CheckInParty,
  CheckInRefusal,
  CheckInSnapshot,
} from "./check-in";
import type { CheckInActorCommand } from "./check-in-actor";
import { CheckInActorReach } from "./check-in-actor-reach";
import { CheckInAnnouncer } from "./check-in-announcer";
import type { CheckInClients } from "./check-in-clients";
import type { CheckInIncidents } from "./check-in-incidents";
import type {
  CheckInNotification,
  CheckInNotifications,
} from "./check-in-notifications";
import { CheckInTimeZone } from "./check-in-time-zone";
import type { CheckIns } from "./check-ins";

type CheckInSettlerOptions = {
  checkIns: Pick<CheckIns, "find" | "settle">;
  clients: Pick<CheckInClients, "findByAuthSubjectId" | "identitiesOf">;
  clock: Clock;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
};

type CheckInTurn = { party: CheckInParty; at: Date };

type CheckInAnswer = {
  command: CheckInActorCommand;
  refusalOf: (checkIn: CheckIn, turn: CheckInTurn) => CheckInRefusal | null;
  outcome: CheckInOutcome;
  notification: CheckInNotification;
};

type AnsweringZone =
  { status: "valid"; timeZone: CheckInTimeZone | null } | { status: "invalid" };

export type SettledCheckIn =
  | { status: "settled"; checkIn: CheckInSnapshot }
  | { status: "unknown" }
  | { status: "ended" }
  | { status: "invalid_time_zone" }
  | { status: CheckInRefusal };

export class CheckInSettler {
  private readonly announcer: CheckInAnnouncer;
  private readonly reach: CheckInActorReach;

  constructor(private readonly options: CheckInSettlerOptions) {
    this.announcer = new CheckInAnnouncer(options);
    this.reach = new CheckInActorReach(options);
  }

  async settle(answer: CheckInAnswer): Promise<SettledCheckIn> {
    const { command, outcome, notification } = answer;
    const zone = this.answeringZoneOf(command);

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
    const refusal = answer.refusalOf(checkIn, { party, at });

    if (refusal) {
      return { status: refusal };
    }

    const recorded = await this.options.checkIns.settle({
      id: checkIn.id,
      outcome,
      at,
      ...(zone.timeZone && { clientTimeZone: zone.timeZone.name }),
    });

    if (recorded === "not_pending") {
      return { status: "not_pending" };
    }

    const settled = checkIn.settled({
      outcome,
      at,
      clientTimeZone: zone.timeZone,
    });

    await this.announcer.announce(notification, settled, party);

    return { status: "settled", checkIn: settled.toSnapshot() };
  }

  private answeringZoneOf(command: CheckInActorCommand): AnsweringZone {
    if (
      command.actor.party === "coach" ||
      command.clientTimeZone === undefined
    ) {
      return { status: "valid", timeZone: null };
    }

    return CheckInTimeZone.from(command.clientTimeZone);
  }
}
