import type { ClientReachPort } from "./client-reach-port";
import type { ClockPort } from "../clock-port";

import type { CheckIn } from "./check-in";
import type { CheckInActor } from "./check-in-actor";
import { CheckInActorReach } from "./check-in-actor-reach";
import type { CheckInIncidentsPort } from "./check-in-incidents-port";
import type { CheckInsPort } from "./check-ins-port";

type CountCheckInsAwaitingUseCaseOptions = {
  checkInsPort: Pick<CheckInsPort, "find" | "listAll" | "listForClient">;
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId">;
  clockPort: ClockPort;
  checkInIncidentsPort: CheckInIncidentsPort;
};

export class CountCheckInsAwaitingUseCase {
  private readonly reach: CheckInActorReach;

  constructor(private readonly options: CountCheckInsAwaitingUseCaseOptions) {
    this.reach = new CheckInActorReach(options);
  }

  async execute(actor: CheckInActor): Promise<number> {
    try {
      const checkIns = await this.checkInsSeenBy(actor);
      const at = this.options.clockPort.now();

      return checkIns.filter((checkIn) =>
        checkIn.awaitsAnswerOf({ party: actor.party, at }),
      ).length;
    } catch (error) {
      this.options.checkInIncidentsPort.awaitingCheckInsCountFailed({
        party: actor.party,
        error,
      });

      return 0;
    }
  }

  private async checkInsSeenBy(actor: CheckInActor): Promise<CheckIn[]> {
    if (actor.party === "coach") {
      return this.options.checkInsPort.listAll();
    }

    const clientId = await this.reach.reachableClientIdOf(actor.authSubjectId);

    return clientId ? this.options.checkInsPort.listForClient(clientId) : [];
  }
}
