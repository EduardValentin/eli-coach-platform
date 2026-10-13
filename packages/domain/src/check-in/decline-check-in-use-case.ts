import type { ClientIdentities, ClientReach } from "../client";
import type { Clock } from "../shared";

import type { CheckInAnswerRefusal, CheckInSnapshot } from "./check-in";
import type { CheckInActorCommand } from "./check-in-actor";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInNotifications } from "./check-in-notifications";
import { CheckInSettler } from "./check-in-settler";
import type { CheckIns } from "./check-ins";

export type DeclineCheckInResult =
  | { status: "declined"; checkIn: CheckInSnapshot }
  | { status: "unknown" }
  | { status: "ended" }
  | { status: "invalid_time_zone" }
  | { status: CheckInAnswerRefusal | "changed_meanwhile" };

type DeclineCheckInUseCaseOptions = {
  checkIns: CheckIns;
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  clock: Clock;
  identities: Pick<ClientIdentities, "findByClientIds">;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
};

export class DeclineCheckInUseCase {
  private readonly settler: CheckInSettler;

  constructor(options: DeclineCheckInUseCaseOptions) {
    this.settler = new CheckInSettler(options);
  }

  async execute(command: CheckInActorCommand): Promise<DeclineCheckInResult> {
    const settled = await this.settler.settle({
      command,
      refusalOf: (checkIn, turn) => checkIn.answerRefusalFor(turn),
      outcome: "cancelled",
      notificationOf: (checkIn) =>
        checkIn.hasPendingNewTime() ? "newTimeDeclined" : "declined",
    });

    return settled.status === "settled"
      ? { status: "declined", checkIn: settled.checkIn }
      : settled;
  }
}
