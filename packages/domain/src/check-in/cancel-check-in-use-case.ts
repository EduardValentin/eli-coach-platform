import type { Clock } from "../shared";

import type { CheckInCancellationRefusal, CheckInSnapshot } from "./check-in";
import type { CheckInActorCommand } from "./check-in-actor";
import type { CheckInClients } from "./check-in-clients";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInNotifications } from "./check-in-notifications";
import { CheckInSettler } from "./check-in-settler";
import type { CheckIns } from "./check-ins";

export type CancelCheckInResult =
  | { status: "cancelled"; checkIn: CheckInSnapshot }
  | { status: "unknown" }
  | { status: "ended" }
  | { status: "invalid_time_zone" }
  | { status: CheckInCancellationRefusal | "not_pending" };

type CancelCheckInUseCaseOptions = {
  checkIns: CheckIns;
  clients: Pick<CheckInClients, "findByAuthSubjectId" | "identitiesOf">;
  clock: Clock;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
};

export class CancelCheckInUseCase {
  private readonly settler: CheckInSettler;

  constructor(options: CancelCheckInUseCaseOptions) {
    this.settler = new CheckInSettler(options);
  }

  async execute(command: CheckInActorCommand): Promise<CancelCheckInResult> {
    const settled = await this.settler.settle({
      command,
      refusalOf: (checkIn, turn) => checkIn.cancellationRefusalFor(turn),
      outcome: "cancelled",
      from: "approved",
      notificationOf: () => "cancelled",
    });

    return settled.status === "settled"
      ? { status: "cancelled", checkIn: settled.checkIn }
      : settled;
  }
}
