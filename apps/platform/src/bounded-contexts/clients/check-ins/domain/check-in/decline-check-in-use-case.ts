import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClientReachPort } from "./client-reach-port";
import type { ClockPort } from "../clock-port";

import type { CheckInAnswerRefusal, CheckInSnapshot } from "./check-in";
import type { CheckInActorCommand } from "./check-in-actor";
import type { CheckInInboxPort } from "./check-in-inbox-port";
import type { CheckInIncidentsPort } from "./check-in-incidents-port";
import type { CheckInNotificationsPort } from "./check-in-notifications-port";
import { CheckInSettler } from "./check-in-settler";
import type { CheckInsPort } from "./check-ins-port";
import type { CoachTimePort } from "./coach-time-port";

export type DeclineCheckInResult =
  | { status: "declined"; checkIn: CheckInSnapshot }
  | { status: "unknown" }
  | { status: "ended" }
  | { status: "invalid_time_zone" }
  | { status: CheckInAnswerRefusal | "changed_meanwhile" };

type DeclineCheckInUseCaseOptions = {
  checkIns: CheckInsPort;
  clients: Pick<ClientReachPort, "findByAuthSubjectId">;
  clock: ClockPort;
  coachTime: Pick<CoachTimePort, "release">;
  identities: Pick<ClientIdentitiesPort, "findByClientIds">;
  inbox: CheckInInboxPort;
  incidents: CheckInIncidentsPort;
  notifications: CheckInNotificationsPort;
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
