import type {
  ClientIdentities,
  ClientReach,
} from "~/bounded-contexts/clients/clients/domain/client";
import type { Clock } from "../clock";

import type { CheckInAnswerRefusal, CheckInSnapshot } from "./check-in";
import type { CheckInActorCommand } from "./check-in-actor";
import type { CheckInInbox } from "./check-in-inbox";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInNotifications } from "./check-in-notifications";
import { CheckInSettler } from "./check-in-settler";
import type { CheckIns } from "./check-ins";
import type { CoachTime } from "./coach-time";

export type WithdrawCheckInRequestResult =
  | { status: "withdrawn"; checkIn: CheckInSnapshot }
  | { status: "unknown" }
  | { status: "ended" }
  | { status: "invalid_time_zone" }
  | { status: CheckInAnswerRefusal | "changed_meanwhile" };

type WithdrawCheckInRequestUseCaseOptions = {
  checkIns: CheckIns;
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  clock: Clock;
  coachTime: Pick<CoachTime, "release">;
  identities: Pick<ClientIdentities, "findByClientIds">;
  inbox: CheckInInbox;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
};

export class WithdrawCheckInRequestUseCase {
  private readonly settler: CheckInSettler;

  constructor(options: WithdrawCheckInRequestUseCaseOptions) {
    this.settler = new CheckInSettler(options);
  }

  async execute(
    command: CheckInActorCommand,
  ): Promise<WithdrawCheckInRequestResult> {
    const settled = await this.settler.settle({
      command,
      refusalOf: (checkIn, turn) => checkIn.withdrawalRefusalFor(turn),
      outcome: "cancelled",
      notificationOf: () => "withdrawn",
    });

    return settled.status === "settled"
      ? { status: "withdrawn", checkIn: settled.checkIn }
      : settled;
  }
}
