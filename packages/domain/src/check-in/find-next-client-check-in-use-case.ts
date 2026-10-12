import type { ClientReach } from "../client";
import type { Clock } from "../shared";

import { CheckIn, type CheckInView } from "./check-in";
import { CheckInActorReach } from "./check-in-actor-reach";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckIns } from "./check-ins";

type FindNextClientCheckInUseCaseOptions = {
  checkIns: Pick<CheckIns, "find" | "listForClient">;
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  clock: Clock;
  incidents: CheckInIncidents;
};

export class FindNextClientCheckInUseCase {
  private readonly reach: CheckInActorReach;

  constructor(private readonly options: FindNextClientCheckInUseCaseOptions) {
    this.reach = new CheckInActorReach(options);
  }

  async execute(authSubjectId: string): Promise<CheckInView | null> {
    try {
      const clientId = await this.reach.reachableClientIdOf(authSubjectId);

      if (!clientId) {
        return null;
      }

      const checkIns = await this.options.checkIns.listForClient(clientId);
      const at = this.options.clock.now();
      const next = [...checkIns]
        .sort(CheckIn.byStart)
        .find((checkIn) => checkIn.statusAt(at) === "approved");

      return next?.viewFor({ party: "client", at }) ?? null;
    } catch (error) {
      this.options.incidents.nextCheckInLookupFailed({ error });

      return null;
    }
  }
}
