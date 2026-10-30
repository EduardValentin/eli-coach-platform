import type { ClientIdentitiesPort } from "./client-identities-port";
import type { ClientReachPort } from "./client-reach-port";
import type { ClockPort } from "../clock-port";

import type { CheckInCancellationRefusal, CheckInSnapshot } from "./check-in";
import type { CheckInActorCommand } from "./check-in-actor";
import type { CheckInInboxPort } from "./check-in-inbox-port";
import type { CheckInIncidentsPort } from "./check-in-incidents-port";
import type { CheckInNotificationsPort } from "./check-in-notifications-port";
import { CheckInSettler } from "./check-in-settler";
import type { CheckInsPort } from "./check-ins-port";
import type { CoachTimePort } from "./coach-time-port";

export type CancelCheckInResult =
  | { status: "cancelled"; checkIn: CheckInSnapshot }
  | { status: "unknown" }
  | { status: "ended" }
  | { status: "invalid_time_zone" }
  | { status: CheckInCancellationRefusal | "changed_meanwhile" };

type CancelCheckInUseCaseOptions = {
  checkIns: CheckInsPort;
  clients: Pick<ClientReachPort, "findByAuthSubjectId">;
  clock: ClockPort;
  coachTime: Pick<CoachTimePort, "release">;
  identities: Pick<ClientIdentitiesPort, "findByClientIds">;
  inbox: CheckInInboxPort;
  incidents: CheckInIncidentsPort;
  notifications: CheckInNotificationsPort;
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
      notificationOf: () => "cancelled",
    });

    return settled.status === "settled"
      ? { status: "cancelled", checkIn: settled.checkIn }
      : settled;
  }
}
