import type { ClientReach } from "~/bounded-contexts/clients/clients/domain/client";
import type { Clock } from "../clock";

import type { CheckIn } from "./check-in";
import type { CheckInActor } from "./check-in-actor";
import { CheckInActorReach } from "./check-in-actor-reach";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckIns } from "./check-ins";

type CountCheckInsAwaitingUseCaseOptions = {
  checkIns: Pick<CheckIns, "find" | "listAll" | "listForClient">;
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  clock: Clock;
  incidents: CheckInIncidents;
};

export class CountCheckInsAwaitingUseCase {
  private readonly reach: CheckInActorReach;

  constructor(private readonly options: CountCheckInsAwaitingUseCaseOptions) {
    this.reach = new CheckInActorReach(options);
  }

  async execute(actor: CheckInActor): Promise<number> {
    try {
      const checkIns = await this.checkInsSeenBy(actor);
      const at = this.options.clock.now();

      return checkIns.filter((checkIn) =>
        checkIn.awaitsAnswerOf({ party: actor.party, at }),
      ).length;
    } catch (error) {
      this.options.incidents.awaitingCheckInsCountFailed({
        party: actor.party,
        error,
      });

      return 0;
    }
  }

  private async checkInsSeenBy(actor: CheckInActor): Promise<CheckIn[]> {
    if (actor.party === "coach") {
      return this.options.checkIns.listAll();
    }

    const clientId = await this.reach.reachableClientIdOf(actor.authSubjectId);

    return clientId ? this.options.checkIns.listForClient(clientId) : [];
  }
}
