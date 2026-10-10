import type { Clock } from "../shared";

import type { CheckInRefusal, CheckInSnapshot } from "./check-in";
import { CheckInClientReach } from "./check-in-client-reach";
import type { CheckInClients } from "./check-in-clients";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInNotifications } from "./check-in-notifications";
import { CheckInSettler } from "./check-in-settler";
import type { CheckIns } from "./check-ins";

export type WithdrawCheckInRequestCommand = {
  authSubjectId: string;
  checkInId: string;
};

export type WithdrawCheckInRequestResult =
  | { status: "withdrawn"; checkIn: CheckInSnapshot }
  | { status: "unknown" }
  | { status: "ended" }
  | { status: CheckInRefusal };

type WithdrawCheckInRequestUseCaseOptions = {
  checkIns: CheckIns;
  clients: CheckInClients;
  clock: Clock;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
};

export class WithdrawCheckInRequestUseCase {
  private readonly reach: CheckInClientReach;
  private readonly settler: CheckInSettler;

  constructor(private readonly options: WithdrawCheckInRequestUseCaseOptions) {
    this.reach = new CheckInClientReach(options);
    this.settler = new CheckInSettler(options);
  }

  async execute(
    command: WithdrawCheckInRequestCommand,
  ): Promise<WithdrawCheckInRequestResult> {
    const clientId = await this.reach.reachableClientIdOf(
      command.authSubjectId,
    );

    if (!clientId) {
      return { status: "ended" };
    }

    const checkIn = await this.options.checkIns.find(command.checkInId);

    if (!checkIn?.isFor(clientId)) {
      return { status: "unknown" };
    }

    const at = this.options.clock.now();
    const refusal = checkIn.withdrawalRefusalFor({ party: "client", at });

    if (refusal) {
      return { status: refusal };
    }

    const settled = await this.settler.settle({
      checkIn,
      outcome: "cancelled",
      notification: "withdrawn",
      at,
    });

    if (settled.status === "not_pending") {
      return settled;
    }

    return { status: "withdrawn", checkIn: settled.checkIn };
  }
}
