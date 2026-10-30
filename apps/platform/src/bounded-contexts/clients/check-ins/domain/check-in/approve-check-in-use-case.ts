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

export type ApproveCheckInResult =
  | { status: "approved"; checkIn: CheckInSnapshot }
  | { status: "unknown" }
  | { status: "ended" }
  | { status: "invalid_time_zone" }
  | { status: CheckInAnswerRefusal | "changed_meanwhile" };

type ApproveCheckInUseCaseOptions = {
  checkInsPort: CheckInsPort;
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId">;
  clockPort: ClockPort;
  coachTimePort: Pick<CoachTimePort, "release">;
  clientIdentitiesPort: Pick<ClientIdentitiesPort, "findByClientIds">;
  checkInInboxPort: CheckInInboxPort;
  checkInIncidentsPort: CheckInIncidentsPort;
  checkInNotificationsPort: CheckInNotificationsPort;
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
      notificationOf: (checkIn) =>
        checkIn.hasPendingNewTime() ? "newTimeAccepted" : "approved",
    });

    return settled.status === "settled"
      ? { status: "approved", checkIn: settled.checkIn }
      : settled;
  }
}
