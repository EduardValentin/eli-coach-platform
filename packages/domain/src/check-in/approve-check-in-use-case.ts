import type { Clock } from "../shared";

import type { CheckInAnswerRefusal, CheckInSnapshot } from "./check-in";
import type { CheckInActorCommand } from "./check-in-actor";
import type { CheckInClients } from "./check-in-clients";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInNotifications } from "./check-in-notifications";
import { CheckInSettler } from "./check-in-settler";
import type { CheckIns } from "./check-ins";

export type ApproveCheckInResult =
  | { status: "approved"; checkIn: CheckInSnapshot }
  | { status: "unknown" }
  | { status: "ended" }
  | { status: "invalid_time_zone" }
  | { status: CheckInAnswerRefusal | "changed_meanwhile" };

type ApproveCheckInUseCaseOptions = {
  checkIns: CheckIns;
  clients: Pick<CheckInClients, "findByAuthSubjectId" | "identitiesOf">;
  clock: Clock;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
};

export class ApproveCheckInUseCase {
  private readonly settler: CheckInSettler;

  constructor(options: ApproveCheckInUseCaseOptions) {
    this.settler = new CheckInSettler(options);
  }

  async execute(command: CheckInActorCommand): Promise<ApproveCheckInResult> {
    const settled = await this.settler.settle({
      command,
      refusalOf: (checkIn, turn) => checkIn.answerRefusalFor(turn),
      outcome: "approved",
      expectedStatus: "pending",
      notificationOf: (checkIn) =>
        checkIn.hasPendingNewTime() ? "newTimeAccepted" : "approved",
    });

    return settled.status === "settled"
      ? { status: "approved", checkIn: settled.checkIn }
      : settled;
  }
}
