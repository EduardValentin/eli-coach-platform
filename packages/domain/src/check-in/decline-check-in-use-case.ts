import type { Clock } from "../shared";

import type { CheckInRefusal, CheckInSnapshot } from "./check-in";
import type { CheckInClients } from "./check-in-clients";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInNotifications } from "./check-in-notifications";
import { CheckInSettler } from "./check-in-settler";
import type { CheckIns } from "./check-ins";

export type DeclineCheckInResult =
  | { status: "declined"; checkIn: CheckInSnapshot }
  | { status: "unknown" }
  | { status: CheckInRefusal };

type DeclineCheckInUseCaseOptions = {
  checkIns: CheckIns;
  clients: CheckInClients;
  clock: Clock;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
};

export class DeclineCheckInUseCase {
  private readonly settler: CheckInSettler;

  constructor(private readonly options: DeclineCheckInUseCaseOptions) {
    this.settler = new CheckInSettler(options);
  }

  async execute(checkInId: string): Promise<DeclineCheckInResult> {
    const checkIn = await this.options.checkIns.find(checkInId);

    if (!checkIn) {
      return { status: "unknown" };
    }

    const at = this.options.clock.now();
    const refusal = checkIn.answerRefusalFor({ party: "coach", at });

    if (refusal) {
      return { status: refusal };
    }

    const settled = await this.settler.settle({
      checkIn,
      outcome: "cancelled",
      notification: "declined",
      at,
    });

    if (settled.status === "not_pending") {
      return settled;
    }

    return { status: "declined", checkIn: settled.checkIn };
  }
}
