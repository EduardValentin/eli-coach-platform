import type { Clock } from "../shared";

import type { CheckInRefusal, CheckInSnapshot } from "./check-in";
import {
  CheckInClientReach,
  type CheckInActorCommand,
} from "./check-in-client-reach";
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
  | { status: CheckInRefusal };

type ApproveCheckInUseCaseOptions = {
  checkIns: CheckIns;
  clients: Pick<CheckInClients, "findByAuthSubjectId" | "identitiesOf">;
  clock: Clock;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
};

export class ApproveCheckInUseCase {
  private readonly reach: CheckInClientReach;
  private readonly settler: CheckInSettler;

  constructor(private readonly options: ApproveCheckInUseCaseOptions) {
    this.reach = new CheckInClientReach(options);
    this.settler = new CheckInSettler(options);
  }

  async execute(command: CheckInActorCommand): Promise<ApproveCheckInResult> {
    const reached = await this.reach.checkInReachedBy(command);

    if (reached.status !== "reached") {
      return reached;
    }

    const { checkIn, clientTimeZone } = reached;
    const party = command.actor.party;
    const at = this.options.clock.now();
    const refusal = checkIn.answerRefusalFor({ party, at });

    if (refusal) {
      return { status: refusal };
    }

    const settled = await this.settler.settle({
      checkIn,
      outcome: "approved",
      notification: "approved",
      actedBy: party,
      clientTimeZone,
      at,
    });

    if (settled.status === "not_pending") {
      return settled;
    }

    return { status: "approved", checkIn: settled.checkIn };
  }
}
