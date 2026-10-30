import type { ClientReachPort } from "./client-reach-port";
import type { ClockPort } from "../clock-port";

import { CheckIn, type CheckInView } from "./check-in";
import { CheckInActorReach } from "./check-in-actor-reach";
import type { CheckInIncidentsPort } from "./check-in-incidents-port";
import type { CheckInsPort } from "./check-ins-port";

type FindNextClientCheckInUseCaseOptions = {
  checkIns: Pick<CheckInsPort, "find" | "listForClient">;
  clients: Pick<ClientReachPort, "findByAuthSubjectId">;
  clock: ClockPort;
  incidents: CheckInIncidentsPort;
};

export class FindNextClientCheckInUseCase {
  private readonly reach: CheckInActorReach;

  constructor(private readonly options: FindNextClientCheckInUseCaseOptions) {
    this.reach = new CheckInActorReach(options);
  }

  async execute(authSubjectId: string): Promise<CheckInView | null> {
    try {
      return await this.nextApprovedCheckInOf(authSubjectId);
    } catch (error) {
      this.options.incidents.nextCheckInLookupFailed({ error });

      return null;
    }
  }

  private async nextApprovedCheckInOf(
    authSubjectId: string,
  ): Promise<CheckInView | null> {
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
  }
}
