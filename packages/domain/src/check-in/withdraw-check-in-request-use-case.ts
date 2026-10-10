import type { Clock } from "../shared";

import type { CheckInRefusal, CheckInSnapshot } from "./check-in";
import type { CheckInActorCommand } from "./check-in-actor";
import type { CheckInClients } from "./check-in-clients";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInNotifications } from "./check-in-notifications";
import { CheckInSettler } from "./check-in-settler";
import type { CheckIns } from "./check-ins";

export type WithdrawCheckInRequestResult =
  | { status: "withdrawn"; checkIn: CheckInSnapshot }
  | { status: "unknown" }
  | { status: "ended" }
  | { status: "invalid_time_zone" }
  | { status: CheckInRefusal };

type WithdrawCheckInRequestUseCaseOptions = {
  checkIns: CheckIns;
  clients: Pick<CheckInClients, "findByAuthSubjectId" | "identitiesOf">;
  clock: Clock;
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
      notification: "withdrawn",
    });

    return settled.status === "settled"
      ? { status: "withdrawn", checkIn: settled.checkIn }
      : settled;
  }
}
