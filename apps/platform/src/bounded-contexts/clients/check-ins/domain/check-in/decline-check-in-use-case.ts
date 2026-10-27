import type { ClientIdentities } from "./client-identities";
import type { ClientReach } from "./client-reach";
import type { Clock } from "../clock";

import type { CheckInAnswerRefusal, CheckInSnapshot } from "./check-in";
import type { CheckInActorCommand } from "./check-in-actor";
import type { CheckInInbox } from "./check-in-inbox";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInNotifications } from "./check-in-notifications";
import { CheckInSettler } from "./check-in-settler";
import type { CheckIns } from "./check-ins";
import type { CoachTime } from "./coach-time";

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
  coachTime: Pick<CoachTime, "release">;
  identities: Pick<ClientIdentities, "findByClientIds">;
  inbox: CheckInInbox;
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
